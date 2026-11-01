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

### 12.1.7 `[[noreturn]]` Functions

A construct `[[...]]` is called an attribute and can be placed just about anywhere in the C++ syntax. In general, an attribute specifies some implementation-dependent property about the syntactic entity that precedes it. In addition, an attribute can be placed in front of a declaration. There are only two standard attributes, and `[[noreturn]]` is one of them. The other is `[[carries_dependency]]`.

Placing `[[noreturn]]` at the start of a function declaration indicates that the function is not expected to return.

What happens if the function returns despite a `[[noreturn]]` attribute is undefined.

### 12.1.8 Local Variables

A local variable or constant is initialized when a thread of execution reaches its definition. Unless declared `static`, each invocation of the function has its own copy of the variable. If a local variable is declared `static`, a single, statically allocated object will be used to represent that variable in all calls of the function. It will be initialized only the first time a thread of execution reaches its definition.

A static local variable allows the function to preserve information between calls without introducing a global variable that might be accessed and corrupted by other functions.

Initialization of a static local variable does not lead to a data race unless you enter the function containing it recursively or a deadlock occurs.

There are no local functions.

The scope of a label, should you be foolhardy enough to use one, is the complete function, independent of which nested scope it may be in.

## 12.2 Argument Passing

When a function is called using the suffix `()`, known as the call operator or application operator, store is set aside for its formal arguments, also known as its parameters, and each formal argument is initialized by its corresponding actual argument.

### 12.2.1 Reference Arguments

The importance of using `const` arguments increases with the size of a program.

Note that the semantics of argument passing are different from the semantics of assignment. This is important for `const` arguments, reference arguments, and arguments of some user-defined types.

Following the rules for reference initialization, a literal, a constant, and an argument that requires conversion can be passed as a `const T&` argument, but not as a plain non-`const` `T&` argument.

### 12.2.2 Array Arguments

If an array is used as a function argument, a pointer to its initial element is passed.

A parameter of array type is equivalent to a parameter of pointer type.

The size of an array is not available to the called function.

If you really want to pass an array, rather than a container or a pointer to the first element of an array, you can declare a parameter of type reference to array. Note that the number of elements is part of a reference-to-array type. The main use of references to arrays is in templates, where the number of elements is then deduced.

### 12.2.3 List Arguments

A `{}`-delimited list can be used as an argument to a parameter of:

* Type `std::initializer_list<T>`, where the values of the list can be implicitly converted to `T`
* A type that can be initialized with the values provided in the list
* A reference to an array of `T`, where the values of the list can be implicitly converted to `T`

If there is a possible ambiguity, an `initializer_list` parameter takes priority.

The reason that a function with an `initializer_list` argument takes priority is that it could be very confusing if different functions were chosen based on the number of elements of a list. It is not possible to eliminate every form of confusion in overload resolution, but giving `initializer_list` parameters priority for `{}`-list arguments seems to minimize confusion.

### 12.2.4 Unspecified Number of Arguments

For some functions, it is not possible to specify the number and type of all arguments expected in a call. To implement such interfaces, we have three choices:

* Use a variadic template: this allows us to handle an arbitrary number of arbitrary types in a type-safe manner by writing a small template metaprogram that interprets the argument list to determine its meaning and take appropriate actions.
* Use an `initializer_list` as the argument type. This allows us to handle an arbitrary number of arguments of a single type in a type-safe manner. In many contexts, such homogeneous lists are the most common and important case.
* Terminate the argument list with the ellipsis `...`, which means "and maybe some more arguments." This allows us to handle an arbitrary number of almost arbitrary types by using some macros from `<cstdarg>`. This solution is not inherently type-safe and can be hard to use with sophisticated user-defined types. However, this mechanism has been used from the earliest days of C.

Clearly, if an argument has not been declared, the compiler does not have the information needed to perform the standard type checking and type conversion for it. In that case, a `char` or a `short` is passed as an `int` and a `float` is passed as a `double`. This is not necessarily what the programmer expects.

Only when both the number of arguments and the types of arguments vary and a variadic template solution is deemed undesirable is the ellipsis necessary.

### 12.2.5 Default Arguments

A default argument is type checked at the time of the function declaration and evaluated at the time of the call.

Default arguments that can change value are most often best avoided because they introduce subtle context dependencies.

Default arguments may be provided for trailing arguments only.

A default argument cannot be repeated or changed in a subsequent declaration in the same scope.

Declaring a name in a nested scope so that the name hides a declaration of the same name in an outer scope is error-prone.

