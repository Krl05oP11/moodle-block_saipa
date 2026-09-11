// This file is part of Moodle - http://moodle.org/
//
// block_saipa/chat AMD module
// Loads conversation history on init, persists messages via web services.

/**
 * @module    block_saipa/chat
 * @copyright 2026 Schaller & Ponce <dev@schaller-ponce.com.ar>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
define(['core/ajax', 'core/log', 'core/str'], function(Ajax, Log, Str) {

    'use strict';

    function appendMessage(role, text, container, messageId, courseId) {
        var div = document.createElement('div');
        div.className = 'saipa-msg saipa-msg-' + role + ' mb-1 p-1 rounded';
        div.style.background  = (role === 'user') ? '#d1ecf1' : '#fff3cd';
        div.style.maxWidth    = '90%';
        div.style.marginLeft  = (role === 'user') ? 'auto' : '0';
        div.style.wordBreak   = 'break-word';
        div.style.whiteSpace  = 'pre-wrap';
        div.textContent = text;
        container.appendChild(div);

        // Feedback buttons for assistant messages.
        if (role === 'assistant' && messageId) {
            var fb = document.createElement('div');
            fb.style.fontSize = '0.75em';
            fb.style.marginBottom = '4px';
            fb.innerHTML = '<button class="btn btn-link btn-sm p-0 saipa-fb-up">&#128077;</button>' +
                           '<button class="btn btn-link btn-sm p-0 saipa-fb-down">&#128078;</button>';
            container.appendChild(fb);

            Str.get_strings([
                {key: 'chat_feedback_useful', component: 'block_saipa'},
                {key: 'chat_feedback_not_useful', component: 'block_saipa'},
            ]).then(function(strings) {
                fb.querySelector('.saipa-fb-up').title   = strings[0];
                fb.querySelector('.saipa-fb-down').title = strings[1];
                return strings;
            }).catch(function(err) {
                Log.error('SAIPA feedback strings error: ' + JSON.stringify(err));
            });

            function sendFeedback(rating, upBtn, downBtn) {
                upBtn.disabled   = true;
                downBtn.disabled = true;
                Ajax.call([{
                    methodname: 'local_saipa_save_feedback',
                    args: { course_id: courseId, message_id: messageId, rating: rating }
                }])[0].then(function() {
                    if (rating === 1) { upBtn.style.opacity = '1'; downBtn.style.opacity = '0.3'; }
                    else              { downBtn.style.opacity = '1'; upBtn.style.opacity = '0.3'; }
                }).fail(function(err) {
                    Log.error('SAIPA feedback error: ' + JSON.stringify(err));
                    upBtn.disabled   = false;
                    downBtn.disabled = false;
                });
            }

            var upBtn   = fb.querySelector('.saipa-fb-up');
            var downBtn = fb.querySelector('.saipa-fb-down');
            upBtn.addEventListener('click',   function() { sendFeedback(1,  upBtn, downBtn); });
            downBtn.addEventListener('click', function() { sendFeedback(-1, upBtn, downBtn); });
        }

        container.scrollTop = container.scrollHeight;
    }

    // Cached fallback message shown when the chat request fails; resolved once at module load.
    var connectErrorMsg = 'Error connecting to SAIPA. Please try again.';
    Str.get_string('chat_connect_error', 'block_saipa').then(function(msg) {
        connectErrorMsg = msg;
        return msg;
    }).catch(function() {});

    function init(courseId) {
        var sendBtn      = document.getElementById('saipa-send-' + courseId);
        var inputEl      = document.getElementById('saipa-input-' + courseId);
        var msgContainer = document.getElementById('saipa-messages-' + courseId);

        if (!sendBtn || !inputEl || !msgContainer) {
            Log.error('SAIPA: widget elements not found for course ' + courseId);
            return;
        }

        var sessionId = 0;

        // Load conversation history on init.
        Ajax.call([{
            methodname: 'local_saipa_get_history',
            args: { course_id: courseId }
        }])[0].then(function(result) {
            sessionId = result.session_id || 0;

            if (result.messages && result.messages.length > 0) {
                msgContainer.innerHTML = '';
                result.messages.forEach(function(msg) {
                    appendMessage(msg.role, msg.content, msgContainer, msg.message_id || 0, courseId);
                });
            }
            return result;
        }).fail(function(err) {
            Log.error('SAIPA get_history error: ' + JSON.stringify(err));
        });

        function sendMessage() {
            var text = inputEl.value.trim();
            if (!text) {
                return;
            }

            // Clear placeholder on first real message.
            var placeholder = msgContainer.querySelector('.text-muted');
            if (placeholder) {
                msgContainer.innerHTML = '';
            }

            inputEl.value    = '';
            inputEl.disabled = true;
            sendBtn.disabled = true;

            appendMessage('user', text, msgContainer, 0, courseId);

            // Typing indicator.
            var typingDiv = document.createElement('div');
            typingDiv.id              = 'saipa-typing-' + courseId;
            typingDiv.className       = 'saipa-msg saipa-msg-assistant mb-1 p-1 rounded';
            typingDiv.style.background  = '#fff3cd';
            typingDiv.style.maxWidth    = '90%';
            typingDiv.style.fontStyle   = 'italic';
            typingDiv.textContent = '...';
            msgContainer.appendChild(typingDiv);
            msgContainer.scrollTop = msgContainer.scrollHeight;

            Ajax.call([{
                methodname: 'local_saipa_chat',
                args: {
                    course_id:  courseId,
                    message:    text,
                    session_id: sessionId
                }
            }])[0].then(function(result) {
                var typing = document.getElementById('saipa-typing-' + courseId);
                if (typing) { typing.remove(); }

                sessionId = result.session_id || sessionId;
                appendMessage('assistant', result.reply, msgContainer, result.message_id || 0, courseId);

            }).fail(function(err) {
                var typing = document.getElementById('saipa-typing-' + courseId);
                if (typing) { typing.remove(); }
                Log.error('SAIPA chat error: ' + JSON.stringify(err));
                appendMessage('assistant', connectErrorMsg, msgContainer, 0, courseId);

            }).always(function() {
                inputEl.disabled = false;
                sendBtn.disabled = false;
                inputEl.focus();
            });
        }

        sendBtn.addEventListener('click', sendMessage);
        inputEl.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !inputEl.disabled) {
                sendMessage();
            }
        });

        Log.debug('SAIPA: chat widget initialised for course ' + courseId);
    }

    return { init: init };
});
