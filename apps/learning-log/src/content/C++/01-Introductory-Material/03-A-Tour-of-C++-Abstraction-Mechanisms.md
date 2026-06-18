---

title: 03 A tour of C++: Abstraction Mechanisms
date: 2026-06-14
---

## 3.2 Class

A `class` is a user-defined type provided to represent a concept in the code of a program.

Essentially all language facilities beyond the fundamental types, operators, and statements exist to help define better classes or to use them more conveniently.

### 3.2.1 Concrete Types

The basic idea of concrete classes is that they behave "just like built-in types."

The defining characteristic of a concrete type is that its representation is part of its definition.

### 3.2.1.2 A Container

A `container` is an object holding a collection of elements.

The name of a `destructor` is the complement operator, `~`, followed by the name of the class; it is the complement of a `constructor`.

The technique of acquiring resources in a `constructor` and releasing them in a `destructor`, known as `Resource Acquisition Is Initialization` or `RAII`, ...

### 3.2.2 Abstract Types

In contrast, an abstract type is a type that completely insulates a user from implementation details.

The curious `=0` syntax says the function is `pure virtual`; that is, some class derived from `Container` must define the function.

A class with a pure virtual function is called an abstract class.

A class that provides the interface to a variety of other classes is often called a polymorphic type.

```
class Vector_container : public Container {
    Vector v;
public:
    Vector_container(int s) : v(s) {}
    ~Vector_container() {}

    double& operator[](int i) { return v[i]; }
    int size() const { return v.size(); }
};
```

- The `:public` can be read as "is derived from" or "is a subtype of."
- The derived class is said to inherit members from its base class, so the use of base and derived classes is commonly referred to as inheritance.
- The members `operator[]()` and `size()` are said to override the corresponding members in the base class `Container`.
- Note that the member destructor `~Vector()` is implicitly invoked by its class's destructor `~Vector_container()`.

The point is that `use(Container&)` has no idea if its argument is a `Vector_container`, a `List_container`, or some other kind of container;

The flip side of this flexibility is that objects must be manipulated through pointers or references.

### 3.2.3 Virtual Functions

The usual implementation technique is for the compiler to convert the name of a virtual function into an index into a table of pointers to functions. That table is usually called the virtual function table or simply the `vtbl`.

### 3.2.4 Class Hierarchies

A class hierarchy is a set of classes ordered in a lattice created by derivation.

A class hierarchy offers two kinds of benefits:
- Interface inheritance: An object of a derived class can be used wherever an object of a base class is required.
- Implementation inheritance: A base class provides functions or data that simplifies the implementation of derived classes.