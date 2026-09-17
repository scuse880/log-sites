---
title: Function Statement
date: 2026-09-16
---

[Public | Private | Friend] [ Static ] Function name [ ( arglist ) ] [ As type ]
[ statements ]
[ name = expression ]
[ Exit Function ]
[ statements ]
[ name = expression ]
End Function

All executable code must be in procedures. You can't define a Function procedure inside another Function, Sub, or Property procedure.

To return a value from a function, assign the value to the function name. If no value is assigned to name, the procedure returns a default value.

Variables that are explicitly declared in a procedure (using Dim or the equivalent) are always local to the procedure. Variables that are used but not explicitly declared in a procedure are also local unless they are explicitly declared at some higher level outside the procedure.

Use an Option Explicit statement to force explicit declaration of variables.