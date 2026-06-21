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