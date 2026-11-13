# Handoff, 23 October 2026: the de-caging branch, the digs, and everything left

Written for the next worker, human or model, who opens this repository cold. It says what exists, where it is, how the loop runs, what is still missing, and what the owner has decided so nobody re-asks. Read `BUILD-INSTRUCTIONS.md` Section 1 first; it never changes. Then this file. Then the lane reports named below.

## 1. Where things are

| Thing | Location |
|---|---|
| Branch | `owner/decage-20261023`, tip `11691457`, on the W03 bare origin `/srv/git/clifford-number.git`. Not on GitHub. The owner pushes to GitHub; nobody else does. |
| Working copy used today | `S:\Scratch\Worktrees\clifford-decage-20261023` on W01 (fresh GitHub clone, `core.autocrlf=false` since mid-afternoon; before that the checkout was CRLF and hash validators failed on Windows). |
| Canonical checkout | W03: `/mnt/w03data/Incoming/DataArray/Projects/Products/Clifford-Number/repo`, still on the September `main`; bring it to this branch when the owner merges. |
| Reference gate | W03, `/srv/w03/clifford-gate/w03-gate.sh <branch>`: clones from the bare origin, `npm ci`, `npm run compile`, commits regenerated artifacts, `npm run release:check`, pushes back on green. Logs in `/srv/w03/clifford-gate/<branch-slug>/gate.log`, exit in `exit.txt`. `TMPDIR` must sit on `/srv/w03`; `/tmp` returns `EDQUOT` for test temp files. |
| Lane reports | `S:\Scratch\Worktrees\decage-*.md`: A disclaimers, B heat, C record pages, D refused surfaces, E/G defense corridor and receipt archiving, F/H LinkedIn, I/J/L/M gate repairs, K-capital-factory, K-conventions, K-uk-public-money, K-fund-portfolios, K-synthetic-constituency. Each lists sources attempted, archived and failed with URLs. |
| Prototypes | Clifford Route Cards `https://claude.ai/artifact/B6MaNXefEM89pQLE4J4gUA`; Clifford Field `https://claude.ai/artifact/UW4xfNMFqNKHpt6Wtbjs1W`; Design provenance `https://claude.ai/artifact/XzfuWZ2ngvrJiJQ57qGQHh`. Private to the owner. |
| Owner's private layer | W03: `/mnt/w03data/Incoming/DataArray/Projects/Products/Clifford-Number/recovery/2026-07-17-pre-sync-clean/private/linkedin-data-local/` (484 capture PDFs, captures manifest, 4,122 role claims, 2,257 crossing candidates, the attention log and heatmap). 572 human-named PDFs at `.../Projects/Personal/Documents/Sorted/LinkedIn Profiles`. The attention log is the only private material in the project and stays out of the repository. |
| Built explorer from the green tip | `S:\Scratch\Worktrees\clifford-decage-dist\Clifford-Number-explorer-standalone.html` (15.5 MB, self-contained). |

## 2. What exists at tip 11691457

**Ledger.** 1,155 surfaces, 4,411 participation rows, 501 receipts (484 in-repo copies with checked SHA-256, 15 Wayback snapshots), 404 people, 1,720 organizations, 280 hop edges. Money carried: about $2.55 billion in US awards, rounds and fund raises, £38.4 million in UK contract values and £2.7 million in DSIT payments, kept apart.

**Commits on the branch, in order.** `ad7f772c` one method statement per page, 34 profiles rewritten as what the record shows, heat restored as a printed formula, rule 6 amended in the owner's words. `7552ef26`, `ffa89673` recompile and fingerprint refresh. `df596145` record pages open with the trajectory. `3d45450b` intake promotion: NatSec100, the defense routers and the Austin–Israel corridor with archived receipts, 469 LinkedIn profile PDFs as receipts, 1,002 role crossings for 99 people. `90646bd3`, `fd571dc2` gate repairs, timeline lanes ranked hop-first, allowlist, budgets, Baer person/org fix, intake hold. `11691457` five digs: Capital Factory, conventions, UK public money, fund portfolios, synthetic constituencies.

