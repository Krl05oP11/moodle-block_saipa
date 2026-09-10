// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * AMD module: Telegram account linking for block_saipa.
 *
 * Responsibilities:
 *  - "Link" button → call local_saipa_telegram_generate_link → open Telegram deep link
 *  - Poll local_saipa_telegram_get_status every 3 s while the modal is open
 *  - On confirmed: replace the link panel with the "connected" state (page reload)
 *  - "Unlink" button → call local_saipa_telegram_unlink → reload
 *
 * @module     block_saipa/telegram
 * @package    block_saipa
 * @copyright  2026 Schaller & Ponce <dev@schaller-ponce.com.ar>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
define(['core/ajax', 'core/str', 'core/notification'], function(Ajax, Str, Notification) {

    'use strict';

    var POLL_INTERVAL_MS = 3000;

    /**
     * @param {number} courseId
     * @param {boolean} alreadyLinked  — passed from the template server-side render
     */
    function init(courseId, alreadyLinked) {

        var linkBtn   = document.getElementById('saipa-tg-link-btn-' + courseId);
        var unlinkBtn = document.getElementById('saipa-tg-unlink-btn-' + courseId);
        var statusDiv = document.getElementById('saipa-tg-status-' + courseId);

        if (unlinkBtn) {
            unlinkBtn.addEventListener('click', function() {
                unlinkBtn.disabled = true;
                Ajax.call([{
                    methodname: 'local_saipa_telegram_unlink',
                    args: {},
                    done: function() {
                        window.location.reload();
                    },
                    fail: function(err) {
                        unlinkBtn.disabled = false;
                        Notification.exception(err);
                    }
                }]);
            });
        }

        if (!linkBtn) {
            return;
        }

        linkBtn.addEventListener('click', function() {
            linkBtn.disabled = true;

            Ajax.call([{
                methodname: 'local_saipa_telegram_generate_link',
                args: {course_id: courseId},
                done: function(result) {

                    if (result.already_linked) {
                        // Race condition: linked between page render and button click.
                        window.location.reload();
                        return;
                    }

                    // Open the Telegram deep link in a new tab.
                    window.open(result.deep_link, '_blank', 'noopener,noreferrer');

                    // Show polling feedback.
                    Str.get_string('telegram_polling', 'block_saipa').then(function(msg) {
                        if (statusDiv) {
                            statusDiv.style.display = '';
                            statusDiv.textContent = msg;
                        }
                    }).catch(function() {});

                    // Start polling for confirmation.
                    var pollHandle = setInterval(function() {
                        Ajax.call([{
                            methodname: 'local_saipa_telegram_get_status',
                            args: {},
                            done: function(status) {
                                if (status.linked) {
                                    clearInterval(pollHandle);
                                    window.location.reload();
                                }
                            },
                            fail: function() {
                                // Silently ignore transient errors during polling.
                            }
                        }]);
                    }, POLL_INTERVAL_MS);

                    // Auto-stop polling after 15 min (token expiry window).
                    setTimeout(function() {
                        clearInterval(pollHandle);
                        if (statusDiv) {
                            statusDiv.style.display = 'none';
                        }
                        linkBtn.disabled = false;
                    }, 15 * 60 * 1000);
                },
                fail: function(err) {
                    linkBtn.disabled = false;
                    Str.get_string('telegram_error', 'block_saipa').then(function(msg) {
                        if (statusDiv) {
                            statusDiv.style.display = '';
                            statusDiv.textContent = msg;
                        }
                    }).catch(function() {});
                    Notification.exception(err);
                }
            }]);
        });
    }

    return {
        init: init
    };
});
