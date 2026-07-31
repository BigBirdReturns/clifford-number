schema={'$schema':'https://json-schema.org/draft/2020-12/schema','title':'Counter-Selector Wave 07 acquisition record','type':'object','required':['schema_version','candidate_id','qualification','source_ids','field_test_eligible','operator_finding','graph_effect'],'properties':{'schema_version':{'const':'counter-selector-artifact-acquisition-b02@1'},'candidate_id':{'pattern':'^CS-C[0-9]{4}$'},'qualification':{'enum':['partial_not_blind_ready','qualifying_for_blind_packet']},'source_ids':{'type':'array','minItems':1,'uniqueItems':True},'field_test_eligible':{'const':False},'operator_finding':{'const':False},'graph_effect':{'const':'none'}},'additionalProperties':True}
J('schemas/counter-selector-wave-07-acquisition.schema.json',schema)
W('docs/methods/counter-selector-wave-07-acquisition.md','''# Counter-Selector Wave 07 Batch 02 acquisition\n\nWave 07 applies one qualifying-artifact contract across the second class-balanced batch. Official narratives route acquisition but are not original work merely because they are authoritative. A packet needs a bounded task, requirements, chronology, transition, counterevidence, and falsifier. System mechanisms remain mechanisms; catastrophe remains consequence evidence rather than proof of person-level capacity.\n\nPartial objects remain in the denominator. Identity minimization removes class, status, institution, jurisdiction, and source cues. No acquisition result authorizes contact, field testing, promotion, identity release, ranking, or graph construction.\n''')
W('docs/milestones/counter-selector-wave-07.md','''# Milestone — Counter-Selector Wave 07 Batch 02\n\nThe second balanced six-object batch contains thirteen official source packets. Four objects satisfy the bounded packet contract; two remain explicit partials because original claim or work bytes are absent. Two admitted packets preserve person-attributable collective or checking-function work. Two preserve system mechanisms only: external research-record correction and a distributed warning-to-failure route.\n\nNo blind review, field test, operator finding, promotion, ranking, identity release, or graph effect is generated.\n''')
workflow="""name: Counter-Selector Wave 07 Batch 02 acquisition

on:
  pull_request:
    branches: [main]
    paths:
      - '.github/workflows/counter-selector-wave-07.yml'
      - 'data/project/counter-selector-wave-07-*.json'
      - 'data/project/counter-selector-artifact-acquisition-b02-registry.json'
      - 'data/project/counter-selector-blind-packet-b02-registry.json'
      - 'schemas/counter-selector-wave-07-acquisition.schema.json'
      - 'docs/methods/counter-selector-wave-07-acquisition.md'
      - 'docs/milestones/counter-selector-wave-07.md'
      - 'tools/build-counter-selector-wave-07.mjs'
      - 'tools/validate-counter-selector-wave-07.mjs'
      - 'test/counter-selector-wave-07.test.js'
      - 'reports/core-thesis/counter-selector-wave-07/**'
  push:
    branches: [main]
    paths:
      - '.github/workflows/counter-selector-wave-07.yml'
      - 'data/project/counter-selector-wave-07-*.json'
      - 'data/project/counter-selector-artifact-acquisition-b02-registry.json'
      - 'data/project/counter-selector-blind-packet-b02-registry.json'
      - 'schemas/counter-selector-wave-07-acquisition.schema.json'
      - 'docs/methods/counter-selector-wave-07-acquisition.md'
      - 'docs/milestones/counter-selector-wave-07.md'
      - 'tools/build-counter-selector-wave-07.mjs'
      - 'tools/validate-counter-selector-wave-07.mjs'
      - 'test/counter-selector-wave-07.test.js'
      - 'reports/core-thesis/counter-selector-wave-07/**'
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
      - run: node tools/build-counter-selector-wave-07.mjs
      - run: node tools/validate-counter-selector-wave-07.mjs
      - run: node test/counter-selector-wave-07.test.js
      - name: Require exact products
        run: |
          git diff --exit-code -- data/project/counter-selector-artifact-acquisition-b02-registry.json data/project/counter-selector-blind-packet-b02-registry.json data/project/counter-selector-wave-07-release-manifest.json reports/core-thesis/counter-selector-wave-07/data.json reports/core-thesis/counter-selector-wave-07/index.html
      - run: npm run release:check
      - name: Deterministic reconstruction
        run: |
          git restore --staged --worktree .
          node tools/build-counter-selector-wave-07.mjs
          node tools/validate-counter-selector-wave-07.mjs
          node test/counter-selector-wave-07.test.js
          git diff --exit-code
          test -z "$(git status --porcelain)"
"""
W('.github/workflows/counter-selector-wave-07.yml',workflow)
