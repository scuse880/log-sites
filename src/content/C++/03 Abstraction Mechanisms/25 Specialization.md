---
title: 25 Specialization
date: 2026-08-28
---

## 25.2 Template Parameters and Arguments

### 25.2.1 Types as Arguments

A template argument is defined to be a type parameter by prefixing it with `typename` or `class`. The result of using either is completely equivalent.

### 25.2.5.1 Default Function Template Arguments

If all function template arguments are defaulted, the `<>` can be left out (exactly as in function template specializations).

## 25.3 Specialization

The `template<>` prefix says that this is a specialization that can be specified without a template parameter. The template arguments for which the specialization is to be used are specified in `<>` brackets after the name.

A specialization with a pattern containing a template parameter is called a partial specialization in contrast to complete specializations (as in the definition of `vector<void*>`), where "the pattern" is simply a specific type.

### 25.3.2 The Primary Template

The primary template must be declared before any specialization.

If a user specializes a template, that specialization must be in scope for every use of the template with the type for which it was specialized.

All specializations of a template must be declared in the same namespace as the primary template.

Explicitly specializing a template implies that no (other) definition is generated for that specialization.

### 25.3.4 Function Template Specialization

C++ supports only complete specialization for functions.
