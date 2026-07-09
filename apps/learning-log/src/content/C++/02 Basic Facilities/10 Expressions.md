---
title: 10 Expressions
date: 2026-07-06
---

## 10.2 A Desk Calculator

### 10.2.1 The Parser

C++ provides assignment operators for the binary operators. For a binary operator `@` applied to operands of built-in types, an expression `x@=y` means `x=x@y`, except that `x` is evaluated once only.

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

### 10.3.1 Results

The result types of arithmetic operators are determined by a set of rules known as "the usual arithmetic conversions". The overall aim is to produce a result of the "largest" operand type.

Operands that are smaller than an `int` such as `bool` and `char` are converted to `int` before the operator is applied.

The relational operators, `==`, `<=`, etc., produce Boolean results. The meaning and result type of user-defined operators are determined by their declarations.

Where logically feasible, the result of an operator that takes an `lvalue` operand is an `lvalue` denoting that `lvalue` operand.

### 10.3.2 Order of Evaluation

The order of evaluation of subexpressions within an expression is undefined.

The operators `,` (comma), `&&` (logical and), and `||` (logical or) guarantee that their left-hand operand is evaluated before their right-hand operand.

Note that the sequencing operator `,` (comma) is logically different from the comma used to separate arguments in a function call.

### 10.3.4 Temporary Objects

Often, the compiler must introduce an object to hold an intermediate result of an expression. For example, for `v=x+y*z` the result of `y*z` has to be put somewhere before it is added to `x`. For built-in types, this is all handled so that a temporary object, often referred to as just a temporary, is invisible to the user. However, for a user-defined type that holds a resource knowing the lifetime of a temporary can be important. Unless bound to a reference or used to initialize a named object, a temporary object is destroyed at the end of the full expression in which it was created.

A temporary can be used as an initializer for a `const` reference or a named object.

Remember that returning a reference to a local variable is an error and that a temporary object cannot be bound to a non-`const` `lvalue` reference.

## 10.4 Constant Expressions

Basically, `constexpr`'s role is to enable and ensure compile-time evaluation, whereas `const`'s primary role is to specify immutability in interfaces.

A constant expression is an expression that a compiler can evaluate. It cannot use values that are not known at compile time and it cannot have side effects. Ultimately, a constant expression must start out with an integral value, a floating-point value, or an enumerator, and we can combine those using operators and `constexpr` functions that in turn produce values. In addition, some addresses can be used in some forms of constant expressions.

If the initializer for a `constexpr` can't be evaluated at compile time, the compiler will give an error.

The condition of a `?:` is evaluated and then the selected alternative is evaluated. The alternative not selected is not evaluated and might even not be a constant expression. This feature is primarily useful in `constexpr` functions that are sometimes used as constant expressions and sometimes not.

### 10.4.1 Symbolic Constants

The most important single use of constants (`constexpr` or `const` values) is simply to provide symbolic names for values. Symbolic names should be used systematically to avoid "magic numbers" in code.

### 10.4.2 consts in Constant Expressions

A `const` differs from a `constexpr` in that it can be initialized by something that is not a constant expression; in that case, the `const` cannot be used as a constant expression.

### 10.4.3 Literal Types

A class with a `constexpr` constructor is called a literal type.

To be simple enough to be `constexpr`, a constructor must have an empty body and all members must be initialized by potentially constant expressions.

We can define `constexpr` functions to take arguments of literal types.

### 10.4.4 Reference Arguments

When working with `constexpr`, the key thing to remember is that `constexpr` is all about values.

### 10.4.5 Address Constant Expressions

The address of a named variable is a constant.

## 10.5 Implicit Type Conversion

A conversion is value-preserving if you can convert a value and then convert the result back to its original type and get the original value. If a conversion cannot do that, it is a narrowing conversion.

### 10.5.1 Promotions

The implicit conversions that preserve values are commonly referred to as promotions. Before an arithmetic operation is performed, integral promotion is used to create `int`s out of shorter integer types.

### 10.5.2 Conversions

### 10.5.2.3 Pointer and Reference Conversions

Any pointer to an object type can be implicitly converted to a `void*`. A pointer or reference to a derived class can be implicitly converted to a pointer or reference to an accessible and unambiguous base. Note that a pointer to function or a pointer to member cannot be implicitly converted to a `void*`.

A `T*` can be implicitly converted to a `const T*`. Similarly, a `T&` can be implicitly converted to a `const T&`.

### 10.5.2.5 Boolean Conversions

Pointer, integral, and floating-point values can be implicitly converted to `bool`. A nonzero value converts to `true`; a zero value converts to `false`.

### 10.5.2.6 Floating-Integral Conversions

When a floating-point value is converted to an integer value, the fractional part is discarded. The behavior is undefined if the truncated value cannot be represented in the destination type.
