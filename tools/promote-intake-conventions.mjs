#!/usr/bin/env node
// Promote dated convention, forum and summit rosters into a ledger staging lane.
//
// Owner's direction (2026-10-23): a conference agenda, panel, exhibitor list or speaker roster on a
// date is a bounded surface with named participants, which is what creates a hop in this compiler
// (docs/methodology.md). This tool carries a hand-transcribed register of such rosters (EVENTS
// below), each tied to an organiser's own page or PDF, and stages them as
// data/ledger/staging/conventions/{surfaces,participation,receipts}.jsonl, {actors,organizations}.json,
// gaps.jsonl and summary.json. tools/merge-staging.mjs appends the lane into the ledger.
//
//   node tools/promote-intake-conventions.mjs --archive [--refresh]   fetch + archive, then promote
//   node tools/promote-intake-conventions.mjs                         promote only (offline, deterministic)
//
// --archive fetches every SOURCES url with curl (browser-like User-Agent, 30 s timeout, about one
// request per second per host), stores the body under receipts/conventions/<receipt-id>.<ext>, writes
// a pdftotext extract beside every PDF (receipts/conventions/<receipt-id>.txt) so name checks can run
// offline, hashes with the receipt contract's canonical hash, asks the Wayback availability API for
// a snapshot, and writes data/ledger/staging/conventions/archived-receipts.jsonl. A source already
// archived with a matching hash is not refetched unless --refresh.
//
// Admission rule (the same as tools/promote-intake-defense-corridor.mjs): a row is staged only when
// its receipt resolves to a public URL and satisfies the live receipt contract (in-repo copy whose
// SHA-256 matches, or Wayback snapshot; plus a `limits` statement). A roster entry is staged only
// when the archived copy actually shows the listed name; a surface only when the archived copy
// shows the date strings that date it. Everything refused goes to gaps.jsonl with its reason.
//
// Shape rules:
//   - one session (panel, fireside, keynote with named introducers) = one bounded surface,
//     policy_document_surface, dated to the session day; hop eligibility is computed afterwards
//     (two or more people on the same date, non-reported evidence, under the density cap);
//   - one event programme = one block surface, directory_roster_surface, hop_eligible false with
//     dense_roster_density_policy (every block here lists 20+ people or 40+ organizations);
//   - a person not yet in data/canonical is minted only when the session that names them with a
//     role also names at least one existing ledger person; other names are counted in the notes;
//   - an organization row is written only for a listed affiliation that already exists in
//     data/canonical/organizations.json; this lane mints no organizations.
// Co-presence on a programme is not coordination: a listing shows a scheduled appearance, not
// attendance, agreement, contact or influence.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { root, readJson, readJsonl, writeJson, writeJsonl, slug } from './lib/ledger.mjs';
import { checkReceiptContract, MIN_LIMITS_LENGTH } from './lib/receipt-contract.mjs';
import { canonicalReceiptHash } from './lib/receipt-archival.mjs';

const LANE = 'conventions';
const OUT = 'data/ledger/staging/conventions';
const STORE = 'receipts/conventions';
const ARCHIVE_FILE = `${OUT}/archived-receipts.jsonl`;
const TOOL = 'tools/promote-intake-conventions.mjs';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

const uniq = xs => [...new Set(xs)];
const norm = s => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');

// =============================================================== sources
const L_AGENDA = 'An organiser\'s published agenda shows who was scheduled to appear, in which session and with what listed title as of its update date; it is subject to change and does not prove attendance, what anyone said, or any relationship between participants beyond sharing the programme.';
const L_EVENT_PAGE = 'An organiser\'s event page lists speakers and sessions as published at retrieval; it does not prove attendance, the content of remarks, or any relationship between listed people beyond appearing on the same programme.';
const L_VIDEO_HUB = 'An organiser\'s session-video listing names the people shown in each recorded session and groups sessions by year; it gives no session date or listed titles for the 2022 sessions and does not establish any relationship between participants beyond sharing a session.';
const SOURCES = {
  'conv-rndf-2023-agenda': {
    url: 'https://reaganfoundation.org/cms/assets/1739827495-2023_rndf_agenda.pdf',
    label: 'Reagan National Defense Forum 2023 agenda (Ronald Reagan Presidential Foundation and Institute), December 1-2, 2023',
    source_type: 'organiser_agenda_pdf', evidence_class: 'primary_public', limits: L_AGENDA,
  },
  'conv-rndf-2024-agenda': {
    url: 'https://reaganfoundation.org/cms/assets/1736543550-2024_rndf_agenda.pdf',
    label: 'Reagan National Defense Forum 2024 agenda, updated 11/26/2024 (Ronald Reagan Presidential Foundation and Institute)',
    source_type: 'organiser_agenda_pdf', evidence_class: 'primary_public', limits: L_AGENDA,
  },
  'conv-rndf-2025-agenda': {
    url: 'https://www.reaganfoundation.org/cms/assets/1764875484-rndf_agenda_12_4.pdf',
    label: 'Reagan National Defense Forum 2025 agenda, updated 12/3/2025 (Ronald Reagan Presidential Foundation and Institute)',
    source_type: 'organiser_agenda_pdf', evidence_class: 'primary_public', limits: L_AGENDA,
  },
  'conv-rndf-2025-event-page': {
    url: 'https://www.reaganfoundation.org/events/2025-reagan-national-defense-forum',
    label: 'Reagan National Defense Forum 2025 event page with sessions and speaker list (Ronald Reagan Presidential Foundation and Institute)',
    source_type: 'organiser_event_page', evidence_class: 'primary_public', limits: L_EVENT_PAGE,
  },
  'conv-a16z-ad-summit-2024': {
    url: 'https://a16z.com/events/american-dynamism-summit-2024/',
    label: 'Andreessen Horowitz American Dynamism Summit 2024 event page and agenda, Washington D.C., January 30, 2024',
    source_type: 'organiser_event_page', evidence_class: 'primary_public', limits: L_EVENT_PAGE,
  },
  'conv-a16z-ad-summit-2025': {
    url: 'https://a16z.com/events/american-dynamism-summit-2025/',
    label: 'Andreessen Horowitz American Dynamism Summit 2025 event page and agenda, Washington D.C., March 18, 2025',
    source_type: 'organiser_event_page', evidence_class: 'primary_public', limits: L_EVENT_PAGE,
  },
  'conv-a16z-ad-summit-video-hub': {
    url: 'https://a16z.com/american-dynamism-summit',
    label: 'Andreessen Horowitz American Dynamism Summit content hub (session videos filtered by year 2022, 2024, 2025)',
    source_type: 'organiser_video_listing', evidence_class: 'primary_public', limits: L_VIDEO_HUB,
  },
  'conv-gov-uk-ai-safety-summit-confirmed-attendees': {
    url: 'https://www.gov.uk/government/publications/ai-safety-summit-introduction/ai-safety-summit-confirmed-governments-and-organisations',
    label: 'GOV.UK, AI Safety Summit: confirmed attendees (governments and organisations), updated 31 October 2023',
    source_type: 'official_attendee_list', evidence_class: 'official',
    limits: 'The government list names governments and organisations confirmed to attend the AI Safety Summit as of 31 October 2023; it names no individual delegates, does not show who attended for each organisation or which sessions they joined, and confirmation is not proof of attendance.',
  },
  'conv-gov-uk-ai-safety-summit-day-one': {
    url: 'https://www.gov.uk/government/news/nations-and-ai-experts-convene-for-day-one-of-first-global-ai-safety-summit',
    label: 'GOV.UK press release, Nations and AI experts convene for day one of first global AI Safety Summit, 1 November 2023',
    source_type: 'official_press_release', evidence_class: 'official',
    limits: 'A government press release states the summit opened on 1 November 2023 and describes the day as the government presented it; it does not list all delegates or establish what any organisation said or agreed.',
  },
  'conv-diu-sxsw-2024-programme': {
    url: 'https://www.diu.mil/latest/diu-at-sxsw-connecting-technology-and-talent-from-around-the-world-for',
    label: 'Defense Innovation Unit, DIU at SXSW 2024: Connecting Technology and Talent From Around the World for National Security (programme for March 8-10, 2024)',
    source_type: 'official_event_programme', evidence_class: 'official',
    limits: 'A DIU programme post published ahead of SXSW 2024 lists scheduled events and the people billed to speak; it does not prove that each scheduled item took place as listed, and it does not establish any agreement, investment or contract between the named people or organizations.',
  },
  'conv-ltw-2026-human-technology-interaction': {
    url: 'https://londontechweek.com/agenda/future-human-technology-interaction',
    label: 'London Tech Week 2026 agenda session, The Future of Human-Technology Interaction, Monday 8 June 2026, AI Arena',
    source_type: 'organiser_agenda_session', evidence_class: 'primary_public',
    limits: 'An organiser\'s agenda session page lists the moderator and speaker billed for a session as published at retrieval; it does not prove the session ran as listed or establish any relationship between the two people beyond sharing that stage.',
  },
  'conv-ltw-2026-science-out-lab-economy': {
    url: 'https://londontechweek.com/agenda/science-out-lab-economy',
    label: 'London Tech Week 2026 agenda session, Discovery that delivers: Turning Britain\'s scientific edge into real-world impact, Tuesday 9 June 2026, Deep Tech Stage',
    source_type: 'organiser_agenda_session', evidence_class: 'primary_public',
    limits: 'An organiser\'s agenda session page lists the two people billed for a session as published at retrieval; it does not prove the session ran as listed, and their shared ARIA roles are stated by the page, not verified here against appointment records.',
  },
};