**Tools added.** `tools/promote-intake-{defense-corridor,linkedin-crossings,capital-factory,conventions,uk-public-money,fund-portfolios,synthetic-constituency}.mjs`, `tools/archive-intake-receipts.mjs`, `tools/merge-staging.mjs` (idempotent; `npm run promote:intake --lane <lane>`). Each lane writes `data/ledger/staging/<lane>/{surfaces,participation,receipts}.jsonl`, `actors.json`, `organizations.json`, `gaps.jsonl`, `summary.json`, and stores copies under `receipts/<lane>/`.

**Docs changed.** `docs/explorer.md` rule 6 and the Network section, `docs/plain-language.md`, `docs/atlas-renderer-boundary.md`, `docs/release-architecture.md` and `docs/releases/2.1.0.md` (budgets), `docs/linkedin-profile-receipts.md`, `docs/synthetic-constituency-leg.md`, `data/project/publication-allowlist.json` (`policy_changes` list).

**Product.** Explorer opens on the network; heat = Σ touches × weight(class) × 0.8^years, weights policy 1, appointment 1, procurement 2, capital 2, printed in the legend, breakdown in the inspector. Record pages open with a Trajectory strip. Default timeline lanes: the 18 people ranked by hop bases, then hop-eligible surfaces, then dated rows. Disclaimers: one method statement per page.

## 3. The loop, exactly

1. **Dig.** Official and first-party sources first, press as `reported`. Every source fetched, stored under `receipts/<lane>/`, SHA-256 and `retrieved_at` recorded, a `limits` sentence of 20+ characters, Wayback snapshot recorded where one exists. A row is admitted only if the archived copy shows the name or title it claims (the "text check" in the corridor and convention tools).
2. **Stage.** Mirror an existing lane tool. Reuse canonical ids by label before minting (grep `data/canonical/*.json`); a listing that names a person must not mint an organization with the person's id. One row per person per surface; join roles with `; `. Surfaces with 20+ distinct actors: `hop_eligible false`, `hop_refusal_reason dense_roster_density_policy`. Year-only dates: `YYYY-01-01` to `YYYY-12-31`, `hop_eligible false`, reason `year_precision_only`. Never put anything under `data/intake/` that must publish; `validate-pages` refuses it.
3. **Merge.** `node tools/merge-staging.mjs --lane <lane>`; never hand-edit the ledger except through a recorded reconciliation.
4. **Reconcile.** Collapse case-insensitive label collisions in actors, organizations and surface labels (the compile's AXM identity layer throws on the first collision); remap references; dedupe rows by (surface, participant, role, start). Today's script lives in the session scratchpad; rewrite it as `tools/reconcile-ledger.mjs` next time.
5. **Compile.** `npm run compile`. Collisions surface here.
6. **Re-pin.** Run every `test/*.test.js` individually (the npm chain stops at the first failure), then `npm run check`. Update pinned counts with a dated comment. Never weaken a rule; narrow only to its original scope and record old and new. Known environment-only failures on W01: symlink permission (5), no Python (3), TEMP on C: (7), Playwright (1), shallow clone (5).
7. **Clean.** Delete `build/m04g-source-ecology-v2*/` and `reports/core-thesis/answerable-power/sprint-03-leg-07.*`; revert `docs/update-sweep.md`.
8. **Commit** under the owner's identity with the owner's words as the reason, `Co-Authored-By` the model.
9. **Push** to the W03 bare origin over the pinned config: `git -c core.sshCommand="ssh -F S:/Scratch/Runs/Estate-Peer/ssh_config" push ssh://OCTO-W03/srv/git/clifford-number.git <branch>`.
10. **Gate** on W03 (detached: write the script to a file, start it with `setsid nohup … & disown`; the peer exec channel dies at about 38 seconds). Poll `exit.txt`.

## 4. Gaps, by lane, with what resolves each

**Clifford and Faculty.** DSIT's 2023 payment spreadsheets (the Taskforce period) are unread; Find a Tender keyword search ignores the keyword when called directly, so awards published only there are missing; Cabinet Office, NHS England, DHSC, Home Office, MoD and DfE spend-over-£25k files not attempted; the NHS COVID data store value never surfaced on Contracts Finder; two FCDO Services notices may be one contract plus a modification; what became of Clifford's Faculty shares after Accenture's control on 12 March 2026 is not in the register; the Centre for Human Progress not searched; Electric Twin has no public awards found.

**Capital Factory and Baer.** No lease or payment record for the Army's space (the Army's own narrative is the evidence); no 2009 Texas formation record (paid system); no rosters under "Defense Innovation Summit" or "Texas Defense Tech"; no link found between the Austin–Israel cohort or Stratos and Capital Factory; no board or public-body roles beyond two filings; the death is press only; two sources failed to archive (AETC release, army.mil 268663, retry with `--fetch --only <id>`); 45 Capital Factory-named vehicles are administered by Belltower and six by Alpha Partners, unexamined; `SEC_UA` carries a placeholder contact, set a real one.

