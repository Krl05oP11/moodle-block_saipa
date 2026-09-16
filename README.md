# SAIPA Assistant block (block_saipa)

A course block that puts the SAIPA AI assistant on the course page: a chat widget
plus panels for linking Telegram / WhatsApp so students can talk to the assistant
from their phone.

- **Plugin type:** `block`
- **Component:** `block_saipa`
- **Requires:** Moodle 4.4+ (2024042200) and **[`local_saipa`](https://github.com/Krl05oP11/moodle-local_saipa)** installed and configured. The block does nothing on its own — it is a front-end for `local_saipa`'s web services.
- **Maturity:** BETA

## What it shows

The block only renders for users with the `local/saipa:chat` capability in the
course, and hides itself when SAIPA is disabled for that course
(`saipa_course_settings.saipa_enabled = 0`).

| Section | When it appears |
|---|---|
| Course chat widget | always (for eligible users) |
| "Student panel" link | users with `local/saipa:view` (teachers) |
| Telegram panel (link / unlink / status) | `local_saipa` messaging channel is `telegram` or `both` |
| WhatsApp panel (verify number / unlink) | `local_saipa` messaging channel is `whatsapp` or `both` |

> ⚠️ **WhatsApp is not functional yet.** The panel renders and its
> verify/unlink actions call real `local_saipa` web services, but
> `saipa-engine` has no route mounted for the WhatsApp webhook (see
> `saipa-engine`'s `docker-compose.prod.yml`, "NOT FUNCTIONAL YET (E9)").
> Don't set `messaging_channel` to `whatsapp`/`both` expecting delivery —
> an admin who does gets a panel that accepts input and silently goes
> nowhere. Telegram is the only working channel today.

All AI calls, RAG, risk data and channel bookkeeping live in `local_saipa` and the
separate `saipa-engine` service. This plugin stores **no** data of its own.

## Install

1. Install [`local_saipa`](https://github.com/Krl05oP11/moodle-local_saipa) first and run its setup wizard.
2. Copy this plugin to `blocks/saipa/` (or install the ZIP from the plugin page).
3. Visit **Site administration → Notifications** to complete installation.
4. Turn editing on in a course and add the **SAIPA Assistant** block.

## Privacy

`block_saipa` declares `\core_privacy\local\metadata\null_provider` — it holds no
personal data. Telegram/WhatsApp link state and chat history are the
responsibility of `local_saipa`.

## Links

- Issues: https://github.com/Krl05oP11/moodle-block_saipa/issues
- `local_saipa`: https://github.com/Krl05oP11/moodle-local_saipa
- License: GNU GPL v3 or later
