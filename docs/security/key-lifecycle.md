# Key lifecycle requirements

- Status: Requirements baseline
- Last reviewed: 2026-08-13

## Create

Generate the vault master key and recovery material with an operating-system CSPRNG. Protect the local envelope with platform facilities and create a verified recovery envelope before accepting irreplaceable records.

## Unlock

The application PIN gates the application session and uses retry throttling. Optional platform authentication authorizes local key use. The application never receives biometric templates; it receives only platform authorization results.

## Lock

Lock on explicit request, approved inactivity, application backgrounding, OS session lock, or platform security change. Clear plaintext keys and sensitive buffers as far as the selected runtime and native libraries permit.

## Platform changes

Handle biometric enrollment changes, device-passcode removal, Windows credential reset, key invalidation, OS restore, and application reinstall without silent data loss. If local key access fails, offer recovery rather than reinitializing over existing data.

## Rotate and migrate

Key rotation writes a new authenticated copy, verifies it, records the operation, and retains a rollback path until completion. A crash must leave either the old or new vault recoverable.

## Recover and retire

Recovery creates a fresh platform-protected local envelope on the destination device. Deleting a vault requires an explicit warning and must not imply that external backups or exported copies were erased.
