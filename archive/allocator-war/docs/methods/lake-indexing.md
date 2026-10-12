# Lake indexing

The repository contains several different things that are easy to collapse into one word: “the lake.” They are not the same.

## Six waterlines

1. **Physical presence** — a path is tracked in the current Git tree.
2. **Parsed presence** — the path can be read and its machine-addressable objects can be extracted.
3. **Indexed presence** — an index, manifest, catalog, registry, map, coverage file, or trail points to the path or one of its object identifiers.
4. **Authoritative reachability** — the path is reachable from a declared governing root rather than only from an incidental generated product.
5. **Public discoverability** — a user can reach the object from a current public entry surface.
6. **Semantic ownership** — the object has a declared program, case, report, or adjudication owner with a current status and boundary.

A file may clear one waterline and fail all the others. A file can be public but unowned; owned but undiscoverable; indexed only by a generated artifact; or physically present with no inbound reference at all.

## Census objects

`tools/build-lake-index.mjs` catalogs every tracked path except the census’s own generated products. It records exact bytes and SHA-256, path role, parse state, schema versions, program/case/report identifiers, status fields, receipt definitions and references, repository path references, inbound references, index reachability, authoritative reachability, public reachability, orphan state, and detected ownership state.

`tools/build-lake-open-pr-shadow.mjs` separately records open pull-request paths. Branch-only paths are a shadow inventory, not merged corpus.

The generated products are:

```text
build/lake-index.json
build/lake-object-index.json
build/lake-index-gaps.json
reports/lake-index-census.md
data/project/lake-open-pr-shadow.json
```

## What the census does not establish

```text
tracked path       ≠ semantically understood object
index membership   ≠ evidence truth
public visibility  ≠ publication clearance
repeated ID        ≠ resolved identity
unreferenced path  ≠ irrelevance
open PR path       ≠ merged corpus
current tree       ≠ complete Git history
```

The first release is therefore allowed to say that the **current tracked path census is complete** while requiring `current_tree_semantic_index_complete: false` and `historical_git_object_index_complete: false`.

## Closure rule

The lake is not “fully indexed and known” merely because every current path appears in `build/lake-index.json`. Closure requires, at minimum:

- zero unexplained exact-orphan evidence paths;
- an explicit disposition for every machine-addressable identifier absent from an index;
- a program owner or bounded archival status for every evidence-bearing file;
- receipt-definition and receipt-reference reconciliation;
- source/projection reconciliation for cases, reports, programs, and other typed objects;
- an indexed open-branch shadow with merged, superseded, abandoned, or active dispositions;
- a separate historical Git-object census;
- human semantic review of the mechanically generated gap classes.

No generated census can satisfy those human and historical gates by itself.
