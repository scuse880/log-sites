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

### 10.2.3 Low-Level Input

Constructing programs so that improvements can be implemented through local modifications only is an important design aim.

### 10.2.7 Command-Line Arguments

The list of arguments is zero-terminated; that is, `argv[argc]==0`.

### 10.2.8 A Note on Style

The standard library and other libraries are meant to be used. Often, a library has received more care in its design and implementation than a programmer could afford for a handcrafted piece of code to be used in just one program.

## 10.3 Operator Summary

Unary operators and assignment operators are right-associative; all others are left-associative. For example, `a=b=c` means `a=(b=c)` whereas `a+b+c` means `(a+b)+c`.