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

### 4.2 Strings

"Addition" of strings means concatenation.

### 4.3 Stream I/O

### 4.3.1 Output

The operator `<<` ("put to") is used as an output operator on objects of type `ostream`.

The result of an output expression can itself be used for further output.

A character is output as a character rather than as a numerical value.

### 4.3.2 Input

The type of the right-hand operand of `>>` determines what input is accepted and what is the target of the input operation.