# ADR 0007: Prototype release boundary

- Status: Accepted
- Date: 2026-08-13

## Decision

The authorized finish line is a locally installable test candidate for Windows, Android, and iPhone plus fixtures, recovery instructions, known limitations, checksums, and an acceptance checklist.

Development/test signing and local sideloading are allowed when the required platform credentials and registered devices become available. The following remain outside current authorization:

- creating or pushing to a remote repository;
- public hosting or deployment;
- paid services;
- production signing or notarization;
- app-store or marketplace submission;
- labeling any build stable before internal testing and user acceptance.

Each implementation stage ends in an independently testable commit. A failed gate is corrected before later stages continue.
