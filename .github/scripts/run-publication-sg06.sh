#!/usr/bin/env bash
set -Eeuo pipefail

BRANCH='agent/publication-allowlist-poof-admission-v2'
EXPECTED_BASE='0d701692fa83a405bd0ba86e7b45c525022589f7'
LOCAL_PUBLICATION_SHA='1991d4528cca0836be84469fb2115b3308b4dfa1'
LIFECYCLE_LOCAL_PUBLICATION_SHA='c8a0847e54243d997f171c0327c5b8a2057a7815'
EXPECTED_HEAD="${EXPECTED_HEAD:?EXPECTED_HEAD is required}"

test "$(git rev-parse HEAD)" = "$EXPECTED_HEAD"
git fetch origin main
base="$(git rev-parse origin/main)"
test "$base" = "$EXPECTED_BASE"
transport_head="$EXPECTED_HEAD"

cat > /tmp/expected-transport <<'PATHS'
.github/scripts/run-publication-sg06.sh
.github/tmp/publication-sg06-checkpoint.part-00.patch
.github/tmp/publication-sg06-checkpoint.part-01.patch
.github/tmp/publication-sg06-checkpoint.part-02.patch
.github/tmp/publication-sg06-checkpoint.part-03.patch
.github/tmp/publication-sg06-checkpoint.part-04.patch
.github/tmp/publication-sg06-checkpoint.part-05.patch
.github/tmp/publication-sg06-checkpoint.part-06.patch
.github/tmp/publication-sg06-checkpoint.part-07.patch
.github/tmp/publication-sg06-checkpoint.part-08.patch
.github/tmp/publication-sg06-publication.part-00.b64
.github/tmp/publication-sg06-publication.part-01.b64
.github/tmp/publication-sg06-publication.part-02.b64
.github/workflows/temporary-publication-sg06.yml
PATHS
sort -o /tmp/expected-transport /tmp/expected-transport
git diff --name-only "$base"..HEAD | sort > /tmp/observed-transport
diff -u /tmp/expected-transport /tmp/observed-transport

cat .github/tmp/publication-sg06-publication.part-*.b64 | tr -d '\n\r\t ' > /tmp/publication.patch.xz.b64
printf '%s  %s\n' '2175c03bd627aaf9e0ed31530e14bac60dd28807561692a1b7f42e251279b04d' /tmp/publication.patch.xz.b64 | sha256sum --check --strict
base64 --decode /tmp/publication.patch.xz.b64 > /tmp/publication.patch.xz
printf '%s  %s\n' 'a28622ad2c4aeb834e907d7a44dd95098e672e0594b4e59d5d1af5d750cd823d' /tmp/publication.patch.xz | sha256sum --check --strict
xz --decompress --stdout /tmp/publication.patch.xz > /tmp/publication.patch
printf '%s  %s\n' '4003b83ff0a2863dae3b83b0bc2bf92d26e95e411331052c9332b02038fc5d34' /tmp/publication.patch | sha256sum --check --strict

cat .github/tmp/publication-sg06-checkpoint.part-*.patch > /tmp/sg06.patch
printf '%s  %s\n' '0a2f358557c8c97e1ee6f3d5a8d565084ba3ee2f66c75c19bb3c7810ad103671' /tmp/sg06.patch | sha256sum --check --strict

cat > /tmp/sg06-lifecycle-repair.patch <<'LIFECYCLE_PATCH'
diff --git a/.github/workflows/project-stable-ground-sg06.yml b/.github/workflows/project-stable-ground-sg06.yml
index f9f11f2..b6cb1a2 100644
--- a/.github/workflows/project-stable-ground-sg06.yml
+++ b/.github/workflows/project-stable-ground-sg06.yml
@@ -17,7 +17,10 @@ on:
       - 'tools/validate-pages.mjs'
       - 'tools/validate-publication-plan.mjs'
       - 'tools/build-project-stable-ground-sg06.mjs'
+      - 'tools/validate-project-stable-ground-sg04.mjs'
+      - 'tools/validate-project-stable-ground-sg05.mjs'
       - 'tools/validate-project-stable-ground-sg06.mjs'
+      - 'test/project-stable-ground-sg05.test.js'
       - 'test/publication-*.test.js'
       - 'test/project-stable-ground-sg06.test.js'
       - 'test/status-sovereignty-compact.test.js'
@@ -42,7 +45,10 @@ on:
       - 'tools/validate-pages.mjs'
       - 'tools/validate-publication-plan.mjs'
       - 'tools/build-project-stable-ground-sg06.mjs'
+      - 'tools/validate-project-stable-ground-sg04.mjs'
+      - 'tools/validate-project-stable-ground-sg05.mjs'
       - 'tools/validate-project-stable-ground-sg06.mjs'
+      - 'test/project-stable-ground-sg05.test.js'
       - 'test/publication-*.test.js'
       - 'test/project-stable-ground-sg06.test.js'
       - 'test/status-sovereignty-compact.test.js'
