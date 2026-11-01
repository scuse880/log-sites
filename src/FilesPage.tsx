import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type FormEvent, type ReactNode,
} from "react";
import "./files.css";

type Session = {
  authenticated: boolean;
  csrfToken?: string;
  expiresAt?: number;
  mode?: "public" | "private";
};
type SharedFile = { id: string; name: string; size: number; uploadedAt: string | number };
type SharedFileList = { files: SharedFile[]; revision: number };
type Usage = {
  usedBytes: number; reservedBytes: number; remainingUploads: number;
  dailyLimit: number; maxFileBytes: number; maxTotalBytes: number;
};
type UploadItem = {
  key: number; name: string; size: number; progress: number;
  state: "waiting" | "uploading" | "done" | "error" | "cancelled";
  message?: string;
};
const uploadedDateFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hour12: false,
});

class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function responseJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(data?.error || (response.status === 404
      ? "파일 서비스를 사용할 수 없습니다. 서버 설정을 확인해 주세요."
      : `요청에 실패했습니다 (${response.status}). 잠시 후 다시 시도해 주세요.`), response.status);
  }
  return data as T;
}

type AdminContextValue = {
  session: Session;
  getSession: () => Session;
  requestAdmin: () => Promise<boolean>;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  refreshSession: () => Promise<void>;
  expire: () => void;
  logout: () => Promise<void>;
  authNotice: string;
};
const AdminContext = createContext<AdminContextValue | null>(null);
function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) throw new Error("FilesProvider is required");
  return value;
}

function Modal({ children, title, onClose }: { children: ReactNode; title: string; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(panel.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex="0"]',
    ) || []);
    focusable()[0]?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); }
      if (event.key === "Tab") {
        const items = focusable();
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); previous?.focus(); };
  }, []);
  return <div className="files-modal-backdrop">
    <div ref={panel} className="files-modal" role="dialog" aria-modal="true" aria-label={title}>
      <h2>{title}</h2>{children}
    </div>
  </div>;
}

