---
title: 26 Instantiation
date: 2026-08-30
---

## 26.2 Template Instantiation

From a template function and a set of template arguments, a function needs to be generated. This process is commonly called template instantiation.

The generated classes and functions are called specializations.

### 26.2.1 When Is Instantiation Needed?

A place where a template is used defines a point of instantiation.

Instantiation of a class template does not imply the instantiation of all of its member functions.

### 26.2.2 Manual Control of Instantiation

An explicit instantiation request (often simply called an explicit instantiation) is a declaration of a specialization prefixed by the keyword `template` (not followed by `<`).

When a class template is explicitly instantiated, every member function is also instantiated.

To complement explicit instantiation requests, the language provides explicit requests not to instantiate (usually called `extern` templates).

## 26.3 Name Binding

The process of finding the declaration for each name explicitly or implicitly used in a template is called name binding.

### 26.3.3 Point-of-Instantiation Binding

Each use of a template for a given set of template arguments defines a point of instantiation. For a function template, that point is in the nearest global or namespace scope enclosing its use, just after the declaration that contains that use. For a template class or a class member, the point of instantiation is just before the declaration containing its use.