diff --git a/data/project/project-stable-ground-sg06-release-manifest.json b/data/project/project-stable-ground-sg06-release-manifest.json
index 13a47b0..7137f68 100644
--- a/data/project/project-stable-ground-sg06-release-manifest.json
+++ b/data/project/project-stable-ground-sg06-release-manifest.json
@@ -13,8 +13,8 @@
     },
     {
       "path": ".github/workflows/project-stable-ground-sg06.yml",
-      "sha256": "9140095e74fcc873798458a9cb5b78336bebe630079fb79d7ecbec32a282f6a0",
-      "bytes": 4630
+      "sha256": "5442cae9d8670fed4de467369454ef63f82a5f883257d11c6832287c2b6c902c",
+      "bytes": 4954
     },
     {
       "path": ".github/workflows/project-stable-ground-sg05.yml",
@@ -43,13 +43,13 @@
     },
     {
       "path": "data/project/project-stable-ground-current.json",
-      "sha256": "fc716fe864946385b34a64ece1196b55e9ba85be205107610349c408b9ddfb77",
+      "sha256": "ccecba629cb949813241fa72babf08e3f7f3beafb26094ba47f10863ffba0aa4",
       "bytes": 2209
     },
     {
       "path": "data/project/project-stable-ground-sg06.json",
-      "sha256": "f52e451ecba09ccfe102a27ce37721a41bd41260b45743cf64c35a96bcbe14d5",
-      "bytes": 24868
+      "sha256": "a3490e79358e9dff8d8b56d3534031f622aa70ad5bfc9d4a73ebc3fcd9201961",
+      "bytes": 25301
     },
     {
       "path": "data/project/publication-plan.json",
@@ -68,8 +68,8 @@
     },
     {
       "path": "reports/core-thesis/stable-ground/sg06/checkpoint.json",
-      "sha256": "45d779f924c4d9419050e77acfc3ac2947383b9a3ef469707749e79071d0a814",
-      "bytes": 26692
+      "sha256": "91a46863b94cb8cf4b85c0dad2c350337a372da0f7fa89cc33bb86570af805ba",
+      "bytes": 27125
     },
     {
       "path": "reports/core-thesis/stable-ground/sg06/index.html",
-      "sha256": "713ffdb3c4dec2e887e4a5c8f1b23fb35589dc375fb24d67f307b5b1af51ad21",
-      "bytes": 9636
+      "sha256": "6c7f444ef73acee54ff21fc5d0f2eeb2e416293cd2f4177339e6858a1c34320f",
+      "bytes": 9636
     },
     {
       "path": "test/project-stable-ground-sg06.test.js",
-      "sha256": "d88a28b7b245460e530f838710043c63a07b255f0dab6a01800a42cce65a6a5c",
-      "bytes": 6564
+      "sha256": "274f26f3b36993f077ea8c87e08270d615f89d9f9e8810d4d2f28c58103799b4",
+      "bytes": 7209
     },
     {
       "path": "test/status-sovereignty-compact.test.js",
@@ -78,13 +78,28 @@
       "bytes": 6056
     },
     {
+      "path": "test/project-stable-ground-sg05.test.js",
+      "sha256": "1b8b4333f351c3979c1de3f96622547f55fae0230ebf188f450ca13dcedcdeea",
+      "bytes": 6563
+    },
+    {
       "path": "tools/build-project-stable-ground-sg06.mjs",
-      "sha256": "7d83a42d7dc2ba6dc79fe5b8f54af4af9fd8e8c85f37c60a87701254083a476e",
-      "bytes": 18912
+      "sha256": "14359bf946d8d847a03f80f71670812f4f231d91dd6573587d78d883c0f1e2d4",
+      "bytes": 19021
+    },
+    {
+      "path": "tools/validate-project-stable-ground-sg04.mjs",
+      "sha256": "677460cf64604739fdf8b9a60cbb77939b0a1b959dbbeeb8cf8c6321b6da38c1",
+      "bytes": 9715
+    },
+    {
+      "path": "tools/validate-project-stable-ground-sg05.mjs",
+      "sha256": "a73bd373893195e9af13182b9a8aac235ce26f5f0fdab7675013c7cdf2efc3da",
+      "bytes": 19895
     },
     {
       "path": "tools/validate-project-stable-ground-sg06.mjs",
-      "sha256": "5bf163dd0bf717154703f7642d87beb65b740bfb670242b00f5898058180dbb6f",
-      "bytes": 16684
+      "sha256": "6800bc94c3cb256268111a34795748854402adf3041a00b8775b201753668d7a",
+      "bytes": 17532
     }
   ],
