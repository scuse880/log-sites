---
title: 22 Run-Time Type Information
date: 2026-08-18
---

## 22.2 Class Hierarchy Navigation

Casting from a base class to a derived class is often called a downcast.

### 22.2.1 dynamic_cast

`dynamic_cast<T*>(p)` looks at the object pointed to by `p` (if any). If that object is of class `T` or has a unique base class of type `T`, then `dynamic_cast` returns a pointer of type `T*` to that object; otherwise, `nullptr` is returned.

A `dynamic_cast` requires a pointer or a reference to a polymorphic type in order to do a downcast or a crosscast.

A `dynamic_cast` to `void*` can be used to determine the address of the beginning of an object of polymorphic type.

There is no `dynamic_cast` from `void*` (because there would be no way of knowing where to find the `vptr`).

### 22.2.1.1 dynamic_cast to Reference

The result of a `dynamic_cast` for a reference is implicitly tested by the implementation of `dynamic_cast` itself. If the operand of a `dynamic_cast` to a reference isn't of the expected type, a `bad_cast` exception is thrown.

### 22.2.3 static_cast and dynamic_cast

Where possible, use the safer `dynamic_cast`.

## 22.3 Double Dispatch and Visitors

Classical object-oriented programming is based on selecting a virtual function based on the dynamic type (the type of the most derived class) of an object given only a pointer or a reference to an interface (a base class).

## 22.5 Type Identification

`typeid()` returns a reference to a standard-library type called `type_info` defined in `<typeinfo>`.

## 22.6 Uses and Misuses of RTTI

Use virtual functions rather than RTTI to handle most cases when run-time discrimination based on type is needed.