---
title: 17 Construction, Cleanup, Copy, and Move
date: 2026-07-29
---

## 17.2 Constructors and Destructors

### 17.2.2 Destructors and Resources

A destructor does not take an argument, and a class can have only one destructor.

Destructors are called implicitly when an automatic variable goes out of scope, an object on the free store is deleted, etc. Only in very rare circumstances does the user need to call a destructor explicitly.

### 17.2.3 Base and Member Destructors

Constructors execute member and base constructors in declaration order (not the order of initializers).

### 17.2.4 Calling Constructors and Destructors

We can prevent destruction of an `X` by declaring its destructor `=delete` or private.

## 17.3 Class Object Initialization

### 17.3.1 Initialization Without Constructors

We can initialize objects of a class for which we have not defined a constructor using

* memberwise initialization,
* copy initialization, or
* default initialization (without an initializer or with an empty initializer list).

For statically allocated objects, the rules are exactly as if you had used `{}`, so the value of `alpha` is `{"","",0}`. However, for local variables and free-store objects, the default initialization is done only for members of class type, and members of built-in type are left uninitialized, so the value of `beta` is `{"","",unknown}`.

Memberwise initialization works only if we can access the members.

### 17.3.2 Initialization Using Constructors

A constructor is often used to establish an invariant for its class and to acquire resources necessary to do that.

If a constructor is declared for a class, some constructor will be used for every object. It is an error to try to create an object without a proper initializer as required by the constructors.

The default constructor disappears when you define a constructor requiring arguments. However, the copy constructor does not disappear.

I used the `{}` notation to make explicit the fact that I am initializing.

### 17.3.2.1 Initialization by Constructors

Using the `()` notation, you can request to use a constructor in an initialization. That is, you can ensure that for a class, you will get initialization by constructor and not get the memberwise initialization or initializer-list initialization that the `{}` notation also offers.

### 17.3.3 Default Constructors

A constructor that can be invoked without an argument is called a default constructor.

A default constructor is used if no arguments are specified or if an empty initializer list is provided.

### 17.3.4 Initializer-List Constructors

A constructor that takes a single argument of type `std::initializer_list` is called an initializer-list constructor.

The mechanism for accepting a `{}`-list is a function (often a constructor) taking an argument of type `std::initializer_list<T>`.

### 17.3.4.1 `initializer_list` Constructor Disambiguation

The rules are:

* If either a default constructor or an initializer-list constructor could be invoked, prefer the default constructor.
* If both an initializer-list constructor and an "ordinary constructor" could be invoked, prefer the initializer-list constructor.

If we really want to invoke the constructor taking one or two integer arguments, we must use the `()` notation.

### 17.3.4.2 Use of `initializer_list`s

A function with an `initializer_list<T>` argument can access it as a sequence using the member functions `begin()`, `end()`, and `size()`.

Unfortunately, `initializer_list` doesn't provide subscripting.

The elements of an `initializer_list` are immutable.

## 17.4 Member and Base Initialization

### 17.4.1 Member Initialization

The member initializer list starts with a colon, and the individual member initializers are separated by commas.

If a member constructor needs no arguments, the member need not be mentioned in the member initializer list. It is usually a good idea to be explicit about initializing members.

A constructor can initialize members and bases of its class, but not members or bases of its members or bases.

### 17.4.2 Base Initializers

Bases are initialized before members and destroyed after members.

### 17.4.3 Delegating Constructors

That is, a member-style initializer using the class's own name (its constructor name) calls another constructor as part of the construction. Such a constructor is called a delegating constructor (and occasionally a forwarding constructor).

You cannot both delegate and explicitly initialize a member.

### 17.4.4 In-Class Initializers

We can specify an initializer for a non-static data member in the class declaration.

By default, a constructor will use such an in-class initializer.

If a member is initialized by both an in-class initializer and a constructor, only the constructor's initialization is done (it "overrides" the default).

## 17.5 Copy and Move

### 17.5.1 Copy

A copy constructor and a copy assignment differ in that a copy constructor initializes uninitialized memory, whereas the copy assignment operator must correctly deal with an object that has already been constructed and may own resources.

### 17.5.1.2 Copy of Bases

For the purposes of copying, a base is just a member: to copy an object of a derived class, you have to copy its bases.

### 17.5.1.3 The Meaning of Copy

The operation must meet two criteria: equivalence and independence.

### 17.5.2 Move

To allow the user to avoid the logical and performance problems of copying, C++ directly supports the notion of moving as well as the notion of copying.

The idea behind using a swap to implement a move assignment is that the source is just about to be destroyed, so we can just let the destructor for the source do the necessary cleanup work for us.

In particular, move operations typically do not throw exceptions; they don't acquire resources or do complicated operations, so they don't need to. In this, they differ from many copy operations.

How does the compiler know when it can use a move operation rather than a copy operation? In a few cases, such as for a return value, the language rules say that it can (because the next action is defined to destroy the element). However, in general, we have to tell it by giving an rvalue reference argument.

The `move()` is a standard-library function returning an rvalue reference to its argument.

## 17.6 Generating Default Operations

* If the programmer declares any constructor for a class, the default constructor is not generated for that class.
* If the programmer declares a copy operation, a move operation, or a destructor for a class, no copy operation, move operation, or destructor is generated for that class.

Unfortunately, the second rule is only incompletely enforced: for backward compatibility, copy constructors and copy assignments are generated even if a destructor is defined. However, that generation is deprecated in the ISO standard, and you should expect a modern compiler to warn against it.

### 17.6.2 Default Operations

The default meaning of each generated operation, as implemented when the compiler generates it, is to apply the operation to each base and non-static data member of the class.

### 17.6.4 Deleted Functions

We can `delete` a function.

The most obvious use is to eliminate otherwise defaulted functions.

We can eliminate a specialization from the set of possible specializations of a function template:

Another application is to eliminate an undesired conversion.