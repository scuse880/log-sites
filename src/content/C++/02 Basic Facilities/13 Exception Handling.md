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

## 13.5 Throwing and Catching Exceptions

### 13.5.1 Throwing Exceptions

We can throw an exception of any type that can be copied or moved.

### 13.5.1.1 `noexcept` Functions

What happens if the programmer "lied" so that a `noexcept` function deliberately or accidentally threw an exception that wasn't caught before leaving the `noexcept` function? It terminates unconditionally by invoking `std::terminate()`. It does not invoke destructors from calling functions. It is implementation-defined whether destructors from scopes between the `throw` and the `noexcept` function, for example, for `s` in `compute()`, are invoked.

### 13.5.1.2 The `noexcept` Operator

The predicate in a `noexcept()` specification must be a constant expression. Plain `noexcept` means `noexcept(true)`.

The `noexcept()` operator takes an expression as its argument and returns `true` if the compiler "knows" that it cannot throw and `false` otherwise.

### 13.5.1.3 Exception Specifications

In older C++ code, you may find exception specifications. For example:

```cpp
void f(int) throw(Bad,Worse); // may only throw Bad or Worse exceptions
void g(int) throw();          // may not throw
```

This feature has not been a success and is deprecated. Don't use it.

### 13.5.2 Catching Exceptions

Consider:

```cpp
void f()
{
    try {
        throw E{};
    }
    catch(H) {
        // when do we get here?
    }
}
```

The handler is invoked:

1. If `H` is the same type as `E`
2. If `H` is an unambiguous public base of `E`
3. If `H` and `E` are pointer types and condition 1 or 2 holds for the types to which they refer
4. If `H` is a reference and condition 1 or 2 holds for the type to which `H` refers

The `{}` in both the try-part and a catch-clause of a try-block are real scopes.

### 13.5.2.1 Rethrow

A rethrow is indicated by a `throw` without an operand. A rethrow may occur in a catch-clause or in a function called from a catch-clause. If a rethrow is attempted when there is no exception to rethrow, `std::terminate()` will be called.

The exception rethrown is the original exception caught and not just the part of it that was accessible as an exception.

### 13.5.2.3 Multiple Handlers

A try-block may have multiple catch-clauses, or handlers. The handlers are tried in order.

### 13.5.2.4 Function try-Blocks

For most functions, all we gain from using a function try-block is a bit of notational convenience. However, a try-block allows us to deal with exceptions thrown by base-or-member initializers in constructors.

The best we can do in a catch-clause of a function try-block for a constructor or destructor is to throw an exception. The default action is to rethrow the original exception when we "fall off the end" of the catch-clause.

There are no such restrictions for the try-block of an ordinary function.

### 13.5.2.5 Termination

There are cases where exception handling must be abandoned for less subtle error-handling techniques. The guiding principles are:

* Don't throw an exception while handling an exception.
* Don't throw an exception that can't be caught.

If the exception-handling implementation catches you doing either, it will terminate your program.

A terminate handler cannot return to its caller. If it tries to, `terminate()` will call `abort()`. Note that `abort()` indicates abnormal exit from the program. The function `exit()` can be used to exit a program with a return value that indicates to the surrounding system whether the exit is normal or abnormal.

When an exception is caught, the exact point where it was thrown is generally not known.

## 13.6 A Vector Implementation

### 13.6.4.4 Final Thoughts

The basic rule of ordering is not to destroy information before its replacement has been constructed and can be assigned without the possibility of an exception.

I conjecture that the effectiveness of the ordering approach and the RAII approach compared to more extensive use of try-blocks stems from the simplification of the local control flow. Simple, stylized code is easier to understand, easier to get right, and easier to generate good code for.