export function FilesProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session>({ authenticated: false });
  const sessionRef = useRef(session);
  const sessionRevision = useRef(0);
  const [dialog, setDialog] = useState<"login" | "remember" | null>(null);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const pending = useRef<((value: boolean) => void)[]>([]);
  const setSession = useCallback((value: Session) => {
    sessionRevision.current++;
    sessionRef.current = value;
    setSessionState(value);
  }, []);
  const expire = useCallback(() => {
    if (sessionRef.current.authenticated) setAuthNotice("관리자 로그인이 만료되었습니다. 변경하려면 다시 로그인해 주세요.");
    setSession({ authenticated: false });
  }, [setSession]);
  const request = useCallback(async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    const headers = new Headers(init.headers);
    if (init.body && typeof init.body === "string") headers.set("Content-Type", "application/json");
    if (init.method && init.method !== "GET" && sessionRef.current.csrfToken) {
      headers.set("X-CSRF-Token", sessionRef.current.csrfToken);
    }
    try {
      const result = await responseJson<T>(await fetch(path, { ...init, headers, credentials: "same-origin", cache: "no-store" }));
      if (init.method && init.method !== "GET" && !path.startsWith("/api/auth/") && sessionRef.current.authenticated) {
        const token = sessionRef.current.csrfToken;
        // The server may extend its idle deadline after an authorized write.
        // Read that deadline only after work; this does not create a heartbeat.
        try {
          const value = await responseJson<Session>(await fetch("/api/session", { credentials: "same-origin", cache: "no-store" }));
          if (sessionRef.current.csrfToken === token) setSession(value);
        } catch { /* Preserve the successful write if the deadline refresh fails. */ }
      }
      return result;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && path !== "/api/auth/login") expire();
      throw error;
    }
  }, [expire, setSession]);
  const refreshSession = useCallback(async () => {
    const token = sessionRef.current.csrfToken;
    const value = await request<Session>("/api/session");
    if (sessionRef.current.authenticated && sessionRef.current.csrfToken === token) setSession(value);
  }, [request, setSession]);
  useEffect(() => {
    let current = true;
    const revision = sessionRevision.current;
    request<Session>("/api/session").then(value => {
      if (current && sessionRevision.current === revision) setSession(value);
    }).catch(() => {});
    return () => { current = false; };
  }, [request, setSession]);

  // Only real user interactions extend the idle deadline. Reading the page does not.
  useEffect(() => {
    if (!session.authenticated) return;
    let lastActivity = Date.now();
    let stopped = false;
    const activity = (event: Event) => {
      if (!event.isTrusted || Date.now() - lastActivity < 60_000 || !sessionRef.current.authenticated) return;
      lastActivity = Date.now();
      request<Session>("/api/auth/activity", { method: "POST" })
        .then(value => { if (!stopped && sessionRef.current.authenticated) setSession(value); })
        .catch(() => {});
    };
    document.addEventListener("pointerdown", activity);
    document.addEventListener("keydown", activity);
    return () => {
      stopped = true;
      document.removeEventListener("pointerdown", activity);
      document.removeEventListener("keydown", activity);
    };
  }, [session.authenticated, request, setSession]);
  useEffect(() => {
    if (!session.authenticated || !session.expiresAt) return;
    const timer = window.setTimeout(expire, Math.max(0, session.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [session.authenticated, session.expiresAt, expire]);

  const resolveLogin = (allowed: boolean) => {
    setDialog(null);
    setPassword("");
    for (const resolve of pending.current.splice(0)) resolve(allowed);
  };
  const requestAdmin = useCallback(() => {
    const current = sessionRef.current;
    if (current.authenticated && (!current.expiresAt || current.expiresAt > Date.now())) return Promise.resolve(true);
    setLoginError("");
    setAuthNotice("");
    setRemember(false);
    setDialog("login");
    return new Promise<boolean>(resolve => pending.current.push(resolve));
  }, []);
  const login = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const submittedPassword = password;
    setPassword("");
    setSubmitting(true);
    setLoginError("");
    try {
      const result = await request<Session>("/api/auth/login", { method: "POST", body: JSON.stringify({ password: submittedPassword }) });
      setSession(result);
      setRemember(false);
      setDialog("remember");
    } catch (error) { setLoginError(messageOf(error)); }
    finally { setSubmitting(false); }
  };
  const chooseRemember = async (keep: boolean) => {
    if (submitting) return;
    setSubmitting(true);
    setLoginError("");
    try {
      const result = await request<Session>("/api/auth/remember", { method: "POST", body: JSON.stringify({ remember: keep }) });
      setSession(result);
      setAuthNotice("");
      resolveLogin(true);
    } catch (error) { setLoginError(messageOf(error)); }
    finally { setSubmitting(false); }
  };
  const logout = async () => {
    try {
      await request("/api/auth/logout", { method: "POST" });
      setSession({ authenticated: false });
      setAuthNotice("로그아웃했습니다.");
    } catch (error) { setAuthNotice(`로그아웃 처리: ${messageOf(error)} 연결 후 다시 시도해 주세요.`); }
  };
  return <AdminContext.Provider value={{ session, getSession: () => sessionRef.current, requestAdmin, request, refreshSession, expire, logout, authNotice }}>
    {children}
    {dialog === "login" && <Modal title="관리자 로그인" onClose={() => { if (!submitting) resolveLogin(false); }}>
      <p>파일 업로드·삭제·순서 변경에만 로그인이 필요합니다.</p>
      <form onSubmit={login}>
        <label className="files-field">관리자 비밀번호
          <input type="password" value={password} autoComplete="current-password" required disabled={submitting}
            onChange={event => setPassword(event.target.value)} />
        </label>
        {loginError && <p role="alert" className="files-error">{loginError}</p>}
        <div className="files-actions">
          <button type="button" className="files-button" disabled={submitting} onClick={() => resolveLogin(false)}>취소</button>
          <button type="submit" className="files-button primary" disabled={submitting || !password}>{submitting ? "확인 중…" : "로그인"}</button>
        </div>
      </form>
    </Modal>}
    {dialog === "remember" && <Modal title="이 기기에서 로그인을 유지할까요?" onClose={() => { if (!submitting) resolveLogin(false); }}>
      <p className="files-public-warning">프린트카페 등 공용 PC에서는 유지 안 함을 선택하세요.</p>
      <label className="files-radio">
        <input type="radio" name="remember-admin" checked={!remember} onChange={() => setRemember(false)} disabled={submitting} />
        <span><strong>유지 안 함 (공용 PC) · 기본</strong><small>5분 미사용 또는 로그인 후 15분이 지나면 만료됩니다. 영구 쿠키를 저장하지 않습니다.</small></span>
      </label>
      <label className="files-radio">
        <input type="radio" name="remember-admin" checked={remember} onChange={() => setRemember(true)} disabled={submitting} />
        <span><strong>유지 (개인 PC)</strong><small>최대 12시간 동안 유지합니다.</small></span>
      </label>
      <p className="files-muted">브라우저를 닫아도 로그인 상태가 복원될 수 있습니다. 사용을 마치면 로그아웃하세요.</p>
      {loginError && <p role="alert" className="files-error">{loginError}</p>}
      <div className="files-actions">
        <button className="files-button" disabled={submitting} onClick={() => resolveLogin(false)}>작업 취소</button>
        {loginError && <button className="files-button" disabled={submitting} onClick={() => { setLoginError(""); setDialog("login"); }}>다시 로그인</button>}
        <button className="files-button primary" disabled={submitting || !session.authenticated} onClick={() => void chooseRemember(remember)}>{submitting ? "설정 중…" : "선택 확인"}</button>
      </div>
    </Modal>}
  </AdminContext.Provider>;
}

export function AdminSessionStatus() {
  const { session, logout, authNotice } = useAdmin();
  const [working, setWorking] = useState(false);
  if (!session.authenticated) return null;
  return <aside className="admin-session-status" aria-label="관리자 로그인 상태">
    <span><strong>관리자 로그인 중</strong><small>{session.mode === "private" ? "개인 PC · 최대 12시간" : "공용 PC · 5분 미사용 / 최대 15분"}</small>
      {authNotice && <small role="alert">{authNotice}</small>}</span>
    <button className="files-button danger" disabled={working} onClick={async () => { setWorking(true); await logout(); setWorking(false); }}>{working ? "로그아웃 중…" : "로그아웃"}</button>
  </aside>;
}

const messageOf = (error: unknown) => error instanceof Error ? error.message : "요청을 처리하지 못했습니다.";
export function formatBytes(bytes: number) {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(1)} KB`;
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
}
function uploadPart(path: string, blob: Blob, token: string, signal: AbortSignal, onProgress: (bytes: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const finish = (error?: Error) => {
      signal.removeEventListener("abort", abort);
      if (error) reject(error); else resolve();
    };
    xhr.open("PUT", path);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.setRequestHeader("X-CSRF-Token", token);
    xhr.timeout = 180_000;
    xhr.upload.onprogress = event => onProgress(event.loaded);
    xhr.onerror = () => finish(new Error("네트워크 오류로 업로드하지 못했습니다."));
    xhr.ontimeout = () => finish(new Error("업로드 응답 시간이 초과되었습니다."));
    xhr.onabort = () => finish(new DOMException("업로드를 취소했습니다.", "AbortError"));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) finish();
      else {
        let message = `파일 전송에 실패했습니다 (${xhr.status}).`;
        try { message = JSON.parse(xhr.responseText).error || message; } catch { /* use status message */ }
        finish(new ApiError(message, xhr.status));
      }
    };
    if (signal.aborted) { finish(new DOMException("업로드를 취소했습니다.", "AbortError")); return; }
    signal.addEventListener("abort", abort, { once: true });
    xhr.send(blob);
  });
}

export default function FilesPage() {
  return <FilesProvider><FilesPageContent /><AdminSessionStatus /></FilesProvider>;
}

function FilesPageContent() {
  const { session, getSession, requestAdmin, request, refreshSession, expire, authNotice } = useAdmin();
  const [listing, setListing] = useState<SharedFileList>({ files: [], revision: 0 });
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const selectAll = useRef<HTMLInputElement>(null);
  const activeUpload = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const mutationLock = useRef(false);
  const uploadKey = useRef(0);
  const refresh = useCallback(async () => {
    const result = await request<SharedFileList>("/api/files");
    setListing(result);
    setSelected(previous => new Set([...previous].filter(id => result.files.some(file => file.id === id))));
  }, [request]);
  const refreshUsage = useCallback(async () => {
    if (!getSession().authenticated) return;
    const result = await request<Usage>("/api/admin/usage");
    setUsage(result);
  }, [getSession, request]);
  useEffect(() => {
    refresh().catch(error => setError(messageOf(error))).finally(() => setLoading(false));
  }, [refresh]);
  useEffect(() => {
    if (session.authenticated) {
      request<Usage>("/api/admin/usage").then(setUsage).catch(error => setError(messageOf(error)));
    } else { setUsage(null); activeUpload.current?.abort(); }
  }, [session.authenticated, request]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; activeUpload.current?.abort(); };
  }, []);
  useEffect(() => {
    if (selectAll.current) selectAll.current.indeterminate = selected.size > 0 && selected.size < listing.files.length;
  }, [selected, listing.files.length]);
  const beginMutation = async () => {
    if (mutationLock.current) return false;
    mutationLock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    if (!await requestAdmin() || !mounted.current) { mutationLock.current = false; setBusy(false); return false; }
    return true;
  };
  const endMutation = () => { mutationLock.current = false; setBusy(false); };

  const uploadFiles = async (incoming: File[]) => {
    if (!incoming.length || !await beginMutation()) return;
    const controller = new AbortController();
    activeUpload.current = controller;
    const items: UploadItem[] = incoming.map(file => ({ key: ++uploadKey.current, name: file.name, size: file.size, progress: 0, state: "waiting" }));
    setUploads(items);
    const update = (key: number, changes: Partial<UploadItem>) => setUploads(current => current.map(item => item.key === key ? { ...item, ...changes } : item));
    let completed = 0;
    try {
      for (let index = 0; index < incoming.length; index++) {
        const file = incoming[index];
        const item = items[index];
        if (controller.signal.aborted) { update(item.key, { state: "cancelled", message: "업로드를 취소했습니다." }); continue; }
        if (file.size > (usage?.maxFileBytes || 100_000_000)) {
          update(item.key, { state: "error", message: "개별 파일은 최대 100 MB까지 업로드할 수 있습니다." }); continue;
        }
        let reservation: string | null = null;
        update(item.key, { state: "uploading" });
        try {
          const upload = await request<{ id: string; chunkSize: number; partCount: number }>("/api/uploads", {
            method: "POST", body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "application/octet-stream" }), signal: controller.signal,
          });
          reservation = upload.id;
          for (let part = 1; part <= upload.partCount; part++) {
            const offset = (part - 1) * upload.chunkSize;
            const blob = file.slice(offset, Math.min(offset + upload.chunkSize, file.size));
            await uploadPart(`/api/uploads/${encodeURIComponent(upload.id)}/parts/${part}`, blob,
              getSession().csrfToken || "", controller.signal,
              bytes => update(item.key, { progress: Math.min(99, (offset + bytes) / Math.max(1, file.size) * 100) }));
            await refreshSession().catch(() => {});
          }
          await request(`/api/uploads/${encodeURIComponent(upload.id)}/complete`, { method: "POST", signal: controller.signal });
          reservation = null;
          completed++;
          update(item.key, { state: "done", progress: 100 });
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) { expire(); controller.abort(); }
          update(item.key, { state: controller.signal.aborted ? "cancelled" : "error", message: messageOf(error) });
        } finally {
          if (reservation) {
            await request(`/api/uploads/${encodeURIComponent(reservation)}`, { method: "DELETE" }).catch(() => {
              setError("취소한 업로드의 정리 요청을 완료하지 못했습니다. 서버가 만료된 임시 파일과 예약량을 자동 정리합니다.");
            });
          }
        }
        const updates = await Promise.allSettled([refresh(), refreshUsage()]);
        if (updates.some(result => result.status === "rejected")) setError("업로드 결과의 목록 또는 사용량을 갱신하지 못했습니다. 새로고침해 주세요.");
      }
      setNotice(`${completed}개 파일 업로드 완료. 파일별 처리 결과를 확인하세요.`);
    } finally { activeUpload.current = null; endMutation(); }
  };
  const deleteSelected = async () => {
    setDeleteDialog(false);
    if (!selected.size || !await beginMutation()) return;
    const ids = [...selected];
    let deleted = 0;
    try {
      for (let offset = 0; offset < ids.length; offset += 500) {
        const batch = ids.slice(offset, offset + 500);
        await request("/api/files/delete", { method: "POST", body: JSON.stringify({ ids: batch }) });
        deleted += batch.length;
        const confirmed = new Set(batch);
        setSelected(previous => new Set([...previous].filter(id => !confirmed.has(id))));
        setListing(previous => ({ ...previous, files: previous.files.filter(file => !confirmed.has(file.id)) }));
        setNotice(`${deleted} / ${ids.length}개 파일 삭제 중…`);
      }
      setNotice(`${deleted}개 파일을 삭제했습니다.`);
    } catch (error) {
      setNotice(deleted ? `${deleted}개 파일을 삭제한 뒤 중단되었습니다. 남은 선택 파일을 확인해 주세요.` : "");
      setError(messageOf(error));
    } finally {
      const updates = await Promise.allSettled([refresh(), refreshUsage()]);
      if (updates.some(result => result.status === "rejected")) setError(previous =>
        [previous, "목록 또는 사용량을 갱신하지 못했습니다. 새로고침해 주세요."].filter(Boolean).join(" "));
      endMutation();
    }
  };
  const moveFile = async (id: string, targetIndex: number) => {
    const index = listing.files.findIndex(file => file.id === id);
    if (index < 0 || index === targetIndex || targetIndex < 0 || targetIndex >= listing.files.length || !await beginMutation()) return;
    const files = [...listing.files];
    files.splice(targetIndex, 0, files.splice(index, 1)[0]);
    try {
      await request("/api/files/order", { method: "PUT", body: JSON.stringify({ id, beforeId: files[targetIndex + 1]?.id ?? null, revision: listing.revision }) });
      await refresh();
      setNotice("파일 순서를 저장했습니다.");
    } catch (error) {
      setError(error instanceof ApiError && error.status === 409 ? "다른 창에서 목록이 변경되었습니다. 최신 목록을 확인하고 다시 정렬해 주세요." : messageOf(error));
      await refresh().catch(() => {});
    } finally { endMutation(); }
  };
  const chooseFiles = (files: FileList | null) => {
    if (files) void uploadFiles(Array.from(files));
  };
  return <section className="files-page" aria-labelledby="files-heading">
    <header className="files-header"><div><p className="files-eyebrow">공유 자료</p><h1 id="files-heading">파일 보관함</h1>
      <p>파일명으로 다운로드할 수 있습니다. 업로드·삭제·순서 변경은 관리자만 할 수 있습니다.</p></div>
      {!session.authenticated && <button className="files-button" disabled={busy} onClick={() => void requestAdmin()}>관리자 로그인</button>}
    </header>
    {authNotice && <p className="files-notice" role="status">{authNotice}</p>}
    {error && <p className="files-error" role="alert">{error}</p>}
    {notice && <p className="files-notice" role="status">{notice}</p>}
    {usage && <div className="files-usage" aria-label="관리자 사용량">
      <div><strong>{formatBytes(usage.usedBytes)}</strong><span> / {formatBytes(usage.maxTotalBytes)} 사용</span>
        {usage.reservedBytes > 0 && <small>업로드 예약 {formatBytes(usage.reservedBytes)} 포함 시 {formatBytes(usage.usedBytes + usage.reservedBytes)}</small>}
        <progress max={usage.maxTotalBytes} value={usage.usedBytes + usage.reservedBytes} aria-label="저장 용량 사용률" /></div>
      <div><strong>{usage.remainingUploads}개</strong><span> 오늘 업로드 가능 / {usage.dailyLimit}개</span><small>한국시간 자정 기준 · 진행 중인 예약 포함</small></div>
    </div>}
    <div className={`files-dropzone${dropActive ? " active" : ""}`} onDragOver={event => {
      if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); if (!busy) setDropActive(true); }
    }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropActive(false); }} onDrop={event => {
      event.preventDefault(); setDropActive(false); if (!busy) chooseFiles(event.dataTransfer.files);
    }}>
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5" /></svg>
      <div><strong>파일을 여기에 끌어 놓으세요</strong><p>여러 파일 선택 가능 · 파일당 최대 100 MB</p></div>
      <input ref={fileInput} className="files-hidden-input" type="file" multiple aria-label="업로드할 파일 선택" tabIndex={-1} onChange={event => { chooseFiles(event.target.files); event.currentTarget.value = ""; }} />
      <button className="files-button primary" disabled={busy} onClick={() => fileInput.current?.click()}>파일 선택</button>
    </div>
    {uploads.length > 0 && <section className="files-upload-list" aria-label="업로드 진행 상태">
      <div className="files-toolbar"><strong>업로드 진행 상태</strong>{activeUpload.current && <button className="files-button" onClick={() => activeUpload.current?.abort()}>업로드 취소</button>}</div>
      <ul>{uploads.map(item => <li key={item.key}>
        <div className="files-upload-meta"><span>{item.name}</span><small>{formatBytes(item.size)} · {item.state === "done" ? "완료" : item.state === "error" ? "실패" : item.state === "cancelled" ? "취소" : item.state === "waiting" ? "대기" : `${Math.floor(item.progress)}%`}</small></div>
        {item.state === "uploading" && <progress max="100" value={item.progress} aria-label={`${item.name} 업로드 진행률`} />}
        {item.message && <p className="files-error">{item.message}</p>}
      </li>)}</ul>
    </section>}
    <div className="files-toolbar"><span>총 <strong>{listing.files.length}</strong>개 파일 {selected.size > 0 && `· ${selected.size}개 선택`}</span>
      <div className="files-actions"><button className="files-button" disabled={busy || loading} onClick={() => { setError(""); setLoading(true); Promise.all([refresh(), refreshUsage()]).catch(error => setError(messageOf(error))).finally(() => setLoading(false)); }}>새로고침</button>
        <button className="files-button danger" disabled={!selected.size || busy} onClick={() => setDeleteDialog(true)}>선택 삭제</button></div>
    </div>
    <div className="files-table-wrap" aria-busy={loading || busy}><table className="files-table">
      <thead><tr><th><input ref={selectAll} type="checkbox" aria-label="모든 파일 선택" checked={listing.files.length > 0 && selected.size === listing.files.length} disabled={!listing.files.length || busy} onChange={event => setSelected(event.target.checked ? new Set(listing.files.map(file => file.id)) : new Set())} /></th>
        <th>순서</th><th>연번</th><th>파일명</th><th>크기</th><th>업로드 일시 (한국)</th></tr></thead>
      <tbody>{listing.files.map((file, index) => <tr key={file.id} className={dragging === file.id ? "dragging" : ""} onDragOver={event => { if (dragging && !busy) event.preventDefault(); }} onDrop={event => {
        if (dragging && !busy) { event.preventDefault(); void moveFile(dragging, index); setDragging(null); }
      }}>
        <td><input type="checkbox" aria-label={`${file.name} 선택`} checked={selected.has(file.id)} disabled={busy} onChange={event => setSelected(previous => { const next = new Set(previous); if (event.target.checked) next.add(file.id); else next.delete(file.id); return next; })} /></td>
        <td><div className="files-sort-controls"><button type="button" className="files-drag-handle" draggable={!busy} disabled={busy} aria-label={`${file.name} 드래그하여 순서 변경`} title="끌어서 순서 변경" onDragStart={event => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", file.id); setDragging(file.id); }} onDragEnd={() => setDragging(null)}>⠿</button>
          <div><button className="files-sort-button" disabled={busy || index === 0} aria-label={`${file.name} 위로 이동`} onClick={() => void moveFile(file.id, index - 1)}>↑</button>
            <button className="files-sort-button" disabled={busy || index === listing.files.length - 1} aria-label={`${file.name} 아래로 이동`} onClick={() => void moveFile(file.id, index + 1)}>↓</button></div></div></td>
        <td className="files-muted">{index + 1}</td><td className="files-name"><a href={`/api/files/${encodeURIComponent(file.id)}/download`} download={file.name}>{file.name}</a></td>
        <td className="files-nowrap">{formatBytes(file.size)}</td><td className="files-date">{uploadedDateFormat.format(new Date(file.uploadedAt))}</td>
      </tr>)}
      {!listing.files.length && <tr><td colSpan={6} className="files-empty">{loading ? "파일 목록을 불러오는 중…" : error ? "목록을 불러오지 못했습니다. 새로고침해 주세요." : "아직 등록된 파일이 없습니다."}</td></tr>}</tbody>
    </table></div>
    <p className="files-muted files-footer-note">파일은 순서 손잡이(⠿)를 끌거나 ↑ ↓ 버튼으로 정렬할 수 있습니다. 변경된 순서는 모든 기기에 적용됩니다.</p>
    {deleteDialog && <Modal title="선택한 파일을 삭제할까요?" onClose={() => setDeleteDialog(false)}>
      <p>{selected.size}개 파일을 영구 삭제합니다. 삭제한 파일은 되돌릴 수 없습니다.</p>
      <div className="files-actions"><button className="files-button" onClick={() => setDeleteDialog(false)}>취소</button><button className="files-button danger" onClick={() => void deleteSelected()}>삭제</button></div>
    </Modal>}
  </section>;
}
