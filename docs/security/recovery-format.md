# Recovery format requirements

- Status: Draft requirements; algorithm selection deferred to Stage 1
- Format identifier: `receipt-collector-recovery`
- First planned format version: 1

## Required properties

- A high-entropy recovery secret distinct from the application PIN.
- A memory-hard password/key derivation function with device-benchmarked parameters if a human-entered passphrase is supported.
- Authenticated encryption of the vault-key recovery envelope and all backup metadata.
- No dependence on the originating device's Android Keystore, Apple Keychain, Windows account, or DPAPI state.
- Cross-platform test vectors and restore compatibility among Windows, Android, and iPhone.
- Clear archive magic, version, KDF parameters, salt, algorithm identifier, and authenticated payload length.
- Generic error reporting that does not distinguish useful details for secret guessing.

The setup flow displays recovery material once, requires confirmation, and explains that losing both device access and recovery material makes records unrecoverable. Recovery secrets and decrypted envelopes are never persisted or logged.
