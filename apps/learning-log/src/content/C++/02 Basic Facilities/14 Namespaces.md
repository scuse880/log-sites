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