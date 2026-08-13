# Dependency review

Reviewed 2026-08-13. Exact versions are pins, not floating recommendations. Registry metadata was checked with `npm view`; installed versions were checked with `npm ls`. Official project links are retained so a clean-room reviewer can repeat the assessment.

## Selected and pinned

| Area | Exact version | Licence and maintenance | Compatibility and offline fit | Size and redistribution |
|---|---:|---|---|---|
| [Playwright Test](https://playwright.dev/docs/intro) | `@playwright/test 1.62.1` | Apache-2.0; current, actively maintained Microsoft project | Node 20+; Stage 1 uses Chromium only and loopback-only test traffic | npm package 28,544 bytes unpacked; downloaded Chromium is development-only, locally cached, and not redistributed with the app |
| [vite-plugin-pwa](https://github.com/vite-pwa/vite-plugin-pwa) | `1.3.0` | MIT; maintained and Vite 8 compatible | Browser baseline only; inject-manifest produces a fully local service worker | npm package 241,610 bytes unpacked; source licence notices must be retained |
| [Workbox](https://github.com/GoogleChrome/workbox) | `workbox-build 7.4.1`, runtime modules `7.4.1` | MIT; maintained by Google Chrome teams | Browser baseline only; no runtime download is permitted | Transitive through vite-plugin-pwa; bundle contribution is measured by `npm run build` |
| [Dexie](https://dexie.org/) | `4.4.4` | Apache-2.0; actively maintained | Browser baseline adapter only; offline capable but not encrypted, durable, or suitable as the native vault | Already in the browser bundle; must be removed from native vault composition after migration |

## Native platform selection for the feasibility slice

| Area | Pin / source | Status | Platform and security notes | Package size / redistribution |
|---|---|---|---|---|
| [Capacitor](https://capacitorjs.com/docs) | `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios` `8.5.0` | Selected for the Stage 2 Android/iOS shell; MIT and actively maintained | Android and iOS native projects are source artifacts. Android requires its SDK/JDK; iOS requires macOS/Xcode and Apple tooling. Runtime plugins must not add updater, analytics, or remote services. | Registry unpacked sizes: core 374,298 B; CLI 910,300 B; Android 447,682 B; iOS 408,800 B. Native SDK output is measured after scaffold; MIT notice redistributes normally. |
| [Tauri](https://v2.tauri.app/start/prerequisites/) | `@tauri-apps/cli 2.11.4`, `@tauri-apps/api 2.11.1`; Rust crates locked by `Cargo.lock` | Selected for the Stage 2 Windows shell; MIT OR Apache-2.0 and actively maintained | Windows requires Rust MSVC, Microsoft C++ Build Tools, and WebView2. No updater plugin is selected. A system WebView means clean-machine testing is mandatory. | npm unpacked sizes: CLI 381,640 B; API 699,049 B. Tauri reports small binaries by using the system webview; actual candidate size must be recorded from the locked build. |
| Rust toolchain | Stable MSVC, exact channel to be written to `rust-toolchain.toml` when installed | Required but not present on the Stage 1 Windows host | Rust, `cargo`, MSVC Build Tools, and `cl` are external toolchain prerequisites. | Toolchain is development-only and is not redistributed. |
| Android requirements | Android Studio/SDK, JDK, Gradle wrapper, API level chosen by Capacitor 8 | Required but not present on the Stage 1 host | Target remains Android 12+. Use development signing only. Hardware airplane-mode, biometric, camera, and packet tests cannot be replaced by an emulator-only result. | SDK/emulator are development-only; Gradle artefact licences and APK size must be captured after build. |
| iOS requirements | Current Capacitor 8-supported Xcode/iOS SDK | Required on macOS; unavailable on this Windows host | iOS builds, Keychain/LocalAuthentication, camera/share behavior, and device provisioning require macOS/Xcode and a registered test device. | Development tools are not redistributed; IPA/framework sizes must be captured on the macOS gate. |

## Storage and key facilities

- Native files: select application-private directories exposed by each shell for the feasibility slice. Do not use shared photo/document directories for originals. A private directory is not, by itself, encryption.
- [Android Keystore](https://developer.android.com/privacy-and-security/keystore) is the selected key-protection facility for Android. It can keep key material non-exportable and gate use on user authentication. No JavaScript keychain wrapper is selected; the adapter will be native and narrow.
- [Apple Keychain with LocalAuthentication](https://developer.apple.com/documentation/localauthentication/accessing-keychain-items-with-face-id-or-touch-id) is the selected iOS facility. Face ID usage text and device-passcode fallback require device review.
- Windows key protection remains open between DPAPI/Windows Hello and a narrowly scoped Tauri/Rust adapter. No choice is claimed until Windows 10 19045 and Windows 11 behavior is tested.
- `@capacitor-community/sqlite 8.1.1` (MIT, 2,034,996 B unpacked) was reviewed but not selected. Its mobile SQLCipher support is useful, but it does not provide the Tauri Windows half of one vault/recovery design and cannot substitute for explicit key lifecycle tests.
- SQLCipher Community Edition `4.17.0` was reviewed for Android API 23+ support. It is not selected yet: the Stage 3 design must reconcile iOS/Windows builds, notices, migration behavior, KDF parameters, authenticated file/source storage, and recovery compatibility.

## OCR engine and models

- [Tesseract 5.5.2](https://github.com/tesseract-ocr/tesseract/releases) with Apache-2.0 code is the offline benchmark candidate, not yet a product selection. Tesseract does not parse PDFs itself and depends on Leptonica and its licences.
- Candidate `tessdata_fast` models are English `eng` (3.92 MB), Malay `msa` (1.67 MB), Traditional Chinese `chi_tra` (2.26 MB), and secondary Simplified Chinese `chi_sim` (2.35 MB). Model repository provenance, individual file SHA-256 values, traineddata version, and notices must be pinned before bundling.
- [Tesseract.js 7.0.0](https://github.com/naptha/tesseract.js/releases) (Apache-2.0) was reviewed as a browser/WASM fallback. It is rejected for the native feasibility default because memory, startup, and mobile receipt accuracy still require comparison against native builds; it may remain a benchmark participant.
- No model is downloaded or redistributed in Stage 1. The Stage 4 selection gate remains a 30–50 receipt benchmark across the required languages and document conditions.

## Document, spreadsheet, and archive parsing

| Format | Candidate / decision | Offline, size, and safety notes |
|---|---|---|
| PDF | [PDF.js `pdfjs-dist 6.2.108`](https://mozilla.github.io/pdf.js/getting_started/) (Apache-2.0), 34,497,725 B unpacked, is the browser rendering/extraction candidate | Offline once bundled. Worker, CMaps/fonts, password handling, object limits, decompression limits, and malicious-PDF fixtures must be configured before selection. Native PDF rendering remains a benchmark alternative. |
| CSV / TSV | A small audited parser in the shared core is preferred | No runtime dependency or network. It must preserve preview-first import, encoding limits, integer-sen conversion, and spreadsheet-formula neutralisation. |
| XLSX / ODS | Selection deferred to Stage 1 follow-up benchmark; Rust `calamine` and an actively distributed JS parser are candidates | Must support XLSX and ODS offline, cap ZIP/XML expansion, ignore formulas as executable content, and preserve cell provenance. Package/model size must be recorded after an exact candidate is pinned. |
| Legacy XLS | Rejected by default | Add only if representative user files prove the need and a reviewed parser passes malformed BIFF and resource-limit tests. |
| SheetJS CE npm `xlsx 0.18.5` | Rejected as the default | Apache-2.0 and 7,499,035 B unpacked, but the npm release is stale relative to the project’s separate distribution channel; do not silently install an old registry package. |
| ZIP archives | [Rust `zip 8.6.0`](https://docs.rs/zip/latest/zip/) is a recovery/import benchmark candidate | Offline; supports many codecs and encryption modes, which increases attack surface. Selection must disable unused features and enforce entry-count, path, ratio, and expanded-size limits. ZIP encryption is not the vault design. |

## Cryptographic libraries

No cryptographic algorithm or library is selected in Stage 1. This is deliberate: the contracts describe key protection, randomness, sealing, corruption, and recovery outcomes without imitating algorithms. RustCrypto AEAD crates (MIT OR Apache-2.0), platform cryptography, and audited KDF crates remain candidates for Stage 3. Selection requires a written format, misuse-resistance review, known-answer vectors, maintained versions, platform availability, redistribution notices, and independent security review. Browser Web Crypto remains limited to the explicitly labelled baseline adapter’s SHA-256 duplicate fingerprint.

Rejected shortcuts include home-grown cryptography, using ZIP passwords as vault encryption, storing a raw encryption key in browser storage, treating platform authentication as encryption, and choosing an algorithm solely because one runtime exposes it.

## Workbox deprecation path

`npm ls workbox-build glob` currently resolves `workbox-build 7.4.1 -> glob 11.1.0`. A clean `npm ci` emits npm's upstream deprecation notice for `glob@11.1.0`; `npm audit` still reports zero known vulnerabilities. The transitive range belongs to Workbox, so an unsupported override is not acceptable. Vite 8 also exposed vite-plugin-pwa's ES service-worker use of deprecated `inlineDynamicImports`; the checked-in `injectManifest.rollupFormat: 'iife'` takes the plugin's supported classic-worker build path and removes that build warning. The production build and offline E2E gate verify the resulting `sw.js`.

The PWA is a baseline delivery shell, not the native security boundary. At each dependency review, first test an exact `vite-plugin-pwa`/Workbox release that moves to a supported `glob`; accept it only under the complete clean-clone and offline E2E gate. If upstream has not resolved the chain before the first internal native candidate, remove Workbox after Capacitor/Tauri shells provide all required offline entry paths and replace the browser fallback with a minimal, locally audited precache/share-target worker. Dependency overrides for `glob` are prohibited unless Workbox’s own supported range and tests cover the override.

## Upgrade policy

1. Production and development dependencies use exact versions for platform, test, parsing, storage, OCR, and cryptographic packages; native builds also commit lockfiles and wrapper versions.
2. Review upstream release notes, security policy/advisories, licence, engine/platform requirements, transitive changes, package/model size, and redistribution notices before upgrading.
3. Regenerate the lockfile only through the package manager. Run typecheck, lint, unit/contract tests, regulatory validation, production build, outbound-request E2E, native builds available on the host, and copied-file/packet checks.
4. Model updates are data migrations: record source commit/tag, SHA-256, language, measured size, benchmark corpus version, field accuracy, and application release.
5. Security or regulatory updates may be expedited, but never fetched by the application at runtime. They ship only in a separately obtained, integrity-checked application package.
