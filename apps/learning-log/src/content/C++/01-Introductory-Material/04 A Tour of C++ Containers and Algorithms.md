---
title: 04 A Tour of C++: Containers and Algorithms
date: 2026-06-21
---

## 4.1. Libraries

The specification of the standard library is almost two thirds of the ISO C++ standard. Explore it, and prefer it to home-made alternatives. Much thought has gone into its design, more still into its implementations, and much effort will go into its maintenance and extension.

### 4.1.1 Standard-Library Overview

Essentially, the C++ standard library provides the most common fundamental data structures together with the fundamental algorithms used on them.

### 4.1.2 The Standard-Library Headers and Namespace

The standard library is defined in a namespace called `std`.

## 4.2 Strings

"Addition" of strings means concatenation.

## 4.3 Stream I/O

### 4.3.1 Output

The operator `<<` ("put to") is used as an output operator on objects of type `ostream`.

The result of an output expression can itself be used for further output.

A character is output as a character rather than as a numerical value.

### 4.3.2 Input

The type of the right-hand operand of `>>` determines what input is accepted and what is the target of the input operation.

## 4.4 Containers

A class with the main purpose of holding objects is commonly called a container. Providing suitable containers for a given task and supporting them with useful fundamental operations are important steps in the construction of any program.

### 4.4.1 vector

An explicit size is enclosed in ordinary parentheses, for example, `(23)`, and by default the elements are initialized to the element type's default value. If you don't want the default value, you can specify one as a second argument.

### 4.4.1.1 Elements

When you insert a new element, its value is copied into the container.

### 4.4.2 list

Every standard-library container provides the functions `begin()` and `end()`

When `p` refers to a class with a member `m`, then `p->m` is equivalent to `(*p).m`.

### 4.4.3 map

When indexed by a value of its first type (called the key), a `map` returns the corresponding value of the second type (called the value or the mapped type).

### 4.4.5 Container Overview

The standard containers and their basic operations are designed to be similar from a notational point of view. Furthermore, the meanings of the operations are equivalent for the various containers.

Please note that a `vector` is usually more efficient than a `list` for short sequences of small elements (even for `insert()` and `erase()`).


