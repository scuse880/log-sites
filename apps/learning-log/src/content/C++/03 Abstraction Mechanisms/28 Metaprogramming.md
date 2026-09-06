---
title: 28 Metaprogramming
date: 2026-09-06
---

## 28.2 Type Functions

A type function is a function that either takes at least one type argument or produces at least one type as a result.

### 28.2.4 Traits

A trait is used to associate properties with a type.

## 28.4 Conditional Definition: Enable_if

### 28.4.1 Use of Enable_if

That (unused) default template argument will be instantiated because we certainly can't deduce that unused template parameter.

The Enable_if techniques work for template functions (including member functions of class templates and specializations) only.

## 28.6 Variadic Templates

### 28.6.2 Technical Details

```cpp
template<typename... Types>
void f(Types... args); // variadic template function
```

The `typename...` in the declaration of `Types` specifies that `Types` is a template parameter pack. The `...` in the type of `args` specifies that `args` is a function parameter pack. The type of each `args` function argument is the corresponding `Types` template argument. We can use `class...` with the same meaning as `typename...`.

A `sizeof...` expression is used to obtain the number of elements in a parameter pack.

## 28.7 SI Units Example

### 28.7.3 Unit Literals

I use `long double` arguments because that is required for floating-point literal operators.