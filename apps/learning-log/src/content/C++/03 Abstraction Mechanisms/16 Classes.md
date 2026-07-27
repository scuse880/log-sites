---
title: 16 Classes
date: 2026-07-27
---

## 16.2 Class Basics

### 16.2.1 Member Functions

A class member function "knows" for which object it was invoked.

### 16.2.2 Default Copying

By default, objects can be copied.

By default, the copy of a class object is a copy of each member.

### 16.2.5 Constructors

A constructor is recognized by having the same name as the class itself.

### 16.2.6 Explicit Constructors

By default, a constructor invoked by a single argument acts as an implicit conversion from its argument type to its type.

We can specify that a constructor is not used as an implicit conversion. A constructor declared with the keyword `explicit` can only be used for initialization and explicit conversions. By default, declare a constructor that can be called with a single argument `explicit`.

Leaving out the `=` makes the initialization explicit. Explicit initialization is known as direct initialization. The distinction between direct and copy initialization is maintained for list initialization.