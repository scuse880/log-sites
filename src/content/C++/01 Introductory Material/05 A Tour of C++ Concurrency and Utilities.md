---
title: 05 A Tour of C++: Concurrency and Utilities
date: 2026-06-22
---

## 5.1 Introduction

The C++ standard library aims to serve the intersection of all needs rather than their union.

## 5.2 Resource Management

### 5.2.1 unique_ptr and shared_ptr

In `<memory>`, the standard library provides two "smart pointers" to help manage objects on the free store:
- `unique_ptr` to represent unique ownership
- `shared_ptr` to represent shared ownership

## 5.3 Concurrency

### 5.3.1 Tasks and threads

We call a computation that can potentially be executed concurrently with other computations a task. A thread is the system-level representation of a task in a program.

### 5.3.2 Passing Arguments

```
thread t1 {f,ref(some_vec)};
thread t2 {F(vec2)};
```

The compiler checks that the first argument can be invoked given the following arguments and builds the necessary function object to pass to the thread.

### 5.3.4 Sharing Data

A `thread` acquires a mutex using a `lock()` operation

### 5.3.4.1 Waiting for Events

A `condition_variable` is a mechanism allowing one `thread` to wait for another.

### 5.3.5 Communicating Tasks

### 5.3.5.1 future and promise

The important point about `future` and `promise` is that they enable a transfer of a value between two tasks without explicit use of a lock; "the system" implements the transfer efficiently.

### 5.3.5.2 packaged_task

The `packaged_task` type is provided to simplify setting up tasks connected with `future`s and `promise`s to be run on `thread`s.

### 5.3.5.3 async()

Basically, `async()` separates the "call part" of a function call from the "get the result part," and separates both from the actual execution of the task. There is an obvious limitation: Don't even think of using `async()` for tasks that share resources needing locking.

## 5.4 Small Utility Components

### 5.4.1 Time

The standard-library facilities for dealing with time are found in the subnamespace `std::chrono` in `<chrono>`.

Don’t make statements about ‘‘efficiency’’ of code without first doing time measurements. Guesses about performance are most unreliable.

### 5.4.2 Type Functions

A type function is a function that is evaluated at compile-time given a type as its argument or returning a type.

### 5.4.2.1 iterator_traits

The standard library provides a mechanism, `iterator_traits`, that allows us to check which kind of iterator is supported.

`Iterator_category<Iter>{}` constructs a ‘‘tag’’ value indicating the kind of iterator provided.

### 5.4.2.2 Type Predicates

A standard-library type predicate is a simple type function that answers a fundamental question about types.

### 5.4.3 pair and tuple

The first member of a `pair` is called `first` and the second member is called `second`.

The standard-library `pair` (from `<utility>`) is quite frequently used in the standard library and
elsewhere.

## 5.5 Regular Expressions

In `<regex>`, the standard library provides support for regular expressions in the form of the `std::regex` class and its supporting functions.

## 5.6 Math

### 5.6.1 Mathematical Functions and Algorithms

In `<cmath>`, we find the "usual mathematical functions."

Complex number versions of these functions are found in `<complex>`.

In `<numeric>`, we find a small set of generalized numerical algorithms, such as `accumulate()`.

### 5.6.3 Random Numbers

A random number generator consists of two parts:
- an engine that produces a sequence of random or pseudo-random values.
- a distribution that maps those values into a mathematical distribution in a range.

### 5.6.4 Vector Arithmetic

Consequently, the standard library provides (in `<valarray>`) a `vector`-like template, called `valarray`, that is less general and more amenable to optimization for numerical computation.

### 5.6.5 Numeric Limits

In `<limits>`, the standard library provides classes that describe the properties of built-in types.