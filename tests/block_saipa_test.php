<?php
// This file is part of Moodle - https://moodle.org/
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
 * PHPUnit tests for block_saipa.
 *
 * Run from the Moodle root:
 *   vendor/bin/phpunit --filter block_saipa blocks/saipa/tests/block_saipa_test.php
 *
 * block_saipa had zero test coverage before this file — the only one of the
 * three Marketplace-bound plugins without any. It stores no data of its own
 * (privacy\provider is a null_provider); everything worth testing lives in
 * get_content()'s branching (capability gate, per-course disable flag,
 * Telegram/WhatsApp channel + link-state derivation).
 *
 * @package    block_saipa
 * @copyright  2026 Schaller & Ponce <dev@schaller-ponce.com.ar>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_saipa\tests;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/blocks/moodleblock.class.php');
require_once($CFG->dirroot . '/blocks/saipa/block_saipa.php');

/**
 * Tests for block_saipa.
 *
 * @covers \block_saipa
 */
final class block_saipa_test extends \advanced_testcase {
    /**
     * Set up test fixtures.
     */
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
    }

    /**
     * Builds a course with a student enrolled, and points the block at it.
     *
     * @return array [\block_saipa $block, \stdClass $course, \stdClass $user]
     */
    private function create_block_with_course(): array {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $user   = $this->getDataGenerator()->create_and_enrol($course, 'student');
        $this->setUser($user);

        global $COURSE;
        $COURSE = $course;

        $block = new \block_saipa();
        $block->init();

        return [$block, $course, $user];
    }

    // ── Block metadata ──────────────────────────────────────────────────────

    /**
     * The title comes from the lang string, not hardcoded.
     */
    public function test_init_sets_title_from_lang_string(): void {
        $block = new \block_saipa();
        $block->init();
        $this->assertEquals(get_string('pluginname', 'block_saipa'), $block->title);
    }

    /**
     * Only one instance of this block is allowed per page.
     */
    public function test_only_one_instance_allowed(): void {
        $block = new \block_saipa();
        $this->assertFalse($block->instance_allow_multiple());
    }

    /**
     * The block is only meant for course pages, not site/dashboard.
     */
    public function test_applicable_formats_is_course_view_only(): void {
        $block   = new \block_saipa();
        $formats = $block->applicable_formats();
        $this->assertTrue($formats['course-view']);
        $this->assertFalse($formats['site']);
        $this->assertFalse($formats['my']);
    }

    // ── get_content(): capability gate ──────────────────────────────────────

    /**
     * A user without local/saipa:chat sees no widget (empty content, no fatal).
     */
    public function test_get_content_without_capability_shows_nothing(): void {
        [$block, $course, $user] = $this->create_block_with_course();

        $context = \context_course::instance($course->id);
        // Prevent at the course context for whatever role the student has.
        foreach (get_user_roles($context, $user->id) as $role) {
            assign_capability('local/saipa:chat', CAP_PREVENT, $role->roleid, $context->id);
        }
        accesslib_clear_all_caches_for_unit_testing();
        $this->assertFalse(has_capability('local/saipa:chat', $context, $user));

        $content = $block->get_content();

        $this->assertFalse(isset($content->text) && $content->text !== '');
    }

    // ── get_content(): per-course disable flag ────────────────────────────

    /**
     * saipa_course_settings.saipa_enabled = 0 hides the block for that course,
     * even though the user has the chat capability.
     */
    public function test_get_content_hidden_when_course_disabled(): void {
        global $DB;
        [$block, $course, $user] = $this->create_block_with_course();

        $DB->insert_record('local_saipa_course_settings', (object) [
            'courseid'       => $course->id,
            'saipa_enabled'  => 0,
            'chat_enabled'   => 1,
            'risk_enabled'   => 1,
            'alerts_enabled' => 1,
            'rag_enabled'    => 1,
            'timecreated'    => time(),
            'timemodified'   => time(),
        ]);

        $content = $block->get_content();

        $this->assertSame('', $content->text);
    }

    /**
     * No saipa_course_settings row at all (default state for a fresh course)
     * must NOT be treated as disabled — the widget renders.
     */
    public function test_get_content_renders_when_no_course_settings_row(): void {
        [$block, $course, $user] = $this->create_block_with_course();

        $content = $block->get_content();

        $this->assertStringContainsString((string) $course->id, $content->text);
    }

    // ── get_content(): Telegram / WhatsApp channel derivation ────────────

    /**
     * messaging_channel = 'none' (or unset): neither channel is offered.
     */
    public function test_get_content_default_channel_is_none(): void {
        [$block, $course, $user] = $this->create_block_with_course();

        $content = $block->get_content();

        // The widget still renders (courseid appears); channel-specific
        // markup is the AMD/mustache's concern, so we only assert the
        // upstream flags implied no server-side crash and a normal render.
        $this->assertStringContainsString((string) $course->id, $content->text);
    }

    /**
     * With channel = 'telegram' and a confirmed link, the widget reflects
     * the linked state (not just "enabled").
     */
    public function test_get_content_telegram_linked_state(): void {
        global $DB;
        [$block, $course, $user] = $this->create_block_with_course();
        set_config('messaging_channel', 'telegram', 'local_saipa');

        $DB->insert_record('local_saipa_telegram_links', (object) [
            'userid'            => $user->id,
            'telegram_id'       => 123456789,
            'telegram_username' => 'testuser',
            'link_token'        => null,
            'token_expires'     => null,
            'confirmed'         => 1,
            'timecreated'       => time(),
            'timemodified'      => time(),
        ]);

        $content = $block->get_content();

        $this->assertStringContainsString('testuser', $content->text);
    }

    /**
     * With channel = 'telegram' but no confirmed link row, the widget still
     * renders (offering to link), without a DB error for the missing row.
     */
    public function test_get_content_telegram_not_linked_does_not_error(): void {
        [$block, $course, $user] = $this->create_block_with_course();
        set_config('messaging_channel', 'telegram', 'local_saipa');

        $content = $block->get_content();

        $this->assertStringContainsString((string) $course->id, $content->text);
    }

    /**
     * With channel = 'whatsapp' and a verified phone, the widget shows the
     * masked phone (last 4 digits only — privacy: no full number in markup).
     */
    public function test_get_content_whatsapp_verified_masks_phone(): void {
        global $DB;
        [$block, $course, $user] = $this->create_block_with_course();
        set_config('messaging_channel', 'whatsapp', 'local_saipa');

        $DB->insert_record('local_saipa_phone_verify', (object) [
            'userid'      => $user->id,
            'phone'       => '+5493511234567',
            'otp'         => '000000',
            'verified'    => 1,
            'timecreated' => time(),
            'timeexpires' => time() + 3600,
        ]);

        $content = $block->get_content();

        $this->assertStringContainsString('****4567', $content->text);
        $this->assertStringNotContainsString('+5493511234567', $content->text);
    }

    /**
     * channel = 'both' enables Telegram and WhatsApp simultaneously.
     */
    public function test_get_content_both_channels_enabled(): void {
        global $DB;
        [$block, $course, $user] = $this->create_block_with_course();
        set_config('messaging_channel', 'both', 'local_saipa');

        $DB->insert_record('local_saipa_telegram_links', (object) [
            'userid'            => $user->id,
            'telegram_id'       => 1,
            'telegram_username' => 'bothuser',
            'link_token'        => null,
            'token_expires'     => null,
            'confirmed'         => 1,
            'timecreated'       => time(),
            'timemodified'      => time(),
        ]);
        $DB->insert_record('local_saipa_phone_verify', (object) [
            'userid'      => $user->id,
            'phone'       => '+5493511230000',
            'otp'         => '000000',
            'verified'    => 1,
            'timecreated' => time(),
            'timeexpires' => time() + 3600,
        ]);

        $content = $block->get_content();

        $this->assertStringContainsString('bothuser', $content->text);
        $this->assertStringContainsString('****0000', $content->text);
    }

    /**
     * get_content() caches its result — a second call returns the same
     * object without re-querying (mirrors Moodle's block content-cache
     * convention: $this->content !== null short-circuits).
     */
    public function test_get_content_is_cached_after_first_call(): void {
        [$block, $course, $user] = $this->create_block_with_course();

        $first  = $block->get_content();
        $second = $block->get_content();

        $this->assertSame($first, $second);
    }
}
