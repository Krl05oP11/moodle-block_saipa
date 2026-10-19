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
define(['core/ajax', 'core/log', 'core/str'], function(Ajax, Log, Str) {

    // UI strings, keyed by block_saipa lang key. English fallbacks (same as lang/en) until
    // the batch below resolves; it is cached and normally done before the first click.
    var S = {
        index_button: 'Index course',
        index_error: 'Indexing failed',
        index_indexing: 'Indexing...',
        index_result: '{$a->pages} pages, {$a->chunks} chunks'
    };
    var keys = Object.keys(S);
    Str.get_strings(keys.map(function(k) {
        return {key: k, component: 'block_saipa'};
    })).then(function(values) {
        keys.forEach(function(k, i) {
            S[k] = values[i];
        });
        return values;
    }).catch(function(err) {
        Log.error('block_saipa/index: string load error', err);
    });

    /**
     * Wire up the teacher's "Index course" button to request RAG indexing of the course and show the result.
     *
     * @param {number} courseId Course id to index.
     */
    function init(courseId) {
        var btn = document.getElementById('saipa-index-btn-' + courseId);
        var status = document.getElementById('saipa-index-status-' + courseId);
        if (!btn || !status) {
            return;
        }

        btn.addEventListener('click', function() {
            btn.disabled = true;
            btn.textContent = '...';
            status.textContent = S.index_indexing;

            Ajax.call([{
                methodname: 'local_saipa_index_course',
                args: {course_id: courseId}
            }])[0].then(function(result) {
                status.textContent = '\u2713 ' + S.index_result
                    .replace('{$a->pages}', result.indexed_count)
                    .replace('{$a->chunks}', result.chunk_count);
                return result;
            }).fail(function(err) {
                Log.error('SAIPA index error: ' + JSON.stringify(err));
                status.textContent = '\u2717 ' + S.index_error;
            }).always(function() {
                btn.disabled = false;
                btn.textContent = '\ud83d\udcc4 ' + S.index_button;
            });
        });
    }

    return {init: init};
});
