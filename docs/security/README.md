# Security design records

These Stage 0 documents define requirements and review gates. They do not claim that the current browser prototype already implements an encrypted vault.

- [Threat model](threat-model.md)
- [Vault format requirements](vault-format.md)
- [Recovery format requirements](recovery-format.md)
- [Key lifecycle](key-lifecycle.md)

Stage 1 now provides typed platform security/recovery contracts, deterministic unavailable/locked/corrupt/interrupted test outcomes, an outbound-network browser E2E gate, and the dependency review in [../dependencies](../dependencies). No algorithm or cryptographic library has been selected merely to satisfy an interface.

The Dexie browser implementation is isolated as a **baseline adapter**, not an encrypted vault. Stage 3 must still select and review cryptographic libraries and formats, implement authenticated encrypted persistence and key envelopes, and pass the known-answer, corruption, wrong-secret, lifecycle, and migration gates in these records.