// =============================================================== event register
// Roster entry: n = name exactly as the archived copy shows it (checked), r = role as the source
// gives it, t = listed title/affiliation (free text, from the source), a = canonical actor id
// (forces the identity; must exist), o = canonical organization id for the listed affiliation.
const P = (n, r, t, extra = {}) => ({ n, r, t, ...extra });

const DEFENCE = ['defence_industrial_surface'];
const EVENTS = [
  // ------------------------------------------------------------- Reagan National Defense Forum 2023
  {
    id: 'rndf-2023', label: 'Reagan National Defense Forum 2023', receipt: 'conv-rndf-2023-agenda',
    start: '2023-12-01', end: '2023-12-02', shows: ['DECEMBER 1-2, 2023', 'SATURDAY, DECEMBER 2'],
    secondary: DEFENCE, roster_size_listed: 56,
    roster_note: 'The agenda names about 56 programme participants (panelists, fireside guests and moderators) across ten panels, two fireside chats and a keynote.',
    block_extra: [
      P('Alexander C. Karp', 'panelist', 'Co-Founder and CEO, Palantir Technologies', { o: 'palantir', org_only: true }),
      P('Jim Taiclet', 'panelist', 'President and CEO, Lockheed Martin Corporation', { o: 'lockheed-martin-corporation', org_only: true }),
      P('H. Lawrence Culp', 'panelist', 'Chairman and CEO, GE', { o: 'ge-aerospace', org_only: true }),
    ],
    sessions: [
      {
        id: 'panel-2', date: '2023-12-02', title: 'Panel 2: Investing in AI: Fielding and Operationalizing Autonomy in Our National Defense',
        shows: ['INVESTING IN AI'],
        roster: [
          P('Mike Gallagher', 'panelist', 'Rep., Chair, House Select Committee on the Chinese Communist Party'),
          P('Frank Kendall', 'panelist', 'Hon., Secretary, U.S. Air Force', { a: 'frank-kendall' }),
          P('Brian Schimpf', 'panelist', 'Co-Founder and CEO, Anduril Industries', { o: 'anduril-industries' }),
          P('Heidi Shyu', 'panelist', 'Hon., U.S. Under Secretary of Defense for Research and Engineering', { a: 'heidi-shyu' }),
          P('Jason Zander', 'panelist', 'Executive Vice President, Microsoft', { o: 'microsoft' }),
          P('Missy Ryan', 'moderator', 'The Washington Post'),
        ],
      },
      {
        id: 'panel-3', date: '2023-12-02', title: 'Panel 3: Overlooking Monroe? Protecting Our Hemisphere and Homeland',
        shows: ['OVERLOOKING MONROE'],
        roster: [
          P('Joseph T. Lonsdale', 'panelist', 'Co-Founder and Managing Partner, 8VC', { a: 'joe-lonsdale', o: '8vc' }),
          P('Paul M. Nakasone', 'panelist', 'Gen., Commander, U.S. Cyber Command'),
          P('Laura J. Richardson', 'panelist', 'Gen., Commander, U.S. Southern Command'),
          P('Mike Waltz', 'panelist', 'Rep., U.S. House of Representatives, Florida'),
          P('Courtney Kube', 'moderator', 'NBC News'),
        ],
      },
      {
        id: 'panel-7', date: '2023-12-02', title: 'Panel 7: Celebrating and Encouraging Service: How to Boost Recruitment and Ensure Readiness',
        shows: ['CELEBRATING AND ENCOURAGING SERVICE'],
        roster: [
          P('Gabe Camarillo', 'panelist', 'Hon., Under Secretary, U.S. Army', { a: 'gabe-camarillo' }),
          P('Kevin Cramer', 'panelist', 'Sen., U.S. Senator, North Dakota'),
          P('Daniel R. Hokanson', 'panelist', 'Gen., Chief, U.S. National Guard Bureau'),
          P('Karl Rove', 'panelist', 'Former Senior Advisor and Deputy Chief of Staff, President George W. Bush'),
          P('Ben Kesling', 'moderator', 'The Wall Street Journal'),
        ],
      },
      {
        id: 'panel-9', date: '2023-12-02', title: 'Panel 9: Supremacy or Parity? Aligning the NDS for Techno-Competition with the PRC',
        shows: ['SUPREMACY OR PARITY'],
        roster: [
          P('John C. Aquilino', 'panelist', 'Adm., Commander, U.S. Indo-Pacific Command'),
          P('Doug Beck', 'panelist', 'Director, Defense Innovation Unit', { a: 'doug-beck' }),
          P('Christopher J. Mahoney', 'panelist', 'Gen., Assistant Commandant, U.S. Marine Corps'),
          P('Mike Rounds', 'panelist', 'Sen., U.S. Senator, South Dakota'),
          P('Horacio Rozanski', 'panelist', 'President and CEO, Booz Allen Hamilton, Inc.', { o: 'booz-allen-hamilton' }),
          P('Jennifer Griffin', 'moderator', 'Fox News Channel'),
        ],
      },
    ],
  },
  // ------------------------------------------------------------- Reagan National Defense Forum 2024
  {
    id: 'rndf-2024', label: 'Reagan National Defense Forum 2024', receipt: 'conv-rndf-2024-agenda',
    start: '2024-12-06', end: '2024-12-07', shows: ['FRIDAY, DECEMBER 6', 'SATURDAY, DECEMBER 7', '11/26/2024'],
    secondary: DEFENCE, roster_size_listed: 59,
    roster_note: 'The agenda (updated 11/26/2024) names about 59 programme participants across ten panels, two fireside chats, an awards ceremony and a keynote.',
    block_extra: [
      P('Alexander C. Karp', 'panelist', 'Co-Founder and CEO, Palantir Technologies', { o: 'palantir', org_only: true }),
      P('H. Lawrence Culp', 'panelist', 'Chairman and CEO, GE Aerospace', { o: 'ge-aerospace', org_only: true }),
      P('Brad Smith', 'panelist', 'Vice Chair and President, Microsoft', { o: 'microsoft', org_only: true }),
      P('Horacio Rozanski', 'panelist', 'President and CEO, Booz Allen Hamilton', { o: 'booz-allen-hamilton', org_only: true }),
      P('Brian Schimpf', 'panelist', 'Co-Founder and CEO, Anduril Industries', { o: 'anduril-industries', org_only: true }),
      P('James D. Taiclet', 'panelist', 'Chairman, President, and CEO, Lockheed Martin', { o: 'lockheed-martin-corporation', org_only: true }),
    ],
    sessions: [
      {
        id: 'panel-4', date: '2024-12-07', title: 'Panel 4: The Innovation Imperative: Modernizing Defense Capabilities at the Speed of Relevance',
        shows: ['THE INNOVATION IMPERATIVE'],
        roster: [
          P('David W. Allvin', 'panelist', 'Gen., Chief of Staff, U.S. Air Force'),
          P('Joseph T. Lonsdale', 'panelist', 'Co-Founder and Managing Partner, 8VC', { a: 'joe-lonsdale', o: '8vc' }),
          P('Heidi Shyu', 'panelist', 'Hon., U.S. Under Secretary of Defense for Research and Engineering', { a: 'heidi-shyu' }),
          P('Toni Townes-Whitley', 'panelist', 'CEO, SAIC', { o: 'saic' }),
          P('Todd Young', 'panelist', 'Sen., U.S. Senate, Indiana'),
          P('Sharon Weinberger', 'moderator', 'The Wall Street Journal'),
        ],
      },
      {
        id: 'panel-9', date: '2024-12-07', title: 'Panel 9: Can We Build Again? Overcoming Production and Manufacturing Constraints to Build the Future Force',
        shows: ['CAN WE BUILD AGAIN'],
        roster: [
          P('Doug Beck', 'panelist', 'Director, Defense Innovation Unit', { a: 'doug-beck' }),
          P('Chris Calio', 'panelist', 'President and CEO, RTX'),
          P('Randy A. George', 'panelist', 'Gen., Chief of Staff, U.S. Army'),
          P('Dan Jablonsky', 'panelist', 'Chairman and CEO, Ursa Major', { o: 'ursa-major' }),
          P('Angus King', 'panelist', 'Sen., U.S. Senate, Maine'),
          P('Aaron Mehta', 'moderator', 'Breaking Defense'),
        ],
      },
    ],
  },
  // ------------------------------------------------------------- Reagan National Defense Forum 2025
  {
    id: 'rndf-2025', label: 'Reagan National Defense Forum 2025', receipt: 'conv-rndf-2025-agenda', block_receipts: ['conv-rndf-2025-event-page'],
    start: '2025-12-05', end: '2025-12-06', shows: ['DECEMBER 5-6, 2025', 'SATURDAY, DECEMBER 6'],
    secondary: DEFENCE, roster_size_listed: 59,
    roster_note: 'The organiser\'s event page lists 59 speakers; the agenda (updated 12/3/2025) adds panelists not on that list.',
    block_extra: [
      P('Mike Gallagher', 'panelist', 'Hon., Head of Defense, Palantir Technologies', { o: 'palantir', org_only: true }),
      P('Chris Power', 'panelist', 'CEO, Hadrian', { o: 'hadrian', org_only: true }),
      P('Dan Jablonsky', 'panelist', 'CEO, Ursa Major Technologies', { o: 'ursa-major-technologies', org_only: true }),
      P('Tara Murphy Dougherty', 'panelist', 'CEO, Govini', { o: 'govini', org_only: true }),
      P('Kathy Warden', 'panelist', 'Chair, CEO, and President, Northrop Grumman', { o: 'northrop-grumman', org_only: true }),
    ],
    sessions: [
      {
        id: 'panel-2', date: '2025-12-06', title: 'Panel 2: Deterrence by Design: Advancing AI for Competitive Advantage Over China',
        shows: ['Deterrence by Design'],
        roster: [
          P('Stephen Ehikian', 'panelist', 'CEO, C3 AI'),
          P('Joe Lonsdale', 'panelist', 'Co-Founder and Managing Partner, 8VC', { a: 'joe-lonsdale', o: '8vc' }),
          P('Emil Michael', 'panelist', 'Hon., U.S. Under Secretary of War for Research and Engineering'),
          P('Samuel Paparo', 'panelist', 'Admiral, Commander, U.S. Indo-Pacific Command'),
          P('Horacio Rozanski', 'panelist', 'Chairman and CEO, Booz Allen', { o: 'booz-allen-hamilton' }),
          P('Gordon Lubold', 'moderator', 'NBC News'),
        ],
      },
      {
        id: 'panel-10', date: '2025-12-06', title: 'Panel 10: Funding the Force: Aligning the Defense Budget with Global Priorities',
        shows: ['Funding the Force'],
        // The agenda lists "Chris Brose, President and Chief Strategy Officer, Anduril"; the ledger's
        // christian-brose is Anduril's Christian Brose, so the listed affiliation fixes the identity.
        roster: [
          P('Chris Brose', 'panelist', 'President and Chief Strategy Officer, Anduril', { a: 'christian-brose', o: 'anduril-industries', identity_basis: 'listed affiliation (Anduril) matches the ledger identity Christian Brose' }),
          P('Ken Calvert', 'panelist', 'Representative, Chair, House Appropriations Subcommittee on Defense'),
          P('Pat Ryan', 'panelist', 'Representative, U.S. House of Representatives, New York, 18th District'),
          P('Jennifer Griffin', 'moderator', 'Fox News'),
        ],
      },
    ],
  },
  // ------------------------------------------------------------- a16z American Dynamism Summit 2024
  {
    id: 'a16z-american-dynamism-summit-2024', label: 'a16z American Dynamism Summit 2024', receipt: 'conv-a16z-ad-summit-2024',
    start: '2024-01-30', end: '2024-01-30', shows: ['January 30, 2024'],
    secondary: ['surface_factory_capital_layer'], roster_size_listed: 23, host_org: 'andreessen-horowitz',
    roster_note: 'The agenda names 23 speakers and moderators.',
    block_extra: [
      P('Brian Schimpf', 'speaker', 'Anduril Industries', { o: 'anduril-industries', org_only: true }),
      P('Ed Park', 'speaker', 'Devoted Health', { o: 'devoted-health', org_only: true }),
    ],
    sessions: [
      {
        id: 'welcome', date: '2024-01-30', title: 'Welcome Remarks & American Dynamism Introduction',
        shows: ['Welcome Remarks'],
        roster: [
          P('Katherine Boyle', 'speaker', 'Andreessen Horowitz', { a: 'katherine-boyle', o: 'andreessen-horowitz' }),
          P('David Ulevitch', 'speaker', 'Andreessen Horowitz', { o: 'andreessen-horowitz' }),
        ],
      },
      {
        id: 'china-threat', date: '2024-01-30', title: 'The China Threat: Silicon Valley and the Great Uncoupling',
        shows: ['The China Threat'],
        roster: [
          P('Mike Gallagher', 'speaker', 'Congressman (R-WI)'),
          P('Jake Auchincloss', 'speaker', 'Congressman (D-MA)'),
          P('Katherine Boyle', 'moderator', 'Andreessen Horowitz', { a: 'katherine-boyle', o: 'andreessen-horowitz' }),
        ],
      },
      {
        id: 'california-dream', date: '2024-01-30', title: 'Rebuilding the California Dream',
        shows: ['Rebuilding the California Dream'],
        roster: [
          P('Jan Sramek', 'speaker', 'California Forever'),
          P('Katherine Boyle', 'moderator', 'Andreessen Horowitz', { a: 'katherine-boyle', o: 'andreessen-horowitz' }),
        ],
      },
      {
        id: 'next-generation-leadership', date: '2024-01-30', title: 'The Next Generation of Leadership',
        shows: ['The Next Generation of Leadership'],
        roster: [
          P('Wes Moore', 'speaker', 'Governor of Maryland', { a: 'wes-moore' }),
          P('Ben Horowitz', 'moderator', 'Andreessen Horowitz', { o: 'andreessen-horowitz' }),
        ],
      },
      {
        id: 'techno-optimism', date: '2024-01-30', title: 'America Needs More Techno-Optimism',
        shows: ['America Needs More Techno-Optimism'],
        roster: [
          P('Marc Andreessen', 'speaker', 'Andreessen Horowitz', { a: 'marc-andreessen', o: 'andreessen-horowitz' }),
          P('Tyler Cowen', 'moderator', 'George Mason University', { a: 'tyler-cowen' }),
        ],
      },
    ],
  },
  // ------------------------------------------------------------- a16z American Dynamism Summit 2025
  {
    id: 'a16z-american-dynamism-summit-2025', label: 'a16z American Dynamism Summit 2025', receipt: 'conv-a16z-ad-summit-2025',
    start: '2025-03-18', end: '2025-03-18', shows: ['March 18th, 2025'],
    secondary: ['surface_factory_capital_layer', 'defence_industrial_surface'], roster_size_listed: 24, host_org: 'andreessen-horowitz',
    roster_note: 'The agenda names 24 speakers, introducers and interviewers.',
    block_extra: [
      P('Ali Ghodsi', 'speaker', 'Cofounder & CEO, Databricks', { o: 'databricks', org_only: true }),
      P('Qasar Younis', 'speaker', 'Cofounder & CEO, Applied Intuition', { o: 'applied-intuition', org_only: true }),
      P('Ryan Tseng', 'lightning talk and introduction', 'Cofounder & President, Shield AI', { o: 'shield-ai', org_only: true }),
      P('Chris Power', 'speaker', 'Founder & CEO, Hadrian', { o: 'hadrian', org_only: true }),
      P('Bryon Hargis', 'speaker', 'Founder & CEO, Castelion', { o: 'castelion', org_only: true }),
      P('Doug Bernauer', 'introduction', 'CEO, Radiant', { o: 'radiant', org_only: true }),
      P('John Doyle', 'introduction', 'Founder & CEO, Cape', { o: 'cape', org_only: true }),
      P('Joe Connor', 'introduction', 'Founder & CEO, Odyssey', { o: 'odyssey', org_only: true }),
    ],
    sessions: [
      {
        id: 'opening-keynote', date: '2025-03-18', title: 'Opening Keynote, The Honorable JD Vance, with introduction by Katherine Boyle and David Ulevitch',
        shows: ['Opening Keynote'],
        roster: [
          P('JD Vance', 'keynote speaker', 'Vice President of the United States'),
          P('Katherine Boyle', 'introduction', 'General Partner, a16z', { a: 'katherine-boyle', o: 'andreessen-horowitz' }),
          P('David Ulevitch', 'introduction', 'General Partner, a16z', { o: 'andreessen-horowitz' }),
        ],
      },
      {
        id: 'mars-but-first-dc', date: '2025-03-18', title: 'Mars. But First D.C.',
        shows: ['Mars. But First D.C.'],
        roster: [
          P('Gwynne Shotwell', 'speaker', 'President & COO, Spacex', { o: 'spacex' }),
          P('Katherine Boyle', 'interviewer', 'General Partner, a16z', { a: 'katherine-boyle', o: 'andreessen-horowitz' }),
        ],
      },
      {
        id: 'science-fiction-or-socom', date: '2025-03-18', title: 'Is it Science Fiction, or SOCOM?',
        shows: ['Is it Science Fiction, or SOCOM?'],
        roster: [
          P('Bryan P. Fenton', 'speaker', 'General, U.S. Special Operations Command', { o: 'ussocom' }),
          P('Katherine Boyle', 'interviewer', 'General Partner, a16z', { a: 'katherine-boyle', o: 'andreessen-horowitz' }),
        ],
      },
      {
        id: 'kill-chain-2025', date: '2025-03-18', title: 'The Kill Chain: 2025 Edition',
        shows: ['The Kill Chain: 2025 Edition'],
        roster: [
          P('Christian Brose', 'speaker', 'President & Chief Strategy Officer, Anduril Industries', { a: 'christian-brose', o: 'anduril-industries' }),
          P('Katherine Boyle', 'interviewer', 'General Partner, a16z', { a: 'katherine-boyle', o: 'andreessen-horowitz' }),
        ],
      },
      {
        id: 'mobilizing-industrial-base', date: '2025-03-18', title: 'Mobilizing the American Industrial Base',
        shows: ['Mobilizing the American Industrial Base'],
        roster: [
          P('Shyam Sankar', 'speaker', 'Chief Technology Officer, Palantir Technologies', { a: 'shyam-sankar', o: 'palantir' }),
          P('David Ignatius', 'interviewer', 'Washington Post'),
        ],
      },
    ],
  },
  // ------------------------------------------------------------- a16z American Dynamism Summit 2022 (year only)
  {
    id: 'a16z-american-dynamism-summit-2022', label: 'a16z American Dynamism Summit 2022 (session videos)', receipt: 'conv-a16z-ad-summit-video-hub',
    start: '2022-01-01', end: '2022-12-31', date_precision: 'year', shows: ['data-filter="2022"'],
    date_note: 'Year-only date: the organiser\'s content hub files these session videos under 2022 and gives no session day; recorded as the 2022 calendar year, day not established.',
    secondary: ['surface_factory_capital_layer'], roster_size_listed: 22, host_org: 'andreessen-horowitz',
    roster_note: 'The 2022 session-video listing names 22 people across 13 sessions; it gives names only, without titles for most entries.',
    raw_html_checks: true,
    block_extra: [
      P('Palmer Luckey', 'speaker', 'Anduril Industries', { o: 'anduril-industries', org_only: true }),
    ],
    sessions: [
      {
        id: 'ai-future-of-modern-warfare', date: null, title: 'AI & The Future of Modern Warfare',
        shows: ['AI &amp; The Future of Modern Warfare'],
        roster: [
          P('Adam Bry', 'speaker', 'named in the session listing'),
          P('Brandon Tseng', 'speaker', 'named in the session listing', { a: 'brandon-tseng', identity_basis: 'name match only; the 2022 listing gives no affiliation' }),
          P('Brian Schimpf', 'speaker', 'named in the session listing'),
          P('Roger Zakheim', 'speaker', 'named in the session listing'),
        ],
      },
      {
        id: 'autonomy-defense-policy', date: null, title: 'Autonomy & Defense Policy in the 21st Century',
        shows: ['Autonomy &amp; Defense Policy in the 21st Century'],
        roster: [
          P('Chris Brose', 'speaker', 'named in the session listing', { a: 'christian-brose', identity_basis: 'name match; the 2022 listing gives no affiliation (the same hub lists Christian Brose of Anduril for 2025)' }),
          P('Jacob Helberg', 'speaker', 'named in the session listing'),
          P('Mike Gallagher', 'speaker', 'Congressman, as named in the session listing'),
        ],
      },
      {
        id: 'fourth-estate', date: null, title: 'The 4th Estate: How Media is Changing in Washington D.C.',
        shows: ['The 4th Estate'],
        roster: [
          P('Bari Weiss', 'speaker', 'named in the session listing'),
          P('Chris Best', 'speaker', 'named in the session listing'),
          P('Jim VandeHei', 'speaker', 'named in the session listing'),
          P('Katherine Boyle', 'speaker', 'named in the session listing', { a: 'katherine-boyle' }),
        ],
      },
      {
        id: 'housing-crisis', date: null, title: 'Easing the Housing Crisis by Building Better Tools',
        shows: ['Easing the Housing Crisis'],
        roster: [
          P('Adena Hefets', 'speaker', 'named in the session listing'),
          P('Katherine Boyle', 'speaker', 'named in the session listing', { a: 'katherine-boyle' }),
        ],
      },
      {
        id: 'largest-asset-class', date: null, title: 'Disrupting the World\'s Largest Asset Class',
        shows: ['Largest Asset Class'],
        roster: [
          P('Adam Neumann', 'speaker', 'named in the session listing'),
          P('David Ulevitch', 'speaker', 'named in the session listing'),
          P('Marc Andreessen', 'speaker', 'named in the session listing', { a: 'marc-andreessen' }),
        ],
      },
    ],
  },
  // ------------------------------------------------------------- UK AI Safety Summit, Bletchley Park
  {
    id: 'uk-ai-safety-summit-2023-confirmed-attendees', label: 'UK AI Safety Summit, Bletchley Park: confirmed attending organisations',
    receipt: 'conv-gov-uk-ai-safety-summit-confirmed-attendees', block_receipts: ['conv-gov-uk-ai-safety-summit-day-one'],
    start: '2023-11-01', end: '2023-11-02', shows: ['Updated 31 October 2023', 'Industry and related organisations'],
    extra_shows: { 'conv-gov-uk-ai-safety-summit-day-one': ['1 November 2023'] },
    date_note: 'Summit dated 1-2 November 2023; the list was last updated 31 October 2023 and the government\'s day-one release is dated 1 November 2023.',
    surface_type: 'directory_roster_surface', secondary: ['government_advisory_surface'], org_only_roster: true,
    org_list_role: 'confirmed attending organisation', org_list_section: 'listed under its published section',
    org_list: {
      'Academia and civil society': ['Ada Lovelace Institute', 'Advanced Research and Invention Agency', 'AI Now Institute', 'Alan Turing Institute', 'Alignment Research Center', 'Brookings Institution', 'Carnegie Endowment', 'Centre for AI Safety', 'Centre for Long-Term Resilience', 'Centre for the Governance of AI', 'Future of Life Institute', 'Mozilla Foundation', 'Open Philanthropy', 'Partnership on AI', 'RAND Corporation', 'Royal Society', 'Stanford University', 'University of Oxford'],
      'Industry and related organisations': ['Adept', 'Aleph Alpha', 'Alibaba', 'Amazon Web Services', 'Anthropic', 'Apollo Research', 'ARM', 'Cohere', 'Conjecture', 'Darktrace', 'Databricks', 'Eleuther AI', 'Faculty AI', 'Frontier Model Forum', 'Google DeepMind', 'Google', 'Graphcore', 'Helsing', 'Hugging Face', 'IBM', 'Imbue', 'Inflection AI', 'Meta', 'Microsoft', 'Mistral', 'Naver', 'Nvidia', 'Omidyar Group', 'OpenAI', 'Palantir', 'Rise Networks', 'Salesforce', 'Samsung Electronics', 'Scale AI', 'Sony', 'Stability AI', 'techUK', 'Tencent', 'Trail of Bits', 'XAI'],
    },
    org_overrides: { 'Faculty AI': 'faculty', 'Amazon Web Services': 'amazon-web-services-aws', 'Advanced Research and Invention Agency': 'aria', 'Carnegie Endowment': 'carnegie-endowment-for-international-peace', 'Palantir': 'palantir' },
    roster_size_listed: 107,
    roster_note: 'The list names 27 governments, 40 industry and related organisations, 46 academic and civil-society institutions and 7 multilateral organisations; it names no individuals.',
    sessions: [],
  },
  // ------------------------------------------------------------- DIU at SXSW 2024 (Capital Factory)
  {
    id: 'diu-sxsw-2024', label: 'Defense Innovation Unit programme at SXSW 2024 (Capital Factory, Austin)', receipt: 'conv-diu-sxsw-2024-programme',
    start: '2024-03-08', end: '2024-03-10', shows: ['SXSW 2024', 'March 8-10'],
    secondary: ['policy_to_procurement_surface', 'defence_industrial_surface'], evidence_class: 'official', no_block: true,
    sessions: [
      {
        id: 'joint-innovation-space-ribbon-cutting', date: '2024-03-08', title: 'Ribbon Cutting Event: Launch of New Joint Innovation Space at Capital Factory',
        shows: ['Ribbon Cutting Event', 'Friday, March 8, 15:15'],
        secondary: ['policy_to_procurement_surface', 'defence_industrial_surface'],
        roster: [
          P('Doug Beck', 'remarks', 'DIU Director', { a: 'doug-beck' }),
          P('Joshua Baer', 'remarks', 'founder of Capital Factory', { a: 'joshua-baer', o: 'capital-factory' }),
          P('Elliott J. Leigh', 'remarks', 'Col., Director of AFWERX and Chief Commercialization Officer for the Department of the Air Force'),
        ],
      },
    ],
  },
  // ------------------------------------------------------------- London Tech Week 2026
  {
    id: 'london-tech-week-2026', label: 'London Tech Week 2026', receipt: 'conv-ltw-2026-human-technology-interaction',
    start: '2026-06-08', end: '2026-06-09', shows: ['Monday 8 June 2026'], secondary: [], no_block: true,
    sessions: [
      {
        id: 'future-human-technology-interaction', date: '2026-06-08', title: 'The Future of Human-Technology Interaction (AI Arena)',
        shows: ['Monday 8 June 2026', 'The Future of Human-Technology Interaction'], secondary: ['public_private_ai_infrastructure'],
        roster: [
          P('Matt Clifford', 'moderator', 'Chair - ARIA', { a: 'matt-clifford', o: 'aria' }),
          P('Mati Staniszewski', 'speaker', 'Co-Founder - ElevenLabs'),
        ],
      },
      {
        id: 'science-out-lab-economy', date: '2026-06-09', receipt: 'conv-ltw-2026-science-out-lab-economy',
        title: 'Discovery that delivers: Turning Britain\'s scientific edge into real-world impact (Deep Tech Stage)',
        shows: ['Tuesday 9 June 2026', 'Discovery that delivers'], secondary: ['public_private_ai_infrastructure'],
        roster: [
          P('Kathleen Fisher', 'in conversation', 'CEO of the Advanced Resarch Innovation Agency (ARIA)', { o: 'aria' }),
          P('Matt Clifford', 'in conversation', 'Chair of ARIA', { a: 'matt-clifford', o: 'aria' }),
        ],
      },
    ],
  },
];

