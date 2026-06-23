---
title: 06 Types and Declarations
date: 2026-06-23
---

## 6.1 The ISO C++ Standard

Many important things are deemed *implementation-defined* by the standard. This means that each implementation must provide a specific, well-defined behavior for a construct and that behavior must be documented.

Other behaviors are *unspecified*; that is, a range of possible behaviors are acceptable, but the implementer is not obliged to specify which actually occur.

A construct is deemed *undefined* by the standard if no reasonable behavior is required by an implementation.

### 6.1.1 Implementation

A hosted implementation includes all the standard-library facilities as described in the standard and in this book. A freestanding implementation may provide fewer standard-library facilities, as long as the following are provided: ...

### 6.1.2 The Basic Source Character Set

A programming environment can map the extended character set into the basic source character set.

## 6.2 Types

Every name (identifier) in a C++ program has a type associated with it. This type determines what operations can be applied to the name (that is, to the entity referred to by the name) and how such operations are interpreted.

### 6.2.1 Fundamental Types

The Boolean, character, and integer types are collectively called *integral types*. The integral and floating-point types are collectively called *arithmetic types*. Enumerations and classes are called *user-defined types* because they must be defined by users rather than being available for use without previous declaration, the way fundamental types are. In contrast, fundamental types, pointers, and references are collectively referred to as *built-in types*. The standard library provides many user-defined types.

For most applications, we could use `bool` for logical values, `char` for characters, `int` for integer values, and `double` for floating-point values. The remaining fundamental types are variations for optimizations, special needs, and compatibility that are best ignored until such needs arise.