# Budget Standalone v0.2 Stable — release acceptance

- [x] Source derived from user-accepted GUI & Titlebar Parity, not rejected geometry Hotfix 1.
- [x] Tauri window geometry and Rust window management untouched.
- [x] Only runtime behavior change: ready-stage splash hold 380 -> 980 ms.
- [x] Canonical data & seed-data hashes unchanged.
- [x] Version metadata / scripts / cache keys updated to 0.2.0 Stable.
- [ ] Native Windows build (`MAKE-FINAL-RELEASE.ps1`) passes with cargo-audit.
- [ ] Release Portable 3-file verification, source ZIP re-extract, hashes/metadata pass.
- [ ] User visually confirms final Windows EXE and startup.

For full release, avoid changing data in the staging Portable and preserve the original v0.1 Stable artifacts separately.
