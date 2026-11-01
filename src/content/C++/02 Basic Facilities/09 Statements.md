---
title: 09 Statements
date: 2026-07-03
---

## 9.1 Introduction

Note that a declaration is a statement and that an expression becomes a statement when you add a semicolon at its end.

Unlike an expression, a statement does not have a value. Instead, statements are used to specify the order of execution.

## 9.2 Statement Summary

A semicolon is by itself a statement, the empty statement.

A (possibly empty) sequence of statements within "curly braces" (i.e., `{` and `}`) is called a *block* or a *compound statement*. A name declared in a block goes out of scope at the end of its block.

A *declaration* is a statement and there is no assignment statement or procedure-call statement; assignments and function calls are expressions.

A *for-init-statement* must be either a declaration or an *expression-statement*. Note that both end with a semicolon.

A *for-init-declaration* must be the declaration of a single uninitialized variable. The variable is initialized by an element of the sequence specified as the *expression*. Thus, `auto` can be used.

## 9.3 Declarations as Statements

The reason for allowing declarations wherever a statement can be used (and a few other places) is to enable the programmer to minimize the errors caused by uninitialized variables and to allow better locality in code.

## 9.4 Selection Statements

### 9.4.1 if Statements

The operators `&&` and `||` will not evaluate their second argument unless doing so is necessary.

A name can only be used within the scope in which it is declared. In particular, it cannot be used on another branch of an `if`-statement.

If we need to introduce a name in a branch, it must be enclosed in a block.

### 9.4.2 switch Statements

The expression in the `case` labels must be a constant expression of integral or enumeration type.

A `switch`-statement can alternatively be written as a set of `if`-statements. It typically also leads to the generation of better code because there is no reason to repeatedly check individual values. Instead, a jump table can be used.

Beware that a case of a switch must be terminated somehow unless you want to carry on executing the next case. A `break` is the most common way of terminating a case, but a `return` is often useful.

There is one case where a `default` should not be used: if a `switch` is intended to have one case for each enumerator of an enumeration.

### 9.4.2.1 Declarations in Cases

However, it is not possible to bypass an initialization.

If we need a variable within a `switch`-statement, we can limit its scope by enclosing its declaration and its use in a block.

### 9.4.3 Declarations in Conditions

To avoid accidental misuse of a variable, it is usually a good idea to introduce the variable into the smallest scope possible. In particular, it is usually best to delay the definition of a local variable until one can give it an initial value.

In addition to the logical benefits of declaring variables in conditions, doing so also yields the most compact source code.

A declaration in a condition must declare and initialize a single variable or `const`.

## 9.5 Iteration Statements

### 9.5.1 Range-for Statements

The `for (int x : v)` can be read as "for each element `x` in the range `v`" or just "for each `x` in `v`." The
elements of `v` are visited in order from the first to the last.

The scope of the variable naming the element (here, `x`) is the `for`-statement.

The expression after the colon must denote a sequence (a range); that is, it must yield a value for which we can call `v.begin()` and `v.end()` or `begin(v)` and `end(v)` to obtain iterators:
- the compiler first looks for members `begin` and `end` and tries to use those. If a `begin` or an `end` is found that cannot be used as a range (e.g., because a member `begin` is a variable rather than a function), the range-`for` is an error.
- Otherwise, the compiler looks for a `begin`/`end` member pair in the enclosing scope. If none is found or if what is found cannot be used (e.g., because the `begin` did not take an argument of the sequence's type), the range-`for` is an error.

### 9.5.3 while Statements

I tend to prefer `while`-statements over `for`-statements when there isn't an obvious loop variable or where the update of a loop variable naturally comes in the middle of the loop body.

A `for`-statement is easily rewritten into an equivalent `while`-statement and vice versa.

### 9.5.5 Loop Exit

A `break` "breaks out of" the nearest enclosing switch-statement or iteration-statement.

A `continue` skips the rest of the body of an iteration-statement.

## 9.6 goto Statements

The scope of a label is the function it is in. This implies that you can use `goto` to jump both into and out of blocks. The only restriction is that you cannot jump past an initializer or into an exception handler.

## 9.7 Comments and Indentation

There are two forms of comments:
- line comments: `//` the comment extends to the end of the line
- block comments: `/*` the comment extends to the end-of-comment marker `*/`

The `/* */` style comments do not nest.

If something can be stated in the language itself, it should be, and not just mentioned in a comment.

Writing good comments can be as difficult as writing the program itself.