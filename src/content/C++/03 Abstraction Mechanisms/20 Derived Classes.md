---
title: 20 Derived Classes
date: 2026-08-08
---

## 20.2 Derived Classes

The Manager is derived from Employee, and conversely, Employee is a base class for Manager. The class Manager has the members of class Employee (`first_name`, `department`, etc.) in addition to its own members (`group`, `level`, etc.).

A derived class is often said to inherit properties from its base, so the relationship is also called inheritance.

No memory overhead is implied by deriving a class. The space required is just the space required by the members.

In general, if a class `Derived` has a public base class `Base`, then a `Derived*` can be assigned to a variable of type `Base*` without the use of explicit type conversion. The opposite conversion, from `Base*` to `Derived*`, must be explicit.

Using a class as a base is equivalent to defining an (unnamed) object of that class. Consequently, a class must be defined in order to be used as a base.

### 20.2.1 Member Functions

A member of a derived class can use the public – and protected – members of a base class as if they were declared in the derived class itself. However, a derived class cannot access private members of a base class.

## 20.3 Class Hierarchies

### 20.3.1 Type Fields

It has a fundamental weakness in that it depends on the programmer manipulating types in a way that cannot be checked by the compiler. This problem is usually made worse because functions such as `print_employee()` are often organized to take advantage of the commonality of the classes involved. Furthermore, any addition of a new kind of Employee involves a change to all the key functions in a system – the ones containing the tests on the type field.

### 20.3.2 Virtual Functions

A virtual member function is sometimes called a method.

A virtual function must be defined for the class in which it is first declared (unless it is declared to be a pure virtual function).

A virtual function can be used even if no class is derived from its class, and a derived class that does not need its own version of a virtual function need not provide one.

A function from a derived class with the same name and the same set of argument types as a virtual function in a base is said to override the base class version of the virtual function.

Getting "the right" behavior from Employee's functions independently of exactly what kind of Employee is actually used is called polymorphism. A type with virtual functions is called a polymorphic type or (more precisely) a run-time polymorphic type. To get runtime polymorphic behavior in C++, the member functions called must be virtual and objects must be manipulated through pointers or references.

By default, a function that overrides a virtual function itself becomes virtual. We can, but do not have to, repeat `virtual` in a derived class. I don't recommend repeating `virtual`.

Each class with virtual functions has its own vtbl identifying its virtual functions.

Its space overhead is one pointer in each object of a class with virtual functions plus one vtbl for each such class.

### 20.3.4 Override Control

For larger hierarchies more specific controls are useful:

* `virtual`: The function may be overridden.
* `=0`: The function must be virtual and must be overridden.
* `override`: The function is meant to override a virtual function in a base class.
* `final`: The function is not meant to be overridden.

### 20.3.4.1 override

In a large or complicated class hierarchy with many virtual functions, it is best to use `virtual` only to introduce a new virtual function and to use `override` on all functions intended as overriders.

The `override` specifier comes last in a declaration, after all other parts.

An `override` specifier is not part of the type of a function and cannot be repeated in an out-of-class definition.

Curiously, `override` is not a keyword; it is what is called a contextual keyword.

### 20.3.4.2 final

After using `final` for a member function, it can no longer be overridden and an attempt to do so is an error.

We can make every virtual member function of a class final; just add `final` after the class name. For good and bad, adding `final` to the class not only prevents overriding, it also prevents further derivation from a class.

A `final` specifier is not part of the type of a function and cannot be repeated in an out-of-class definition.

Like `override`, `final` is a contextual keyword.

### 20.3.5 using Base Members

Functions do not overload across scopes.

We cannot use using-directives to bring all members of a base class into a derived class.

### 20.3.5.1 Inheriting Constructors

```cpp
template<class T>
struct Vector : std::vector<T> {
    using vector<T>::vector; // inherit constructors
    T& operator[](size_type i) { check(i); return this->elem(i); }
    const T& operator[](size_type i) const { check(i); return this->elem(i); }
    void check(size_type i) { if (this->size()<i) throw Bad_index(i); }
};

Vector<int> v { 1, 2, 3, 5, 8 }; // OK: use initializer-list constructor from std::vector
```

This use of `using` is exactly equivalent to its use for ordinary functions.

### 20.3.6 Return Type Relaxation

There is a relaxation of the rule that the type of an overriding function must be the same as the type of the virtual function it overrides. That is, if the original return type was `B*`, then the return type of the overriding function may be `D*`, provided `B` is a public base of `D`. Similarly, a return type of `B&` may be relaxed to `D&`. This is sometimes called the covariant return rule.

## 20.4 Abstract Classes

A class with one or more pure virtual functions is an abstract class, and no objects of that abstract class can be created:

```cpp
Shape s; // error: variable of abstract class Shape
```

A pure virtual function that is not defined in a derived class remains a pure virtual function, so the derived class is also an abstract class. This allows us to build implementations in stages:

```cpp
class Polygon : public Shape { // abstract class
public:
    bool is_closed() const override { return true; }
    // ... draw and rotate not overridden ...
};

Polygon b {p1,p2,p3,p4}; // error: declaration of object of abstract class Polygon
```

Polygon is still abstract because we did not override `draw()` and `rotate()`.

## 20.5 Access Control

A member of a class can be private, protected, or public.

The access control is applied uniformly to names.

### 20.5.1.1 Use of protected Members

Members declared protected are far more open to abuse than members declared private. In particular, declaring data members protected is usually a design error.

### 20.5.2 Access to Base Classes

The access specifier for a base class can be left out. In that case, the base defaults to a private base for a class and a public base for a struct. For example:

```cpp
class XX : B { /* ... */ }; // B is a private base
struct YY : B { /* ... */ }; // B is a public base
```

## 20.6 Pointers to Members

### 20.6.1 Pointers to Function Members

A variable of type "pointer to member of class X" is declared using a declarator of the form `X::*`.

It is not possible to store the result of a `->*` or a `.*` operation for later use.
