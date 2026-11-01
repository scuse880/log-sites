---
title: Dim statement
date: 2026-09-20
---

If the `New` keyword is not used when declaring an object variable, the variable that refers to the object must be assigned an existing object by using the `Set` statement before it can be used. Until it is assigned an object, the declared object variable has the special value `Nothing`, which indicates that it doesn't refer to any particular instance of an object.

If you don't specify a data type or object type, and there is no `Def_type_` statement in the module, the variable is `Variant` by default.
