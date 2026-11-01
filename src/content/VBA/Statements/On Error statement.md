---
title: On Error statement
date: 2026-09-20
---

Enables an error-handling routine and specifies the location of the routine within a procedure; can also be used to disable an error-handling routine.

If an error occurs while an error handler is active (between the occurrence of the error and a `Resume`, `Exit Sub`, `Exit Function`, or `Exit Property` statement), the current procedure's error handler can't handle the error. Control returns to the calling procedure.

An error-handling routine is not a `Sub` procedure or `Function` procedure. It's a section of code marked by a line label or line number.

Without an `On Error GoTo 0` statement, an error handler is automatically disabled when a procedure is exited.

To prevent error-handling code from running when no error has occurred, place an `Exit Sub`, `Exit Function`, or `Exit Property` statement immediately before the error-handling routine.
