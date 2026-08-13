#!/usr/bin/env python3
from __future__ import annotations

import os
from pathlib import Path

path = Path(os.environ.get(
    "MATERIALIZER_PATH",
    "tools/materialize-dialog-directory-boundary-v1.py",
))
text = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one seam, found {count}")
    text = text.replace(old, new, 1)


replace_once(
    '    officers = [row for row in rows if row.get("participation_type") == "society_officer"]\n',
    '    officers = [row for row in rows if row.get("participation_type") == "society_officer"]\n'
    '    organizations = [row for row in rows if row.get("participant_type") == "organization"]\n',
    "source organization denominator",
)
replace_once(
    '    if len(rows) != 116 or len(listings) != 113 or len(officers) != 3:\n',
    '    if len(rows) != 116 or len(listings) != 112 or len(officers) != 3 or len(organizations) != 1:\n',
    "source denominator condition",
)
replace_once(
    '    if not any(row.get("actor_id") == "matt-clifford" for row in listings):\n',
    '    if organizations[0].get("organization_id") != "dialog" or organizations[0].get("participation_type") != "society":\n'
    '        raise SystemExit(f"unexpected Dialog organization row: {organizations[0]}")\n'
    '    if not any(row.get("actor_id") == "matt-clifford" for row in listings):\n',
    "source organization assertion",
)
replace_once(
    '    officer_rows = [row for row in old_rows if row.get("participation_type") == "society_officer"]\n',
    '    officer_rows = [row for row in old_rows if row.get("participation_type") == "society_officer"]\n'
    '    organization_rows = [row for row in old_rows if row.get("participant_type") == "organization"]\n',
    "replacement organization rows",
)
replace_once(
    '    retained[first:first] = new_listing_rows + new_officer_rows + [invitation_row]\n',
    '''    new_organization_rows = []
    for source in organization_rows:
        row = dict(source)
        row["surface_id"] = DIRECTORY
        row["role"] = "Organization whose public directory exposed the listing identities"
        row["participation_type"] = "directory_host_context"
        row["time_start"] = OBSERVED_AT
        row["time_end"] = OBSERVED_AT
        row["evidence_class"] = "primary_public"
        row["receipt_ids"] = ["dialog-directory-extract", "wired-dialog-misconfig"]
        row["notes"] = "Organization context for the public directory; it is excluded from the actor-listing denominator and creates no actor adjacency."
        new_organization_rows.append(row)

    retained[first:first] = (
        new_listing_rows + new_organization_rows + new_officer_rows + [invitation_row]
    )
''',
    "organization preservation block",
)
replace_once(
    '- Reported leadership-role rows excluded from this listing denominator: 3\n',
    '- Reported leadership-role rows excluded from this listing denominator: 3\n'
    '- Dialog organization-context rows excluded from this actor denominator: 1\n',
    "receipt denominator prose",
)

for old, new, label in [
    ("113 source-addressed", "112 source-addressed", "receipt identity prose"),
    ("113 rows typed as listed_in_directory", "112 rows typed as listed_in_directory", "surface bound"),
    ("113-name roster", "112-name roster", "surface note"),
    ('"directory_listing_count": 113', '"directory_listing_count": 112', "receipt count"),
    ("assert.equal(dialogDirectoryActors.length, 113);", "assert.equal(dialogDirectoryActors.length, 112);", "compiler count"),
    ("directory_listing_count, 113);", "directory_listing_count, 112);", "compiler receipt count"),
    ("length === 113,", "length === 112,", "release count"),
    ("remain 113'", "remain 112'", "release message"),
]:
    replace_once(old, new, label)

replace_once(
    """+assert.equal(dialogDirectoryActors.length, 112);
+assert.ok(dialogDirectoryActors.includes('matt-clifford'));
""",
    """+assert.equal(dialogDirectoryActors.length, 112);
+assert.ok(dialogDirectoryActors.includes('matt-clifford'));
+assert.deepEqual(
+  dialogDirectory.participants.filter(part => part.participant_type === 'organization')
+    .map(part => part.organization_id),
+  ['dialog'],
+);
""",
    "compiler organization regression",
)
replace_once(
    """+assert((dialogDirectory?.participants ?? []).filter(part => part.participant_type === 'actor').length === 112,
+  'Dialog directory listing denominator must remain 112');
+assert((dialogDirectory?.participants ?? []).some(part => part.actor_id === 'matt-clifford'),
""",
    """+assert((dialogDirectory?.participants ?? []).filter(part => part.participant_type === 'actor').length === 112,
+  'Dialog directory listing denominator must remain 112');
+assert(sameIdSet(
+  (dialogDirectory?.participants ?? []).filter(part => part.participant_type === 'organization')
+    .map(part => part.organization_id),
+  ['dialog'],
+), 'Dialog directory must retain exactly one organization-context row');
+assert((dialogDirectory?.participants ?? []).some(part => part.actor_id === 'matt-clifford'),
""",
    "release organization regression",
)

if "113" in text:
    raise SystemExit("unreconciled stale Dialog denominator literal remains")

path.write_text(text, encoding="utf-8")
print("Dialog materializer reconciled to 112 actor listings, 3 officers, and 1 organization context row")
