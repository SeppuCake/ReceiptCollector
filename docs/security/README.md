# Security design records

These Stage 0 documents define requirements and review gates. They do not claim that the current browser prototype already implements an encrypted vault.

- [Threat model](threat-model.md)
- [Vault format requirements](vault-format.md)
- [Recovery format requirements](recovery-format.md)
- [Key lifecycle](key-lifecycle.md)

Stage 1 now provides typed platform security/recovery contracts, deterministic unavailable/locked/corrupt/interrupted test outcomes, an outbound-network browser E2E gate, and the dependency review in [../dependencies](../dependencies). No algorithm or cryptographic library has been selected merely to satisfy an interface.

The browser OCR slice runs a locally bundled Tesseract worker with checksum-pinned English and Malay models. OCR requests are restricted to local application assets; production tests exercise recognition after an offline reload and reject non-loopback traffic. Raw observations, candidates, confidence, and engine/model provenance are stored in a separate IndexedDB `ocrRuns` table and deleted with their source receipt. Application code does not log receipt text.

The Dexie browser implementation is isolated as a **baseline adapter**, not an encrypted vault. OCR text and receipt images are currently plaintext inside the browser profile and may be evicted; local OCR does not make that storage secure. Stage 3 must still select and review cryptographic libraries and formats, implement authenticated encrypted persistence and key envelopes, and pass the known-answer, corruption, wrong-secret, lifecycle, and migration gates in these records.
