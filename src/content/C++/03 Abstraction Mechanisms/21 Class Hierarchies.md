---
title: 21 Class Hierarchies
date: 2026-08-10
---

## 21.2 Design of Class Hierarchies

### 21.2.1 Implementation Inheritance

A protected member is accessible from a class's own members and from members of derived classes, but not to general users.

### 21.2.2 Interface Inheritance

Deriving directly from more than one class is usually called multiple inheritance.

### 21.2.4 Localizing Object Creation

```cpp
class Ival_maker {
public:
    virtual Ival_dial* dial(int, int) =0; // make dial
    virtual Popup_ival_slider* popup_slider(int, int) =0; // make popup slider
    // ...
};
```

For each interface from the `Ival_box` family of classes that a user should know about, class `Ival_maker` provides a function that makes an object. Such a class is sometimes called a factory, and its functions are (somewhat misleadingly) sometimes called virtual constructors.

## 21.3 Multiple Inheritance

### 21.3.1 Multiple Interfaces

The key observation is that a class without mutable state can be replicated if necessary or shared if that is desired.

The use of multiple abstract classes as interfaces is almost universal in object-oriented designs (in any language with a notion of an interface).

### 21.3.4 Repeated Use of a Base Class

Unless you state otherwise, you get one copy for each time you mention a class as a base.

A virtual function of a replicated base class can be overridden by a (single) function in a derived class.

### 21.3.5 Virtual Base Classes

We avoid replication by declaring a base virtual: every virtual base of a derived class is represented by the same (shared) object.

### 21.3.6 Replicated vs. Virtual Bases

### 21.3.6.1 Overriding Virtual Base Functions

A class that provides some – but not all – of the implementation for a virtual base class is often called a mixin.