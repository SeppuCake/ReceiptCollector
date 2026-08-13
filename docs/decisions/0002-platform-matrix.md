# ADR 0002: Platform matrix

- Status: Accepted with implementation details open
- Date: 2026-08-13

## Decision

One React/TypeScript application core will be hosted by:

- Capacitor on Android and iPhone;
- Tauri on Windows.

The initial compatibility matrix is:

- Android 12 (API 31) through the latest tested Android version;
- a Huawei Mate 30-class device without assuming Google Play Services;
- iPhone XS Max as the lower-performance iPhone baseline;
- iPhone 13 Pro Max as the newer reference;
- Windows 10 22H2 x64, build 19045;
- Windows 11 x64.

The Windows prototype will use a per-current-user x64 NSIS installer and offline WebView2 prerequisite handling. Android will use a signed development/sideload APK. iPhone will use a development or ad-hoc package for registered devices.

## Stage 1 selections still open

- Exact Capacitor, Tauri, Rust, Android Gradle, native plugin, and OCR versions.
- Minimum iOS version supported by the selected Capacitor version.
- Android compile/target SDK values required at the time of packaging.
- Permanent application and bundle identifier.
- Exact Huawei/Xiaomi model, firmware, SDK_INT, RAM, storage, and GMS status.

Emulators may supplement but cannot replace physical-device acceptance.
