---
title: 08 Structures, Unions, and Enumerations
date: 2026-06-30
---

## 8.1 Introduction

- A `struct` (a structure) is a sequence of elements (called members) of arbitrary types.
- A `union` is a `struct` that holds the value of just one of its elements at any one time.
- An `enum` (an enumeration) is a type with a set of named constants (called enumerators).
- `enum class` (a scoped enumeration) is an `enum` where the enumerators are within the scope of the enumeration and no implicit conversions to other types are provided.

The notion of a `struct` as described here is a simple form of a `class`.

## 8.2 Structures

A `struct` is an aggregate of elements of arbitrary types. 

When `p` is a pointer, `p->m` is equivalent to `(*p).m`.

Objects of structure types can be assigned, passed as function arguments, and returned as the result from a function.

Other plausible operations, such as comparison (`==` and `!=`), are not available by default. However, the user can define such operators.

### 8.2.1 struct Layout

An object of a `struct` holds its members in the order they are declared.

Many machines require objects of certain types to be allocated on architecture dependent boundaries or handle such objects much more efficiently if they are.

It is usually best to order members for readability and sort them by size only if there is a demonstrated need to optimize.

Use of multiple access specifiers (i.e., `public`, `private`, or `protected`) can affect layout.

### 8.2.2 struct Names

The name of a type becomes available for use immediately after it has been encountered and not just after the complete declaration has been seen.

However, it is not possible to declare new objects of a struct until its complete declaration has been seen.

To allow two (or more) `struct`s to refer to each other, we can declare a name to be the name of a `struct`.

For reasons that reach into the prehistory of C, it is possible to declare a `struct` and a non-`struct` with the same name in the same scope.

In that case, the plain name (`stat`) is the name of the non-`struct`, and the `struct` must be referred to with the prefix `struct`. Similarly, the keywords `class`, `union`, and `enum` can be used as prefixes for disambiguation. However, it is best not to overload names to make such explicit disambiguation necessary.

### 8.2.3 Structures and Classes

A `struct` is simply a `class` where the members are `public` by default. So, a `struct` can have member functions. In particular, a `struct` can have constructors.