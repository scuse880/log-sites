---
title: 13 Exception Handling
date: 2026-07-20
---

## 13.1 Error Handling

### 13.1.1 Exceptions

A function that cannot cope with a problem throws an exception, hoping that its direct or indirect caller can handle the problem. A function that wants to handle a kind of problem indicates that by catching the corresponding exception.

The exception-handling mechanism is integrated with the constructor/destructor mechanisms and the concurrency mechanisms to help ensure correctness.

An exception is an object thrown to represent the occurrence of an error. It can be of any type that can be copied, but it is strongly recommended to use only user-defined types specifically defined for that purpose.

### 13.1.3 Muddling Through

Please recognize that error handling will remain a difficult task and that the exception-handling mechanism—although more formalized than the techniques it replaces—is still relatively unstructured compared with language features involving only local control flow.

### 13.1.6 Hierarchical Error Handling

However, separating the program into distinct subsystems that either complete successfully or fail in well-defined ways is essential, feasible, and economical. Thus, major libraries, subsystems, and key interface functions should be designed in this way.

Error handling should be—as far as possible—hierarchical.

### 13.1.7 Exceptions and Efficiency

Complexity tends to move around rather than just disappear.

## 13.2 Exception Guarantees

By valid state we mean that a constructor has completed and the destructor has not yet been entered.

Before a `throw`, a function must place all constructed objects in valid states. However, such a valid state may be one that doesn't suit the caller.

The C++ standard library provides a generally useful conceptual framework for designing exception-safe program components. The library provides one of the following guarantees for every library operation:

* The basic guarantee for all operations: The basic invariants of all objects are maintained, and no resources, such as memory, are leaked. In particular, the basic invariants of every built-in and standard-library type guarantee that you can destroy an object or assign to it after every standard-library operation.
* The strong guarantee for key operations: In addition to providing the basic guarantee, either the operation succeeds or it has no effect. This guarantee is provided for key operations, such as `push_back()`, single-element `insert()` on a `list`, and `uninitialized_copy()`.
* The nothrow guarantee for some operations: In addition to providing the basic guarantee, some operations are guaranteed not to throw an exception. This guarantee is provided for a few simple operations, such as `swap()` of two containers and `pop_back()`.

Remember that memory isn't the only kind of resource that can leak. Files, locks, network connections, and threads are examples of system resources.

## 13.3 Resource Management

The destructor will be called independently of whether the function is exited normally or exited because an exception is thrown. That is, the exception-handling mechanisms enable us to remove the error-handling code from the main algorithm.

This technique for managing resources using local objects is usually referred to as "Resource Acquisition Is Initialization" (RAII). This is a general technique that relies on the properties of constructors and destructors and their interaction with exception handling.

## 13.4 Enforcing Invariants

When we want to be neutral about the logical reason for the check, we typically use the word assertion, often abbreviated to an `assert`.

It is possible to control the testing done and the response to testing through build options (e.g., controlling conditional compilation) and/or through options in the program code.

I personally favor leaving at least some tests in the final (shipping) version of a program.

Only the builder of the final complete system can decide whether a failure is acceptable or not. The writer of a library or reusable component usually does not have the luxury of terminating unconditionally. I interpret that to mean that for general library code, reporting an error - preferably by throwing an exception - is essential.

As usual, destructors should not throw, so don't use a throwing `Assert()` in a destructor.
