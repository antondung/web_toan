Option Explicit

' ── Math Quest Launcher for Windows ──────────────────────────────
' Double-click this file to start the server and open the teacher page.
' No console window appears.

Dim WshShell, FSO
Set WshShell = CreateObject("WScript.Shell")
Set FSO      = CreateObject("Scripting.FileSystemObject")

Const PORT = 5001

' Project files live in the same folder as this script
Dim AppDir
AppDir = FSO.GetParentFolderName(WScript.ScriptFullName)

' ── Find Python ──────────────────────────────────────────────────
Dim PythonExe
PythonExe = FindPythonW()

If PythonExe = "" Then
    Dim answer
    answer = MsgBox("Python 3 is not installed." & vbCrLf & vbCrLf & _
                    "Click Yes to open python.org and download it." & vbCrLf & _
                    "During installation, check the box that says:" & vbCrLf & _
                    """Add Python to PATH""" & vbCrLf & vbCrLf & _
                    "Then open Math Quest again.", _
                    vbYesNo + vbExclamation, "Math Quest — Setup Needed")
    If answer = vbYes Then WshShell.Run "https://www.python.org/downloads/"
    WScript.Quit
End If

' ── Already running? Just open the page ─────────────────────────
If IsServerRunning() Then
    WshShell.Run "http://localhost:" & PORT & "/teacher"
    WScript.Quit
End If

' ── Start server silently (no window) ────────────────────────────
Dim cmd
cmd = Chr(34) & PythonExe & Chr(34) & " " & Chr(34) & AppDir & "\app.py" & Chr(34)
WshShell.Run cmd, 0, False   ' 0 = hidden window, False = don't wait

' ── Wait up to 10 s for the server to be ready ───────────────────
Dim i
For i = 1 To 20
    WScript.Sleep 500
    If IsServerRunning() Then
        WshShell.Run "http://localhost:" & PORT & "/teacher"
        WScript.Quit
    End If
Next

' Timed out — open anyway and hope for the best
WshShell.Run "http://localhost:" & PORT & "/teacher"
WScript.Quit

' ════════════════════════════════════════════════════════════════

Function FindPythonW()
    ' pythonw.exe is the Windows version of Python that runs with NO console window.
    Dim LocalApp : LocalApp = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%")
    Dim AppData  : AppData  = WshShell.ExpandEnvironmentStrings("%APPDATA%")
    Dim ProgFiles: ProgFiles = WshShell.ExpandEnvironmentStrings("%PROGRAMFILES%")

    Dim candidates(15)
    ' Python.org installer — per-user (most common on school/home machines)
    candidates(0)  = LocalApp & "\Programs\Python\Python313\pythonw.exe"
    candidates(1)  = LocalApp & "\Programs\Python\Python312\pythonw.exe"
    candidates(2)  = LocalApp & "\Programs\Python\Python311\pythonw.exe"
    candidates(3)  = LocalApp & "\Programs\Python\Python310\pythonw.exe"
    candidates(4)  = LocalApp & "\Programs\Python\Python39\pythonw.exe"
    ' Python.org installer — all-users
    candidates(5)  = ProgFiles & "\Python313\pythonw.exe"
    candidates(6)  = ProgFiles & "\Python312\pythonw.exe"
    candidates(7)  = ProgFiles & "\Python311\pythonw.exe"
    candidates(8)  = ProgFiles & "\Python310\pythonw.exe"
    ' Legacy / manual installs
    candidates(9)  = "C:\Python313\pythonw.exe"
    candidates(10) = "C:\Python312\pythonw.exe"
    candidates(11) = "C:\Python311\pythonw.exe"
    candidates(12) = "C:\Python310\pythonw.exe"

    Dim i
    For i = 0 To 12
        If candidates(i) <> "" And FSO.FileExists(candidates(i)) Then
            FindPythonW = candidates(i)
            Exit Function
        End If
    Next

    ' Last resort: see if pythonw is on PATH
    Dim exitCode
    exitCode = WshShell.Run("cmd /c pythonw --version > nul 2>&1", 0, True)
    If exitCode = 0 Then
        FindPythonW = "pythonw"
        Exit Function
    End If

    FindPythonW = ""
End Function

Function IsServerRunning()
    On Error Resume Next
    Dim http
    Set http = CreateObject("MSXML2.XMLHTTP")
    http.Open "GET", "http://localhost:" & PORT & "/", False
    http.setRequestHeader "Connection", "close"
    http.Send
    IsServerRunning = (Err.Number = 0 And http.Status > 0)
    On Error GoTo 0
End Function
