# Stage 2 native feasibility status

Status: scaffolded; native acceptance blocked on external toolchains and devices.

## Completed locally

- Exact Capacitor 8.5.0 Android/iOS and Tauri CLI 2.11.4/API 2.11.1 packages are pinned in the npm lockfile.
- Capacitor projects exist under `android/` and `ios/`; the Tauri Windows project exists under `src-tauri/`.
- Generated web assets remain ignored and are reproduced with `npm.cmd run native:sync`.
- Android backup, cleartext traffic, and the INTERNET permission are disabled for the feasibility shell.
- iOS declares complete file protection and disables document-in-place/iTunes file sharing.
- The shared page and Tauri window enforce `connect-src 'self'`; Capacitor navigation has no external allow-list.
- Tauri packaging is disabled. No signing, package candidate, deployment, updater, or cloud service is configured.

These controls are defence in depth for an unverified shell. They do not claim private-file, key-protection, platform-authentication, or OCR acceptance.

## External blockers at this gate

The Windows host has no `rustc`, `cargo`, MSVC `cl`, JDK `java`, Android `adb`, macOS `xcodebuild`, Android/Huawei device, registered iPhone, or Windows 10 19045 test target. `npm.cmd run native:windows:info` confirms WebView2 151.0.4129.78 is present but reports missing MSVC/Windows SDK, Rust, Cargo, and rustup. `android\gradlew.bat test` stops before Gradle execution with `JAVA_HOME is not set and no 'java' command could be found in your PATH.` Consequently the required native build/run, airplane-mode packet monitoring, copied-file inspection, app-private storage proof, platform-authentication behavior, local OCR benchmark, startup benchmark, and development-signing tests cannot be executed here.

The latest Capacitor CLI also brings a development-only `xcode -> uuid@7.0.3` chain. `npm audit` reports three moderate findings for GHSA-w5hq-g745-h8pq with no upstream fix available through npm. Do not use an unsupported major-version override. This does not enter the web runtime bundle, but it must be resolved or risk-accepted after upstream fixes before an internal package candidate.

## Smallest external action

Provide a build host with Rust stable MSVC plus Visual Studio C++ Build Tools/WebView2, a supported JDK and Android SDK/ADB with an Android 12+ test device, and a macOS/Xcode host with a registered iPhone. Then run the native sync/builds using development signing only and implement each private-file/authentication/OCR adapter against measured device behavior. Independent Android, iOS, and Windows results should be recorded separately; one unavailable platform must not invalidate another passing platform.
