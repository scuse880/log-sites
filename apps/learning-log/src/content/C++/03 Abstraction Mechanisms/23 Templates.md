---
title: 23 Templates
date: 2026-08-22
---

## 23.2 A Simple String Template

### 23.2.1 Defining a Template

A class generated from a class template is a perfectly ordinary class.

### 23.2.2 Template Instantiation

The process of generating a class or a function from a template plus a template argument list is often called template instantiation. A version of a template for a specific template argument list is called a specialization.

## 23.3 Type Checking

We can think of "C must be a container" as a predicate that takes a type, `C`, as an argument and returns true if `C` is a container (however we may have defined "container") and false if it is not. For example, `Container<vector<int>>()` and `Container<list<string>>()` should be true whereas `Container<int>()` and `Container<shared_ptr<string>>()` should be false. We call such a predicate a concept.

C++ does not directly support concepts, but that does not mean that concepts don't exist.

## 23.5 Function Templates

When a function template is called, the types of the function arguments determine which version of the template is used; that is, the template arguments are deduced from the function arguments.

### 23.5.3.2 Argument Substitution Failure

Substitution failure is not an error.

## 23.6 Template Aliases

We can define an alias for a type with the `using` syntax or with the `typedef` syntax. The `using` syntax is more general in the important sense that it can be used to define an alias for a template with some of its arguments bound.

When we use the alias, it is completely equivalent to a use of the original template.