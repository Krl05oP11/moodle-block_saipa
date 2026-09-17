<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

/**
 * Main class for block_saipa.
 *
 * @package    block_saipa
 * @copyright  2026 Schaller & Ponce <dev@schaller-ponce.com.ar>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Course-view block that renders the SAIPA chat widget.
 *
 * @package    block_saipa
 * @copyright  2026 Schaller & Ponce <dev@schaller-ponce.com.ar>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class block_saipa extends block_base {
    /**
     * Sets the block title.
     */
    public function init(): void {
        $this->title = get_string('pluginname', 'block_saipa');
    }

    /**
     * Only one instance of this block is allowed per page.
     *
     * @return bool
     */
    public function instance_allow_multiple(): bool {
        return false;
    }

    /**
     * Declares the page formats this block can appear on.
     *
     * @return array
     */
    public function applicable_formats(): array {
        return [
            'course-view' => true,
            'site'        => false,
            'my'          => false,
        ];
    }

    /**
     * Builds the block content: the SAIPA chat widget for the current course.
     *
     * @return \stdClass|null
     */
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
        $coursesettings = $DB->get_record('local_saipa_course_settings', ['courseid' => (int) $COURSE->id]);
        if ($coursesettings && !(bool) $coursesettings->saipa_enabled) {
            $this->content->text = '';
            return $this->content;
        }
        $channel         = get_config('local_saipa', 'messaging_channel') ?: 'none';
        $telegramenabled = in_array($channel, ['telegram', 'both'], true);
        $whatsappenabled = in_array($channel, ['whatsapp', 'both'], true);

        // Resolve Telegram link state.
        $telegramlinked   = false;
        $telegramusername = '';
        if ($telegramenabled) {
            $tg = $DB->get_record('local_saipa_telegram_links', ['userid' => (int) $USER->id, 'confirmed' => 1]);
            if ($tg) {
                $telegramlinked   = true;
                $telegramusername = (string) ($tg->telegram_username ?? '');
            }
        }

        // Resolve WhatsApp verification state.
        $whatsappverified = false;
        $whatsappphone    = '';
        if ($whatsappenabled) {
            $wa = $DB->get_record('local_saipa_phone_verify', ['userid' => (int) $USER->id, 'verified' => 1]);
            if ($wa) {
                $whatsappverified = true;
                $whatsappphone    = '****' . substr((string) $wa->phone, -4);
            }
        }

        $templatedata = [
            'courseid'          => $COURSE->id,
            'userid'            => $USER->id,
            'username'          => fullname($USER),
            'wwwroot'           => (new \moodle_url('/'))->out(false),
            'is_teacher'        => has_capability('local/saipa:view', $context),
            'telegram_enabled'  => $telegramenabled,
            'telegram_linked'   => $telegramlinked,
            'telegram_username' => $telegramusername,
            'whatsapp_enabled'  => $whatsappenabled,
            'whatsapp_verified' => $whatsappverified,
            'whatsapp_phone'    => $whatsappphone,
        ];

        $this->content->text = $OUTPUT->render_from_template(
            'block_saipa/chat_widget',
            $templatedata
        );

        return $this->content;
    }
}
