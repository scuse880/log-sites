/** Move one ready file before another (or to the end), using a revision-checked
 * snapshot. Both statements run in a single D1 transaction, so upload commits,
 * deletions and other moves cannot interleave with the revision check. */
export async function reorderOne(
  db: D1Database,
  id: string,
  beforeId: string | null,
  revision: number,
): Promise<boolean> {
  const results = await db.batch([
    db.prepare(`
      WITH
      input AS MATERIALIZED (
        SELECT ? AS moved_id, ? AS before_id, ? AS expected_revision
      ),
      ordered AS MATERIALIZED (
        SELECT id,
          ROW_NUMBER() OVER (ORDER BY sort_order, uploaded_at, id) AS old_position
        FROM uploads WHERE state='ready'
      ),
      eligible AS MATERIALIZED (
        SELECT * FROM input
        WHERE (SELECT revision FROM storage_usage WHERE id=1)=expected_revision
          AND EXISTS (SELECT 1 FROM ordered WHERE id=input.moved_id)
          AND (before_id IS NULL OR (
            before_id<>moved_id
            AND EXISTS (SELECT 1 FROM ordered WHERE id=input.before_id)
          ))
      ),
      reordered AS MATERIALIZED (
        SELECT ordered.id,
          ROW_NUMBER() OVER (
            ORDER BY
              CASE WHEN ordered.id=eligible.moved_id THEN
                COALESCE(
                  (SELECT old_position FROM ordered WHERE id=eligible.before_id),
                  (SELECT COUNT(*)+1 FROM ordered)
                )
              ELSE ordered.old_position END,
              CASE WHEN ordered.id=eligible.moved_id THEN 0 ELSE 1 END
          ) AS new_position
        FROM ordered CROSS JOIN eligible
      )
      UPDATE uploads
      SET sort_order=(SELECT new_position FROM reordered WHERE reordered.id=uploads.id)
      WHERE state='ready' AND EXISTS (SELECT 1 FROM eligible)
    `).bind(id, beforeId, revision),
    // changes() is the preceding UPDATE's row count on this transaction's
    // connection. A stale revision or invalid target changed zero rows.
    db.prepare(`
      UPDATE storage_usage SET revision=revision+1
      WHERE id=1 AND revision=? AND changes()>0
      RETURNING revision
    `).bind(revision),
  ]);
  return results[1].results.length === 1;
}