// =============================================================== archive (network; --archive only)
const args = process.argv.slice(2);
const REFRESH = args.includes('--refresh');
const lastHit = new Map();
const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function pace(url, gapMs = 1100) {
  const host = new URL(url).host;
  const wait = (lastHit.get(host) ?? 0) + gapMs - Date.now();
  if (wait > 0) sleep(wait);
  lastHit.set(host, Date.now());
}
function curl(url, tmp, { accept, timeout = 30 } = {}) {
  pace(url);
  const body = path.join(tmp, 'body');
  if (fs.existsSync(body)) fs.rmSync(body);
  try {
    const meta = execFileSync('curl', ['-sS', '-L', '--max-redirs', '10', '--max-time', String(timeout), '-A', UA,
      '-H', `Accept: ${accept ?? 'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,application/json;q=0.8,*/*;q=0.7'}`,
      '-H', 'Accept-Language: en-GB,en;q=0.9', '--compressed', '-o', body, '-w', '%{http_code}\t%{content_type}\t%{url_effective}', url],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const [status, contentType, finalUrl] = meta.split('\t');
    return { ok: true, status: Number(status), contentType: (contentType || '').trim(), finalUrl, bytes: fs.existsSync(body) ? fs.readFileSync(body) : Buffer.alloc(0) };
  } catch (err) {
    return { ok: false, error: String(err.stderr || err.message).trim().split('\n').pop().slice(0, 200) };
  }
}
function blocked(res) {
  if (!res.ok) return `fetch_error: ${res.error}`;
  if (res.status >= 400) return `http_${res.status}`;
  if (res.bytes.length < 200) return 'empty_or_truncated_body';
  const head = res.bytes.subarray(0, 20000).toString('utf8');
  if (/<title>\s*(Just a moment|Attention Required|Access denied|Request Rejected)/i.test(head) || /cf-browser-verification|_Incapsula_Resource|px-captcha/i.test(head)) return 'bot_challenge';
  return null;
}
const extFor = (ct, bytes) => (/pdf/i.test(ct) || bytes.subarray(0, 4).toString() === '%PDF' ? 'pdf' : /json/i.test(ct) ? 'json' : /html/i.test(ct) ? 'html' : 'txt');
const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

function archive() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'archive-conventions-'));
  fs.mkdirSync(path.join(root, STORE), { recursive: true });
  const prior = new Map(readJsonl(ARCHIVE_FILE, { optional: true }).map(r => [r.receipt_id, r]));
  const out = [];
  for (const [id, src] of Object.entries(SOURCES)) {
    const prev = prior.get(id);
    if (!REFRESH && prev?.status === 'archived' && prev.source_url === src.url && fs.existsSync(path.join(root, prev.path))
        && canonicalReceiptHash(path.join(root, prev.path)) === prev.content_sha256) {
      out.push(prev);
      console.log(`kept     ${id}`);
      continue;
    }
    if (src.limits.length < MIN_LIMITS_LENGTH) throw new Error(`limits too short for ${id}`);
    const rec = { receipt_id: id, source_url: src.url, attempted: true };
    const res = curl(src.url, tmp);
    const why = blocked(res);
    rec.fetch = { status: res.status ?? null, final_url: res.finalUrl ?? null, content_type: res.contentType ?? null, ...(why ? { refused: why } : {}) };
    const wbRes = curl(`https://archive.org/wayback/available?url=${encodeURIComponent(src.url)}`, tmp, { accept: 'application/json', timeout: 40 });
    let wayback = { checked: false };
    try {
      const snap = wbRes.ok && wbRes.status === 200 ? JSON.parse(wbRes.bytes.toString('utf8'))?.archived_snapshots?.closest : null;
      wayback = wbRes.ok && wbRes.status === 200 ? { checked: true, timestamp: snap?.available ? snap.timestamp : null } : { checked: false, error: wbRes.error ?? `http_${wbRes.status}` };
      if (wayback.timestamp) wayback.ref = `http://web.archive.org/web/${wayback.timestamp}/${src.url}`;
    } catch (e) { wayback = { checked: false, error: `bad_json: ${e.message}` }; }
    rec.wayback = wayback;
    if (!why) {
      const ext = extFor(res.contentType, res.bytes);
      const rel = `${STORE}/${id}.${ext}`;
      fs.writeFileSync(path.join(root, rel), res.bytes);
      const sha = canonicalReceiptHash(path.join(root, rel));
      const at = nowIso();
      Object.assign(rec, {
        status: 'archived', path: rel, retrieved_at: at.slice(0, 10), retrieved_at_utc: at,
        content_type: res.contentType, content_bytes: res.bytes.length, content_sha256: sha, http_status: res.status, final_url: res.finalUrl,
        limits: src.limits,
        archive: {
          method: 'in_repo_content_hash', ref: `sha256:${sha}`, captured: at.slice(0, 10), checked: at.slice(0, 10),
          fetched_url: src.url, content_type: res.contentType, bytes: res.bytes.length,
          ...(wayback.ref ? { wayback_ref: wayback.ref } : {}),
          note: 'Hash covers the in-repository copy of the source body as fetched; markup, scripts and later page changes are not normalized.',
        },
      });
      if (ext === 'pdf') {
        const txt = `${STORE}/${id}.txt`;
        execFileSync('pdftotext', ['-layout', path.join(root, rel), path.join(root, txt)]);
        rec.text_extract = { path: txt, sha256: canonicalReceiptHash(path.join(root, txt)), tool: 'pdftotext -layout', note: 'Derived text of the archived PDF, kept so roster names can be checked offline; the PDF is the receipt.' };
      }
    } else if (wayback.ref) {
      const ts = wayback.timestamp;
      Object.assign(rec, {
        status: 'archived', path: src.url, retrieved_at: `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`, limits: src.limits,
        archive: { method: 'internet_archive', ref: wayback.ref, captured: ts, checked: nowIso().slice(0, 10), note: `Direct fetch refused (${why}); the Wayback snapshot is the archive.` },
      });
    } else {
      rec.status = 'failed';
      rec.reason = `${why}; ${wayback.checked ? 'no_wayback_snapshot' : `wayback_check_failed (${wayback.error})`}`;
    }
    out.push(rec);
    console.log(`${rec.status.padEnd(8)} ${id} ${rec.archive?.method ?? rec.reason}${rec.content_bytes ? ` ${rec.content_bytes}B` : ''}`);
  }
  writeJsonl(ARCHIVE_FILE, out);
  fs.rmSync(tmp, { recursive: true, force: true });
}
if (args.includes('--archive')) archive();

