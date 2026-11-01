---
title: 07 Pointers, Arrays, and References
date: 2026-06-29
---

## 7.2 Pointers

The fundamental operation on a pointer is dereferencing, that is, referring to the object pointed to by the pointer. This operation is also called indirection.

### 7.2.1 void*

A pointer to any type of object can be assigned to a variable of type `void*`, but a pointer to function or a pointer to member cannot.

### 7.2.2 nullptr

There is just one `nullptr`, which can be used for every pointer type, rather than a null pointer for each pointer type.

## 7.3 Arrays

Access out of the range of an array is undefined and usually disastrous. In particular, run-time range checking is neither guaranteed nor common.

The number of elements of the array (not allocated using `new`), the array bound, must be a constant expression. If
you need variable bounds, use a vector.

### 7.3.1 Array Initializers

There is no built-in copy operation for arrays. You cannot initialize one array with another (not even of exactly the same type), and there is no array assignment.

Similarly, you can’t pass arrays by value.

### 7.3.2 String Literals

The type of a string literal is an array of the appropriate number of `const` characters.

Whether two identical string literals are allocated as one array or as two is implementation defined.

The compiler will concatenate adjacent string literals.

### 7.3.2.1 Raw Character Strings

Raw string literals use the `R"(ccc)"` notation for a sequence of characters `ccc`. The initial `R` is there to distinguish raw string literals from ordinary string literals. The parentheses are there to allow ("unescaped") double quotes.

In contrast to nonraw string literals, a raw string literal can contain a newline.

### 7.3.2.2 Larger Character Sets

A string with the prefix `L`, such as `L"angst"`, is a string of wide characters. Its type is `const wchar_t[]`. Similarly, a string with the prefix `LR`, such as `LR"(angst)"`, is a raw string of wide characters of type `const wchar_t[]`. Such a string is terminated by a `L'\0'` character.

```
"folder\\file" // implementation character set string
R"(folder\file)" // implementation character raw set string
u8"folder\\file" // UTF-8 string
u8R"(folder\file)" // UTF-8 raw string
u"folder\\file" // UTF-16 string
uR"(folder\file)" // UTF-16 raw string
U"folder\\file" // UTF-32 string
UR"(folder\file)" // UTF-32 raw string
```

The order of the `u`s and `R`s and their cases are significant: `RU` and `Ur` are not valid string prefixes.

## 7.4 Pointers into Arrays

There is no way of declaring a function so that the array `v` is copied when the function is called. 

### 7.4.1 Navigating Arrays

When an arithmetic operator is applied to a pointer `p` of type `T*`, `p` is assumed to point to an element of an array of objects of type `T`; `p+1` points to the next element of that array, and `p-1` points to the previous element.

Arrays are not self-describing because the number of elements of an array is not guaranteed to be stored with the array.

## 7.5 Pointers and const

Basically, `constexpr`’s role is to enable and ensure compile-time evaluation, whereas `const`’s primary role is to specify immutability in interfaces.

Because an object declared `const` cannot be assigned to, it must be initialized.

Note that `const` modifies a type.

To declare a pointer itself, rather than the object pointed to, to be a constant, we use the declarator operator `*const` instead of plain `*`. 

There is no `const∗` declarator operator, so a `const` appearing before the `∗` is taken to be part of the base type.

The address of a constant cannot be assigned to an unrestricted pointer because this would allow the object’s value to be changed.

## 7.6 Pointers and Ownership

It is usually a good idea to immediately place a pointer that represents ownership in a resource handle class, such as `vector`, `string`, and `unique_ptr`. That way, we can assume that every pointer that is not within a resource handle is not an owner and must not be `delete`d.

## 7.7 References

Using a pointer differs from using the name of an object in a few ways:

-  We use a different syntax, for example, `*p` instead of `obj` and `p->m` rather than `obj.m`.
- We can make a pointer point to different objects at different times.
- We must be more careful when using pointers than when using an object directly: a pointer may be a `nullptr` or point to an object that wasn’t the one we expected.

These differences can be annoying; for example, some programmers find `f(&x)` ugly compared to `f(x)`. Worse, managing pointer variables with varying values and protecting code against the possibility of `nullptr` can be a significant burden. Finally, when we want to overload an operator, say `+`, we want to write `x+y` rather than `&x+&y`. The language mechanism addressing these problems is called a reference. Like a pointer, a reference is an alias for an object, is usually implemented to hold a machine address of an object, and does not impose performance overhead compared to pointers, but it differs from a pointer in that:

- You access a reference with exactly the same syntax as the name of an object.
- A reference always refers to the object to which it was initialized.
- There is no “null reference,” and we may assume that a reference refers to an object.


There are three kinds of references:

- lvalue references: to refer to objects whose value we want to change
- `const` references: to refer to objects whose value we do not want to change, e.g., a constant
- rvalue references: to refer to objects whose value we do not need to preserve after we have used it, e.g., a temporary

Collectively, they are called references. The first two are both called lvalue references.

### 7.7.1 Lvalue References

To ensure that a reference is a name for something, we must initialize the reference.

Despite appearances, no operator operates on a reference.

The initializer for a "plain" `T&` must be an lvalue of type `T`.

The initializer for a `const T&` need not be an `lvalue` or even of type `T`. In such cases:
- First, implicit type conversion to `T` is applied if necessary.
- Then, the resulting value is placed in a temporary variable of type `T`.
- Finally, this temporary variable is used as the value of the initializer.

The semantics of argument passing are defined to be those of initialization.

### 7.7.2 Rvalue References

An rvalue reference refers to a temporary object, which the user of the reference can (and typically will) modify, assuming that the object will never be used again.

The `&&` declarator operator means "rvalue reference."

We do not use `const` rvalue references; most of the benefits from using rvalue references involve writing to the object to which it refers.

The standard library provides a `move()` function: `move(x)` means `static_cast<X&&>(x)`.

Since `move(x)` does not move `x` (it simply produces an rvalue reference to `x`), it would have been better if `move()` had been called `rval()`, but by now `move()` has been used for years.

### 7.7.3 References to References

lvalue reference refers to an lvalue.

### 7.7.4 Pointers and References

If you need to change which object to refer to, use a pointer.

If you want to be sure that a name always refers to the same object, use a reference.

If you want to use a user-defined (overloaded) operator on something that refers to an object, use a reference.

A reference is not an object.

If you need a notion of ‘‘no value,’’ pointers offer `nullptr`.