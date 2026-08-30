#!/usr/bin/env bash
set -euo pipefail

ARCHIVE_BRANCH='archive/pr2231-current-authority-state-controller-v6'
BASE_CONTROLLER='f391d592486775aecdf4b99cc153b0ef8968c227'
BASE_WRAPPER_PATH='.github/tmp/pr2231-current-authority-state-qualification-v1.tar.gz.b64'
BASE_PAYLOAD_PATH='.github/tmp/pr2231-current-authority-state-qualification-v1.payload.gz'
EXPECTED_BASE_WRAPPER_BLOB='b01d1231e37b4d7a700c05adf7651b648b4f43d5'
EXPECTED_BASE_PAYLOAD_BLOB='7fe045e91efefbc3e5c4dc7041824aafd795d06a'
EXPECTED_V6_GIT_BLOB='111bb917b5701a9399f853a7e16dcacb4ae81555'
EXPECTED_V7_GIT_BLOB='3f971ecff462a1e710400a57dba9aadb945dd15f'
EXPECTED_V7_SHA256='922f191c91e54c4b89fa5f3088d59ae661ab0eb681da44e3c9734102ebc03453'
SOURCE_DIR='/tmp/pr2231-v7-source'
V6_SCRIPT='/tmp/pr2231-v6-effective.sh'
V7_SCRIPT='/tmp/pr2231-v7-effective.sh'

rm -rf "$SOURCE_DIR" "$V6_SCRIPT" "$V7_SCRIPT"
mkdir -p "$SOURCE_DIR/.github/tmp"
git fetch --no-tags origin "+refs/heads/${ARCHIVE_BRANCH}:refs/remotes/origin/${ARCHIVE_BRANCH}"
test "$(git rev-parse "refs/remotes/origin/${ARCHIVE_BRANCH}")" = "$BASE_CONTROLLER"
git show "${BASE_CONTROLLER}:${BASE_WRAPPER_PATH}" > "$SOURCE_DIR/$BASE_WRAPPER_PATH"
git show "${BASE_CONTROLLER}:${BASE_PAYLOAD_PATH}" > "$SOURCE_DIR/$BASE_PAYLOAD_PATH"
test "$(git hash-object "$SOURCE_DIR/$BASE_WRAPPER_PATH")" = "$EXPECTED_BASE_WRAPPER_BLOB"
test "$(git hash-object "$SOURCE_DIR/$BASE_PAYLOAD_PATH")" = "$EXPECTED_BASE_PAYLOAD_BLOB"
GITHUB_WORKSPACE="$SOURCE_DIR" WRAPPER_ONLY=1 bash "$SOURCE_DIR/$BASE_WRAPPER_PATH"
test "$(git hash-object "$V6_SCRIPT")" = "$EXPECTED_V6_GIT_BLOB"
cp "$V6_SCRIPT" "$V7_SCRIPT"
patch --silent "$V7_SCRIPT" <<'PATCH'
--- v6-effective.sh
+++ v7-effective.sh
@@ -12,16 +12,16 @@
 : "${RECEIPT_DIR:?missing RECEIPT_DIR}"
 
 REPO='BigBirdReturns/clifford-number'
-PAYLOAD_PATH='.github/tmp/pr2231-current-authority-state-qualification-v1.tar.gz.b64'
+PAYLOAD_PATH='.github/tmp/pr2231-current-authority-state-qualification-v7.sh'
 PRODUCT_DIR='/tmp/pr2231-current-authority-state-product'
 MAIN_DIR='/tmp/pr2231-current-authority-state-main'
 PATCHED_DIR='/tmp/pr2231-current-authority-state-patched'
 
 rm -rf "$RECEIPT_DIR" "$PRODUCT_DIR" "$MAIN_DIR" "$PATCHED_DIR"
 mkdir -p "$RECEIPT_DIR/logs" "$PATCHED_DIR/tools/lib" "$PATCHED_DIR/test"
-cp /tmp/pr2231-v6-effective.sh "$RECEIPT_DIR/controller-script.sh"
+cp /tmp/pr2231-v7-effective.sh "$RECEIPT_DIR/controller-script.sh"
 cp "$GITHUB_WORKSPACE/$PAYLOAD_PATH" "$RECEIPT_DIR/controller-wrapper.sh"
