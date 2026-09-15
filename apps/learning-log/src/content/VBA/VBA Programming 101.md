---
title: VBA Programming 101
date: 2026-09-15
---

## The Object Model

Developers organize programming objects in a hierarchy, and that hierarchy is called the object model of the application.

The definition of an object is called a class.

## Methods

In Word, for example, you can change the properties and invoke the methods of the current Word document by using the `ActiveDocument` property of the `Application` object.

## Properties

You use the same syntax to set a property that you use to read a property.

## Variables

To use a variable in VBA, you must tell VBA which type of object the variable represents by using the `Dim` statement.

## Branching and looping

```vba
Sub Macro1()

    If Worksheets(1).Range("A1").Value = "Yes!" Then

        Dim i As Integer

        For i = 2 To 10

            Worksheets(1).Range("A" & i).Value = "OK! " & i

        Next i

    Else

        MsgBox "Put Yes! in cell A1"

    End If

End Sub
```