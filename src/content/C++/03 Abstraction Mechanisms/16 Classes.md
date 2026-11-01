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

### 16.2.8 In-Class Function Definitions

A member function defined within the class definition – rather than simply declared there – is taken to be an `inline` member function.

### 16.2.9 Mutability

### 16.2.9.1 Constant Member Functions

The `const` after the empty argument list in the function declarations indicates that these functions do not modify the state of a `Date`.

When a `const` member function is defined outside its class, the `const` suffix is required.

### 16.2.9.3 mutable

We can define a member of a class to be `mutable`, meaning that it can be modified even in a `const` object.

### 16.2.10 Self-Reference

In a non-static member function, the keyword `this` is a pointer to the object for which the function was invoked. In a non-const member function of class `X`, the type of `this` is `X*`. However, `this` is considered an rvalue, so it is not possible to take the address of `this` or to assign to `this`. In a const member function of class `X`, the type of `this` is `const X*` to prevent modification of the object itself.

Most uses of `this` are implicit. In particular, every reference to a non-static member from within a class relies on an implicit use of `this` to get the member of the appropriate object.

### 16.2.11 Member Access

A member of a class `X` can be accessed by applying the `.` (dot) operator to an object of class `X` or by applying the `->` (arrow) operator to a pointer to an object of class `X`.

### 16.2.12 static Members

A variable that is part of a class, yet is not part of an object of that class, is called a static member. There is exactly one copy of a static member instead of one copy per object.

The keyword `static` is not repeated in the definition of a static member.

### 16.2.13 Member Types

A member class, often called a nested class, can refer to types and static members of its enclosing class. It can only refer to non-static members when it is given an object of the enclosing class to refer to.

A nested class has access to members of its enclosing class, even to private members, just as a member function has.

A class does not have any special access rights to the members of its nested class.

## 16.3 Concrete Classes

A class is called concrete, or a concrete class, if its representation is part of its definition.

### 16.3.2 Helper Functions

How are such functions "associated" with class `Date`? In early C++, as in C, their declarations were simply placed in the same file as the declaration of class `Date`. Users who needed `Date`s would make them all available by including the file that defined the interface.

In addition, or alternatively, we can make the association explicit by enclosing the class and its helper functions in a namespace.

### 16.3.3 Overloaded Operators

These operators are defined in `Chrono` together with `Date` to avoid overload problems and to benefit from argument-dependent lookup.

For `Date`, these operators can be seen as mere conveniences. However, for many types – such as complex numbers, vectors, and function-like objects – the use of conventional operators is so firmly entrenched in people's minds that their definition is almost mandatory.

### 16.3.4 The Significance of Concrete Classes

With a reasonably good compiler, a concrete class such as `Date` incurs no hidden overhead in time or space.

Lack of concrete types can lead to obscure programs and time wasted when each programmer writes code to directly manipulate "simple and frequently used" data structures represented as simple aggregates of built-in types.