## 12.3 Overloaded Functions

Using the same name for operations on different types is called overloading.

### 12.3.1 Automatic Overload Resolution

When a function `fct` is called, the compiler must determine which of the functions named `fct` to invoke. This is done by comparing the types of the actual arguments with the types of the parameters of all functions in scope called `fct`. The idea is to invoke the function that is the best match to the arguments and give a compile-time error if no function is the best match.

To approximate our notions of what is reasonable, a series of criteria are tried in order:

* Exact match; that is, match using no or only trivial conversions, for example, array name to pointer, function name to pointer to function, and `T` to `const T`
* Match using promotions; that is, integral promotions, such as `bool` to `int`, `char` to `int`, `short` to `int`, and their unsigned counterparts, and `float` to `double`
* Match using standard conversions, for example, `int` to `double`, `double` to `int`, `double` to `long double`, `Derived*` to `Base*`, `T*` to `void*`, and `int` to `unsigned int`
* Match using user-defined conversions, for example, `double` to `complex<double>`
* Match using the ellipsis `...` in a function declaration

If two matches are found at the highest level where a match is found, the call is rejected as ambiguous.

The reason to distinguish between conversions and promotions is that we want to prefer safe promotions, such as `char` to `int`, over unsafe conversions, such as `int` to `char`.

Overload resolution is independent of the order of declaration of the functions considered.

### 12.3.3 Overloading and Scope

A base class and a derived class provide different scopes so that overloading between a base class function and a derived class function doesn't happen by default.

When overloading across class scopes or namespace scopes is wanted, `using`-declarations or `using`-directives can be used.

### 12.3.4 Resolution for Multiple Arguments

In the process of choosing among overloaded functions with two or more arguments, a best match is found for each argument using the overload resolution rules. A function that is the best match for one argument and a better or equal match for all other arguments is called. If no such function exists, the call is rejected as ambiguous.

## 12.4 Pre- and Postconditions

We call logical criteria that are supposed to hold when a function is called preconditions, and logical criteria that are supposed to hold when a function returns its postconditions.

## 12.5 Pointer to Function

Like a data object, the code generated for a function body is placed in memory somewhere, so it has an address. We can have a pointer to a function just as we can have a pointer to an object. However, for a variety of reasons - some related to machine architecture and others to system design - a pointer to function does not allow the code to be modified. There are only two things one can do to a function: call it and take its address.

Dereferencing a pointer to function using `*` is optional. Similarly, using `&` to get the address of a function is optional.

In pointer assignments, the complete function type must match exactly.

The rules for argument passing are the same for calls directly to a function and for calls to a function through a pointer.

We need the nastiest of casts, `reinterpret_cast`, to do conversion of pointer-to-function types. The reason is that the result of using a pointer to function of the wrong type is so unpredictable and system-dependent.

Pointers to functions provide a way of parameterizing algorithms.

You can take the address of an overloaded function by assigning to or initializing a pointer to function. In that case, the type of the target is used to select from the set of overloaded functions.

A pointer to a `noexcept` function can be declared `noexcept`.

A pointer to function must reflect the linkage of a function. Neither linkage specification nor `noexcept` may appear in type aliases.

## 12.6 Macros

The first rule about macros is: don't use them unless you have to.

I recommend using macros only for conditional compilation and in particular for include guards.

A macro can also be defined to take arguments.

Macro names cannot be overloaded, and the macro preprocessor cannot handle recursive calls.

A string can be created by concatenating two strings using the `##` macro operator.

A single `#` before a parameter name in a replacement string means a string containing the macro argument.

The directive `#undef X` ensures that no macro called `X` is defined - whether or not one was before the directive.

### 12.6.1 Conditional Compilation

One use of macros is almost impossible to avoid. The directive `#ifdef IDENTIFIER` does nothing if `IDENTIFIER` is defined, but if it is not, the directive causes all input to be ignored until a `#endif` directive is seen.

Names of the macros used to control `#ifdef` should be chosen carefully so that they don't clash with ordinary identifiers.

### 12.6.2 Predefined Macros

Most C++ implementations allow a user to define arbitrary macros on the command line or in some other form of compile-time environment.

### 12.6.3 Pragmas

Implementations often provide facilities that differ from or go beyond what the standard offers. Obviously, the standard cannot specify how such facilities are provided, but one standard syntax is a line of tokens prefixed with the preprocessor directive `#pragma`. For example: `#pragma foo bar 666 foobar`

If possible, `#pragma`s are best avoided.