**Conventions.** Not reached: Munich Security Conference side events, the NatSec100 reception, the Founders Fund summit, UK DASA events, the Action Plan launch, AUSA, NDIA, SCSP, SXSW 2025 organiser rosters, DSEI (JavaScript), Hill & Valley (404/403). Not found at any roster: Dan Driscoll, Norquist with a second ledger person, the Warners, the Detachment 201 officers together, Trae Stephens, Jackson Moses. Chris Brose 2022 and Brandon Tseng 2022 are name matches only.

**Defense corridor and routers.** 1,069 rows still in `data/ledger/staging/defense-corridor/gaps.jsonl`: 24 receipts with no URL, 5 that stand in for locally derived files (search log, portfolio census, roster ledger, LinkedIn projection), In-Q-Tel's team page (404, no snapshot). Portfolio rows refused where the page shows logos only (Pallas). Award figures moved since July (Hadrian $39.2M to $79.4M); the ledger carries the archived figures.

**Fund portfolios.** Thrive Capital, Altimeter, Pallas, Texas Venture Partners unlisted; General Catalyst partial (pagination returns page one); Shield Capital partial (10 featured of 50+); Valor's only snapshot is 2015; short generic names that matched may be different companies (Loop, Cape, Odyssey, Swan, Coder, Apex, Armada, Cloud 9); a16z American Dynamism rows use the `andreessen-horowitz` id.

**LinkedIn.** 1,255 candidates refused: 556 classification (365 public-to-public, 152 neither side on the allowlist, 34 public bodies outside it such as OPFOR and the MIT Naval Construction program), 477 bad extraction, 220 surname-initial identities. The allowlist is US and UK only; foreign militaries refused rather than classified. 385 of the 469 PDFs produced no crossing and sit as preserved captures; each still holds dated roles that could become single-person trajectory rows. No profile captured for Shyam Sankar, Matt Clifford, Mike Gallagher, Mac Thornberry; Ellen Lord all refused; 15 profiles including Lonsdale, Schmidt and Luckey yielded no crossing, a detector result. A few surfaces carry duplicate participant rows (Quay Barnett). Rows are self-reported, evidence `reported`; nothing checked against official records.

**Synthetic constituency.** The licensed Gartner roster, tiers and method (403, no snapshot); Lakmoos and Semilattice LinkedIn-only; New Statesman and Axios Wayback-only and rate-limited (rerun `--archive`); no named government or party client of Electric Twin; no UK or US official document proposing synthetic populations as a consultation substitute; the Electric Twin register-of-members request prepared, not sent; no published decision gives model, question, output and rejected alternatives together. That absence is a finding and should be stated on the page.

