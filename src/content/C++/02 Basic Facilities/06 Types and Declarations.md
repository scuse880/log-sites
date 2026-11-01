---
title: 06 Types and Declarations
date: 2026-06-23
---

## 6.1 The ISO C++ Standard

Many important things are deemed *implementation-defined* by the standard. This means that each implementation must provide a specific, well-defined behavior for a construct and that behavior must be documented.

Other behaviors are *unspecified*; that is, a range of possible behaviors are acceptable, but the implementer is not obliged to specify which actually occur.

A construct is deemed *undefined* by the standard if no reasonable behavior is required by an implementation.

### 6.1.1 Implementation

A hosted implementation includes all the standard-library facilities as described in the standard. A freestanding implementation may provide fewer standard-library facilities, as long as the following are provided: ...

### 6.1.2 The Basic Source Character Set

A programming environment can map the extended character set into the basic source character set.

## 6.2 Types

Every name (identifier) in a C++ program has a type associated with it. This type determines what operations can be applied to the name (that is, to the entity referred to by the name) and how such operations are interpreted.

### 6.2.1 Fundamental Types

The Boolean, character, and integer types are collectively called *integral types*. The integral and floating-point types are collectively called *arithmetic types*. Enumerations and classes are called *user-defined types* because they must be defined by users rather than being available for use without previous declaration, the way fundamental types are. In contrast, fundamental types, pointers, and references are collectively referred to as *built-in types*. The standard library provides many user-defined types.

For most applications, we could use `bool` for logical values, `char` for characters, `int` for integer values, and `double` for floating-point values. The remaining fundamental types are variations for optimizations, special needs, and compatibility that are best ignored until such needs arise.

### 6.2.2 Booleans

A Boolean is used to express the results of logical operations.

### 6.2.3 Character Types

`wchar_t`: Provided to hold characters of a larger character set such as Unicode. The size of `wchar_t` is implementation-defined and large enough to hold the largest character set supported by the implementation’s locale.

On each implementation, the `char` type will be identical to that of either `signed char` or `unsigned char`, but these three names are still considered separate types.

### 6.2.3.1 Signed and Unsigned Characters

A `char` must behave identically to either a `signed char` or an `unsigned char`. However, the three
`char` types are distinct, so you can’t mix pointers to different `char` types.

### 6.2.3.2 Character Literals

A character literal is a single character enclosed in single quotes.

### 6.2.4 Integer Types

Unlike plain `char`s, plain `int`s are always signed.

### 6.2.4.1 Integer Literals

Integer literals come in three guises: decimal, octal, and hexadecimal.

### 6.2.4.2 Types of Integer Literals

If it is decimal and has no suffix, it has the first of these types in which its value can be represented: `int`, `long int`, `long long int`.

### 6.2.5 Floating-Point Types

There are three floating-point types: `float` (single-precision), `double` (double-precision), and `long double` (extended-precision).

The exact meaning of single-, double-, and extended-precision is implementation-defined.

### 6.2.5.1 Floating-Point Literals

By default, a floating-point literal is of type `double`.

### 6.2.7 void

There are no objects of type `void`. It is used either to specify that a function does not return a value or as the base type for pointers to objects of unknown type.

### 6.2.8 Sizes

The reason for providing more than one integer type, more than one unsigned type, and more than one floating-point type is to allow the programmer to take advantage of hardware characteristics.

Sizes of C++ objects are expressed in terms of multiples of the size of a `char`.

In addition, it is guaranteed that a `char` has at least 8 bits, a `short` at least 16 bits, and a `long` at least 32 bits. A `char` can hold a character of the machine’s character set.

The functions in `<limits>` are `constexpr` so that they can be used without run-time overhead and in contexts that require a constant expression.

The fundamental types can be mixed freely in assignments and expressions. Wherever possible, values are converted so as not to lose information.

## 6.3 Declarations

Before a name (identifier) can be used in a C++ program, it must be declared. That is, its type must be specified to inform the compiler what kind of entity the name refers to.

