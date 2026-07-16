---
title: 12 Functions
date: 2026-07-16
---

## 12.1 Function Declarations

A function declaration gives the name of the function, the type of the value returned (if any), and the number and types of the arguments that must be supplied in a call.

The semantics of argument passing are identical to the semantics of copy initialization.

Argument types are checked and implicit argument type conversion takes place when necessary.

A function declaration may contain argument names. This can be a help to the reader of a program, but unless the declaration is also a function definition, the compiler simply ignores such names.

The type of a function consists of the return type and the argument types. For class member functions, the name of the class is also part of the function type.

### 12.1.1 Why Functions?

We want our code to be comprehensible, because that is the first step on the way to maintainability. The first step to comprehensibility is to break computational tasks into comprehensible chunks (represented as functions and classes) and name those.

The number of errors in code correlates strongly with the amount of code and the complexity of the code.

Use functions as a structuring mechanism.

### 12.1.3 Function Definitions

Unfortunately, to preserve C compatibility, a `const` is ignored at the highest level of an argument type.

Function argument names are not part of the function type and need not be identical in different declarations.

We can indicate that an argument is unused in a function definition by not naming it.

In addition to functions, there are a few other things that we can call; these follow most rules defined for functions, such as the rules for argument passing:

* Constructors are technically not functions; in particular, they don't return a value, can initialize bases and members, and can't have their address taken.
* Destructors can't be overloaded and can't have their address taken.
* Function objects are not functions (they are objects) and can't be overloaded, but their `operator()`s are functions.
* Lambda expressions are basically a shorthand for defining function objects.

### 12.1.4 Returning Values

A prefix `auto` indicates that the return type is placed after the argument list. The suffix return type is preceded by `->`.

The essential use for a suffix return type comes in function template declarations in which the return type depends on the arguments.

There is an obvious similarity between the suffix return syntax for a function and the lambda expression syntax; it is a pity those two constructs are not identical.

A value must be returned from a function that is not declared `void` (however, `main()` is special). Conversely, a value cannot be returned from a `void` function.

A function that calls itself is said to be recursive.

Like the semantics of argument passing, the semantics of function value return are identical to the semantics of copy initialization. The type of a return expression is checked against the return type, and all standard and user-defined type conversions are performed.

The storage is reused after the function returns, so a pointer to a local non-static variable should never be returned.

A function that does not return normally (i.e., through a `return` or "falling off the end") can be marked `[[noreturn]]`.

### 12.1.5 `inline` Functions

The `inline` specifier is a hint to the compiler that it should attempt to generate code for a call of `fac()` inline rather than laying down the code for the function once and then calling through the usual function call mechanism.

An `inline` specifier does not affect the semantics of a function.

### 12.1.6 `constexpr` Functions

By specifying a function `constexpr`, we indicate that we want it to be usable in constant expressions if given constant expressions as arguments.

When `constexpr` is used in a function definition, it means "should be usable in a constant expression when given constant expressions as arguments." When used in an object definition, it means "evaluate the initializer at compile time."

To be evaluated at compile time, a function must be suitably simple: a `constexpr` function must consist of a single `return` statement; no loops and no local variables are allowed. Also, a `constexpr` function may not have side effects.

A `constexpr` function allows recursion and conditional expressions. This implies that you can express just about anything as a `constexpr` function if you really want to. However, you'll find the debugging gets unnecessarily difficult and compile times longer than you would like unless you restrict the use of `constexpr` functions to the relatively simple tasks for which they are intended.

Like `inline` functions, `constexpr` functions obey the ODR ("one-definition rule"), so that definitions in the different translation units must be identical. You can think of `constexpr` functions as a restricted form of `inline` functions.

### 12.1.6.1 `constexpr` and References

A `constexpr` function can refer to nonlocal objects as long as it does not write to them.

A `constexpr` function can take reference arguments. Of course, it cannot write through such references, but `const` reference parameters are as useful as ever.

### 12.1.6.2 Conditional Evaluation

A branch of a conditional expression that is not taken in a `constexpr` function is not evaluated. This implies that a branch not taken can require run-time evaluation.