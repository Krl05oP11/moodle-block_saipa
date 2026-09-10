// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * AMD module: WhatsApp phone verification for block_saipa.
 *
 * Flow:
 *  Step 1 — Phone entry: student types number → "Send code" →
 *            local_saipa_whatsapp_start_verify → OTP sent → show step 2
 *  Step 2 — OTP entry: student enters 6-digit code →
 *            local_saipa_whatsapp_confirm_otp → success → page reload
 *  Unlink — local_saipa_whatsapp_unlink → reload
 *
 * @module     block_saipa/whatsapp
 * @package    block_saipa
 * @copyright  2026 Schaller & Ponce <dev@schaller-ponce.com.ar>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
define(['core/ajax', 'core/str', 'core/notification'], function(Ajax, Str, Notification) {

    'use strict';

    function init(courseId, alreadyVerified) {

        var sendBtn    = document.getElementById('saipa-wa-send-btn-'    + courseId);
        var confirmBtn = document.getElementById('saipa-wa-confirm-btn-' + courseId);
        var unlinkBtn  = document.getElementById('saipa-wa-unlink-btn-'  + courseId);
        var phoneInput = document.getElementById('saipa-wa-phone-'       + courseId);
        var otpInput   = document.getElementById('saipa-wa-otp-'         + courseId);
        var step1Div   = document.getElementById('saipa-wa-step1-'       + courseId);
        var step2Div   = document.getElementById('saipa-wa-step2-'       + courseId);
        var step1Msg   = document.getElementById('saipa-wa-step1-msg-'   + courseId);
        var step2Msg   = document.getElementById('saipa-wa-step2-'       + courseId + '-msg-' + courseId);

        // Re-query step2 message div with the correct id pattern.
        step2Msg = document.getElementById('saipa-wa-step2-msg-' + courseId);

        // ── Unlink ────────────────────────────────────────────────────────────
        if (unlinkBtn) {
            unlinkBtn.addEventListener('click', function() {
                unlinkBtn.disabled = true;
                Ajax.call([{
                    methodname: 'local_saipa_whatsapp_unlink',
                    args: {},
                    done: function() { window.location.reload(); },
                    fail: function(err) {
                        unlinkBtn.disabled = false;
                        Notification.exception(err);
                    }
                }]);
            });
        }

        if (!sendBtn) {
            return;
        }

        // ── Step 1: Send OTP ──────────────────────────────────────────────────
        sendBtn.addEventListener('click', function() {
            var phone = phoneInput ? phoneInput.value.trim() : '';
            if (!phone) {
                return;
            }
            sendBtn.disabled = true;

            Ajax.call([{
                methodname: 'local_saipa_whatsapp_start_verify',
                args: {phone: phone},
                done: function(result) {
                    if (result.sent) {
                        // Show OTP step.
                        if (step1Div) { step1Div.style.display = 'none'; }
                        if (step2Div) { step2Div.style.display = ''; }
                        Str.get_string('whatsapp_otp_sent', 'block_saipa').then(function(msg) {
                            if (step2Msg) { step2Msg.textContent = msg; }
                        }).catch(function() {});
                    } else {
                        sendBtn.disabled = false;
                        Str.get_string('whatsapp_send_error', 'block_saipa').then(function(msg) {
                            if (step1Msg) { step1Msg.textContent = msg; }
                        }).catch(function() {});
                    }
                },
                fail: function(err) {
                    sendBtn.disabled = false;
                    Str.get_string('whatsapp_send_error', 'block_saipa').then(function(msg) {
                        if (step1Msg) { step1Msg.textContent = msg; }
                    }).catch(function() {});
                    Notification.exception(err);
                }
            }]);
        });

        // Allow pressing Enter in phone field.
        if (phoneInput) {
            phoneInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') { sendBtn.click(); }
            });
        }

        // ── Step 2: Confirm OTP ───────────────────────────────────────────────
        if (!confirmBtn) {
            return;
        }

        confirmBtn.addEventListener('click', function() {
            var otp = otpInput ? otpInput.value.trim() : '';
            if (!otp) {
                return;
            }
            confirmBtn.disabled = true;

            Ajax.call([{
                methodname: 'local_saipa_whatsapp_confirm_otp',
                args: {otp: otp},
                done: function(result) {
                    if (result.success) {
                        window.location.reload();
                        return;
                    }
                    confirmBtn.disabled = false;
                    var errorKey = result.error === 'otp_expired'
                        ? 'whatsapp_otp_expired'
                        : 'whatsapp_otp_invalid';
                    Str.get_string(errorKey, 'block_saipa').then(function(msg) {
                        if (step2Msg) { step2Msg.textContent = msg; }
                    }).catch(function() {});
                },
                fail: function(err) {
                    confirmBtn.disabled = false;
                    Notification.exception(err);
                }
            }]);
        });

        // Allow pressing Enter in OTP field.
        if (otpInput) {
            otpInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') { confirmBtn.click(); }
            });
        }
    }

    return {
        init: init
    };
});
