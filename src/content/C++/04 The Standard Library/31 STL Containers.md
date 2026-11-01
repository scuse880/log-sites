---
title: 31 STL Containers
date: 2026-09-17
---

## 31.2 Container Overview

### 31.2.2 Element Requirements

### 31.2.2.1 Comparisons

The ordering criterion must define a strict weak ordering. Informally, this means that both less-than and equality (if defined) must be transitive.

## 31.3 Operations Overview

Note that the "Big O" complexity measures are asymptotic; that is, it could require a lot of elements before complexity differences matter. Other factors, such as the cost of an individual operation on an element, may dominate. For example, traversing a `vector` and a `list` both have complexity `O(n)`. However, given modern machine architectures, getting to the next element through a link (in a `list`) can be very much more expensive than getting to the next element of a `vector` (where the elements are contiguous). Similarly, a linear algorithm may take significantly more or significantly less than ten times as long for ten times as many elements because of the details of memory and processor architecture. Don't just trust your intuition about cost and your complexity measures; measure.
