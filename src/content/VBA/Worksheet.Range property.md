---
title: Worksheet.Range property
date: 2026-09-17
---

When applied to a `Range` object, the property is relative to the `Range` object. For example, if the selection is cell C3, `Selection.Range("B1")` returns cell D3 because it is relative to the `Range` object returned by the `Selection` property. On the other hand, the code `ActiveSheet.Range("B1")` always returns cell B1.
