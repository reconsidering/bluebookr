# Private Windows installer

Download: https://bluebookr.onrender.com/downloads/BluebookrSetup.exe
Checksum: https://bluebookr.onrender.com/downloads/SHA256SUMS.txt

See INSTALL-WINDOWS.txt for user instructions. The executable is unsigned and untested on a Windows host. It installs a per-user Office web add-in using HKCU WEF Developer registration, not a native COM/VSTO add-in. Availability across documents is not the same as guaranteed global activation of a ribbon tab. No machine-wide security policy is changed.

## Rebuild

Requires Python 3 (standard library) and NSIS 3.x. Run `python installer/build.py` from the checkout. On a portable NSIS setup, set `BLUEBOOKR_MAKENSIS` to the compiler and `NSISDIR` to its data directory. Assets and the starter document are generated from the current manifest. The installer packages its own manifest rather than downloading code at installation time. The web sidebar continues to load from Render.

This build used NSIS 3.11-1 from Debian trixie packages. Debian's InRelease signatures were checked using the installed Debian archive keyring, the package index against its signed SHA-256, and the compiler packages against the index SHA-256 entries. NSIS component license notices are included in the payload and repository. Generated icons/starter document are built by our own standard-library script.

The per-user manifest registration mechanism was verified against Microsoft's `office-addin-dev-settings` 4.0.1 `registerAddIn` implementation (OfficeDev/Office-Addin-Scripts). The starter document uses standard OOXML webextension relationships and registry store references.

## Validation performed

- NSIS compiled both install and uninstall sections successfully.
- Microsoft's `office-addin-manifest validate` returned **The manifest is valid**. The successful run used the environment's configured network proxy; the initial direct attempt could not reach the validator. This validates the manifest, not Windows execution.
- Tests verify PE/GUI format, SHA-256, starter-document manifest ID/version references, ribbon resource references, HTTP binary download headers, and PNG delivery.
- Application tests run with `npm test`.

## Windows verification still required

Use a normal user account with current Windows desktop Word. Save/close Word, install, open the starter, check the ribbon and sidebar, then try a separate document. Verify both 32-bit and 64-bit Office where available. Test upgrade, existing registration preservation, and uninstall restoration. Check the Windows Installed Apps entry and Start Menu shortcuts. Confirm user documents remain intact. No Windows execution test was possible in the build environment.

If Windows blocks the unsigned executable, do not disable protections globally; report the exact message. No organizational restrictions should be overridden. Code signing requires a separate publisher certificate and was not performed.
