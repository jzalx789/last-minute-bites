# Last Minute Bites

IS2023 S01G10 — kitchen inventory, use-first sorting and practical recipe matching.

## Current status

This repository currently contains the agreed development specification and UI references. The application has **not yet been implemented**. There is no working executable or deployment in this initial documentation commit.

- [Complete development prompt](DEVELOPMENT_PROMPT.md)
- [UI reference index](design/README.md)
- [Workflow overview](docs/APP_FLOW.md)

The latest scope includes a flat illustrated fridge, a small condiment rack, flexible date entry, cross-category multi-selection, 3–5 fixed recipes, personal settings, and an Owner/Editor shared kitchen.

Shared inventory is a confirmed scope change from the original single-owner localStorage proposal and requires backend authentication, persistence and permission checks.

The provisional implementation approach is HTML/CSS/JavaScript + Python/SQLite. No startup command, test results or demo credentials are claimed until implementation is available.
