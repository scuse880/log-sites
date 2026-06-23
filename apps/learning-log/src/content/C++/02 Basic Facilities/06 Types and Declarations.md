---
title: 06 Types and Declarations
date: 2026-06
---

## 6.1 The ISO C++ Standard

Many important things are deemed *implementation-defined* by the standard. This means that each implementation must provide a specific, well-defined behavior for a construct and that behavior must be documented.

Other behaviors are *unspecified*; that is, a range of possible behaviors are acceptable, but the implementer is not obliged to specify which actually occur.

 A construct is deemed *undefined* by the standard if no reasonable behavior is required by an implementation.

### 6.1.1 Implementation

A hosted implementation includes all the standard-library facilities as described in the standard and in this book. A freestanding implementation may provide fewer standard-library facilities, as long as the following are provided: ...

### 6.1.2 The Basic Source Character Set

A programming environment can map the extended character set into the basic source character set.