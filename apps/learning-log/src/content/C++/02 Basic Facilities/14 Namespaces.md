---
title: 14 Namespaces
date: 2026-07-23
---

## 14.2 Namespaces

### 14.2.1 Explicit Qualification

Classes are namespaces.

### 14.2.2 using-Declarations

```cpp
using std::string; // use "string" to mean "std::string"
```

When used for an overloaded name, a using-declaration applies to all the overloaded versions.

### 14.2.3 using-Directives

```cpp
using namespace std; // make every name from std accessible
```

Using a using-directive to make names from a frequently used and well-known library available without qualification is a popular technique for simplifying code.

Care should be taken with global using-directives.

### 14.2.4 Argument-Dependent Lookup

If a function isn't found in the context of its use, we look in the namespaces of its arguments.

### 14.2.5 Namespaces Are Open

You can add names to it from several separate namespace declarations.

---

## title: 14.4 Composition Using Namespaces

## 14.4 Composition Using Namespaces

### 14.4.1 Convenience vs. Safety

A locally declared name (declared either by an ordinary declaration or by a using-declaration) hides nonlocal declarations of the same name.

### 14.4.2 Namespace Aliases

Use a namespace alias to shorten names:

`namespace ATT = American_Telephone_and_Telegraph;`

### 14.4.3 Namespace Composition

Only if we need to define something do we need to know the real namespace of an entity.

### 14.4.4 Composition and Selection

There is no general language mechanism for renaming, but for types and templates, we can introduce aliases with `using`.

### 14.4.8 Unnamed Namespaces

An unnamed namespace has an implied using-directive.