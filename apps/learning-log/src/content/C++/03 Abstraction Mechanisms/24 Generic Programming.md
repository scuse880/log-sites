---
title: 24 Generic Programming
date: 2026-08-25
---

## 24.1 Introduction

The type checking provided for templates checks the use of arguments in the template definition
rather than against an explicit interface (in a template declaration).

A key aspect of generic programming, metaprogramming, and probably all uses of templates is
the uniform handling of built-in types and user-defined types.

## 24.2 Algorithms and Lifting

lifting a general algorithm from specific functions.

## 24.3 Concepts

## 24.4 Making Concepts Concrete

A concept is a predicate; that is, we think of a concept as a compile-time function that looks at a
set of template arguments and returns true if they meet the concept’s requirements and false if they
don’t. So, we implement a concept as a `constexpr` function.

Here, I will use the term constraints
check to refer to a call of a `constexpr` predicate that checks a concept for a set of types and values.
In contrast to proper concepts, a constraints check does not deal with semantic issues; it simply
checks assumptions about syntactic properties.