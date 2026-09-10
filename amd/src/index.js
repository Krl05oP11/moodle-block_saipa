// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * AMD module for the SAIPA index-course button (teacher only).
 *
 * @module     block_saipa/index
 * @copyright  2026 Schaller & Ponce <dev@schaller-ponce.com.ar>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
define(['core/ajax', 'core/log'], function(Ajax, Log) {

    function init(courseId) {
        var btn    = document.getElementById('saipa-index-btn-' + courseId);
        var status = document.getElementById('saipa-index-status-' + courseId);
        if (!btn || !status) {
            return;
        }

        btn.addEventListener('click', function() {
            btn.disabled    = true;
            btn.textContent = '...';
            status.textContent = 'Indexando...';

            Ajax.call([{
                methodname: 'local_saipa_index_course',
                args: { course_id: courseId }
            }])[0].then(function(result) {
                status.textContent = '\u2713 ' + result.indexed_count + ' p\u00e1ginas, ' + result.chunk_count + ' fragmentos';
                return result;
            }).fail(function(err) {
                Log.error('SAIPA index error: ' + JSON.stringify(err));
                status.textContent = '\u2717 Error al indexar';
            }).always(function() {
                btn.disabled  = false;
                btn.innerHTML = '&#128196; Indexar curso';
            });
        });
    }

    return { init: init };
});