// =============================================================== promote (offline, deterministic)
const canonActors = readJson('data/canonical/actors.json').actors.filter(a => a.source !== LANE);
const canonOrgs = readJson('data/canonical/organizations.json').organizations.filter(o => o.source !== LANE);
const surfaceTypes = new Set(readJson('data/canonical/surface-types.json').surface_types.map(t => t.id));
const densityMax = readJson('data/canonical/surface-types.json').density_policy.max_hop_actor_count;
const ledgerSurfaceIds = new Set(readJsonl('data/ledger/surfaces.jsonl').filter(s => s.intake_source !== TOOL).map(s => s.surface_id));
const ledgerReceipts = new Map(readJsonl('data/ledger/receipts.jsonl').map(r => [r.receipt_id, JSON.stringify(r)]));
const canonActorById = new Map(canonActors.map(a => [a.id, a]));
const canonActorByLabel = new Map(canonActors.map(a => [norm(a.label), a]));
const canonOrgById = new Map(canonOrgs.map(o => [o.id, o]));
const canonOrgByLabel = new Map();
for (const o of canonOrgs) for (const part of String(o.label).split(' / ')) if (!canonOrgByLabel.has(norm(part))) canonOrgByLabel.set(norm(part), o);
const aliases = readJson('data/canonical/aliases.json').aliases;
const actorAlias = new Map(aliases.filter(x => x.kind === 'actor' && canonActorById.has(x.canonical_id)).map(x => [norm(x.alias), x.canonical_id]));
const orgAlias = new Map(aliases.filter(x => x.kind === 'organization' && canonOrgById.has(x.canonical_id)).map(x => [norm(x.alias), x.canonical_id]));

