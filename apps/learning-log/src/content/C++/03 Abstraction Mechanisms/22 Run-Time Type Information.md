---
title: 22 Run-Time Type Information
date: 2026-08-18
---

## 22.2 Class Hierarchy Navigation

We will refer to the combination of GUI library and operating system facilities that
control the screen as the system. Objects passed back and forth between the system and the application are commonly referred to as widgets or controls. This is how many user interfaces work.

 In particular, a well-designed interface hides inessential details.

 The use of type information at run time is conventionally referred to as ‘‘run-time type information,’’ often abbreviated to RTTI.

Casting from a base class to a derived class is often called a downcast because of the convention
of drawing inheritance trees growing from the root down. Similarly, a cast from a derived class to a
base is called an upcast. A cast that goes from a base to a sibling class, like the cast from BBwindow to Ival_box, is called a crosscast.

### 22.2.1 dynamic_cast

dynamic_cast<T∗>(p) looks at the object pointed
to by p (if any). If that object is of class T or has a unique base class of type T, then dynamic_cast
returns a pointer of type T∗ to that object; otherwise, nullptr is returned.

A dynamic_cast requires a pointer or a reference to a polymorphic type in order to do a downcast or a crosscast.

A dynamic_cast to void∗ can be used to determine the address of the beginning of an object of polymorphic type. 

There is no dynamic_cast from void∗ (because there would be no way of knowing
where to find the vptr; §22.2.3).

### 22.2.1.1 dynamic_cast to Reference

The result of a dynamic_cast for a reference is implicitly tested by the implementation of dynamic_cast itself. If the operand of a dynamic_cast to a reference isn’t of the
expected type, a bad_cast exception is thrown.

### 22.2.3 static_cast and dynamic_cast

Where possible, use the safer dynamic_cast.

## 22.3 Double Dispatch and Visitors

Classical object-oriented programming is based on selecting a virtual function based on the
dynamic type (the type of the most derived class) of an object given only a pointer or a reference to
an interface (a base class).

## 22.5 Type Identification

typeid() returns a reference to a standard-library type called type_info defined in <typeinfo>.

## 22.6 Uses and Misuses of RTTI

Use virtual functions (§3.2.3, §20.3.2) rather than RTTI to handle most cases when
run-time discrimination based on type is needed.