# ADR 0003: Authentication and vault

- Status: Accepted at requirements level
- Date: 2026-08-13

## Decision

The native prototype will use a local application PIN with optional platform authentication. It will not use email verification.

The PIN is an application lock and must never be the sole cryptographic secret protecting copied vault files. A random vault master key will encrypt records and source documents. Platform key facilities will protect the local key envelope, and a separate high-entropy recovery secret will protect cross-device recovery material.

Target platform facilities are Android Keystore/BiometricPrompt, Apple Keychain/LocalAuthentication, and Windows current-user key protection with a separately proven Windows Hello adapter.

## Required behavior

- Retry throttling and auto-lock after an approved inactivity/background policy.
- Explicit handling for unavailable, cancelled, changed, or removed biometrics.
- Authenticated encryption and tamper detection for all persistent financial content.
- Minimal encrypted cross-platform recovery delivered with the vault implementation.
- Clear warning that losing both device key access and recovery material makes the vault unrecoverable.

Exact algorithms, libraries, file framing, KDF parameters, and key-rotation behavior remain Stage 1 security-review decisions. The current IndexedDB prototype does not yet provide these protections.
