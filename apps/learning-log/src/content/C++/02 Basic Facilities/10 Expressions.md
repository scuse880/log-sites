---
title: 10 Expressions
date: 2026-07-06
---

## 10.2 A Desk Calculator

### 10.2.1 The Parser

C++ provides assignment operators for the binary operators.

For a binary operator `@` applied to operands of built-in types, an expression `x@=y` means `x=x@y`, except that `x` is evaluated once only.

### 10.2.2 Input

The `Token_stream` implements the convention that it owns and eventually deletes an `istream` passed as a pointer, but not an `istream` passed as a reference.

By default, operator `>>` skips whitespace (that is, spaces, tabs, newlines, etc.) and leaves the value of `ch` unchanged if the input operation failed.