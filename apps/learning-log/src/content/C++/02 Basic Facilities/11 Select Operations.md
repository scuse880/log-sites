---
title: 11 Select Operations
date: 2026-07-10
---

## 11.1 Etc. Operators

### 11.1.1 Logical Operators

The logical operators `&&` (and), `||` (or), and `!` (not) take operands of arithmetic and pointer types, convert them to `bool`, and return a `bool` result.

### 11.1.2 Bitwise Logical Operators

The bitwise logical operators `&` (and), `|` (or), `^` (exclusive or, xor), `~` (complement), `>>` (right shift), and `<<` (left shift) are applied to objects of integral types.

A plain `enum` (but not an `enum class`) can be implicitly converted to an integer type and used as an operand to bitwise logical operations. The usual arithmetic conversions determine the type of the result.

### 11.1.3 Conditional Expressions

Conditional expressions are important in that they can be used in constant expressions.

A pair of expressions `e1` and `e2` can be used as alternatives in a conditional expression, `c ? e1 : e2`, if they are of the same type or if there is a common type `T` to which they can both be implicitly converted. For arithmetic types, the usual arithmetic conversions are used to find that common type. For other types, either `e1` must be implicitly convertible to `e2`'s type or vice versa.

In addition, one branch may be a throw-expression.

### 11.1.4 Increment and Decrement

`y=++x` is equivalent to `y=(x=x+1)`. `y=x++` is equivalent to `y=(t=x,x=x+1,t)`, where `t` is a variable of the same type as `x`.


## 11.2 Free Store

A named object has its lifetime determined by its scope.

However, it is often useful to create an object that exists independently of the scope in which it was created. The operator `new` creates such objects, and the operator `delete` can be used to destroy them. Objects allocated by `new` are said to be "on the free store" (also, "on the heap" or "in dynamic memory").

An object created by `new` exists until it is explicitly destroyed by `delete`.

The `delete` operator may be applied only to a pointer returned by `new` or to `nullptr`. Applying `delete` to `nullptr` has no effect.

If the deleted object is of a class with a destructor, that destructor is called by `delete` before the object's memory is released for reuse.

### 11.2.1 Memory Management

The main problems with free store are:

* Leaked objects: People use `new` and then forget to delete the allocated object.
* Premature deletion: People delete an object that they have some other pointer to and later use that other pointer.
* Double deletion: An object is deleted twice, invoking its destructor, if any, twice.

As alternatives to using "naked" `new`s and `delete`s, I can recommend two general approaches to resource management that avoid such problems:

1. Don't put objects on the free store if you don't have to; prefer scoped variables.
2. When you construct an object on the free store, place its pointer into a manager object, sometimes called a handle, with a destructor that will destroy it.

My rule of thumb for the use of `new` and `delete` is "no naked use of `new`"; that is, `new` belongs in constructors and similar operations, `delete` belongs in destructors, and together they provide a coherent memory management strategy. In addition, `new` is often used in arguments to resource handles.

### 11.2.2 Arrays

The "plain" `operator delete` is used to delete individual objects; `delete[]` is used to delete arrays.

To deallocate space allocated by `new`, `delete` and `delete[]` must be able to determine the size of the object allocated.

Note that a `vector` is a proper object and can therefore be allocated and deallocated using plain `new` and `delete`.

Applying `delete[]` to the null pointer has no effect.

Do not use `new` to create local objects.

### 11.2.3 Getting Memory Space

The standard implementations of `operator new()` and `operator new[]()` do not initialize the memory returned.

The allocation and deallocation functions deal in untyped and uninitialized memory, often called "raw memory," as opposed to typed objects.

What happens when `new` can find no store to allocate? By default, the allocator throws a standard-library `bad_alloc` exception.

In addition to the functions defined in `<new>`, a user can define `operator new()`, etc., for a specific class.

### 11.2.4 Overloading `new`

The `new(buf) X` syntax for supplying extra arguments to `operator new()` is known as the placement syntax.

The "placement delete" operators do nothing except possibly inform a garbage collector that the deleted pointer is no longer safely derived.

### 11.2.4.1 `nothrow` New

In programs where exceptions must be avoided, we can use `nothrow` versions of `new` and `delete`.

These `operator new` functions return `nullptr`, rather than throwing `bad_alloc`, if there is not sufficient memory to allocate.

## 11.3 Lists

In addition to their use for initializing named variables, `{}`-lists can be used as expressions in many, but not all, places. They can appear in two forms:

1. Qualified by a type, `T{...}`, meaning "create an object of type `T` initialized by `T{...}`"
2. Unqualified, `{...}`, for which the type must be determined from the context of use

### 11.3.1 Implementation Model

The implementation model for `{}`-lists comes in three parts:

* If the `{}`-list is used as constructor arguments, the implementation is just as if you had used a `()`-list. List elements are not copied except as by-value constructor arguments.
* If the `{}`-list is used to initialize the elements of an aggregate, an array or a class without a constructor, each list element initializes an element of the aggregate. List elements are not copied except as by-value arguments to aggregate element constructors.
* If the `{}`-list is used to construct an `initializer_list` object, each list element is used to initialize an element of the underlying array of the `initializer_list`. Elements are typically copied from the `initializer_list` to wherever we use them.

The lifetime of a `{}`-list and its underlying array is determined by the scope in which it is used. When used to initialize a variable of type `initializer_list<T>`, the list lives as long as the variable. When used in an expression, including as an initializer for a variable of some other type, such as `vector<T>`, the list is destroyed at the end of its full expression.

### 11.3.2 Qualified Lists

The basic idea of initializer lists as expressions is that if you can initialize a variable `x` using the notation

`T x {v};`

then you can create an object with the same value as an expression using `T{v}` or `new T{v}`.

### 11.3.3 Unqualified Lists

An unqualified list is used where an expected type is unambiguously known. It can be used as an expression only as:

* A function argument
* A return value
* The right-hand operand of an assignment operator, such as `=`, `+=`, or `*=`
* A subscript

When used as the initializer for a named object without the use of `=`, an unqualified `{}`-list performs direct initialization. In all other cases, it performs copy initialization.

The type of a `{}`-list can be deduced (only) if all elements are of the same type.

We do not deduce the type of an unqualified list for a plain template argument. Similarly, we do not deduce the element type of a container represented as a template.