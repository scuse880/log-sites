---

title: 11 Select Operations
date: 2026-07-10
----------------

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

`y = ++x` is equivalent to `y = (x = x + 1)`.

`y = x++` is equivalent to `y = (t = x, x = x + 1, t)`, where `t` is a variable of the same type as `x`.

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