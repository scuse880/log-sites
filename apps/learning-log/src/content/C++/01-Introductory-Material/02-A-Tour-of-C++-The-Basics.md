---
title: 02 A tour of C++: The Basics
date: 2026-06-09
---

## 2.2 The Basics

`C++` is a statically typed language

### 2.2.2 Types, Variables, and Arithmetic

every name and every expression has a type

a type defines a set of possible values and a set of operations

In assignments and in arithmetic operations, `C++` performs all meaningful conversions between the basic types so that
they can be mixed freely

### 2.2.3 Constants

`constexpr`: meaning roughly "to be evaluated at compile time"

For a function to be usable in a `constant expression`, it must be defined `constexpr`

### 2.2.5 Pointers, Arrays, and Loops

In a declaration, the unary suffix `&` means ‘reference to.’ A reference is similar to a pointer, except that you don’t need to use a prefix `∗` to access the value referred to by the reference. Also, a reference cannot be made to refer to a different object after its initialization.

using `nullptr` eliminates potential confusion between integers(such as `0` or `NULL`) and pointers(such as `nullptr`)

## 2.3 User-Defined Types

The `C++` abstraction mechanisms are primarily designed to let programmers design and implement their own types, with suitable representations and operations.

### 2.3.2 Classes

A "function" with the same name as its class is called a `constructor`.

## 2.4 Modularity

At the language level, `C++` represents interfaces by declarations.

### 2.4.3 Error Handling

The majority of `C++` constructs are dedicated to the design and implementation of elegant and efficient abstractions.

### 2.4.3.1 Exceptions

The `out_of_range` type is defined in the standard library (in `<stdexcept>`) and is in fact used by some standard-library container access functions.

### 2.4.3.2 Invariants

Such a statement of what is assumed to be true for a class is called a class invariant, or simply an invariant.

To throw (rethrow) the exception caught in an exception handler, we simply write `throw;`

### 2.4.3.3 Static Assertions

The `static_assert` mechanism can be used for anything that can be expressed in terms of constant expressions.