#!/usr/bin/env bash
set -euo pipefail

node --check tools/build-lake-allocator-war-targeted-closure-wave-26-source-plan.mjs
node tools/build-lake-allocator-war-targeted-closure-wave-26-source-plan.mjs
first_plan="$(sha256sum data/project/lake-allocator-war-targeted-closure-wave-26-source-plan.json | cut -d' ' -f1)"
node tools/build-lake-allocator-war-targeted-closure-wave-26-source-plan.mjs
test "$first_plan" = "$(sha256sum data/project/lake-allocator-war-targeted-closure-wave-26-source-plan.json | cut -d' ' -f1)"
rm -f tools/run-wave26-targeted-closure-materializer-v2.sh
exec bash tools/run-wave26-targeted-closure-materializer.sh
