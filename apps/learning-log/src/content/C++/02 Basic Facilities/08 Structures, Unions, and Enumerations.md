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

### 8.2.4 Structures and Arrays

Placing a built-in array in a `struct` allows us to treat that array as an object: we can copy the `struct` containing it in initialization (including argument passing and function return) and assignment.

This `array` is a template to allow arbitrary numbers of elements of arbitrary types.

### 8.2.5 Type Equivalence

Two `structs` are different types even when they have the same members.

A `struct` is also a different type from a type used as a member.

### 8.2.6 Plain Old Data

A POD ("Plain Old Data") type is a type whose objects can be manipulated as "just data" without worrying about complications of class layouts or user-defined semantics for construction, copy, and move.

Formally, a POD object must be of
- a standard layout type, and
- a trivially copyable type,
- a type with a trivial default constructor.

Informally, a default constructor is trivial if it does not need to do any work (use `=default` if you need to define one).

Basically, a standard layout type is one that has a layout with an obvious equivalent in C.

A type is trivially copyable unless it has a nontrivial copy operation, move operation, or destructor. Informally, a copy operation is trivial if it can be implemented as a bitwise copy. So, what makes a copy, move, or destructor nontrivial?
- It is user-defined.
- Its class has a `virtual` function.
- Its class has a `virtual` base.
- Its class has a base or a member that is not trivial.

### 8.2.7 Fields

A member is defined to be a field by specifying the number of bits it is to occupy. Unnamed fields are allowed. They do not affect the meaning of the named fields, but they can be used to make the layout better in some machine-dependent way.

Surprisingly, using fields to pack several variables into a single byte does not necessarily save space. It saves data space, but the size of the code needed to manipulate these variables increases on most machines. Programs have been known to shrink significantly when binary variables were converted from bit-fields to characters! Furthermore, it is typically much faster to access a `char` or an int than to access a field. Fields are simply a convenient shorthand for using bitwise logical operators to extract information from and insert information into part of a word.

A bit-field with size zero has a special meaning: Start in a new "allocation unit." The exact meaning is implementation defined, but usually it means that the following field starts at a word boundary.

## 8.3 Unions

A `union` is a `struct` in which all members are allocated at the same address so that the `union` occupies only as much space as its largest member. Naturally, a `union` can hold a value for only one member at a time. 

The language doesn’t keep track of which kind of value is held by a `union`, so the programmer must do that.

Use of `union`s can be essential for compactness of data and through that for performance. However, most programs don’t improve much from the use of `union`s and `union`s are rather error-prone. Consequently, I consider `union`s an overused feature; avoid them when you can.

### 8.3.1 Unions and Classes

It’s illegal to write one member and then read another, but people do that nevertheless (usually by mistake).

It is possible to specify an in-class initializer for at most one member. If so, this initializer will be used for default initialization.

### 8.3.2 Anonymous unions

Note that the `union` in the declaration of `Entry2` is not named. That makes it an anonymous union. An anonymous `union` is an object, not a type, and its members can be accessed without mentioning an object name. That means that we can use members of an anonymous `union` exactly as we use other members of a class – as long as we remember that `union` members really can be used only one at a time.