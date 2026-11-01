---
title: 24 Generic Programming
date: 2026-08-25
---

## 24.1 Introduction

Templates are type-checked based on how their arguments are used, and generic programming aims to handle built-in and user-defined types uniformly.

## 24.2 Algorithms and Lifting

lifting a general algorithm from specific functions.

## 24.3 Concepts

What we need to do is to identify a small number of concepts (sets of requirements) that can be used for many templates and many types as arguments.

## 24.4 Making Concepts Concrete

A concept is a compile-time predicate that checks whether a set of template arguments meets its requirements.