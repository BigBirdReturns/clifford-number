workflow="""name: Counter-Selector Wave 08 Batch 02 blind review

on:
  pull_request:
    branches: [main]
    paths:
      - '.github/workflows/counter-selector-wave-08.yml'
      - 'data/project/counter-selector-wave-08-blind-review.json'
      - 'data/project/counter-selector-blind-review-b02-registry.json'
      - 'data/project/counter-selector-review-disagreement-b02-ledger.json'
      - 'data/project/counter-selector-wave-08-release-manifest.json'
      - 'schemas/counter-selector-wave-08-blind-review.schema.json'
      - 'docs/methods/counter-selector-wave-08-blind-review.md'
      - 'docs/milestones/counter-selector-wave-08.md'
      - 'tools/build-counter-selector-wave-08.mjs'
      - 'tools/validate-counter-selector-wave-08.mjs'
      - 'test/counter-selector-wave-08.test.js'
      - 'reports/core-thesis/counter-selector-wave-08/**'
  push:
    branches: [main]
    paths:
      - '.github/workflows/counter-selector-wave-08.yml'
      - 'data/project/counter-selector-wave-08-blind-review.json'
      - 'data/project/counter-selector-blind-review-b02-registry.json'
      - 'data/project/counter-selector-review-disagreement-b02-ledger.json'
      - 'data/project/counter-selector-wave-08-release-manifest.json'
      - 'schemas/counter-selector-wave-08-blind-review.schema.json'
      - 'docs/methods/counter-selector-wave-08-blind-review.md'
      - 'docs/milestones/counter-selector-wave-08.md'
      - 'tools/build-counter-selector-wave-08.mjs'
      - 'tools/validate-counter-selector-wave-08.mjs'
      - 'test/counter-selector-wave-08.test.js'
      - 'reports/core-thesis/counter-selector-wave-08/**'
  workflow_dispatch:
permissions:
  contents: read
jobs:
  validate:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: {node-version: '24'}
      - run: node tools/build-counter-selector-wave-08.mjs
      - run: node tools/validate-counter-selector-wave-08.mjs
      - run: node test/counter-selector-wave-08.test.js
      - name: Require exact products
        run: |
          git diff --exit-code -- data/project/counter-selector-blind-review-b02-registry.json data/project/counter-selector-review-disagreement-b02-ledger.json data/project/counter-selector-wave-08-release-manifest.json reports/core-thesis/counter-selector-wave-08/data.json reports/core-thesis/counter-selector-wave-08/index.html
      - run: npm run release:check
      - name: Deterministic reconstruction
        run: |
          git restore --staged --worktree .
          node tools/build-counter-selector-wave-08.mjs
          node tools/validate-counter-selector-wave-08.mjs
          node test/counter-selector-wave-08.test.js
          git diff --exit-code
          test -z "$(git status --porcelain)"
"""
W('.github/workflows/counter-selector-wave-08.yml',workflow)
