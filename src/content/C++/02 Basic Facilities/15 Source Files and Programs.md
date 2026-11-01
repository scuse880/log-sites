---
title: 15 Source Files and Programs
date: 2026-07-26
---

## 15.1 Separate Compilation

A user presents a source file to the compiler. The file is then preprocessed.

The result of preprocessing is called a translation unit.

The linker is the program that binds together the separately compiled parts. A linker is sometimes (confusingly) called a loader.

The organization of a program into source files is commonly called the physical structure of a program.

## 15.2 Linkage

The keyword `extern` indicates that the declaration of `x` in `file2.cpp` is (just) a declaration and not a definition. Had `x` been initialized, `extern` would simply be ignored because a declaration with an initializer is always a definition.

An object must be defined exactly once in a program. It may be declared many times, but the types must agree exactly.

Note that a variable defined without an initializer in the global or a namespace scope is initialized by default. This is not the case for non-static local variables or objects created on the free store.

Outside a class body, an entity must be declared before it is used.

A name that can be used in translation units different from the one in which it was defined is said to have external linkage.

A name that can be referred to only in the translation unit in which it is defined is said to have internal linkage.

When used in namespace scope (including the global scope), the keyword `static` (somewhat illogically) means "not accessible from other source files" (i.e., internal linkage).

Names that a linker does not see, such as the names of local variables, are said to have no linkage.

An `inline` function must be defined identically in every translation unit in which it is used. We keep `inline` function definitions consistent by using header files.

By default, `const` objects, `constexpr` objects, type aliases, and anything declared `static` in a namespace scope have internal linkage.

To ensure consistency, place aliases, `const`s, `constexpr`s, and `inline`s in header files.

A `const` can be given external linkage by an explicit declaration.

### 15.2.1 File-Local Names

If you must use global variables, at least restrict their use to a single source file. This restriction can be achieved in one of two ways:

* Place declarations in an unnamed namespace.
* Declare an entity `static`.

### 15.2.2 Header Files

The `#include` mechanism is a text manipulation facility for gathering source program fragments together into a single unit (file) for compilation.

```cpp
#include <iostream>    // from standard include directory
#include "myheader.h"  // from current directory
```

### 15.2.3 The One-Definition Rule

One-definition rule ("the ODR") means two definitions of a class, template, or `inline` function are accepted as examples of the same unique definition if and only if:

* They appear in different translation units.
* They are token-for-token identical.
* The meanings of those tokens are the same in both translation units.

The intent of the ODR is to allow inclusion of a class definition in different translation units from a common source file.

### 15.2.4 Standard-Library Headers

For each C standard-library header `<X.h>`, there is a corresponding standard C++ header `<cX>`.

### 15.2.5 Linkage to Non-C++ Code

One can specify a linkage convention to be used in an `extern` declaration.

An `extern "C"` directive specifies the linkage convention only and does not affect the semantics of calls to the function. In particular, a function declared `extern "C"` still obeys the C++ type-checking and argument conversion rules and not the weaker C rules.

This construct, commonly called a linkage block, can be used to enclose a complete C header to make a header suitable for C++ use.

## 15.3 Using Header Files

### 15.3.2 Multiple-Header Organization

The simple fact is that maintenance of code is invariably done with incomplete information and from a local perspective. The multiple-header organization allows us to work successfully "from the inside out" with only a local perspective.

### 15.3.3 Include Guards

Viewed from the program as a whole, many of the declarations needed to make each logical module complete are redundant. For larger programs, such redundancy can lead to errors, as a header containing class definitions or inline functions gets `#include`d twice in the same compilation unit. We also need that redundancy to make the individual parts of the program comprehensible in isolation. The traditional solution is to insert include guards in headers.

## 15.4 Programs

### 15.4.1 Initialization of Nonlocal Variables

In principle, a variable defined outside any function (that is, global, namespace, and class static variables) is initialized before `main()` is invoked.

The initialization of nonlocal (statically allocated) variables is controlled by whatever mechanism an implementation uses to start up a C++ program. This mechanism is guaranteed to work properly only if `main()` is executed.