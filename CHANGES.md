# block_saipa Changelog

All notable changes to the SAIPA Assistant block are documented in this file.

## [Unreleased]

### Changed
- **`pt_br` i18n completed — was 60% missing (14 of 35 keys).** The entire
  Telegram panel (8 keys) and WhatsApp panel (13 keys) were silently falling
  back to English. Verified: `php -l`; a programmatic diff shows 0 key
  mismatches and 0 `{$a}` placeholder mismatches across `en`/`es`/`pt_br`; and
  a live check against the real Moodle install confirms all 35 keys resolve
  via `get_string_manager()` in all 3 languages — see
  `docs/PLAN_MARKETPLACE_20260910.md` Bloque C.
- Declares its dependency on `local_saipa` in `version.php`
  (`$plugin->dependencies`), so installing the block pulls `local_saipa` in.
  Previously the dependency was (incorrectly) declared on `local_saipa`'s side.
- **PHPCS: the plugin is now clean under `phpcs --standard=moodle`** (0 errors,
  down from 41 across `block_saipa.php`, `edit_form.php`,
  `classes/privacy/provider.php`, `db/access.php`, and the three lang packs).
  Fixed by:
  - `phpcbf` (mechanical, 18 of the 41): full Moodle GPL boilerplate on files
    that had a shortened comment; opening-brace-followed-by-blank-line;
    lang-string alphabetical ordering.
  - Class docblocks added to `block_saipa`, `block_saipa_edit_form`,
    `\block_saipa\privacy\provider`; function docblocks added to `init`,
    `instance_allow_multiple`, `applicable_formats`, `get_content`,
    `specific_definition`, `get_reason` (9 total).
  - 23 local-variable renames in `block_saipa::get_content()` to remove
    underscores (e.g. `$course_settings` → `$coursesettings`,
    `$telegram_enabled` → `$telegramenabled`); object/array-key names
    (`saipa_enabled`, the `template_data` array's own keys) were left
    unchanged since they are not PHP variables.
- **i18n: the last 3 hardcoded UI strings in `amd/src/chat.js`** (the feedback
  button tooltips "Útil"/"No útil" and the chat-failure fallback message) moved
  to `chat_feedback_useful` / `chat_feedback_not_useful` / `chat_connect_error`
  lang keys (`en`/`es`/`pt_br`), resolved client-side via `core/str`.
  `chat_widget.mustache` and the rest of the plugin (`block_saipa.php`,
  `telegram.js`, `whatsapp.js`) were already fully using `get_string()` /
  `core/str` — this closes the one remaining gap found while auditing.
  `amd/build/chat.min.js` regenerated with `terser` to match (it had
  previously been an unminified copy of the source, unlike the plugin's other
  three build files).

### Added
- **PHPUnit test coverage — was the only one of the 3 Marketplace-bound
  plugins with none.** 12 tests: block metadata (title from lang string,
  single-instance, course-view-only format) and `get_content()`'s branching
  — the `local/saipa:chat` capability gate, the per-course
  `saipa_enabled = 0` flag, Telegram/WhatsApp channel derivation
  (none/telegram/whatsapp/both) from `messaging_channel`, link/verification
  state, the WhatsApp phone masked to its last 4 digits in the rendered
  markup, and the content-caching short-circuit on a second call. Verified
  against a live Moodle + Postgres stack: all 12 green.

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
