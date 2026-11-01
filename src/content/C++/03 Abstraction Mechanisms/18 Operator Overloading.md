---
title: 18 Operator Overloading
date: 2026-07-30
---

## 18.2 Operator Functions

User-defined literals are defined by using the `operator""` notation. Similarly, `operator T()` defines a conversion to a type `T`.

The name of an operator function is the keyword `operator` followed by the operator itself, for example, `operator<<`.

A use of the operator is only a shorthand for an explicit call of the operator function.

### 18.2.1 Binary and Unary Operators

For any binary operator `@`, `aa@bb` can be interpreted as either `aa.operator@(bb)` or `operator@(aa,bb)`. If both are defined, overload resolution determines which, if any, interpretation is used.

The default meaning of `&&`, `||`, and `,` (comma) involves sequencing: the first operand is evaluated before the second (and for `&&` and `||` the second operand is not always evaluated). This special rule does not hold for user-defined versions of `&&`, `||`, and `,` (comma); instead, these operators are treated exactly like other binary operators.

### 18.2.2 Predefined Meanings for Operators

The meanings of some built-in operators are defined to be equivalent to some combination of other operators on the same arguments. For example, if `a` is an `int`, `++a` means `a+=1`, which in turn means `a=a+1`. Such relations do not hold for user-defined operators unless the user defines them to. For example, a compiler will not generate a definition of `Z::operator+=()` from the definitions of `Z::operator+()` and `Z::operator=()`.

The operators `=` (assignment), `&` (address-of), and `,` (sequencing) have predefined meanings when applied to class objects. These predefined meanings can be eliminated ("deleted"). Alternatively, they can be given new meanings by suitable definitions.

### 18.2.3 Operators and User-Defined Types

An operator function must either be a member or take at least one argument of a user-defined type (functions redefining the `new` and `delete` operators need not).

### 18.2.4 Passing Objects

Typically, an operator returns a result. Returning a pointer or a reference to a newly created object is usually a very bad idea.

Instead, return objects by value.

## 18.3 A Complex Number Type

### 18.3.3 Conversions

A constructor taking a single argument specifies a conversion from its argument type to the constructor's type.

## 18.4 Type Conversion

Type conversion can be accomplished by

* a constructor taking a single argument
* a conversion operator

In either case, the conversion can be

* explicit; that is, the conversion is only performed in a direct initialization, i.e., as an initializer not using an `=`.
* implicit; that is, it will be applied wherever it can be used unambiguously, e.g., as a function argument.

### 18.4.1 Conversion Operators

```cpp
Tiny::operator int() const { return v; } // right
int Tiny::operator int() const { return v; } // error
```

### 18.4.3 Ambiguities

In some cases, a value of the desired type can be constructed by repeated use of constructors or conversion operators. This must be handled by explicit conversions; only one level of user-defined implicit conversion is legal. In some cases, a value of the desired type can be constructed in more than one way; such cases are illegal.

User-defined conversions are considered only if a call cannot be resolved without them (i.e., using only built-in conversions).