// ---------------------------------------------------------------- receipts
const archived = new Map(readJsonl(ARCHIVE_FILE, { optional: true }).map(r => [r.receipt_id, r]));
const receiptState = new Map(); // id -> { candidate, problems }
for (const [id, src] of Object.entries(SOURCES)) {
  const arc = archived.get(id);
  const problems = [];
  if (!arc) problems.push('not_archived_yet (run with --archive)');
  else if (arc.status !== 'archived') problems.push(`archive_attempt_failed: ${arc.reason}`);
  if (problems.length) { receiptState.set(id, { candidate: null, problems }); continue; }
  const candidate = {
    receipt_id: id,
    label: src.label,
    source_type: src.source_type,
    evidence_class: src.evidence_class,
    path: arc.path,
    source_url: src.url,
    retrieved_at: arc.retrieved_at,
    ...(arc.content_sha256 ? { content_sha256: arc.content_sha256, content_type: arc.content_type, content_bytes: arc.content_bytes } : {}),
    ...(arc.text_extract ? { text_extract: arc.text_extract } : {}),
    notes: `Archived ${arc.retrieved_at} by ${TOOL} --archive. Roster rows citing this receipt were checked against the archived copy: every listed name and dating string was found in it.`,
    limits: src.limits,
    archive: arc.archive,
    intake_source: TOOL,
  };
  const { errors } = checkReceiptContract([candidate], { root });
  for (const e of errors) problems.push(`receipt_contract_${e.check}: ${e.message}`);
  if (ledgerReceipts.has(id) && ledgerReceipts.get(id) !== JSON.stringify(candidate)) problems.push('receipt_id_collides_with_existing_ledger_receipt');
  receiptState.set(id, { candidate: problems.length ? null : candidate, problems });
}
const textCache = new Map();
function archivedText(id, raw = false) {
  const key = `${id}|${raw}`;
  if (textCache.has(key)) return textCache.get(key);
  const c = receiptState.get(id)?.candidate;
  let text = null;
  if (c?.archive?.method === 'in_repo_content_hash') {
    const file = c.text_extract?.path ?? c.path;
    let body = fs.readFileSync(path.join(root, file), 'utf8');
    if (!raw && !c.text_extract) {
      body = body.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
        .replace(/&(?:amp|#0*38);/gi, '&').replace(/&(?:#0*39|#x27|apos|rsquo|#8217);/gi, "'").replace(/&nbsp;/gi, ' ');
    }
    text = raw ? body : norm(body);
  }
  textCache.set(key, text);
  return text;
}
const shows = (id, s, raw = false) => { const t = archivedText(id, raw); return t === null ? true : (raw ? t.includes(s) : t.includes(norm(s))); };

// ---------------------------------------------------------------- accounting
const gaps = [];
const counts = { events: 0, sessions_read: 0, sessions_staged: 0, roster_entries_read: 0, roster_entries_staged: 0, roster_entries_counted_only: 0 };
const refuse = (rowKey, reason, detail = {}) => gaps.push({ lane: LANE, row_key: rowKey, reason, ...detail });

// ---------------------------------------------------------------- entities
const surfaces = new Map();
const participation = [];
const partKeys = new Set();
const newActors = new Map();
const citedReceipts = new Map();

function existingActor(entry) {
  if (entry.a) {
    if (!canonActorById.has(entry.a)) throw new Error(`roster entry ${entry.n} forces unknown actor ${entry.a}`);
    return entry.a;
  }
  const hit = canonActorByLabel.get(norm(entry.n));
  if (hit) return hit.id;
  return actorAlias.get(norm(entry.n)) ?? null;
}
function orgFor(entry) {
  if (entry.o) {
    if (!canonOrgById.has(entry.o)) throw new Error(`roster entry ${entry.n} names unknown organization ${entry.o}`);
    return entry.o;
  }
  return null;
}
function resolveListedOrg(name, overrides) {
  if (overrides?.[name]) {
    if (!canonOrgById.has(overrides[name])) throw new Error(`override for ${name} names unknown organization ${overrides[name]}`);
    return overrides[name];
  }
  return canonOrgByLabel.get(norm(name))?.id ?? orgAlias.get(norm(name)) ?? null;
}
function mintActor(entry, receiptId, sessionLabel) {
  const id = slug(entry.n.replace(/\./g, ''));
  if (canonOrgById.has(id)) throw new Error(`refusing to mint actor ${id}: the id already names an organization`);
  if (canonActorById.has(id)) return id; // same id already canonical (label differs only in punctuation)
  if (!newActors.has(id)) {
    newActors.set(id, {
      id, label: entry.n, kind: 'person', source: LANE,
      identity_status: 'named_with_role_on_dated_programme',
      plain: {
        who: `Listed as ${entry.t} on ${SOURCES[receiptId].label}.`,
        why_here: `Named with the role "${entry.r}" in ${sessionLabel}, a session that also names at least one existing ledger person. A programme listing is a scheduled appearance; it does not establish attendance, contact, agreement or influence.`,
        receipt_ids: [receiptId],
      },
    });
  }
  return id;
}
function stagePart(p) {
  const key = `${p.surface_id}|${p.actor_id ?? p.organization_id}|${p.participation_type}`;
  if (partKeys.has(key)) return;
  partKeys.add(key);
  participation.push(p);
}
const dayOf = (ev, s) => s.date ?? ev.start;
const endOf = (ev, s) => s.date ?? ev.end;

for (const ev of EVENTS) {
  counts.events += 1;
  const blockReceipts = [ev.receipt, ...(ev.block_receipts ?? [])];
  const okBlock = blockReceipts.filter(id => receiptState.get(id)?.candidate);
  const failed = blockReceipts.filter(id => !receiptState.get(id)?.candidate).map(id => ({ receipt_id: id, problems: receiptState.get(id)?.problems ?? ['unknown_receipt'] }));
  if (!receiptState.get(ev.receipt)?.candidate) {
    refuse(ev.id, 'receipt_not_admissible', { receipt_failures: failed });
    continue;
  }
  const missingShows = (ev.shows ?? []).filter(s => !shows(ev.receipt, s, ev.raw_html_checks && /[<="]/.test(s)));
  for (const [rid, list] of Object.entries(ev.extra_shows ?? {})) for (const s of list) if (receiptState.get(rid)?.candidate && !shows(rid, s)) missingShows.push(`${rid}: ${s}`);
  if (missingShows.length) { refuse(ev.id, 'dating_string_not_in_archived_copy', { missing: missingShows }); continue; }
  const evEc = ev.evidence_class ?? SOURCES[ev.receipt].evidence_class;
  const blockId = `${ev.id}-programme-roster`;
  const blockRows = []; // participation rows for the block, collected from sessions and block_extra

  // ---- sessions
  for (const s of ev.sessions) {
    counts.sessions_read += 1;
    const rid = s.receipt ?? ev.receipt;
    const rowKey = `${ev.id}/${s.id}`;
    if (!receiptState.get(rid)?.candidate) { refuse(rowKey, 'receipt_not_admissible', { receipt_failures: [{ receipt_id: rid, problems: receiptState.get(rid)?.problems }] }); continue; }
    const rawCheck = ev.raw_html_checks;
    const miss = (s.shows ?? []).filter(x => !shows(rid, x, rawCheck && /&amp;/.test(x)));
    if (miss.length) { refuse(rowKey, 'session_title_or_date_not_in_archived_copy', { missing: miss }); continue; }
    const listed = [];
    for (const entry of s.roster) {
      counts.roster_entries_read += 1;
      if (!shows(rid, entry.n)) { refuse(`${rowKey}/${entry.n}`, 'name_not_in_archived_copy', { receipt_id: rid }); continue; }
      listed.push({ entry, actor: existingActor(entry) });
    }
    const anchored = listed.some(x => x.actor);
    if (!anchored) {
      for (const x of listed) counts.roster_entries_counted_only += 1;
      refuse(rowKey, 'no_existing_ledger_person_in_session', { names: listed.map(x => x.entry.n) });
      continue;
    }
    const sid = `${ev.id}-${s.id}`;
    if (ledgerSurfaceIds.has(sid)) throw new Error(`surface id collides with ledger: ${sid}`);
    const start = dayOf(ev, s);
    const end = endOf(ev, s);
    citedReceipts.set(rid, receiptState.get(rid).candidate);
    const ec = SOURCES[rid].evidence_class;
    const surface = {
      surface_id: sid,
      surface_label: `${ev.label}: ${s.title}${s.date ? `, ${s.date}` : ''}`,
      surface_type: 'policy_document_surface',
      secondary_surface_types: s.secondary ?? ev.secondary ?? [],
      hop_eligible: false,
      scorable: true,
      status: 'scheduled_programme_session',
      bounded_by: [`${ev.label} published programme`, `session "${s.title}"`],
      time_start: start,
      time_end: end,
      evidence_class: ec,
      receipt_ids: [rid],
      notes: `One session on the organiser's published programme. ${ev.date_note ?? ''} The listing shows who was scheduled to appear together; it does not establish attendance, what was said, agreement, contact or influence.`.replace(/\s+/g, ' ').trim(),
      ...(ev.date_precision ? { date_precision: ev.date_precision } : { date_precision: 'day' }),
      date_basis: 'organiser_programme_date',
      event_id: ev.id,
      session_roster_size_listed: s.roster.length,
      intake_source: TOOL,
    };
    surfaces.set(sid, surface);
    counts.sessions_staged += 1;
    for (const { entry, actor } of listed) {
      const actorId = actor ?? mintActor(entry, rid, surface.surface_label);
      const note = [`Listed as: ${entry.n}, ${entry.t}.`, entry.identity_basis ? `Identity basis: ${entry.identity_basis}.` : null].filter(Boolean).join(' ');
      stagePart({ surface_id: sid, participant_type: 'actor', actor_id: actorId, role: entry.r, participation_type: `programme_${slug(entry.r).replace(/-/g, '_')}`, time_start: start, time_end: end, evidence_class: ec, receipt_ids: [rid], notes: note });
      counts.roster_entries_staged += 1;
      blockRows.push({ participant_type: 'actor', actor_id: actorId, role: entry.r, note });
      const org = orgFor(entry);
      if (org) {
        stagePart({ surface_id: sid, participant_type: 'organization', organization_id: org, role: `listed affiliation of ${entry.r} ${entry.n}`, participation_type: 'programme_listed_affiliation', time_start: start, time_end: end, evidence_class: ec, receipt_ids: [rid], notes: `Listed as: ${entry.n}, ${entry.t}. The organization appears only as the stated affiliation of a listed person.` });
        blockRows.push({ participant_type: 'organization', organization_id: org, role: `listed affiliation of ${entry.r} ${entry.n}`, note: `Listed as: ${entry.n}, ${entry.t}.` });
      }
    }
  }

  // ---- block (whole programme)
  if (ev.no_block) continue;
  for (const entry of ev.block_extra ?? []) {
    counts.roster_entries_read += 1;
    if (!shows(ev.receipt, entry.n) && !blockReceipts.slice(1).some(id => receiptState.get(id)?.candidate && shows(id, entry.n))) { refuse(`${ev.id}/block/${entry.n}`, 'name_not_in_archived_copy'); continue; }
    const actor = entry.org_only ? null : existingActor(entry);
    if (actor) blockRows.push({ participant_type: 'actor', actor_id: actor, role: entry.r, note: `Listed as: ${entry.n}, ${entry.t}.` });
    const org = orgFor(entry);
    if (org) blockRows.push({ participant_type: 'organization', organization_id: org, role: `listed affiliation of ${entry.r} ${entry.n}`, note: `Listed as: ${entry.n}, ${entry.t}. The organization appears only as the stated affiliation of a listed person.` });
    if (!actor) counts.roster_entries_counted_only += 1;
  }
  const unresolvedOrgs = [];
  for (const [section, names] of Object.entries(ev.org_list ?? {})) {
    for (const name of names) {
      counts.roster_entries_read += 1;
      if (!shows(ev.receipt, name)) { refuse(`${ev.id}/block/${name}`, 'name_not_in_archived_copy'); continue; }
      const org = resolveListedOrg(name, ev.org_overrides);
      if (!org) { unresolvedOrgs.push(name); counts.roster_entries_counted_only += 1; continue; }
      blockRows.push({ participant_type: 'organization', organization_id: org, role: ev.org_list_role, note: `Listed as "${name}" under "${section}".` });
    }
  }
  if (ev.host_org) blockRows.unshift({ participant_type: 'organization', organization_id: ev.host_org, role: 'event host', note: 'Host of the summit, as the event page shows.' });
  if (!blockRows.length) { refuse(blockId, 'no_ledger_participant_on_programme'); continue; }
  if (ledgerSurfaceIds.has(blockId)) throw new Error(`surface id collides with ledger: ${blockId}`);
  const ids = okBlock;
  for (const id of ids) citedReceipts.set(id, receiptState.get(id).candidate);
  surfaces.set(blockId, {
    surface_id: blockId,
    surface_label: `${ev.label}, programme roster`,
    surface_type: ev.surface_type ?? 'directory_roster_surface',
    secondary_surface_types: ev.secondary ?? [],
    hop_eligible: false,
    hop_refusal_reason: 'dense_roster_density_policy',
    scorable: true,
    status: ev.org_only_roster ? 'published_confirmed_attendee_list' : 'published_event_programme',
    bounded_by: [`${ev.label} published programme or list`],
    time_start: ev.start,
    time_end: ev.end,
    evidence_class: evEc,
    receipt_ids: ids,
    notes: `${ev.roster_note} ${ev.date_note ?? ''} Only ledger people (existing, or minted from a session that names an existing ledger person) and existing ledger organizations have participation rows; everyone else is counted here only.${unresolvedOrgs.length ? ` Listed organizations not in the ledger registries: ${unresolvedOrgs.length}.` : ''} A dense programme is context, not a hop: it does not establish attendance, contact, agreement or influence.`.replace(/\s+/g, ' ').trim(),
    ...(ev.date_precision ? { date_precision: ev.date_precision } : { date_precision: 'day' }),
    date_basis: 'organiser_programme_date',
    event_id: ev.id,
    roster_size_listed: ev.roster_size_listed,
    intake_source: TOOL,
  });
  for (const row of blockRows) {
    stagePart({
      surface_id: blockId, participant_type: row.participant_type,
      ...(row.actor_id ? { actor_id: row.actor_id } : { organization_id: row.organization_id }),
      role: row.role, participation_type: row.participant_type === 'actor' ? 'listed_programme_participant' : (row.role === 'event host' ? 'event_host' : 'listed_programme_organization'),
      time_start: ev.start, time_end: ev.end, evidence_class: evEc, receipt_ids: ids, notes: row.note,
    });
  }
}

// =============================================================== hop eligibility (post-staging)
for (const s of surfaces.values()) {
  const parts = participation.filter(p => p.surface_id === s.surface_id);
  const actors = uniq(parts.filter(p => p.participant_type === 'actor').map(p => p.actor_id));
  s.roster_entry_count = parts.length;
  s.distinct_actor_count = actors.length;
  if (s.hop_refusal_reason === 'dense_roster_density_policy') continue;
  if (actors.length >= densityMax + 1) { s.hop_eligible = false; s.hop_refusal_reason = 'dense_roster_density_policy'; continue; }
  if (actors.length >= 2 && s.evidence_class === 'reported') { s.hop_eligible = false; s.hop_refusal_reason = 'reported_evidence_without_upgrade_disposition'; }
  else if (actors.length >= 2) { s.hop_eligible = true; delete s.hop_refusal_reason; }
  else { s.hop_eligible = false; s.hop_refusal_reason = 'single_actor_context_only'; }
}

// =============================================================== write
const orderedSurfaces = [...surfaces.values()].map(s => {
  const { surface_id, surface_label, surface_type, secondary_surface_types, hop_eligible, hop_refusal_reason, scorable, status, bounded_by, time_start, time_end, evidence_class, receipt_ids, notes, ...rest } = s;
  return { surface_id, surface_label, surface_type, secondary_surface_types, hop_eligible, ...(hop_refusal_reason ? { hop_refusal_reason } : {}), scorable, status, bounded_by, time_start, time_end, evidence_class, receipt_ids, notes, ...rest };
});
for (const s of orderedSurfaces) if (!surfaceTypes.has(s.surface_type) || s.secondary_surface_types.some(t => !surfaceTypes.has(t))) throw new Error(`unknown surface type on ${s.surface_id}`);
const usedReceiptIds = new Set([...orderedSurfaces.flatMap(s => s.receipt_ids), ...participation.flatMap(p => p.receipt_ids)]);
const receipts = [...citedReceipts.values()].filter(r => usedReceiptIds.has(r.receipt_id)).sort((a, b) => a.receipt_id.localeCompare(b.receipt_id));
const usedActorIds = new Set(participation.map(p => p.actor_id).filter(Boolean));
const actorsOut = [...newActors.values()].filter(a => usedActorIds.has(a.id));

// Hop bases this lane creates: actor pairs sharing a hop-eligible staged surface.
const hopBases = [];
for (const s of orderedSurfaces.filter(x => x.hop_eligible)) {
  const actors = uniq(participation.filter(p => p.surface_id === s.surface_id && p.participant_type === 'actor').map(p => p.actor_id)).sort();
  for (let i = 0; i < actors.length; i += 1) {
    for (let j = i + 1; j < actors.length; j += 1) {
      hopBases.push({ a: actors[i], b: actors[j], both_existing: canonActorById.has(actors[i]) && canonActorById.has(actors[j]), surface_id: s.surface_id, date: s.time_start, date_precision: s.date_precision, evidence_class: s.evidence_class });
    }
  }
}

writeJsonl(`${OUT}/surfaces.jsonl`, orderedSurfaces);
writeJsonl(`${OUT}/participation.jsonl`, participation);
writeJsonl(`${OUT}/receipts.jsonl`, receipts);
writeJson(`${OUT}/actors.json`, { actors: actorsOut });
writeJson(`${OUT}/organizations.json`, { organizations: [] });
writeJsonl(`${OUT}/gaps.jsonl`, gaps);
writeJson(`${OUT}/summary.json`, {
  lane: LANE,
  tool: TOOL,
  admission_rule: 'A row is staged only when its receipt has a public source URL and satisfies the live receipt contract (resolving archive reference plus limits), and the archived copy shows every listed name and the dating strings. New people are minted only from a session that also names an existing ledger person; organizations are never minted.',
  counts,
  receipt_status: Object.fromEntries([...receiptState].map(([id, r]) => [id, r.problems.length ? r.problems : 'admissible'])),
  staged: {
    surfaces: orderedSurfaces.length,
    hop_eligible_surfaces: orderedSurfaces.filter(s => s.hop_eligible).length,
    dense_blocks: orderedSurfaces.filter(s => s.hop_refusal_reason === 'dense_roster_density_policy').length,
    participation: participation.length,
    receipts: receipts.length,
    new_actors: actorsOut.length,
    new_organizations: 0,
    gaps: gaps.length,
  },
  hop_bases_between_existing_ledger_people: hopBases.filter(h => h.both_existing),
  hop_bases_involving_new_actors: hopBases.filter(h => !h.both_existing).length,
});
console.log(`promote-intake-conventions: ${orderedSurfaces.length} surfaces (${orderedSurfaces.filter(s => s.hop_eligible).length} hop-eligible), ${participation.length} participation rows, ${receipts.length} receipts, ${actorsOut.length} new actors; ${gaps.length} gaps; ${hopBases.filter(h => h.both_existing).length} hop bases between existing ledger people.`);