**Dialog.** 112 listed names remain one block; 110 of them have no other row. Each is a person whose public roles could be documented from official sources, which is the single largest multiplier of hop bases available.

**Structural.** The default People view's phone stage exceeded its old budget; budgets were raised, not redesigned. The CSS stage is 650px against a 596px desktop layout. Journalists minted as panel participants are kept by the owner's proximity rule; flag them with a role class. "As represented, <retrieval date>" rows date a page, not an event; the inspector should say so. Form D amendments fold into originals in the ledger but not in the promoter.

## 5. What should happen next, in order

1. Push the branch to GitHub and release 2.2.0 with a note written from this file. Bring the W03 canonical checkout to it.
2. Promote the 110 Dialog-only names: official roles, dated, from government, company and filing sources. Biggest hop multiplier.
3. Finish the money legs: DSIT 2023 spreadsheets, the other departments' spend files, Find a Tender via its API, Faculty's share outcome after Accenture.
4. Conventions at scale: a catalog crawler for exhibitor lists and agendas (AUSA, SOF Week, DSEI, RNDF, Munich, SCSP, London Tech Week, Bletchley, Cannes, MAD//Fest), text-checked, dense rosters as blocks, sessions as hop bases.
5. Re-run the LinkedIn promoter with a wider public-employer allowlist (foreign governments and militaries classified, not refused), surname-initial identities resolved against the capture PDF's own header, and single-person trajectory rows for the 385 unused captures.
6. Archive the 104 stand-in and dead receipts by other routes (Wayback saves, the companies' own filings) so the remaining 1,069 corridor rows enter.
7. Port the two prototypes into the explorer: the route cards as the close-up, the field's organism ring (crawl sources, terms, candidates in orbit, dead and landed pulses from the real logs) as the frontier view, and the owner's attention log as an owner-only layer read from `data/local/`.
8. Reconcile script into `tools/reconcile-ledger.mjs`; a test that fails on any person/organization id clash and any duplicate (surface, person) row.
9. Independent review: a cold reader with the published site and this file, asked to break any row.

## 6. What this can become

The compiler already treats a dated roster as the unit of evidence, so the horizon is a map where every public convention, filing, award, board, cohort and cap table is a surface, every person's rows are a trajectory through the four incentive classes, heat is the visible accumulation of documented touches, and the field plays over time so convergence is seen rather than asserted: independent funds, founders and officials arriving at the same agencies, programs and validation lists. The inverse map sits beside it: the vendors who sell a simulated public, who bought it, and which decisions were taken on it, with every missing field named. The research organism is drawn from its own logs, so the reader sees what was searched, what died, what landed and what the owner was chasing, and the gaps files are the frontier the next shovel goes into. The archive rule turns the site into a dated record that survives the pages it cites.

## 7. Rules that hold, and decisions already made

Hold: a hop is a shared bounded surface, never a line between two people; broad institutions are context; receipts must resolve to a stored copy or snapshot with a limits sentence; no hidden composite drives a visual channel, and the one accumulation, heat, prints its formula; dense rosters are one block; every count names its denominator.

Decided by the owner on 23 October 2026, do not re-ask: captured LinkedIn profiles are public record and live in the repository; leaked material is record; the only private material is the owner's own attention log; take the blinders off, show capital, conviction and attention flow with real names and receipts; proximity counts, including moderators and journalists on a panel; one method statement per page, no repeated disclaimers; heat returns with its formula printed; budgets guard accidental growth, not the size of the record; company registered offices on award notices are public, the privacy guard hides contact data on people's rows.

Open for the owner: whether to push to GitHub now or after the Dialog names; whether a seniority or recency cut applies to LinkedIn crossings (none applied); the default-lane ranking key if the people with the most hop bases are not the people the arrival view should lead with.
