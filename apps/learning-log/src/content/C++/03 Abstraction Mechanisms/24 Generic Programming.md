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

What we need to do is to identify a small number of concepts (sets of requirements) that can be used for many templates and many types as arguments.

## 24.4 Making Concepts Concrete

A concept is a compile-time predicate that checks whether a set of template arguments meets its requirements.