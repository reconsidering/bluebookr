Unicode true
!include "MUI2.nsh"
!include "x64.nsh"
Name "Bluebookr for Word"
OutFile "../public/downloads/BluebookrSetup.exe"
InstallDir "$LOCALAPPDATA\Bluebookr"
RequestExecutionLevel user
SetCompressor /SOLID lzma
BrandingText "Bluebookr — private Word add-in"
VIProductVersion "1.1.0.0"
VIAddVersionKey "ProductName" "Bluebookr for Word"
VIAddVersionKey "FileDescription" "Bluebookr per-user Word add-in setup"
VIAddVersionKey "FileVersion" "1.1.0.0"
VIAddVersionKey "LegalCopyright" "Bluebookr contributors"
!define ADDIN_ID "762eb57c-3a32-4929-856f-2bb41144b148"
!define DEVELOPER_KEY "Software\Microsoft\Office\16.0\WEF\Developer"
!define STATE_KEY "Software\BluebookrInstaller"
!define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\Bluebookr"
!define MUI_WELCOMEPAGE_TEXT "Install Bluebookr for the current Windows account.$\r$\n$\r$\nRequires modern desktop Microsoft Word and internet access. Setup registers a local Office web add-in and adds Start Menu shortcuts. No admin access, network share, or macro security changes are needed.$\r$\n$\r$\nThis private installer is unsigned and has not been tested inside Windows Word. You may need to enable/open the add-in in each new document."
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT "Open the Bluebookr starter document in Word"
!define MUI_FINISHPAGE_RUN_FUNCTION OpenStarter
!define MUI_FINISHPAGE_TEXT "Setup registered Bluebookr for your Windows account.$\r$\n$\r$\nOpen the starter document to load the Bluebookr ribbon tab and sidebar. Word may ask you to trust the add-in. For other documents, use Word's Add-ins menu if the tab is not visible. You should not need to reinstall.$\r$\n$\r$\nInstructions and the uninstaller are in the Bluebookr Start Menu folder."
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

!macro RequireWordClosed
  word_check:
  FindWindow $0 "OpusApp"
  StrCmp $0 0 word_closed
  IfSilent 0 +2
  Abort
  MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Please save your work and close ALL Word windows before continuing. Setup will not close Word or discard documents." IDRETRY word_check IDCANCEL word_cancel
  word_cancel:
  Abort
  word_closed:
!macroend
Function .onInit
  SetShellVarContext current
  !insertmacro RequireWordClosed
FunctionEnd
Function un.onInit
  SetShellVarContext current
  !insertmacro RequireWordClosed
FunctionEnd

!macro RegisterView BITS
  SetRegView ${BITS}
  ReadRegStr $0 HKCU "${DEVELOPER_KEY}" "${ADDIN_ID}"
  StrCmp $0 "$INSTDIR\manifest.xml" registered_${BITS}
  WriteRegStr HKCU "${STATE_KEY}" "PreviousManifest${BITS}" "$0"
  registered_${BITS}:
  ClearErrors
  WriteRegStr HKCU "${DEVELOPER_KEY}" "${ADDIN_ID}" "$INSTDIR\manifest.xml"
  IfErrors 0 +3
  MessageBox MB_OK|MB_ICONSTOP "Word add-in registration failed. No Word security policy was changed. Please report this setup error."
  Abort
!macroend

Section "Bluebookr" SEC_MAIN
  SetOutPath "$INSTDIR"
  File /oname=manifest.xml "../public/word/manifest.xml"
  File "Bluebookr-Start.docx"
  File /oname=README.txt "INSTALL-WINDOWS.txt"
  File "NSIS-LICENSES.txt"
  ${If} ${RunningX64}
    !insertmacro RegisterView 64
  ${EndIf}
  !insertmacro RegisterView 32
  SetRegView 32
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayName" "Bluebookr for Word (private add-in)"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayVersion" "1.1.0"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "Publisher" "Bluebookr"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "UninstallString" '$\"$INSTDIR\Uninstall.exe$\"'
  WriteRegStr HKCU "${UNINSTALL_KEY}" "QuietUninstallString" '$\"$INSTDIR\Uninstall.exe$\" /S'
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayIcon" "$INSTDIR\Uninstall.exe"
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoRepair" 1
  CreateDirectory "$SMPROGRAMS\Bluebookr"
  CreateShortCut "$SMPROGRAMS\Bluebookr\Open Bluebookr in Word.lnk" "$INSTDIR\Bluebookr-Start.docx"
  CreateShortCut "$SMPROGRAMS\Bluebookr\Instructions.lnk" "$INSTDIR\README.txt"
  CreateShortCut "$SMPROGRAMS\Bluebookr\Uninstall Bluebookr.lnk" "$INSTDIR\Uninstall.exe"
SectionEnd

Function OpenStarter
  ExecShell "open" "$INSTDIR\Bluebookr-Start.docx"
FunctionEnd

!macro UnregisterView BITS
  SetRegView ${BITS}
  ReadRegStr $0 HKCU "${DEVELOPER_KEY}" "${ADDIN_ID}"
  StrCmp $0 "$INSTDIR\manifest.xml" 0 unregister_done_${BITS}
  ReadRegStr $1 HKCU "${STATE_KEY}" "PreviousManifest${BITS}"
  StrCmp $1 "" 0 restore_${BITS}
  DeleteRegValue HKCU "${DEVELOPER_KEY}" "${ADDIN_ID}"
  Goto unregister_done_${BITS}
  restore_${BITS}:
  WriteRegStr HKCU "${DEVELOPER_KEY}" "${ADDIN_ID}" "$1"
  unregister_done_${BITS}:
  DeleteRegValue HKCU "${STATE_KEY}" "PreviousManifest${BITS}"
  DeleteRegKey /ifempty HKCU "${STATE_KEY}"
!macroend
Section "Uninstall"
  ${If} ${RunningX64}
    !insertmacro UnregisterView 64
  ${EndIf}
  !insertmacro UnregisterView 32
  SetRegView 32
  DeleteRegKey HKCU "${UNINSTALL_KEY}"
  Delete "$SMPROGRAMS\Bluebookr\Open Bluebookr in Word.lnk"
  Delete "$SMPROGRAMS\Bluebookr\Instructions.lnk"
  Delete "$SMPROGRAMS\Bluebookr\Uninstall Bluebookr.lnk"
  RMDir "$SMPROGRAMS\Bluebookr"
  Delete "$INSTDIR\manifest.xml"
  Delete "$INSTDIR\Bluebookr-Start.docx"
  Delete "$INSTDIR\README.txt"
  Delete "$INSTDIR\NSIS-LICENSES.txt"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
SectionEnd
