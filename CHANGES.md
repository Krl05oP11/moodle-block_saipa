# block_saipa Changelog

All notable changes to the SAIPA Assistant block are documented in this file.

## [0.5.0] - 2026-03-24

### Added
- Course chat widget rendered from `block_saipa/chat_widget` with AMD modules
  for chat, course indexing, Telegram linking and WhatsApp verification.
- Telegram panel: link / unlink / "waiting for confirmation" polling, driven by
  `local_saipa`'s messaging channel setting.
- WhatsApp panel: send OTP / verify / unlink, with the number masked to the last
  four digits.
- Per-course visibility: the block hides itself when SAIPA is disabled for the
  course, and only renders for users with `local/saipa:chat`.
- "Student panel" shortcut for teachers (`local/saipa:view`).
- `null_provider` privacy implementation (the block stores no personal data).

### Notes
- Requires `local_saipa` — the block shows a "requires local_saipa" message if it
  is missing.
