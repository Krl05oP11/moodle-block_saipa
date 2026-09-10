<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Main class for block_saipa.
 *
 * @package    block_saipa
 * @copyright  2026 Schaller & Ponce <dev@schaller-ponce.com.ar>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

class block_saipa extends block_base {

    public function init(): void {
        $this->title = get_string('pluginname', 'block_saipa');
    }

    public function instance_allow_multiple(): bool {
        return false;
    }

    public function applicable_formats(): array {
        return [
            'course-view' => true,
            'site'        => false,
            'my'          => false,
        ];
    }

    public function get_content(): ?\stdClass {
        global $USER, $COURSE, $OUTPUT;

        if ($this->content !== null) {
            return $this->content;
        }

        $this->content = new \stdClass();
        $this->content->footer = '';

        $locallib = \core_component::get_component_directory('local_saipa') . '/lib.php';
        if (!$locallib || !file_exists($locallib)) {
            $this->content->text = get_string('requires_local', 'block_saipa');
            return $this->content;
        }
        require_once($locallib);

        $context = \context_course::instance($COURSE->id);
        if (!has_capability('local/saipa:chat', $context)) {
            return $this->content;
        }

        // Derive active messaging channels from admin setting.
        global $DB;

        // Check per-course feature flag — if SAIPA is disabled for this course, hide the block.
        $course_settings = $DB->get_record('saipa_course_settings', ['courseid' => (int) $COURSE->id]);
        if ($course_settings && !(bool) $course_settings->saipa_enabled) {
            $this->content->text = '';
            return $this->content;
        }
        $channel           = get_config('local_saipa', 'messaging_channel') ?: 'none';
        $telegram_enabled  = in_array($channel, ['telegram', 'both'], true);
        $whatsapp_enabled  = in_array($channel, ['whatsapp', 'both'], true);

        // Resolve Telegram link state.
        $telegram_linked   = false;
        $telegram_username = '';
        if ($telegram_enabled) {
            $tg = $DB->get_record('saipa_telegram_links', ['userid' => (int) $USER->id, 'confirmed' => 1]);
            if ($tg) {
                $telegram_linked   = true;
                $telegram_username = (string) ($tg->telegram_username ?? '');
            }
        }

        // Resolve WhatsApp verification state.
        $whatsapp_verified = false;
        $whatsapp_phone    = '';
        if ($whatsapp_enabled) {
            $wa = $DB->get_record('saipa_phone_verify', ['userid' => (int) $USER->id, 'verified' => 1]);
            if ($wa) {
                $whatsapp_verified = true;
                $whatsapp_phone    = '****' . substr((string) $wa->phone, -4);
            }
        }

        $template_data = [
            'courseid'          => $COURSE->id,
            'userid'            => $USER->id,
            'username'          => fullname($USER),
            'wwwroot'           => (new \moodle_url('/'))->out(false),
            'is_teacher'        => has_capability('local/saipa:view', $context),
            'telegram_enabled'  => $telegram_enabled,
            'telegram_linked'   => $telegram_linked,
            'telegram_username' => $telegram_username,
            'whatsapp_enabled'  => $whatsapp_enabled,
            'whatsapp_verified' => $whatsapp_verified,
            'whatsapp_phone'    => $whatsapp_phone,
        ];

        $this->content->text = $OUTPUT->render_from_template(
            'block_saipa/chat_widget',
            $template_data
        );

        return $this->content;
    }
}
