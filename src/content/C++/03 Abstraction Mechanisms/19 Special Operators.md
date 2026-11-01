---
title: 19 Special Operators
date: 2026-07-31
---

## 19.2 Special Operators

### 19.2.2 Function Call

An argument list for an `operator()()` is evaluated and checked according to the usual argument-passing rules.

### 19.2.3 Dereferencing

```cpp
template<typename T>
class Ptr {
    T* p;

public:
    T* operator->() { return p; }       // dereference to access member
    T& operator*() { return *p; }       // dereference to access whole object
    T& operator[](int i) { return p[i]; } // dereference to access element
    // ...
};
```

If you provide more than one of these operators, it might be wise to provide the equivalence, just as it is wise to ensure that `++x` and `x+=1` have the same effect as `x=x+1` for a simple variable `x` of some class `X` if `++`, `+=`, `=`, and `+` are provided.

Despite the similarity between `->` and `.` (dot), there is no way of overloading operator `.` (dot).

### 19.2.4 Increment and Decrement

The `int` argument is used to indicate that the function is to be invoked for postfix application of `++`. This `int` is never used; the argument is simply a dummy used to distinguish between prefix and postfix application.

The pre-increment operator can return a reference to its object. The post-increment operator must make a new object to return.

### 19.2.6 User-defined Literals

The name of a literal operator is `operator""` followed by the suffix.

To get a C-style string from the program source text into a literal operator, we request both the string and its number of characters.

A literal operator that takes just a `const char*` argument and no size can be applied to integer and floating-point literals.

## 19.4 Friends

An ordinary member function declaration specifies three logically distinct things:

- The function can access the private part of the class declaration.
- The function is in the scope of the class.
- The function must be invoked on an object and has a `this` pointer.

By declaring a member function `static`, we can give it the first two properties only. By declaring a nonmember function a `friend`, we can give it the first property only.

A `friend` declaration can be placed in either the private or the public part of a class declaration; it does not matter where.

```cpp
class List {
    friend class List_iterator;
    // ...
};
```

This `friend` declaration makes all of `List_iterator`'s member functions friends of `List`.

### 19.4.2 Friends and Members

The first question is not "Should it be a member, a static member, or a friend?" but rather "Does it really need access?"