A definition is a declaration that supplies all that is needed in a program for the use of an entity. In particular, if it takes memory to represent something, that memory is set aside by its definition.

There must always be exactly one definition for each name in a C++ program. However, there can be many declarations.

Any declaration that specifies a value is a definition.

### 6.3.4 Scope

- Local scope: A name declared in a function or lambda is called a local name. Its scope extends from its point of declaration to the end of the block in which its declaration occurs. Function and lambda parameter names are considered local names in the outermost block of their function or lambda.
- Class scope: A name is called a member name (or a class member name) if it is defined in a class outside any function, class, enum class, or other namespace. Its scope extends from the opening `{` of the class declaration to the end of the class declaration
- Namespace scope: A name is called a namespace member name if it is defined in a namespace outside any function, lambda, class, enum class, or other namespace. Its scope extends from the point of declaration to the end of its namespace. A namespace name may also be accessible from other translation units.
- Global scope: A name is called a global name if it is defined outside any function, class, enum class, or namespace. The scope of a global name extends from the point of declaration to the end of the file in which its declaration occurs. A global name may also be accessible from other translation units.
- Statement scope: A name is in a statement scope if it is defined within the `()` part of a `for`-, `while`-, `if`-, or `switch`-statement. Its scope extends from its point of declaration to the end of its statement. All names in statement scope are local names.
- Function scope: A label is in scope from its point of declaration until the end of the function.

A hidden global name can be referred to using the scope resolution operator, `::`.

There is no way to use a hidden local name.

### 6.3.5 Initialization

Initialization using `{}`, list initialization, does not allow narrowing.

### 6.3.5.1 Missing Initializers

If no initializer is specified, a global, namespace, local static, or `static` member (collectively called `static` objects) is initialized to `{}` of the appropriate type.

Local variables and objects created on the free store (sometimes called dynamic objects or heap objects) are not initialized by default unless they are of user-defined types with a default constructor.

### 6.3.5.2 Initializer Lists

In a declaration, an empty pair of parentheses, `()`, always means ‘‘function’’. So, if you want to be explicit about ‘‘use default initialization’’ you need `{}`. 

When using `auto`, a `{}`-list has its type deduced to `std::initializer_list<T>`.

### 6.3.6.1 The auto Type Specifier

The harder the type is to write and the harder the type is to know, the more useful `auto` becomes.

Note that the type of an expression is never a reference because references are implicitly dereferenced in expressions.

### 6.3.6.2 The decltype() Specifier

`decltype(expr)` is the declared type of `expr`.

## 6.4 Objects and Values

That is, an object is a contiguous region of storage; an lvalue is an expression that refers to an object.

### 6.4.1 Lvalues and Rvalues

Roughly, rvalue means ‘‘a value that is not an lvalue.’’

### 6.4.2 Lifetimes of Objects

- Automatic: Unless the programmer specifies otherwise, an object declared in a function is created when its definition is encountered and destroyed when its name goes out of scope. Such objects are sometimes called automatic objects.
- Static: Objects declared in global or namespace scope and `static`s declared in functions or classes are created and initialized once (only) and ‘‘live’’ until the program terminates. Such objects are called static objects. A static object has the same address throughout the life of a program execution.
- Free store: Using the `new` and `delete` operators, we can create objects whose lifetimes are controlled directly.
- Temporary objects (e.g., intermediate results in a computation or an object used to hold a value for a reference to `const` argument): their lifetime is determined by their use. If they are bound to a reference, their lifetime is that of the reference; otherwise, they ‘‘live’’ until the end of the full expression of which they are part. A full expression is an expression that is not part of another expression. Typically, temporary objects are automatic.
- Thread-local objects; that is, objects declared `thread_local`: such objects are created when their thread is and destroyed when their thread is.

## 6.5 Type Aliases

An older syntax using the keyword `typedef` and placing the name being declared where it would have been in a declaration of a variable can equivalently be used in many contexts.

The `_t` suffix is conventional for aliases (‘‘typedefs’’).