-  "combined_sha256": "a6e379e62f6b7883e0ffcbf28de7e70de1a4aaf0498c77afb139b7da391883ba",
+  "combined_sha256": "24e1fc475b725fdba3f1cd732f78f9a6c7016e5c2cb8729b0442dc223a40d9e9",
   "boundaries": {
     "manifest_proves_source_truth": false,
     "manifest_proves_external_reproduction": false,
diff --git a/data/project/project-stable-ground-sg06.json b/data/project/project-stable-ground-sg06.json
index adf59b8..26047c2 100644
--- a/data/project/project-stable-ground-sg06.json
+++ b/data/project/project-stable-ground-sg06.json
@@ -9,7 +9,7 @@
   "trigger": {
     "type": "canonical_status_aware_publication_allowlist_and_poof_staging",
     "issue": 463,
-    "pull_request": 478,
+    "pull_request": 484,
     "transition_commit": "c8a0847e54243d997f171c0327c5b8a2057a7815",
     "transition_base": "0d701692fa83a405bd0ba86e7b45c525022589f7",
     "transition_paths": [
@@ -267,7 +267,7 @@
       },
       {
         "lane_id": "FAN-04",
-        "surface": "PR #478",
+        "surface": "PR #484",
         "purpose": "status-aware publication safety and public aperture custody",
         "state": "complete_canonical_default_exclude",
         "receipt": "c8a0847e54243d997f171c0327c5b8a2057a7815"
@@ -383,9 +383,19 @@
       "validator": "tools/validate-project-stable-ground-sg04.mjs",
       "test": "test/project-stable-ground-sg04.test.js",
       "rebuild_allowed": false,
-      "validation_mode": "immutable_history_only"
+      "validation_mode": "successor_aware_immutable_history",
+      "state": "successor_aware_immutable_history_validation_installed_by_SG06",
+      "receipt": "c8a0847e54243d997f171c0327c5b8a2057a7815"
     },
     {
       "checkpoint_id": "SG-2026-07-30-05",
       "validator": "tools/validate-project-stable-ground-sg05.mjs",
+      "test": "test/project-stable-ground-sg05.test.js",
       "rebuild_allowed": false,
-      "validation_mode": "immutable_history_only"
+      "validation_mode": "successor_aware_immutable_history",
+      "state": "successor_aware_immutable_history_validation_installed_by_SG06",
+      "receipt": "c8a0847e54243d997f171c0327c5b8a2057a7815"
     },
     {
       "checkpoint_id": "SG-2026-07-30-06",
@@ -393,7 +403,9 @@
       "test": "test/project-stable-ground-sg06.test.js",
       "rebuild_allowed": true,
       "validation_mode": "current_only",
-      "state": "current"
+      "state": "current",
+      "receipt": "c8a0847e54243d997f171c0327c5b8a2057a7815"
     }
   ],
   "resolved_drift": [
diff --git a/reports/core-thesis/stable-ground/sg06/checkpoint.json b/reports/core-thesis/stable-ground/sg06/checkpoint.json
index f7ff1d8..c868b41 100644
--- a/reports/core-thesis/stable-ground/sg06/checkpoint.json
+++ b/reports/core-thesis/stable-ground/sg06/checkpoint.json
@@ -9,7 +9,7 @@
   "trigger": {
     "type": "canonical_status_aware_publication_allowlist_and_poof_staging",
     "issue": 463,
-    "pull_request": 478,
+    "pull_request": 484,
     "transition_commit": "c8a0847e54243d997f171c0327c5b8a2057a7815",
     "transition_base": "0d701692fa83a405bd0ba86e7b45c525022589f7",
     "transition_paths": [
@@ -267,7 +267,7 @@
       },
       {
         "lane_id": "FAN-04",
-        "surface": "PR #478",
+        "surface": "PR #484",
         "purpose": "status-aware publication safety and public aperture custody",
         "state": "complete_canonical_default_exclude",
         "receipt": "c8a0847e54243d997f171c0327c5b8a2057a7815"
@@ -383,9 +383,19 @@
       "validator": "tools/validate-project-stable-ground-sg04.mjs",
       "test": "test/project-stable-ground-sg04.test.js",
       "rebuild_allowed": false,
-      "validation_mode": "immutable_history_only"
+      "validation_mode": "successor_aware_immutable_history",
+      "state": "successor_aware_immutable_history_validation_installed_by_SG06",
+      "receipt": "c8a0847e54243d997f171c0327c5b8a2057a7815"
     },
     {
       "checkpoint_id": "SG-2026-07-30-05",
       "validator": "tools/validate-project-stable-ground-sg05.mjs",
+      "test": "test/project-stable-ground-sg05.test.js",
       "rebuild_allowed": false,
-      "validation_mode": "immutable_history_only"
+      "validation_mode": "successor_aware_immutable_history",
+      "state": "successor_aware_immutable_history_validation_installed_by_SG06",
+      "receipt": "c8a0847e54243d997f171c0327c5b8a2057a7815"
     },
     {
       "checkpoint_id": "SG-2026-07-30-06",
@@ -393,7 +403,9 @@
       "test": "test/project-stable-ground-sg06.test.js",
       "rebuild_allowed": true,
       "validation_mode": "current_only",
-      "state": "current"
+      "state": "current",
+      "receipt": "c8a0847e54243d997f171c0327c5b8a2057a7815"
     }
   ],
   "resolved_drift": [
diff --git a/reports/core-thesis/stable-ground/sg06/index.html b/reports/core-thesis/stable-ground/sg06/index.html
index df1bd10..af3f42f 100644
--- a/reports/core-thesis/stable-ground/sg06/index.html
+++ b/reports/core-thesis/stable-ground/sg06/index.html
@@ -40,7 +40,7 @@
   &quot;adoption_effect&quot;: &quot;none&quot;
 }</pre>
 <h2>Preserved history</h2><table><thead><tr><th>Checkpoint</th><th>Path</th><th>Status</th><th>Receipt</th></tr></thead><tbody><tr><td><code>SG-2026-07-29-01</code></td><td><code>data/project/project-stable-ground-alignment.json</code></td><td>superseded_preserved</td><td><code>c810cc741b23062b7eb3d026a46404e138e93eda</code></td></tr><tr><td><code>SG-2026-07-29-02</code></td><td><code>data/project/project-stable-ground-sg02.json</code></td><td>superseded_preserved</td><td><code>6b54d531885b5de72be547933ad4f7828a34d529</code></td></tr><tr><td><code>SG-2026-07-29-03</code></td><td><code>data/project/project-stable-ground-sg03.json</code></td><td>superseded_preserved</td><td><code>b305eb935864b8adef320e8db5ff471d2a778403</code></td></tr><tr><td><code>SG-2026-07-29-04</code></td><td><code>data/project/project-stable-ground-sg04.json</code></td><td>superseded_preserved</td><td><code>8c5e592034effe30d644319e085f97e045060269</code></td></tr><tr><td><code>SG-2026-07-30-05</code></td><td><code>data/project/project-stable-ground-sg05.json</code></td><td>superseded_preserved</td><td><code>cada5ce40087305196a53a9ecc32a707cff28e52</code></td></tr><tr><td><code>SG-2026-07-30-06</code></td><td><code>data/project/project-stable-ground-sg06.json</code></td><td>current</td><td><code>c8a0847e54243d997f171c0327c5b8a2057a7815</code></td></tr></tbody></table>
-<h2>Fan-out lanes</h2><table><thead><tr><th>Lane</th><th>Surface</th><th>Purpose</th><th>State</th></tr></thead><tbody><tr><td><code>FAN-01</code></td><td>PR #410</td><td>POOF and Clifford mainline reconciliation</td><td>complete_canonical</td></tr><tr><td><code>FAN-02</code></td><td>PR #405 / PR #461</td><td>complete and deduplicate the K0 nine-query battery</td><td>complete_canonical_zero_events</td></tr><tr><td><code>FAN-03</code></td><td>DCA-H01 and issues #422-#427</td><td>execute the twelve-query field-hypothesis denominator</td><td>canonical_protocol_execution_zero</td></tr><tr><td><code>FAN-04</code></td><td>PR #478</td><td>status-aware publication safety and public aperture custody</td><td>complete_canonical_default_exclude</td></tr><tr><td><code>FAN-05</code></td><td>PR #386 and lake stack through #458</td><td>reconcile branch-scoped judgment, identity, lineage, projection, and residual lake denominators</td><td>validated_branch_shadow_not_main</td></tr><tr><td><code>FAN-06</code></td><td>issues #360, #364, #411-#414</td><td>external reproduction, adjudication, partner topology, and field use</td><td>external_zero_state</td></tr><tr><td><code>FAN-07</code></td><td>PR #467 / issues #468-#476</td><td>status-for-sovereignty compact and white-dominant selector-state evidence program</td><td>canonical_hypothesis_zero_execution</td></tr></tbody></table>
+<h2>Fan-out lanes</h2><table><thead><tr><th>Lane</th><th>Surface</th><th>Purpose</th><th>State</th></tr></thead><tbody><tr><td><code>FAN-01</code></td><td>PR #410</td><td>POOF and Clifford mainline reconciliation</td><td>complete_canonical</td></tr><tr><td><code>FAN-02</code></td><td>PR #405 / PR #461</td><td>complete and deduplicate the K0 nine-query battery</td><td>complete_canonical_zero_events</td></tr><tr><td><code>FAN-03</code></td><td>DCA-H01 and issues #422-#427</td><td>execute the twelve-query field-hypothesis denominator</td><td>canonical_protocol_execution_zero</td></tr><tr><td><code>FAN-04</code></td><td>PR #484</td><td>status-aware publication safety and public aperture custody</td><td>complete_canonical_default_exclude</td></tr><tr><td><code>FAN-05</code></td><td>PR #386 and lake stack through #458</td><td>reconcile branch-scoped judgment, identity, lineage, projection, and residual lake denominators</td><td>validated_branch_shadow_not_main</td></tr><tr><td><code>FAN-06</code></td><td>issues #360, #364, #411-#414</td><td>external reproduction, adjudication, partner topology, and field use</td><td>external_zero_state</td></tr><tr><td><code>FAN-07</code></td><td>PR #467 / issues #468-#476</td><td>status-for-sovereignty compact and white-dominant selector-state evidence program</td><td>canonical_hypothesis_zero_execution</td></tr></tbody></table>
 <h2>Resolved drift</h2><table><thead><tr><th>ID</th><th>Prior state</th><th>Resolution</th></tr></thead><tbody><tr><td><code>SG06-DRIFT-01</code></td><td>GitHub Pages recursively copied broad repository trees and deleted only known-private paths.</td><td>Publication now begins from an explicit positive plan, follows only classified dependencies, and rejects unclassified artifact bytes.</td></tr><tr><td><code>SG06-DRIFT-02</code></td><td>The generic research-edge graph was loaded by the public runtime and presented as a primary route surface.</td><td>The public runtime loads only the bounded surface-hop graph; graph.json and legacy route products are absent and browser-gated.</td></tr><tr><td><code>SG06-DRIFT-03</code></td><td>POOF publication custody and deployment could be narrated as the same act.</td><td>POOF receipt 006 records admission to custody while status remains staged_nonpublic, GitHub Pages returns 404, and deployment remains false.</td></tr><tr><td><code>SG06-DRIFT-04</code></td><td>SSC publication blocking relied on broad builder exclusions.</td><td>All SSC source, report, contract, and custody surfaces are explicit held entries in the positive publication plan and are independently refused by the Pages validator.</td></tr><tr><td><code>SG06-DRIFT-05</code></td><td>Volatile compiler timestamps could change exact public artifact bytes without changing evidence.</td><td>Five named public projections normalize only top-level generated metadata under an explicit publication-projection authority ceiling.</td></tr></tbody></table>
diff --git a/test/project-stable-ground-sg05.test.js b/test/project-stable-ground-sg05.test.js
index a188043..1b8b433 100644
--- a/test/project-stable-ground-sg05.test.js
+++ b/test/project-stable-ground-sg05.test.js
@@ -1,13 +1,41 @@
 #!/usr/bin/env node
 import assert from 'node:assert/strict';
+import crypto from 'node:crypto';
+import fs from 'node:fs';
+import path from 'node:path';
+import { fileURLToPath } from 'node:url';
 import { loadSg05Context, validateSg05 } from '../tools/validate-project-stable-ground-sg05.mjs';
 
-const clean = loadSg05Context({ transitionVerifier: () => [], historicalVerifier: () => [] });
-assert.deepEqual(validateSg05(clean), [], 'clean current SG-05 checkpoint must validate under injected transition custody');
+const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
+const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
+const clean = loadSg05Context({ transitionVerifier: () => [], historicalVerifier: () => [] });
+assert.deepEqual(validateSg05(clean), [], 'clean historical SG-05 checkpoint must validate under injected receipt custody');
 const cloneContext = () => Object.fromEntries(Object.entries(clean).map(([key, value]) => [key, typeof value === 'function' ? value : structuredClone(value)]));
 
-const mutations = [
+const historicalMutations = [
+  ['keep SG-05 current after SG-06', (c) => { c.pointer.current_checkpoint_id = c.checkpoint.checkpoint_id; }, 'SG-05 remains current after successor append'],
   ['duplicate checkpoint identity', (c) => { c.pointer.history[4].checkpoint_id = 'SG-2026-07-29-04'; }, 'pointer history order'],
   ['reorder history', (c) => { c.pointer.history.reverse(); }, 'pointer history order'],
+  ['remove SG-06 successor', (c) => { c.pointer.history.pop(); c.pointer.current_checkpoint_id = 'SG-2026-07-30-05'; }, 'SG-05 remains current after successor append'],
+  ['rewrite historical SG-05 row path', (c) => { c.pointer.history[4].path = 'wrong.json'; }, 'historical SG-05 pointer path'],
+  ['rewrite historical SG-05 row status', (c) => { c.pointer.history[4].status = 'current'; }, 'historical SG-05 pointer status'],
+  ['rewrite historical SG-05 merge receipt', (c) => { c.pointer.history[4].merge_commit = '0'.repeat(40); }, 'historical SG-05 merge receipt'],
+  ['rewrite historical bytes', (c) => { c.historicalVerifier = () => ['historical SG-05 bytes drifted from merge receipt']; }, 'historical SG-05 bytes drifted'],
+  ['rewrite frozen SSC execution', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.query_or_field_execution_started = true; }, 'frozen SSC execution'],
+  ['rewrite frozen K0 event', (c) => { c.checkpoint.canonical_snapshot.k0.included_events = 1; }, 'frozen K0 event count'],
+  ['rewrite frozen DCA execution', (c) => { c.checkpoint.canonical_snapshot.dca.query_templates_executed = 1; }, 'frozen DCA execution'],
+  ['rewrite frozen adoption', (c) => { c.checkpoint.canonical_snapshot.sprint_09.maximum_verified_adoption_level = 'A1'; }, 'frozen adoption ceiling'],
+  ['create frozen graph effect', (c) => { c.checkpoint.boundaries.graph_effect = 'edge'; }, 'SG-05 boundary graph_effect']
+];
+
+for (const [name, mutate, expected] of historicalMutations) {
+  const context = cloneContext();
+  mutate(context);
+  const errors = validateSg05(context);
+  assert(errors.some((error) => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
+}
+
+const current = cloneContext();
+current.pointer.current_checkpoint_id = current.checkpoint.checkpoint_id;
+current.pointer.current_checkpoint_path = 'data/project/project-stable-ground-sg05.json';
+current.pointer.current_canonical_main_commit = current.checkpoint.trigger.transition_commit;
+current.pointer.history = current.pointer.history.slice(0, 5).map((row, index) => ({
+  ...row,
+  status: index === 4 ? 'current' : 'superseded_preserved'
+}));
+const manifestBytes = fs.readFileSync(path.join(root, 'data/project/project-stable-ground-sg05-release-manifest.json'));
+current.manifestComputer = () => ({ ...structuredClone(current.manifest) });
+current.manifest.combined_sha256 = sha256(manifestBytes);
+current.manifestComputer = () => structuredClone(current.manifest);
+assert.deepEqual(validateSg05(current), [], 'clean reconstructed current SG-05 checkpoint must validate');
+
+const currentMutations = [
   ['weaken append-only governor', (c) => { c.governor.history_law.append_only = false; }, 'governor append-only law'],
   ['remove SSC trigger class', (c) => { c.governor.trigger_classes = c.governor.trigger_classes.filter((x) => !x.includes('status-for-sovereignty')); }, 'governor missing SSC trigger class'],
   ['rewrite SG-04 preservation', (c) => { c.checkpoint.supersedes.preserved_unchanged = false; }, 'SG-04 preservation'],
@@ -23,6 +51,7 @@ const mutations = [
   ['turn patriotism into proof', (c) => { c.status.boundaries.patriotism_is_white_power = true; }, 'live patriotism boundary'],
   ['turn minority presence into neutrality', (c) => { c.status.boundaries.multiracial_presence_proves_neutrality = true; }, 'live neutrality boundary'],
   ['turn minority presence into tokenism', (c) => { c.status.boundaries.multiracial_presence_proves_tokenism = true; }, 'live tokenism boundary'],
+  ['rewrite current path', (c) => { c.pointer.current_checkpoint_path = 'wrong.json'; }, 'pointer current path'],
   ['execute a lane', (c) => { c.fanout.lanes[0].execution.started = true; }, 'live SSC lane execution or graph drift'],
   ['create graph effect', (c) => { c.fanout.lanes[0].graph_effect = 'edge'; }, 'live SSC lane execution or graph drift'],
   ['invent external retrieval', (c) => { c.sources.counts.independently_retrieved_external_references = 8; }, 'live SSC retrieval state'],
@@ -32,19 +61,12 @@ const mutations = [
   ['deploy POOF', (c) => { c.poofAperture.publication.deployed = true; }, 'live POOF deployment'],
   ['advance adoption', (c) => { c.sprint09.current_result.maximum_verified_adoption_level = 'A1'; }, 'live adoption'],
   ['drift exact manifest', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'current SG-05 exact-byte manifest'],
-  ['launder historical mode', (c) => {
-    c.pointer.current_checkpoint_id = 'SG-FUTURE';
-    c.pointer.history[4].status = 'superseded_preserved';
-    c.pointer.history[4].merge_commit = 'not-a-commit';
-    c.historicalVerifier = () => ['historical SG-05 merge receipt is not a full commit SHA'];
-  }, 'historical SG-05 merge receipt is not a full commit SHA']
 ];
 
-for (const [name, mutate, expected] of mutations) {
-  const context = cloneContext();
+for (const [name, mutate, expected] of currentMutations) {
+  const context = Object.fromEntries(Object.entries(current).map(([key, value]) => [key, typeof value === 'function' ? value : structuredClone(value)]));
   mutate(context);
   const errors = validateSg05(context);
   assert(errors.some((error) => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
 }
-console.log(`project-stable-ground-sg05.test: ${mutations.length} adversarial mutations PASS`);
+console.log(`project-stable-ground-sg05.test: ${historicalMutations.length + currentMutations.length} current/historical adversarial mutations PASS`);
diff --git a/test/project-stable-ground-sg06.test.js b/test/project-stable-ground-sg06.test.js
index d88a28b..274f26f 100644
--- a/test/project-stable-ground-sg06.test.js
+++ b/test/project-stable-ground-sg06.test.js
@@ -33,6 +33,7 @@ const mutations = [
   ['rewrite publication plan digest', (c) => { c.checkpoint.trigger.publication_plan_sha256 = 'f'.repeat(64); }, 'publication plan digest'],
   ['rewrite release digest', (c) => { c.checkpoint.trigger.publication_release_sha256 = 'f'.repeat(64); }, 'publication release digest'],
   ['rewrite transition receipt', (c) => { c.checkpoint.trigger.transition_commit = '0'.repeat(40); }, 'transition receipt'],
+  ['rewrite publication pull request', (c) => { c.checkpoint.trigger.pull_request = 478; }, 'publication PR'],
   ['rewrite transition denominator', (c) => { c.checkpoint.trigger.transition_paths.pop(); }, 'transition path denominator'],
   ['rewrite POOF receipt', (c) => { c.checkpoint.trigger.poof_receipt_id = '005'; }, 'POOF receipt'],
   ['rewrite POOF state', (c) => { c.checkpoint.canonical_snapshot.poof.publication_state = 'deployed'; }, 'POOF publication state'],
@@ -42,6 +43,9 @@ const mutations = [
   ['promote SSC execution', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.query_or_field_execution_started = true; }, 'SSC execution'],
   ['promote DCA execution', (c) => { c.checkpoint.canonical_snapshot.dca.query_templates_executed = 1; }, 'DCA execution'],
   ['advance adoption', (c) => { c.checkpoint.canonical_snapshot.sprint_09.maximum_verified_adoption_level = 'A1'; }, 'adoption ceiling'],
+  ['remove SG-04 lifecycle repair', (c) => { c.checkpoint.stable_ground_lifecycle[3].state = 'legacy'; }, 'SG-04 lifecycle state'],
+  ['remove SG-05 lifecycle repair', (c) => { c.checkpoint.stable_ground_lifecycle[4].state = 'legacy'; }, 'SG-05 lifecycle state'],
+  ['remove SG-06 lifecycle receipt', (c) => { c.checkpoint.stable_ground_lifecycle[5].receipt = '0'.repeat(40); }, 'SG-06 lifecycle receipt'],
   ['deploy POOF', (c) => { c.poofAperture.publication.deployed = true; }, 'live POOF deployment'],
   ['index POOF', (c) => { c.poofAperture.publication.indexable = true; }, 'live POOF indexability'],
   ['publish SSC route', (c) => { c.pagesManifest.files.push({ path: 'reports/core-thesis/status-sovereignty/index.html' }); }, 'held SSC surface published'],
diff --git a/tools/build-project-stable-ground-sg06.mjs b/tools/build-project-stable-ground-sg06.mjs
index 7d83a42..14359bf 100644
--- a/tools/build-project-stable-ground-sg06.mjs
+++ b/tools/build-project-stable-ground-sg06.mjs
@@ -29,6 +29,8 @@ const releaseScope = [
   'test/status-sovereignty-compact.test.js',
   'test/project-stable-ground-sg05.test.js',
   'test/project-stable-ground-sg06.test.js',
+  'tools/validate-project-stable-ground-sg04.mjs',
+  'tools/validate-project-stable-ground-sg05.mjs',
   'tools/build-project-stable-ground-sg06.mjs',
   'tools/validate-project-stable-ground-sg06.mjs',
 ];
diff --git a/tools/validate-project-stable-ground-sg04.mjs b/tools/validate-project-stable-ground-sg04.mjs
index 2146131..677460c 100644
--- a/tools/validate-project-stable-ground-sg04.mjs
+++ b/tools/validate-project-stable-ground-sg04.mjs
@@ -134,15 +134,29 @@ export function validateSg04(context = loadSg04Context()) {
     else if (typeof value === 'boolean') equal(value, false, `SG-04 boundary ${key}`);
   }
 
-  check(pointer.current_checkpoint_id !== checkpoint.checkpoint_id, 'SG-04 remains current after SG-05 succession');
-  equal(pointer.current_checkpoint_id, 'SG-2026-07-30-05', 'current checkpoint after SG-04');
+  equal(pointer.schema_version, 'project-stable-ground-current@1', 'pointer schema');
   const historyIds = pointer.history?.map((row) => row.checkpoint_id) ?? [];
-  equal(JSON.stringify(historyIds), JSON.stringify(['SG-2026-07-29-01','SG-2026-07-29-02','SG-2026-07-29-03','SG-2026-07-29-04','SG-2026-07-30-05']), 'pointer history order');
-  const historyRow = pointer.history?.find((row) => row.checkpoint_id === checkpoint.checkpoint_id);
+  const requiredPrefix = ['SG-2026-07-29-01','SG-2026-07-29-02','SG-2026-07-29-03','SG-2026-07-29-04','SG-2026-07-30-05'];
+  check(historyIds.length >= requiredPrefix.length, 'pointer history is shorter than the preserved SG-01 through SG-05 prefix');
+  equal(JSON.stringify(historyIds.slice(0, requiredPrefix.length)), JSON.stringify(requiredPrefix), 'pointer history order');
+  equal(new Set(historyIds).size, historyIds.length, 'pointer checkpoint uniqueness');
+  equal(pointer.history?.filter((row) => row.status === 'current').length, 1, 'pointer current-state denominator');
+  const currentRow = pointer.history?.at(-1);
+  equal(currentRow?.checkpoint_id, pointer.current_checkpoint_id, 'pointer current checkpoint row');
+  equal(currentRow?.path, pointer.current_checkpoint_path, 'pointer current path');
+  equal(currentRow?.trigger_commit, pointer.current_canonical_main_commit, 'pointer current transition');
+  check(pointer.current_checkpoint_id !== checkpoint.checkpoint_id, 'SG-04 remains current after successor append');
+
+  const historyIndex = historyIds.indexOf(checkpoint.checkpoint_id);
+  check(historyIndex >= 0, 'historical pointer row missing for SG-04');
+  check(historyIndex < historyIds.length - 1, 'SG-04 has no append-only successor');
+  const historyRow = historyIndex >= 0 ? pointer.history[historyIndex] : null;
   check(Boolean(historyRow), 'historical pointer row missing for SG-04');
   equal(historyRow?.path, 'data/project/project-stable-ground-sg04.json', 'historical SG-04 pointer path');
   equal(historyRow?.status, 'superseded_preserved', 'historical SG-04 pointer status');
   equal(historyRow?.merge_commit, sg04MergeCommit, 'historical SG-04 merge receipt');
+
+  const sg05Row = pointer.history?.find((row) => row.checkpoint_id === 'SG-2026-07-30-05');
+  check(Boolean(sg05Row), 'SG-05 successor row missing after SG-04');
+  equal(sg05Row?.status, 'superseded_preserved', 'SG-05 successor status after later append');
+  equal(sg05Row?.merge_commit, 'cada5ce40087305196a53a9ecc32a707cff28e52', 'SG-05 merge receipt after SG-04');
 
   equal(manifest.schema_version, 'project-stable-ground-sg04-release-manifest@1', 'historical SG-04 manifest schema');
   equal(manifest.checkpoint_id, checkpoint.checkpoint_id, 'historical SG-04 manifest identity');
diff --git a/tools/validate-project-stable-ground-sg05.mjs b/tools/validate-project-stable-ground-sg05.mjs
index 95c7fff..a73bd37 100644
--- a/tools/validate-project-stable-ground-sg05.mjs
+++ b/tools/validate-project-stable-ground-sg05.mjs
@@ -15,6 +15,7 @@ const hex40 = /^[0-9a-f]{40}$/;
 const hex64 = /^[0-9a-f]{64}$/;
 const zero40 = '0'.repeat(40);
 const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
+const sg05MergeCommit = 'cada5ce40087305196a53a9ecc32a707cff28e52';
 
 function ensureCommit(sha, label) {
   if (!hex40.test(sha || '') || sha === zero40) return [`${label} is not a materialized full commit SHA`];
@@ -104,7 +105,11 @@ function defaultHistoricalVerifier(row) {
   return errors;
 }
 
-export function loadSg05Context({ transitionVerifier = defaultTransitionVerifier, historicalVerifier = defaultHistoricalVerifier } = {}) {
+export function loadSg05Context({
+  transitionVerifier = defaultTransitionVerifier,
+  historicalVerifier = defaultHistoricalVerifier,
+  manifestComputer = computeSg05Manifest
+} = {}) {
   return {
     checkpoint: read('data/project/project-stable-ground-sg05.json'),
     pointer: read('data/project/project-stable-ground-current.json'),
@@ -127,6 +132,7 @@ export function loadSg05Context({ transitionVerifier = defaultTransitionVerifier
     report: read('reports/core-thesis/stable-ground/sg05/checkpoint.json'),
     transitionVerifier,
     historicalVerifier
+    ,manifestComputer
   };
 }
 
@@ -138,7 +144,7 @@ export function validateSg05(context = loadSg05Context()) {
   const {
     checkpoint, pointer, governor, sg04, status, fanout, sources, statusRelease, core, k0,
     denominator, dca, stories, m05Fanout, organism, poofAperture, poofRelease, sprint09,
-    manifest, report, transitionVerifier, historicalVerifier
+    manifest, report, transitionVerifier, historicalVerifier, manifestComputer
   } = context;
   const snapshot = checkpoint.canonical_snapshot;
 
@@ -184,15 +190,25 @@ export function validateSg05(context = loadSg05Context()) {
   equal(governor.history_law.historical_release_manifests_recomputed, false, 'governor no-recompute law');
   check(governor.trigger_classes.some((row) => row.includes('status-for-sovereignty')), 'governor missing SSC trigger class');
 
-  const expectedHistory = ['SG-2026-07-29-01','SG-2026-07-29-02','SG-2026-07-29-03','SG-2026-07-29-04','SG-2026-07-30-05'];
+  const requiredPrefix = ['SG-2026-07-29-01','SG-2026-07-29-02','SG-2026-07-29-03','SG-2026-07-29-04','SG-2026-07-30-05'];
   equal(pointer.schema_version, 'project-stable-ground-current@1', 'pointer schema');
-  equal(JSON.stringify(pointer.history.map((row) => row.checkpoint_id)), JSON.stringify(expectedHistory), 'pointer history order');
+  const historyIds = pointer.history.map((row) => row.checkpoint_id);
+  check(historyIds.length >= requiredPrefix.length, 'pointer history is shorter than the preserved SG-01 through SG-05 prefix');
+  equal(JSON.stringify(historyIds.slice(0, requiredPrefix.length)), JSON.stringify(requiredPrefix), 'pointer history order');
   equal(new Set(pointer.history.map((row) => row.checkpoint_id)).size, pointer.history.length, 'pointer checkpoint uniqueness');
   equal(pointer.history.filter((row) => row.status === 'current').length, 1, 'pointer current-state denominator');
-  equal(pointer.current_checkpoint_path, 'data/project/project-stable-ground-sg05.json', 'pointer current path');
-  equal(pointer.current_canonical_main_commit, checkpoint.trigger.transition_commit, 'pointer current commit');
+  const currentRow = pointer.history.at(-1);
+  equal(currentRow?.checkpoint_id, pointer.current_checkpoint_id, 'pointer current checkpoint row');
+  equal(currentRow?.path, pointer.current_checkpoint_path, 'pointer current path');
+  equal(currentRow?.trigger_commit, pointer.current_canonical_main_commit, 'pointer current transition');
 
   equal(snapshot.status_sovereignty.hypothesis_id, 'SSC-H01', 'frozen SSC identity');
   equal(snapshot.status_sovereignty.authority_tier, 'AT-2', 'frozen SSC authority tier');
@@ -241,6 +257,8 @@ export function validateSg05(context = loadSg05Context()) {
 
   const isCurrent = pointer.current_checkpoint_id === checkpoint.checkpoint_id;
   if (isCurrent) {
+    equal(pointer.current_checkpoint_path, 'data/project/project-stable-ground-sg05.json', 'pointer current path');
+    equal(pointer.current_canonical_main_commit, checkpoint.trigger.transition_commit, 'pointer current commit');
     for (const error of transitionVerifier(checkpoint)) errors.push(error);
     equal(status.hypothesis_id, 'SSC-H01', 'live SSC identity');
     equal(status.status, snapshot.status_sovereignty.status, 'live SSC status');
@@ -274,7 +292,7 @@ export function validateSg05(context = loadSg05Context()) {
 
     equal(manifest.schema_version, 'project-stable-ground-sg05-release-manifest@1', 'SG-05 manifest schema');
     equal(manifest.checkpoint_id, checkpoint.checkpoint_id, 'SG-05 manifest identity');
-    equal(JSON.stringify(manifest), JSON.stringify(computeSg05Manifest()), 'current SG-05 exact-byte manifest');
+    equal(JSON.stringify(manifest), JSON.stringify(manifestComputer()), 'current SG-05 exact-byte manifest');
     equal(report.schema_version, 'project-stable-ground-sg05-report@1', 'SG-05 report schema');
     equal(report.checkpoint_id, checkpoint.checkpoint_id, 'SG-05 report identity');
     equal(report.canonical_main.commit, checkpoint.trigger.transition_commit, 'SG-05 report transition');
@@ -286,9 +304,12 @@ export function validateSg05(context = loadSg05Context()) {
     equal(report.release_manifest.combined_sha256, manifest.combined_sha256, 'SG-05 report release digest');
   } else {
     const row = pointer.history.find((item) => item.checkpoint_id === checkpoint.checkpoint_id);
+    check(pointer.current_checkpoint_id !== checkpoint.checkpoint_id, 'SG-05 remains current after successor append');
     check(Boolean(row), 'historical pointer row missing for SG-05');
     equal(row?.path, 'data/project/project-stable-ground-sg05.json', 'historical SG-05 pointer path');
     equal(row?.status, 'superseded_preserved', 'historical SG-05 pointer status');
+    equal(row?.merge_commit, sg05MergeCommit, 'historical SG-05 merge receipt');
+    check(historyIds.indexOf(checkpoint.checkpoint_id) < historyIds.length - 1, 'SG-05 has no append-only successor');
     if (row) for (const error of historicalVerifier(row)) errors.push(error);
   }
   return errors;
diff --git a/tools/validate-project-stable-ground-sg06.mjs b/tools/validate-project-stable-ground-sg06.mjs
index 5bf163d..6800bc9 100644
--- a/tools/validate-project-stable-ground-sg06.mjs
+++ b/tools/validate-project-stable-ground-sg06.mjs
@@ -173,7 +173,7 @@ export function validateSg06(context = loadSg06Context()) {
   equal(checkpoint.trigger.type, 'canonical_status_aware_publication_allowlist_and_poof_staging', 'trigger type');
   equal(checkpoint.trigger.issue, 463, 'trigger issue');
-  equal(checkpoint.trigger.pull_request, 478, 'publication PR');
+  equal(checkpoint.trigger.pull_request, 484, 'publication PR');
   check(hex40.test(checkpoint.trigger.transition_commit) && checkpoint.trigger.transition_commit !== zero40, 'transition receipt');
   equal(checkpoint.trigger.transition_base, '0d701692fa83a405bd0ba86e7b45c525022589f7', 'transition base');
   equal(checkpoint.trigger.transition_paths.length, 22, 'transition path denominator');
@@ -266,8 +266,16 @@ export function validateSg06(context = loadSg06Context()) {
   equal(checkpoint.fanout_state.owner_lanes.find((row) => row.lane_id === 'FAN-04')?.receipt, checkpoint.trigger.transition_commit, 'FAN-04 receipt');
   equal(checkpoint.fanout_state.owner_lanes.find((row) => row.lane_id === 'FAN-07')?.state, 'canonical_hypothesis_zero_execution', 'FAN-07 state');
 
-  equal(checkpoint.stable_ground_lifecycle.length, 6, 'stable-ground lifecycle count');
+  const lifecycle = checkpoint.stable_ground_lifecycle;
+  equal(lifecycle.length, 6, 'stable-ground lifecycle count');
   check(checkpoint.stable_ground_lifecycle.slice(0, 5).every((row) => row.rebuild_allowed === false), 'historical rebuild law');
   equal(checkpoint.stable_ground_lifecycle[5]?.rebuild_allowed, true, 'SG-06 rebuild authority');
+  equal(lifecycle.find((row) => row.checkpoint_id === 'SG-2026-07-29-04')?.state, 'successor_aware_immutable_history_validation_installed_by_SG06', 'SG-04 lifecycle state');
+  equal(lifecycle.find((row) => row.checkpoint_id === 'SG-2026-07-30-05')?.state, 'successor_aware_immutable_history_validation_installed_by_SG06', 'SG-05 lifecycle state');
+  for (const checkpointId of ['SG-2026-07-29-04','SG-2026-07-30-05','SG-2026-07-30-06']) {
+    equal(lifecycle.find((row) => row.checkpoint_id === checkpointId)?.receipt, checkpoint.trigger.transition_commit, `${checkpointId} lifecycle receipt`);
+  }
 
   for (const [key, value] of Object.entries(checkpoint.boundaries)) {
     if (key === 'graph_effect') equal(value, 'none', `boundary ${key}`);
LIFECYCLE_PATCH
printf '%s  %s\n' '984049791865610d81a75d629a6fdecd3009bba6a057c973ceb1ec3058da9b53' /tmp/sg06-lifecycle-repair.patch | sha256sum --check --strict

volatile=(
  build/axm-identity.json
  build/build-hop-report.json
  build/hop-graph.json
  build/migration-review.md
  build/migration-summary.json
  build/receipt-graph.json
  build/scores.json
  build/scout-report.json
  build/scout-report.md
  build/surface-graph.json
)
restore_verified_volatile() {
  local source_ref="$1"
  python3 - <<'PY'
import subprocess
volatile=['build/axm-identity.json','build/build-hop-report.json','build/hop-graph.json','build/migration-review.md','build/migration-summary.json','build/receipt-graph.json','build/scores.json','build/scout-report.json','build/scout-report.md','build/surface-graph.json']
for path in volatile:
    diff=subprocess.run(['git','diff','--unified=0','--',path],check=True,text=True,capture_output=True).stdout
    if not diff: continue
    lines=[line[1:].strip() for line in diff.splitlines() if line.startswith(('+','-')) and not line.startswith(('+++','---'))]
    if len(lines)!=2 or not all(line.startswith('"generated": "') or line.startswith('Generated: ') for line in lines):
        raise RuntimeError(f'unexpected volatile compiler mutation in {path}: {lines}')
PY
  git restore --source="$source_ref" --worktree -- "${volatile[@]}"
  git diff --quiet -- "${volatile[@]}"
}

publication_paths=/tmp/publication-paths
cat > "$publication_paths" <<'PATHS'
.github/workflows/publication-integrity.yml
app.js
data/project/poof-clifford-constitutional-change-log.json
data/project/poof-clifford-ecology-contract.json
data/project/poof-clifford-ecology-release-manifest.json
data/project/publication-plan.json
docs/methods/status-aware-publication-allowlist.md
index.html
package.json
reports/audits/adversarial-release-integrity-failed-custody.md
reports/core-thesis/poof-clifford-ecology/data.json
reports/core-thesis/poof-clifford-ecology/methods/index.html
reports/core-thesis/poof-clifford-ecology/release-manifest.json
test/publication-manifest.test.js
test/publication-pages-browser.test.js
test/status-sovereignty-compact.test.js
test/ui-contract.test.js
tools/build-pages.mjs
tools/build-standalone.mjs
tools/lib/publication-manifest.mjs
tools/validate-pages.mjs
tools/validate-publication-plan.mjs
PATHS
sort -o "$publication_paths" "$publication_paths"

sg06_paths=/tmp/sg06-paths
cat > "$sg06_paths" <<'PATHS'
.github/workflows/project-stable-ground-sg06.yml
data/project/project-stable-ground-current.json
data/project/project-stable-ground-governor.json
data/project/project-stable-ground-sg06-release-manifest.json
data/project/project-stable-ground-sg06.json
docs/milestones/project-stable-ground-sg06.md
reports/core-thesis/stable-ground/sg06/checkpoint.json
reports/core-thesis/stable-ground/sg06/index.html
test/project-stable-ground-sg05.test.js
test/project-stable-ground-sg06.test.js
tools/build-project-stable-ground-sg06.mjs
tools/validate-project-stable-ground-sg04.mjs
tools/validate-project-stable-ground-sg05.mjs
tools/validate-project-stable-ground-sg06.mjs
PATHS
sort -o "$sg06_paths" "$sg06_paths"

# Materialize the permanent publication transition.
git reset --hard "$base"
git clean -fdx
git apply --check /tmp/publication.patch
git apply /tmp/publication.patch
{ git diff --name-only "$base"; git ls-files --others --exclude-standard; } | sort -u > /tmp/observed
diff -u "$publication_paths" /tmp/observed
git diff --check

node test/publication-manifest.test.js
node test/ui-contract.test.js
node test/status-sovereignty-compact.test.js
node tools/build-poof-clifford-ecology.mjs
node tools/validate-poof-clifford-ecology.mjs
node test/poof-clifford-ecology.test.js
npm test
npm run build:pages
npm run build:standalone
npm run validate:publication
npm run validate:pages
restore_verified_volatile "$base"
{ git diff --name-only "$base"; git ls-files --others --exclude-standard; } | sort -u > /tmp/observed
diff -u "$publication_paths" /tmp/observed
git diff --check

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A
git commit -m 'Enforce status-aware publication allowlist and stage POOF'
transition="$(git rev-parse HEAD)"

# Bind SG-06 to the real publication receipt, not the local construction hash.
sed -i "s/$LOCAL_PUBLICATION_SHA/$transition/g" /tmp/sg06.patch
git apply --check /tmp/sg06.patch
git apply /tmp/sg06.patch
sed -i "s/$LIFECYCLE_LOCAL_PUBLICATION_SHA/$transition/g" /tmp/sg06-lifecycle-repair.patch
git apply --check /tmp/sg06-lifecycle-repair.patch
git apply /tmp/sg06-lifecycle-repair.patch
npm run build:pages
npm run build:standalone
node tools/build-project-stable-ground-sg06.mjs
node test/project-stable-ground-sg06.test.js
node tools/validate-project-stable-ground-sg06.mjs
npm run release:check

npm install --no-save --no-package-lock playwright@1.55.0
npx playwright install --with-deps chromium
node test/publication-pages-browser.test.js

# Release checks regenerate ten timestamp-only compiler products. Verify and restore them,
# then rebuild only the exact derivative custody that belongs to SG-06.
restore_verified_volatile "$transition"
node tools/build-poof-clifford-ecology.mjs
npm run build:pages
npm run build:standalone
node tools/build-project-stable-ground-sg06.mjs
node tools/validate-project-stable-ground-sg06.mjs
node test/project-stable-ground-sg06.test.js
npm run validate:publication
npm run validate:pages
node test/publication-pages-browser.test.js

{ git diff --name-only "$transition"; git ls-files --others --exclude-standard; } | sort -u > /tmp/observed
diff -u "$sg06_paths" /tmp/observed
git diff --check
git add -A
git commit -m 'Append stable-ground supersession SG-06'

# Prove the committed head reconstructs exactly without retaining transport.
npm run build:pages
npm run build:standalone
node tools/build-poof-clifford-ecology.mjs
node tools/build-project-stable-ground-sg06.mjs
node tools/validate-project-stable-ground-sg06.mjs
node test/project-stable-ground-sg06.test.js
npm run validate:publication
npm run validate:pages
node test/publication-pages-browser.test.js
git diff --check
git diff --exit-code
test -z "$(git status --porcelain)"

git push --force-with-lease=refs/heads/${BRANCH}:"$transport_head" origin HEAD:"$BRANCH"