-cp "$GITHUB_WORKSPACE/.github/workflows/temporary-pr2231-current-authority-state-qualification-v1.yml" \
+cp "$GITHUB_WORKSPACE/.github/workflows/temporary-pr2231-current-authority-state-qualification-v7.yml" \
   "$RECEIPT_DIR/controller-workflow.yml"
 
 record_ref() {
@@ -177,6 +177,16 @@
   return day <= maximumDay ? match : null;
 }
 
+function completeDottedPhoneMatch(source) {
+  const normalized = source.normalize('NFKC').trimStart();
+  const match = /^\\d{1,4}\\.\\d{1,4}\\.\\d{1,4}(?=$|[^0-9.])/u.exec(normalized);
+  if (!match || completeCalendarDateMatch(match[0])) return null;
+
+  const groups = [...match[0].matchAll(DIGIT_RUN_PATTERN)];
+  if (groups.length !== 3 || groups[0].index !== 0) return null;
+  return completeIntrinsicPhoneContinuation(match[0], groups, 0) ? match : null;
+}
+
 const EVENT_RULES = ["""
 library = replace_once(
     library,
@@ -269,19 +279,7 @@
   }"""
 new_multidot = """  if (/^\\d{1,9}\\.\\d{1,6}\\./u.test(contextual)
       && !/^\\d{4}\\./u.test(contextual)) {
-    const dottedCandidate = /^\\d{1,4}\\.\\d{1,4}\\.\\d{1,4}(?=$|[^0-9.])/u.exec(
-      normalizedSource
-    );
-    if (dottedCandidate) {
-      const dottedGroups = [...dottedCandidate[0].matchAll(DIGIT_RUN_PATTERN)];
-      if (dottedGroups.length === 3
-          && dottedGroups[0].index === 0
-          && completeIntrinsicPhoneContinuation(
-            dottedCandidate[0],
-            dottedGroups,
-            0
-          )) return null;
-    }
+    if (completeDottedPhoneMatch(normalizedSource)) return null;
     return FORMATTED_NUMERIC_OBSERVATION_PATTERN.exec(contextual);
   }"""
 library = replace_once(
@@ -341,17 +339,21 @@
       if (!/\s/u.test(candidate.slice(previousEnd, groups[first].index))) continue;
     }
 
-    // Context-free validation may prove that one telephone beginning at this
-    // group ends before an independent telephone or strong observation. Once
-    // that exact interval exists, generic labelled optimization may not enlarge
-    // the same start across the proved boundary and consume the next source.
+    // Only the reviewed dotted-phone ambiguity needs an optimizer cap. A
+    // generic cap at every intrinsic boundary can expose a locally identifier-
+    // labelled phone when a distant phone label has exhausted its bounded scan.
     const intrinsicBoundary = validatedIntrinsicPhoneContinuation(
       candidate,
       groups,
       first
     );
+    const dottedPhoneAfterBoundary = intrinsicBoundary
+      ? completeDottedPhoneMatch(candidate.slice(intrinsicBoundary.end))
+      : null;
     let intrinsicBoundaryLast = groups.length - 1;
-    if (intrinsicBoundary && intrinsicBoundary.end < candidate.length) {
+    if (intrinsicBoundary
+        && intrinsicBoundary.end < candidate.length
+        && dottedPhoneAfterBoundary) {
       intrinsicBoundaryLast = first;
       while (intrinsicBoundaryLast + 1 < groups.length
           && groups[intrinsicBoundaryLast + 1].index
@@ -434,11 +436,13 @@
           if (priorDigits < 1) continue;
         } else if (priorDigits < minimumPriorDigits || !prefixScore) continue;
 
-        // A complete context-free telephone interval owns every digit group in
-        // its exact source span. Record that monotone frontier before probing
-        // numeric observations so an interior dotted group cannot restart as a
-        // decimal and cause the preceding telephone to absorb only its prefix.
-        const intrinsicTailInterval = !extensionContext
+        // The monotone frontier is local to a complete dotted phone. Applying it
+        // to every intrinsic telephone candidate can suppress genuine date,
+        // time, range, and unit observations in recursive long-chain parsing.
+        const dottedTailPhone = !extensionContext
+          ? completeDottedPhoneMatch(candidate.slice(start))
+          : null;
+        const intrinsicTailInterval = dottedTailPhone
           ? validatedIntrinsicPhoneContinuation(
               candidate,
               groups,
@@ -532,7 +536,15 @@
   );
 }}
 
-// exact intrinsic telephone interval frontier v6
+// exact intrinsic telephone interval frontier v7
+const v7OverflowIdentifierLabelChain = 'GUID '.repeat(4000);
+const v7OverflowObservationInput = `Phone ${{v7OverflowIdentifierLabelChain}}record id: 09012345678 2026-08-17 03-6216-8041`;
+assert.equal(
+  redactContactData(v7OverflowObservationInput),
+  `Phone ${{v7OverflowIdentifierLabelChain}}record id: [contact omitted] 2026-08-17 [contact omitted]`,
+  'a dotted-phone optimizer frontier may not expose the first phone across a proved observation boundary'
+);
+
 for (const [input, expected, message] of [
   [
     'Archive 09012345678 03.6216.8041',
@@ -603,9 +615,31 @@
   console.log(JSON.stringify({ name, input, actual, expected }));
   assert.equal(actual, expected, name);
 }
-console.log('REPAIR_WITNESS_SUCCESS_V6');
+const overflowIdentifierLabelChain = 'GUID '.repeat(4000);
+const overflowInput = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17 03-6216-8041`;
+const overflowExpected = `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17 [contact omitted]`;
+const overflowActual = redactContactData(overflowInput);
+assert.equal(
+  overflowActual,
+  overflowExpected,
+  'overflow-observation-phone-recursion'
+);
+console.log(JSON.stringify({
+  name: 'overflow-observation-phone-recursion',
+  length: overflowActual.length,
+  omissions: (overflowActual.match(/\[contact omitted\]/gu) ?? []).length,
+  first_phone_exposed: overflowActual.includes('09012345678'),
+  later_phone_exposed: overflowActual.includes('03-6216-8041')
+}));
+console.log('REPAIR_WITNESS_SUCCESS_V7');
 NODE
 
+cp tools/lib/industrial-exhaust.mjs "$RECEIPT_DIR/candidate-library.mjs"
+cp test/industrial-exhaust.test.js "$RECEIPT_DIR/candidate-test.js"
+git diff --binary "$EXPECTED_PRODUCT" > "$RECEIPT_DIR/candidate-on-product.patch"
+git diff --stat "$EXPECTED_PRODUCT" > "$RECEIPT_DIR/candidate-on-product.diffstat"
+sha256sum "$RECEIPT_DIR/candidate-on-product.patch" > "$RECEIPT_DIR/candidate-on-product.patch.sha256"
+
 for test_file in test/industrial-exhaust*.test.js; do
   test_name="$(basename "$test_file")"
   run_logged "product-${test_name}" node "$test_file"
@@ -713,7 +747,7 @@
 test "$pr_head" = "$EXPECTED_PRODUCT"
 
 cat > "$RECEIPT_DIR/result.txt" <<EOF
-QUALIFICATION_SUCCESS_V6
+QUALIFICATION_SUCCESS_V7
 product_moved=false
 draft_changed=false
 review_threads_changed=false
@@ -723,4 +757,4 @@
 candidate_test_blob=${candidate_test_blob}
 EOF
 
-printf '%s\n' 'QUALIFICATION_SUCCESS_V6'
+printf '%s\n' 'QUALIFICATION_SUCCESS_V7'
PATCH

test "$(git hash-object "$V7_SCRIPT")" = "$EXPECTED_V7_GIT_BLOB"
printf '%s  %s\n' "$EXPECTED_V7_SHA256" "$V7_SCRIPT" | sha256sum -c -
bash -n "$V7_SCRIPT"
if [[ "${WRAPPER_ONLY:-0}" = '1' ]]; then
  printf '%s\n' 'WRAPPER_RECONSTRUCTION_SUCCESS_V7'
  exit 0
fi
exec bash "$V7_SCRIPT"
