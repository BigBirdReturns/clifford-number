#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PATHS = {
  "capture": "data/intake/status-sovereignty-rd-wave03-rd01-methodology-correction/capture-execution-receipt.json",
  "matrix": "data/research/status-sovereignty-rd-wave03-rd01-methodology-correction/terminal-field-matrix.json",
  "summary": "data/research/status-sovereignty-rd-wave03-rd01-methodology-correction/summary.json",
  "classReceipt": "data/research/status-sovereignty-rd-wave03-rd01-methodology-correction/class-receipt.json",
  "manifest": "data/research/status-sovereignty-rd-wave03-rd01-methodology-correction/manifest.json",
  "closure": "data/project/ssc-residual-wave03/closures/RD-01-C06.json",
  "schema": "schemas/status-sovereignty-rd-wave03-rd01-methodology-correction.schema.json"
};
const EXPECTED = {
  "capture": {
    "schema_version": "ssc-rd01-wave03-methodology-correction-capture-receipt@1",
    "wave_id": "SSC-RD-W03",
    "lane_id": "RD-01",
    "class_id": "RD-01-C06",
    "issue": 1014,
    "as_of": "2026-08-04",
    "target_branch": "agent/ssc-rd-wave03-rd01-methodology-correction",
    "target_head": "c491c99b2deb79b069a6dd7bc92f68e764228151",
    "fixed_protocol": {
      "path": "data/intake/status-sovereignty-rd-wave03-rd01-methodology-correction/fixed-protocol-package.json",
      "git_blob_sha": "4a8711a4a56122280df90801a924585be639cf8a",
      "sha256": "d9ffe5a8021fb16964a7c00e00237a4eed0eecd17d9c3c0b59a0c592cd714af1",
      "fixed_routes": 30,
      "exact_first_party_get_routes": 3,
      "candidate_census_routes": 27,
      "maximum_attempts_per_route": 1,
      "result_spawned_requests": 0
    },
    "fixed_route_capture": {
      "workflow_run": 30914248336,
      "artifact_id": 8894359001,
      "artifact_zip_sha256": "c247a5f9a3d8cd2bc6feb5c30dd643af0bbd3878a8712f7e4fadfdf24ad91291",
      "manifest_combined_sha256": "a3c00b6bb04367646153b693ff229adc046f174c043e88b7dd3a949e670ac12c",
      "route_attempts": 30,
      "http_success_routes": 30,
      "candidate_rows": 269,
      "natsec100_candidate_rows": 0,
      "admitted_candidate_sources": 0,
      "automatic_followup_requests": 0
    },
    "report_pdf_capture": {
      "workflow_run": 30916279943,
      "artifact_id": 8895179282,
      "artifact_zip_sha256": "26c67041bbe69e2983c8733c58c062f808de8d803c8146238f63351db8e9de01",
      "manifest_combined_sha256": "609a9e8e80fe257e2a253aa61dbcd6501e18f63b74d6a42d7d25ff61b1f1ceb9",
      "manifest_entries": 23,
      "routes_attempted": 3,
      "pdfs_observed": 3,
      "adversarial_mutations_refused": 30,
      "result_spawned_requests": 0
    },
    "edition_sources": [
      {
        "edition": 2024,
        "direct_html": {
          "route_id": "RD01-W03-E2024-DIRECT",
          "url": "https://www.natsec100.org/natsec100-2024",
          "bytes": 1479630,
          "sha256": "51fb5fd358b41d1cfbab7ba4f371ecf35e6b6b9bc1d73dd1a8f1174af30002db",
          "headers_sha256": "ab3d6fee5d61c93141d73db867e7943e29305a1428256da84ca90ca10de4e0e3"
        },
        "report_pdf": {
          "route_id": "RD01-W03-E2024-REPORT-PDF",
          "url": "https://www.natsec100.org/s/2024-NatSec100-Report.pdf",
          "final_url": "https://static1.squarespace.com/static/6824e488de9281397c0dfb01/t/686e84de3f77e41bbf4b9777/1752073445300/2024+NatSec100+Report.pdf",
          "bytes": 7216664,
          "sha256": "f66c2fbadf8b409896a77f3c237b3aee993064664258f264fd5c24eb06750f20",
          "headers_sha256": "93bce8ccfd9ae54820a57959947a83b14790442fa513dad7c5727f3a638400eb",
          "pages": 26
        },
        "fixed_candidate_query_route_ids": [
          "RD01-W03-E2024-Q01",
          "RD01-W03-E2024-Q02",
          "RD01-W03-E2024-Q03",
          "RD01-W03-E2024-Q04",
          "RD01-W03-E2024-Q05",
          "RD01-W03-E2024-Q06",
          "RD01-W03-E2024-Q07",
          "RD01-W03-E2024-Q08",
          "RD01-W03-E2024-Q09"
        ]
      },
      {
        "edition": 2025,
        "direct_html": {
          "route_id": "RD01-W03-E2025-DIRECT",
          "url": "https://www.natsec100.org/natsec100-2025",
          "bytes": 1195428,
          "sha256": "5c4281369355e4f9ce2308ed1c6b6117928e73dc724beeb8632980d0c7a63481",
          "headers_sha256": "ba584ac1b9aec398a5b3651c55e1331d5dca5dbd91adb9a4ae1089e2ec936e27"
        },
        "report_pdf": {
          "route_id": "RD01-W03-E2025-REPORT-PDF",
          "url": "https://www.natsec100.org/s/SVDG_2025_NatSec100_20250706.pdf",
          "final_url": "https://static1.squarespace.com/static/6824e488de9281397c0dfb01/t/686b55531ac6cd419b922258/1751864662805/SVDG_2025_NatSec100_20250706.pdf",
          "bytes": 4560506,
          "sha256": "2155473439de63b269357726766c73708c64df8033a7df3e54e91c90e2527f56",
          "headers_sha256": "cbdf37f2a6ad9f668c600c335003d5922d79c7e0b0cc4a48b64bd8ee4883f6fb",
          "pages": 42
        },
        "fixed_candidate_query_route_ids": [
          "RD01-W03-E2025-Q01",
          "RD01-W03-E2025-Q02",
          "RD01-W03-E2025-Q03",
          "RD01-W03-E2025-Q04",
          "RD01-W03-E2025-Q05",
          "RD01-W03-E2025-Q06",
          "RD01-W03-E2025-Q07",
          "RD01-W03-E2025-Q08",
          "RD01-W03-E2025-Q09"
        ]
      },
      {
        "edition": 2026,
        "direct_html": {
          "route_id": "RD01-W03-E2026-DIRECT",
          "url": "https://www.natsec100.org/natsec100-2026",
          "bytes": 2341176,
          "sha256": "ca549e5b03873755d70c30ddac00d62d61326971747a37b3651d8b1692403db4",
          "headers_sha256": "882b7bccda918b9bd69f5a80c3472f24ed776bf2028f8f5ddbfbe9b303779baa"
        },
        "report_pdf": {
          "route_id": "RD01-W03-E2026-REPORT-PDF",
          "url": "https://www.natsec100.org/s/2026-NatSec100-Report-WEB.pdf",
          "final_url": "https://static1.squarespace.com/static/6824e488de9281397c0dfb01/t/6a14a90aae1f4367c7d9c89b/1779738890973/2026+NatSec100+Report-WEB.pdf",
          "bytes": 9869885,
          "sha256": "90df8e5655c4b9c285de713e75a97731485ca1c7756781f59aee4795b183a707",
          "headers_sha256": "c1058d52a088cee37818638e9078799e4d8359715a78dd8cc3bd1b18bef5d78a",
          "pages": 78
        },
        "fixed_candidate_query_route_ids": [
          "RD01-W03-E2026-Q01",
          "RD01-W03-E2026-Q02",
          "RD01-W03-E2026-Q03",
          "RD01-W03-E2026-Q04",
          "RD01-W03-E2026-Q05",
          "RD01-W03-E2026-Q06",
          "RD01-W03-E2026-Q07",
          "RD01-W03-E2026-Q08",
          "RD01-W03-E2026-Q09"
        ]
      }
    ],
    "inspection": {
      "method": "internal_machine_text_extraction_plus_rendered_page_inspection",
      "ocr_used": false,
      "rendered_pages_inspected": {
        "2024": [
          5
        ],
        "2025": [
          5,
          7,
          16
        ],
        "2026": [
          6,
          7,
          39,
          40
        ]
      },
      "external_review": false
    },
    "authority": {
      "source_acquisition_only": true,
      "outside_human_dependency": false,
      "external_contacts": 0,
      "external_reviews": 0,
      "class_closed": false,
      "reviewed_disposition_changed": false,
      "selector_accuracy_finding": false,
      "technical_superiority_finding": false,
      "coordination_finding": false,
      "common_purpose_finding": false,
      "publication_effect": "none",
      "adoption_effect": "none",
      "graph_effect": "none"
    }
  },
  "matrix": {
    "schema_version": "ssc-rd01-wave03-methodology-correction-terminal-matrix@1",
    "wave_id": "SSC-RD-W03",
    "lane_id": "RD-01",
    "class_id": "RD-01-C06",
    "issue": 1014,
    "class_label": "methodology correction, appeal, and re-evaluation records",
    "status": "three_edition_twenty_four_cell_matrix_terminal_bounded_source_unavailable",
    "as_of": "2026-08-04",
    "source_product": {
      "constitution_merge": "dc47681a9ad43e1c64c86e3d823dbb7c203a18c2",
      "frozen_execution_base": "a69bffa4c7c6934432b2b93816f5b2b6a466a85b",
      "seed_path": "data/project/ssc-residual-wave03/seeds/RD-01-C06.json",
      "field_matrix_contract_path": "data/intake/status-sovereignty-rd-wave03-rd01-methodology-correction/field-matrix-contract.json",
      "fixed_protocol_path": "data/intake/status-sovereignty-rd-wave03-rd01-methodology-correction/fixed-protocol-package.json",
      "capture_receipt_path": "data/intake/status-sovereignty-rd-wave03-rd01-methodology-correction/capture-execution-receipt.json",
      "capture_receipt_sha256": "8d20a5e257584c3ffe795e9983b8f6cbe4c7d0a7e3115ce53292f2af1b6b231a"
    },
    "required_fields": [
      "edition_identity_and_publication_cutoff",
      "methodology_identity_and_published_input_description",
      "published_correction_or_errata_record",
      "published_appeal_or_challenge_route",
      "published_re_evaluation_reranking_or_reconsideration_record",
      "version_exception_and_override_custody_where_public",
      "source_identities_and_exact_locators",
      "field_and_row_terminal_state"
    ],
    "rows": [
      {
        "unit_id": "NATSEC100-2024",
        "edition_year": 2024,
        "fields": {
          "edition_identity_and_publication_cutoff": {
            "state": "observed",
            "value": {
              "edition_year": 2024,
              "report_label": "2024 NatSec100 edition",
              "publication_cutoff": "2024-07",
              "cutoff_precision": "month_printed_on_report_cover"
            },
            "source_ids": [
              "RD01-W03-E2024-DIRECT",
              "RD01-W03-E2024-REPORT-PDF"
            ],
            "note": "The first-party report cover fixes July 2024; this is edition custody, not a claim about a more precise web publication timestamp.",
            "fixed_protocol_complete": true,
            "terminal_for_class_closure": true
          },
          "methodology_identity_and_published_input_description": {
            "state": "observed",
            "value": {
              "methodology_identity": "proprietary_weighted_quantitative_formula",
              "published_inputs": [
                "headcount growth",
                "total capital raised",
                "fundraising momentum"
              ],
              "eligibility": [
                "venture-backed",
                "national-security applicability",
                "not publicly traded",
                "not acquired by a publicly traded company"
              ],
              "published_cautions": [
                "criteria are not perfect benchmarks for ultimate success",
                "ranking is a momentum-oriented comparative sample"
              ]
            },
            "source_ids": [
              "RD01-W03-E2024-DIRECT",
              "RD01-W03-E2024-REPORT-PDF"
            ],
            "note": "The report describes weighted inputs and limitations; exact weights and transformations remain unpublished.",
            "fixed_protocol_complete": true,
            "terminal_for_class_closure": true
          },
          "published_correction_or_errata_record": {
            "state": "not_publicly_recovered",
            "value": null,
            "source_ids": [
              "RD01-W03-E2024-DIRECT",
              "RD01-W03-E2024-Q01",
              "RD01-W03-E2024-Q02",
              "RD01-W03-E2024-Q03",
              "RD01-W03-E2024-Q04",
              "RD01-W03-E2024-Q05",
              "RD01-W03-E2024-Q06",
              "RD01-W03-E2024-Q07",
              "RD01-W03-E2024-Q08",
              "RD01-W03-E2024-Q09",
              "RD01-W03-E2024-REPORT-PDF"
            ],
            "note": "No NatSec100-hosted correction, errata, correction log, or superseding correction notice for this edition was recovered after the fixed direct-page, nine-query, and exact-report-PDF protocol. This is not evidence that no correction process or event existed.",
            "fixed_protocol_complete": true,
            "terminal_for_class_closure": true
          },
          "published_appeal_or_challenge_route": {
            "state": "not_publicly_recovered",
            "value": null,
            "source_ids": [
              "RD01-W03-E2024-DIRECT",
              "RD01-W03-E2024-Q01",
              "RD01-W03-E2024-Q02",
              "RD01-W03-E2024-Q03",
              "RD01-W03-E2024-Q04",
              "RD01-W03-E2024-Q05",
              "RD01-W03-E2024-Q06",
              "RD01-W03-E2024-Q07",
              "RD01-W03-E2024-Q08",
              "RD01-W03-E2024-Q09",
              "RD01-W03-E2024-REPORT-PDF"
            ],
            "note": "No published NatSec100 route for a ranked, omitted, ineligible, or assessed entity to appeal or challenge this edition was recovered after the fixed protocol. Public disagreement and unrelated litigation are not substituted for a ranking appeal route.",
            "fixed_protocol_complete": true,
            "terminal_for_class_closure": true
          },
          "published_re_evaluation_reranking_or_reconsideration_record": {
            "state": "not_publicly_recovered",
            "value": null,
            "source_ids": [
              "RD01-W03-E2024-DIRECT",
              "RD01-W03-E2024-Q01",
              "RD01-W03-E2024-Q02",
              "RD01-W03-E2024-Q03",
              "RD01-W03-E2024-Q04",
              "RD01-W03-E2024-Q05",
              "RD01-W03-E2024-Q06",
              "RD01-W03-E2024-Q07",
              "RD01-W03-E2024-Q08",
              "RD01-W03-E2024-Q09",
              "RD01-W03-E2024-REPORT-PDF"
            ],
            "note": "No completed re-evaluation, reranking, reconsideration, restored eligibility, or changed-disposition record for this edition was recovered after the fixed protocol. A new edition or list turnover is not substituted for re-evaluation.",
            "fixed_protocol_complete": true,
            "terminal_for_class_closure": true
          },
          "version_exception_and_override_custody_where_public": {
            "state": "observed",
            "value": {
              "base_formula_reported_consistent_with_2023": true,
              "headcount_growth_scoring_sensitivity_increased": true,
              "stated_reason": "reduce tied scores",
              "published_correction_or_errata": false,
              "public_manual_override_log_recovered": false
            },
            "source_ids": [
              "RD01-W03-E2024-DIRECT",
              "RD01-W03-E2024-REPORT-PDF"
            ],
            "note": "The disclosed sensitivity change is a methodology version change, not a correction of a prior published ranking.",
            "fixed_protocol_complete": true,
            "terminal_for_class_closure": true
          },
          "source_identities_and_exact_locators": {
            "state": "observed",
            "value": {
              "direct_html": {
                "route_id": "RD01-W03-E2024-DIRECT",
                "url": "https://www.natsec100.org/natsec100-2024",
                "bytes": 1479630,
                "sha256": "51fb5fd358b41d1cfbab7ba4f371ecf35e6b6b9bc1d73dd1a8f1174af30002db",
                "headers_sha256": "ab3d6fee5d61c93141d73db867e7943e29305a1428256da84ca90ca10de4e0e3"
              },
              "report_pdf": {
                "route_id": "RD01-W03-E2024-REPORT-PDF",
                "url": "https://www.natsec100.org/s/2024-NatSec100-Report.pdf",
                "final_url": "https://static1.squarespace.com/static/6824e488de9281397c0dfb01/t/686e84de3f77e41bbf4b9777/1752073445300/2024+NatSec100+Report.pdf",
                "bytes": 7216664,
                "sha256": "f66c2fbadf8b409896a77f3c237b3aee993064664258f264fd5c24eb06750f20",
                "headers_sha256": "93bce8ccfd9ae54820a57959947a83b14790442fa513dad7c5727f3a638400eb",
                "pages": 26
              },
              "fixed_candidate_query_route_ids": [
                "RD01-W03-E2024-Q01",
                "RD01-W03-E2024-Q02",
                "RD01-W03-E2024-Q03",
                "RD01-W03-E2024-Q04",
                "RD01-W03-E2024-Q05",
                "RD01-W03-E2024-Q06",
                "RD01-W03-E2024-Q07",
                "RD01-W03-E2024-Q08",
                "RD01-W03-E2024-Q09"
              ],
              "capture_receipt_path": "data/intake/status-sovereignty-rd-wave03-rd01-methodology-correction/capture-execution-receipt.json",
              "capture_receipt_sha256": "8d20a5e257584c3ffe795e9983b8f6cbe4c7d0a7e3115ce53292f2af1b6b231a"
            },
            "source_ids": [
              "RD01-W03-E2024-DIRECT",
              "RD01-W03-E2024-Q01",
              "RD01-W03-E2024-Q02",
              "RD01-W03-E2024-Q03",
              "RD01-W03-E2024-Q04",
              "RD01-W03-E2024-Q05",
              "RD01-W03-E2024-Q06",
              "RD01-W03-E2024-Q07",
              "RD01-W03-E2024-Q08",
              "RD01-W03-E2024-Q09",
              "RD01-W03-E2024-REPORT-PDF"
            ],
            "note": "Exact first-party HTML and PDF digests plus every fixed candidate-query route are retained without admitting off-host search candidates as evidence.",
            "fixed_protocol_complete": true,
            "terminal_for_class_closure": true
          },
          "field_and_row_terminal_state": {
            "state": "observed",
            "value": {
              "row_terminal_state": "bounded_source_unavailable",
              "required_fields": 8,
              "terminal_fields": 8,
              "not_publicly_recovered_field_ids": [
                "published_correction_or_errata_record",
                "published_appeal_or_challenge_route",
                "published_re_evaluation_reranking_or_reconsideration_record"
              ],
              "row_closed": true
            },
            "source_ids": [
              "RD01-W03-E2024-DIRECT",
              "RD01-W03-E2024-Q01",
              "RD01-W03-E2024-Q02",
              "RD01-W03-E2024-Q03",
              "RD01-W03-E2024-Q04",
              "RD01-W03-E2024-Q05",
              "RD01-W03-E2024-Q06",
              "RD01-W03-E2024-Q07",
              "RD01-W03-E2024-Q08",
              "RD01-W03-E2024-Q09",
              "RD01-W03-E2024-REPORT-PDF"
            ],
            "note": "Every required field is terminally typed. Bounded source unavailability closes only this acquisition obligation and does not prove record or event absence.",
            "fixed_protocol_complete": true,
            "terminal_for_class_closure": true
          }
        },
        "row_result": {
          "fixed_protocol_executed": true,
          "required_fields": 8,
          "terminal_fields": 8,
          "observed_fields": 5,
          "not_publicly_recovered_fields": 3,
          "row_closed": true,
          "terminal_state": "bounded_source_unavailable"
        }
      },
      {
        "unit_id": "NATSEC100-2025",
        "edition_year": 2025,
        "fields": {
          "edition_identity_and_publication_cutoff": {
            "state": "observed",
            "value": {
              "edition_year": 2025,
              "report_label": "2025 NatSec100 edition",
              "publication_cutoff": "2025-07-07",
              "cutoff_precision": "pdf_creation_metadata"
            },
            "source_ids": [
              "RD01-W03-E2025-DIRECT",
              "RD01-W03-E2025-REPORT-PDF"
            ],
            "note": "The first-party PDF metadata supplies a creation date; it is retained as document metadata rather than asserted as the exact public posting time.",
            "fixed_protocol_complete": true,
            "terminal_for_class_closure": true
          },
          "methodology_identity_and_published_input_description": {
            "state": "observed",
            "value": {
              "methodology_identity": "momentum_centric_quantitative_methodology",
              "published_inputs": [
                "recent capital raised",
                "total capital raised",
                "recent headcount growth"
              ],
              "eligibility": [
                "venture or private-equity backed",
                "not publicly traded",
                "not acquired by a public company",
                "public dual-use or defense applicability",
                "FOCI vetting"
              ],
              "published_cautions": [
                "public-data limitation",
                "ranking is not a direct measure of operational impact",
                "methodology reported as consistently applied over three years"
              ]
            },
            "source_ids": [
              "RD01-W03-E2025-DIRECT",
              "RD01-W03-E2025-REPORT-PDF"
            ],
            "note": "The report frames the list as a repeatable momentum proxy, not valuation, operational impact, or technical superiority.",
            "fixed_protocol_complete": true,
            "terminal_for_class_closure": true
          },
          "published_correction_or_errata_record": {
            "state": "not_publicly_recovered",
            "value": null,
            "source_ids": [
              "RD01-W03-E2025-DIRECT",
              "RD01-W03-E2025-Q01",
              "RD01-W03-E2025-Q02",
              "RD01-W03-E2025-Q03",
              "RD01-W03-E2025-Q04",
              "RD01-W03-E2025-Q05",
              "RD01-W03-E2025-Q06",
              "RD01-W03-E2025-Q07",
              "RD01-W03-E2025-Q08",
              "RD01-W03-E2025-Q09",
              "RD01-W03-E2025-REPORT-PDF"
            ],
            "note": "No NatSec100-hosted correction, errata, correction log, or superseding correction notice for this edition was recovered after the fixed direct-page, nine-query, and exact-report-PDF protocol. This is not evidence that no correction process or event existed.",
            "fixed_protocol_complete": true,
            "terminal_for_class_closure": true
          },
          "published_appeal_or_challenge_route": {
            "state": "not_publicly_recovered",
            "value": null,
            "source_ids": [
              "RD01-W03-E2025-DIRECT",
              "RD01-W03-E2025-Q01",
              "RD01-W03-E2025-Q02",
              "RD01-W03-E2025-Q03",
              "RD01-W03-E2025-Q04",
              "RD01-W03-E2025-Q05",
              "RD01-W03-E2025-Q06",
              "RD01-W03-E2025-Q07",
              "RD01-W03-E2025-Q08",
              "RD01-W03-E2025-Q09",
              "RD01-W03-E2025-REPORT-PDF"
            ],
            "note": "No published NatSec100 route for a ranked, omitted, ineligible, or assessed entity to appeal or challenge this edition was recovered after the fixed protocol. Public disagreement and unrelated litigation are not substituted for a ranking appeal route.",
            "fixed_protocol_complete": true,
            "terminal_for_class_closure": true
          },
          "published_re_evaluation_reranking_or_reconsideration_record": {
            "state": "not_publicly_recovered",
            "value": null,
            "source_ids": [
              "RD01-W03-E2025-DIRECT",
              "RD01-W03-E2025-Q01",
              "RD01-W03-E2025-Q02",
              "RD01-W03-E2025-Q03",
              "RD01-W03-E2025-Q04",
              "RD01-W03-E2025-Q05",
              "RD01-W03-E2025-Q06",
              "RD01-W03-E2025-Q07",
              "RD01-W03-E2025-Q08",
              "RD01-W03-E2025-Q09",
              "RD01-W03-E2025-REPORT-PDF"
            ],
            "note": "No completed re-evaluation, reranking, reconsideration, restored eligibility, or changed-disposition record for this edition was recovered after the fixed protocol. A new edition or list turnover is not substituted for re-evaluation.",
            "fixed_protocol_complete": true,
            "terminal_for_class_closure": true
          },
          "version_exception_and_override_custody_where_public": {
            "state": "observed",
            "value": {
              "methodology_reported_consistent_over_three_years": true,
              "spacex_isolated_in_some_analysis": true,
              "openai_and_anthropic_excluded_from_consideration_after_list_finalization": true,
              "published_correction_or_errata": false,
              "public_ranking_override_log_recovered": false
            },
            "source_ids": [
              "RD01-W03-E2025-DIRECT",
              "RD01-W03-E2025-REPORT-PDF"
            ],
            "note": "SpaceX isolation is an analytical presentation choice and the AI-company timing note is a cutoff statement; neither is a ranking correction or appeal disposition.",
            "fixed_protocol_complete": true,
            "terminal_for_class_closure": true
          },
          "source_identities_and_exact_locators": {
            "state": "observed",
            "value": {
              "direct_html": {
                "route_id": "RD01-W03-E2025-DIRECT",
                "url": "https://www.natsec100.org/natsec100-2025",
                "bytes": 1195428,
                "sha256": "5c4281369355e4f9ce2308ed1c6b6117928e73dc724beeb8632980d0c7a63481",
                "headers_sha256": "ba584ac1b9aec398a5b3651c55e1331d5dca5dbd91adb9a4ae1089e2ec936e27"
              },
              "report_pdf": {
                "route_id": "RD01-W03-E2025-REPORT-PDF",
                "url": "https://www.natsec100.org/s/SVDG_2025_NatSec100_20250706.pdf",
                "final_url": "https://static1.squarespace.com/static/6824e488de9281397c0dfb01/t/686b55531ac6cd419b922258/1751864662805/SVDG_2025_NatSec100_20250706.pdf",
                "bytes": 4560506,
                "sha256": "2155473439de63b269357726766c73708c64df8033a7df3e54e91c90e2527f56",
                "headers_sha256": "cbdf37f2a6ad9f668c600c335003d5922d79c7e0b0cc4a48b64bd8ee4883f6fb",
                "pages": 42
              },
              "fixed_candidate_query_route_ids": [
                "RD01-W03-E2025-Q01",
                "RD01-W03-E2025-Q02",
                "RD01-W03-E2025-Q03",
                "RD01-W03-E2025-Q04",
                "RD01-W03-E2025-Q05",
                "RD01-W03-E2025-Q06",
                "RD01-W03-E2025-Q07",
                "RD01-W03-E2025-Q08",
                "RD01-W03-E2025-Q09"
              ],
              "capture_receipt_path": "data/intake/status-sovereignty-rd-wave03-rd01-methodology-correction/capture-execution-receipt.json",
              "capture_receipt_sha256": "8d20a5e257584c3ffe795e9983b8f6cbe4c7d0a7e3115ce53292f2af1b6b231a"
            },
            "source_ids": [
              "RD01-W03-E2025-DIRECT",
              "RD01-W03-E2025-Q01",
              "RD01-W03-E2025-Q02",
              "RD01-W03-E2025-Q03",
              "RD01-W03-E2025-Q04",
              "RD01-W03-E2025-Q05",
              "RD01-W03-E2025-Q06",
              "RD01-W03-E2025-Q07",
              "RD01-W03-E2025-Q08",
              "RD01-W03-E2025-Q09",
              "RD01-W03-E2025-REPORT-PDF"
            ],
            "note": "Exact first-party HTML and PDF digests plus every fixed candidate-query route are retained without admitting off-host search candidates as evidence.",
            "fixed_protocol_complete": true,
            "terminal_for_class_closure": true
          },
          "field_and_row_terminal_state": {
            "state": "observed",
            "value": {
              "row_terminal_state": "bounded_source_unavailable",
              "required_fields": 8,
              "terminal_fields": 8,
              "not_publicly_recovered_field_ids": [
                "published_correction_or_errata_record",
                "published_appeal_or_challenge_route",
                "published_re_evaluation_reranking_or_reconsideration_record"
              ],
              "row_closed": true
            },
            "source_ids": [
              "RD01-W03-E2025-DIRECT",
              "RD01-W03-E2025-Q01",
              "RD01-W03-E2025-Q02",
              "RD01-W03-E2025-Q03",
              "RD01-W03-E2025-Q04",
              "RD01-W03-E2025-Q05",
              "RD01-W03-E2025-Q06",
              "RD01-W03-E2025-Q07",
              "RD01-W03-E2025-Q08",
              "RD01-W03-E2025-Q09",
              "RD01-W03-E2025-REPORT-PDF"
            ],
            "note": "Every required field is terminally typed. Bounded source unavailability closes only this acquisition obligation and does not prove record or event absence.",
            "fixed_protocol_complete": true,
            "terminal_for_class_closure": true
          }
        },
        "row_result": {
          "fixed_protocol_executed": true,
          "required_fields": 8,
          "terminal_fields": 8,
          "observed_fields": 5,
          "not_publicly_recovered_fields": 3,
          "row_closed": true,
          "terminal_state": "bounded_source_unavailable"
        }
      },
      {
        "unit_id": "NATSEC100-2026",
        "edition_year": 2026,
        "fields": {
          "edition_identity_and_publication_cutoff": {
            "state": "observed",
            "value": {
              "edition_year": 2026,
              "report_label": "2026 NatSec100 edition",
              "publication_cutoff": "2026-05-25",
              "cutoff_precision": "pdf_creation_metadata"
            },
            "source_ids": [
              "RD01-W03-E2026-DIRECT",
              "RD01-W03-E2026-REPORT-PDF"
            ],
            "note": "The first-party PDF metadata supplies a creation date; it is retained as document metadata rather than asserted as the exact public posting time.",
            "fixed_protocol_complete": true,
            "terminal_for_class_closure": true
          },
          "methodology_identity_and_published_input_description": {
            "state": "observed",
            "value": {
              "methodology_identity": "momentum_based_weighted_quantitative_methodology_with_contracting_input",
              "published_inputs": [
                "U.S. government contracting activity",
                "recent capital raised",
                "total capital raised",
                "recent headcount growth"
              ],
              "eligibility": [
                "venture or private-equity backed",
                "not publicly traded or filed to IPO",
                "not acquired by a public company",
                "defense or dual-use applicability",
                "at least one U.S. government contract by 2025-12-31",
                "FOCI vetting"
              ],
              "published_cautions": [
                "public-data and classified-work limits",
                "does not incorporate valuation or financial performance",
                "proxy for venture-backed momentum"
              ]
            },
            "source_ids": [
              "RD01-W03-E2026-DIRECT",
              "RD01-W03-E2026-REPORT-PDF"
            ],
            "note": "Contracting activity became a direct scoring input and one contract became an eligibility floor; these changes break naive longitudinal comparability.",
            "fixed_protocol_complete": true,
            "terminal_for_class_closure": true
          },
          "published_correction_or_errata_record": {
            "state": "not_publicly_recovered",
            "value": null,
            "source_ids": [
              "RD01-W03-E2026-DIRECT",
              "RD01-W03-E2026-Q01",
              "RD01-W03-E2026-Q02",
              "RD01-W03-E2026-Q03",
              "RD01-W03-E2026-Q04",
              "RD01-W03-E2026-Q05",
              "RD01-W03-E2026-Q06",
              "RD01-W03-E2026-Q07",
              "RD01-W03-E2026-Q08",
              "RD01-W03-E2026-Q09",
              "RD01-W03-E2026-REPORT-PDF"
            ],
            "note": "No NatSec100-hosted correction, errata, correction log, or superseding correction notice for this edition was recovered after the fixed direct-page, nine-query, and exact-report-PDF protocol. This is not evidence that no correction process or event existed.",
            "fixed_protocol_complete": true,
            "terminal_for_class_closure": true
          },
          "published_appeal_or_challenge_route": {
            "state": "not_publicly_recovered",
            "value": null,
            "source_ids": [
              "RD01-W03-E2026-DIRECT",
              "RD01-W03-E2026-Q01",
              "RD01-W03-E2026-Q02",
              "RD01-W03-E2026-Q03",
              "RD01-W03-E2026-Q04",
              "RD01-W03-E2026-Q05",
              "RD01-W03-E2026-Q06",
              "RD01-W03-E2026-Q07",
              "RD01-W03-E2026-Q08",
              "RD01-W03-E2026-Q09",
              "RD01-W03-E2026-REPORT-PDF"
            ],
            "note": "No published NatSec100 route for a ranked, omitted, ineligible, or assessed entity to appeal or challenge this edition was recovered after the fixed protocol. Public disagreement and unrelated litigation are not substituted for a ranking appeal route.",
            "fixed_protocol_complete": true,
            "terminal_for_class_closure": true
          },
          "published_re_evaluation_reranking_or_reconsideration_record": {
            "state": "observed",
            "value": {
              "record_type": "prospective_future_eligibility_re_evaluation_statement",
              "subject": "Anthropic",
              "statement_scope": "eligibility for future editions",
              "completed_2026_reranking_or_changed_disposition": false
            },
            "source_ids": [
              "RD01-W03-E2026-DIRECT",
              "RD01-W03-E2026-REPORT-PDF"
            ],
            "note": "The report says eligibility will be re-evaluated for future editions. It does not document a completed appeal, reranking, reconsideration, or changed 2026 disposition.",
            "fixed_protocol_complete": true,
            "terminal_for_class_closure": true
          },
          "version_exception_and_override_custody_where_public": {
            "state": "observed",
            "value": {
              "government_contracting_added_as_direct_scoring_input": true,
              "government_contract_eligibility_floor_added": true,
              "spacex_ineligible_after_filed_ipo": true,
              "openai_and_anthropic_formally_evaluated": true,
              "anthropic_ineligible_at_publication_due_active_dispute_and_supply_chain_risk_designation": true,
              "public_manual_override_log_recovered": false
            },
            "source_ids": [
              "RD01-W03-E2026-DIRECT",
              "RD01-W03-E2026-REPORT-PDF"
            ],
            "note": "These are public methodology, eligibility, and special-consideration disclosures; they are not evidence of an unpublished override process.",
            "fixed_protocol_complete": true,
            "terminal_for_class_closure": true
          },
          "source_identities_and_exact_locators": {
            "state": "observed",
            "value": {
              "direct_html": {
                "route_id": "RD01-W03-E2026-DIRECT",
                "url": "https://www.natsec100.org/natsec100-2026",
                "bytes": 2341176,
                "sha256": "ca549e5b03873755d70c30ddac00d62d61326971747a37b3651d8b1692403db4",
                "headers_sha256": "882b7bccda918b9bd69f5a80c3472f24ed776bf2028f8f5ddbfbe9b303779baa"
              },
              "report_pdf": {
                "route_id": "RD01-W03-E2026-REPORT-PDF",
                "url": "https://www.natsec100.org/s/2026-NatSec100-Report-WEB.pdf",
                "final_url": "https://static1.squarespace.com/static/6824e488de9281397c0dfb01/t/6a14a90aae1f4367c7d9c89b/1779738890973/2026+NatSec100+Report-WEB.pdf",
                "bytes": 9869885,
                "sha256": "90df8e5655c4b9c285de713e75a97731485ca1c7756781f59aee4795b183a707",
                "headers_sha256": "c1058d52a088cee37818638e9078799e4d8359715a78dd8cc3bd1b18bef5d78a",
                "pages": 78
              },
              "fixed_candidate_query_route_ids": [
                "RD01-W03-E2026-Q01",
                "RD01-W03-E2026-Q02",
                "RD01-W03-E2026-Q03",
                "RD01-W03-E2026-Q04",
                "RD01-W03-E2026-Q05",
                "RD01-W03-E2026-Q06",
                "RD01-W03-E2026-Q07",
                "RD01-W03-E2026-Q08",
                "RD01-W03-E2026-Q09"
              ],
              "capture_receipt_path": "data/intake/status-sovereignty-rd-wave03-rd01-methodology-correction/capture-execution-receipt.json",
              "capture_receipt_sha256": "8d20a5e257584c3ffe795e9983b8f6cbe4c7d0a7e3115ce53292f2af1b6b231a"
            },
            "source_ids": [
              "RD01-W03-E2026-DIRECT",
              "RD01-W03-E2026-Q01",
              "RD01-W03-E2026-Q02",
              "RD01-W03-E2026-Q03",
              "RD01-W03-E2026-Q04",
              "RD01-W03-E2026-Q05",
              "RD01-W03-E2026-Q06",
              "RD01-W03-E2026-Q07",
              "RD01-W03-E2026-Q08",
              "RD01-W03-E2026-Q09",
              "RD01-W03-E2026-REPORT-PDF"
            ],
            "note": "Exact first-party HTML and PDF digests plus every fixed candidate-query route are retained without admitting off-host search candidates as evidence.",
            "fixed_protocol_complete": true,
            "terminal_for_class_closure": true
          },
          "field_and_row_terminal_state": {
            "state": "observed",
            "value": {
              "row_terminal_state": "bounded_source_unavailable",
              "required_fields": 8,
              "terminal_fields": 8,
              "not_publicly_recovered_field_ids": [
                "published_correction_or_errata_record",
                "published_appeal_or_challenge_route"
              ],
              "row_closed": true
            },
            "source_ids": [
              "RD01-W03-E2026-DIRECT",
              "RD01-W03-E2026-Q01",
              "RD01-W03-E2026-Q02",
              "RD01-W03-E2026-Q03",
              "RD01-W03-E2026-Q04",
              "RD01-W03-E2026-Q05",
              "RD01-W03-E2026-Q06",
              "RD01-W03-E2026-Q07",
              "RD01-W03-E2026-Q08",
              "RD01-W03-E2026-Q09",
              "RD01-W03-E2026-REPORT-PDF"
            ],
            "note": "Every required field is terminally typed. Bounded source unavailability closes only this acquisition obligation and does not prove record or event absence.",
            "fixed_protocol_complete": true,
            "terminal_for_class_closure": true
          }
        },
        "row_result": {
          "fixed_protocol_executed": true,
          "required_fields": 8,
          "terminal_fields": 8,
          "observed_fields": 6,
          "not_publicly_recovered_fields": 2,
          "row_closed": true,
          "terminal_state": "bounded_source_unavailable"
        }
      }
    ],
    "counts": {
      "edition_rows": 3,
      "required_fields_per_row": 8,
      "required_fields": 24,
      "terminal_fields": 24,
      "observed_fields": 16,
      "not_publicly_recovered_fields": 8,
      "source_restricted_fields": 0,
      "source_unavailable_after_fixed_protocol_fields": 0,
      "not_applicable_fields": 0,
      "closed_rows": 3,
      "fixed_routes": 30,
      "direct_html_sources": 3,
      "candidate_census_routes": 27,
      "candidate_rows": 269,
      "admitted_candidate_sources": 0,
      "report_pdf_sources": 3,
      "prospective_future_re_evaluation_statements": 1,
      "completed_correction_or_errata_records": 0,
      "published_formal_appeal_routes": 0,
      "completed_reranking_or_changed_disposition_records": 0,
      "external_contacts": 0,
      "external_reviews": 0
    },
    "current_result": {
      "terminal_state": "bounded_source_unavailable",
      "fixed_protocol_complete": true,
      "class_closed": true,
      "all_three_editions_preserved": true,
      "all_twenty_four_fields_terminal": true,
      "edition_specific_methodology_differences_preserved": true,
      "prospective_future_re_evaluation_preserved_without_completion_claim": true,
      "selector_accuracy_finding": false,
      "technical_superiority_finding": false,
      "coordination_finding": false,
      "common_purpose_finding": false,
      "reviewed_disposition_changed": false,
      "outside_human_dependency": false,
      "project_blocking": false,
      "publication_effect": "none",
      "adoption_effect": "none",
      "graph_effect": "none"
    },
    "boundaries": {
      "methodology_change_is_correction": false,
      "new_edition_is_prior_row_re_evaluation": false,
      "future_re_evaluation_statement_is_completed_re_evaluation": false,
      "public_disagreement_is_formal_appeal_route": false,
      "unrelated_litigation_is_natsec100_appeal": false,
      "no_public_correction_record_is_no_correction": false,
      "no_public_appeal_route_is_no_appeal": false,
      "no_public_override_log_is_no_override": false,
      "rank_turnover_is_methodology_defect": false,
      "published_rank_is_technical_superiority_or_causal_treatment": false,
      "source_unavailability_is_event_absence": false,
      "class_closure_is_lane_or_wave_completion": false,
      "publication_effect": "none",
      "adoption_effect": "none",
      "graph_effect": "none"
    },
    "authority": {
      "outside_human_dependency": false,
      "external_contacts": 0,
      "external_reviews": 0,
      "denominator_widened": false,
      "reviewed_disposition_changed": false,
      "selector_accuracy_finding": false,
      "technical_superiority_finding": false,
      "coordination_finding": false,
      "common_purpose_finding": false,
      "publication_effect": "none",
      "adoption_effect": "none",
      "graph_effect": "none"
    }
  },
  "summary": {
    "schema_version": "ssc-rd01-wave03-methodology-correction-summary@1",
    "wave_id": "SSC-RD-W03",
    "lane_id": "RD-01",
    "class_id": "RD-01-C06",
    "issue": 1014,
    "terminal_state": "bounded_source_unavailable",
    "class_closed": true,
    "counts": {
      "edition_rows": 3,
      "required_fields_per_row": 8,
      "required_fields": 24,
      "terminal_fields": 24,
      "observed_fields": 16,
      "not_publicly_recovered_fields": 8,
      "source_restricted_fields": 0,
      "source_unavailable_after_fixed_protocol_fields": 0,
      "not_applicable_fields": 0,
      "closed_rows": 3,
      "fixed_routes": 30,
      "direct_html_sources": 3,
      "candidate_census_routes": 27,
      "candidate_rows": 269,
      "admitted_candidate_sources": 0,
      "report_pdf_sources": 3,
      "prospective_future_re_evaluation_statements": 1,
      "completed_correction_or_errata_records": 0,
      "published_formal_appeal_routes": 0,
      "completed_reranking_or_changed_disposition_records": 0,
      "external_contacts": 0,
      "external_reviews": 0
    },
    "current_result": {
      "terminal_state": "bounded_source_unavailable",
      "fixed_protocol_complete": true,
      "class_closed": true,
      "all_three_editions_preserved": true,
      "all_twenty_four_fields_terminal": true,
      "edition_specific_methodology_differences_preserved": true,
      "prospective_future_re_evaluation_preserved_without_completion_claim": true,
      "selector_accuracy_finding": false,
      "technical_superiority_finding": false,
      "coordination_finding": false,
      "common_purpose_finding": false,
      "reviewed_disposition_changed": false,
      "outside_human_dependency": false,
      "project_blocking": false,
      "publication_effect": "none",
      "adoption_effect": "none",
      "graph_effect": "none"
    },
    "authority": {
      "outside_human_dependency": false,
      "external_contacts": 0,
      "external_reviews": 0,
      "denominator_widened": false,
      "reviewed_disposition_changed": false,
      "selector_accuracy_finding": false,
      "technical_superiority_finding": false,
      "coordination_finding": false,
      "common_purpose_finding": false,
      "publication_effect": "none",
      "adoption_effect": "none",
      "graph_effect": "none"
    }
  },
  "classReceipt": {
    "schema_version": "ssc-rd01-wave03-class-receipt@1",
    "wave_id": "SSC-RD-W03",
    "lane_id": "RD-01",
    "class_id": "RD-01-C06",
    "issue": 1014,
    "source_pr": 1022,
    "class_label": "methodology correction, appeal, and re-evaluation records",
    "terminal_state": "bounded_source_unavailable",
    "class_closed": true,
    "closure_basis": [
      "the immutable denominator retains the 2024, 2025, and 2026 NatSec100 editions as three noninterchangeable historical units",
      "the fixed protocol executed thirty predeclared routes and admitted exactly three first-party HTML pages plus three source-addressed report PDFs without result-spawned search requests",
      "all twenty-four required edition-field cells are terminally typed, including eight not-publicly-recovered acquisition states",
      "edition-specific methodology and eligibility changes are preserved as version disclosures rather than laundered into corrections of prior rankings",
      "one prospective Anthropic future-eligibility re-evaluation statement is retained without claiming a completed appeal, reranking, reconsideration, or changed 2026 disposition",
      "missing public correction, appeal, reconsideration, or override records are not converted into nonexistence, accuracy, superiority, coordination, common purpose, publication, adoption, or graph findings"
    ],
    "counts": {
      "edition_rows": 3,
      "required_fields_per_row": 8,
      "required_fields": 24,
      "terminal_fields": 24,
      "observed_fields": 16,
      "not_publicly_recovered_fields": 8,
      "source_restricted_fields": 0,
      "source_unavailable_after_fixed_protocol_fields": 0,
      "not_applicable_fields": 0,
      "closed_rows": 3,
      "fixed_routes": 30,
      "direct_html_sources": 3,
      "candidate_census_routes": 27,
      "candidate_rows": 269,
      "admitted_candidate_sources": 0,
      "report_pdf_sources": 3,
      "prospective_future_re_evaluation_statements": 1,
      "completed_correction_or_errata_records": 0,
      "published_formal_appeal_routes": 0,
      "completed_reranking_or_changed_disposition_records": 0,
      "external_contacts": 0,
      "external_reviews": 0
    },
    "source_custody": {
      "capture_receipt_path": "data/intake/status-sovereignty-rd-wave03-rd01-methodology-correction/capture-execution-receipt.json",
      "capture_receipt_sha256": "8d20a5e257584c3ffe795e9983b8f6cbe4c7d0a7e3115ce53292f2af1b6b231a",
      "fixed_route_capture_run": 30914248336,
      "fixed_route_capture_artifact_id": 8894359001,
      "fixed_route_capture_artifact_zip_sha256": "c247a5f9a3d8cd2bc6feb5c30dd643af0bbd3878a8712f7e4fadfdf24ad91291",
      "fixed_route_capture_manifest_sha256": "a3c00b6bb04367646153b693ff229adc046f174c043e88b7dd3a949e670ac12c",
      "report_pdf_capture_run": 30916279943,
      "report_pdf_capture_artifact_id": 8895179282,
      "report_pdf_capture_artifact_zip_sha256": "26c67041bbe69e2983c8733c58c062f808de8d803c8146238f63351db8e9de01",
      "report_pdf_capture_manifest_sha256": "609a9e8e80fe257e2a253aa61dbcd6501e18f63b74d6a42d7d25ff61b1f1ceb9"
    },
    "unresolved_limit": {
      "not_publicly_recovered_fields": 8,
      "prospective_future_re_evaluation_statements": 1,
      "completed_correction_or_errata_records": 0,
      "published_formal_appeal_routes": 0,
      "completed_reranking_or_changed_disposition_records": 0,
      "missing_records_are_not_event_absence": true,
      "prospective_re_evaluation_is_not_completed_re_evaluation": true,
      "automatic_additional_search_pass_authorized": false
    },
    "authority": {
      "outside_human_dependency": false,
      "external_contacts": 0,
      "external_reviews": 0,
      "denominator_widened": false,
      "reviewed_disposition_changed": false,
      "selector_accuracy_finding": false,
      "technical_superiority_finding": false,
      "coordination_finding": false,
      "common_purpose_finding": false,
      "publication_effect": "none",
      "adoption_effect": "none",
      "graph_effect": "none"
    }
  },
  "manifest": {
    "schema_version": "ssc-rd01-wave03-terminal-product-manifest@1",
    "entries": [
      {
        "path": "terminal-field-matrix.json",
        "bytes": 32837,
        "sha256": "c06a95f0881ac481c389bb1517aeeea381b139aa0053cd155f5ab6847ffadb76"
      },
      {
        "path": "summary.json",
        "bytes": 2202,
        "sha256": "8a71df1fa9db193d79d2a23834c43247ca5cc3234c33979d9283e1ddfd68b07a"
      },
      {
        "path": "class-receipt.json",
        "bytes": 3916,
        "sha256": "d805f6e19834ad273fdfc346ef21dd86265a56fab5801856e3fcfe84ba6f0626"
      }
    ],
    "entry_count": 3,
    "combined_sha256": "9b59871cf7ce40e68d0a2a89b41148a6c92b7201702d91a7724d1310ddbcc461"
  },
  "closure": {
    "schema_version": "ssc-residual-denominator-wave03-class-closure-reference@1",
    "wave_issue": 1013,
    "child_issue": 1014,
    "source_pr": 1022,
    "lane_id": "RD-01",
    "class_id": "RD-01-C06",
    "exact_label": "methodology correction, appeal, and re-evaluation records",
    "terminal_state": "bounded_source_unavailable",
    "class_closed": true,
    "product": {
      "root": "data/research/status-sovereignty-rd-wave03-rd01-methodology-correction",
      "manifest_path": "data/research/status-sovereignty-rd-wave03-rd01-methodology-correction/manifest.json",
      "manifest_combined_sha256": "9b59871cf7ce40e68d0a2a89b41148a6c92b7201702d91a7724d1310ddbcc461",
      "class_receipt_path": "data/research/status-sovereignty-rd-wave03-rd01-methodology-correction/class-receipt.json"
    },
    "source_custody": {
      "capture_receipt_path": "data/intake/status-sovereignty-rd-wave03-rd01-methodology-correction/capture-execution-receipt.json",
      "capture_receipt_sha256": "8d20a5e257584c3ffe795e9983b8f6cbe4c7d0a7e3115ce53292f2af1b6b231a",
      "fixed_route_capture_run": 30914248336,
      "fixed_route_capture_artifact_id": 8894359001,
      "fixed_route_capture_artifact_zip_sha256": "c247a5f9a3d8cd2bc6feb5c30dd643af0bbd3878a8712f7e4fadfdf24ad91291",
      "fixed_route_capture_manifest_sha256": "a3c00b6bb04367646153b693ff229adc046f174c043e88b7dd3a949e670ac12c",
      "report_pdf_capture_run": 30916279943,
      "report_pdf_capture_artifact_id": 8895179282,
      "report_pdf_capture_artifact_zip_sha256": "26c67041bbe69e2983c8733c58c062f808de8d803c8146238f63351db8e9de01",
      "report_pdf_capture_manifest_sha256": "609a9e8e80fe257e2a253aa61dbcd6501e18f63b74d6a42d7d25ff61b1f1ceb9"
    },
    "authority": {
      "outside_human_dependency": false,
      "external_contacts": 0,
      "external_reviews": 0,
      "denominator_widened": false,
      "reviewed_disposition_changed": false,
      "selector_accuracy_finding": false,
      "technical_superiority_finding": false,
      "coordination_finding": false,
      "common_purpose_finding": false,
      "publication_effect": "none",
      "adoption_effect": "none",
      "graph_effect": "none"
    },
    "residual_atlas_effect_if_promoted_after_wave02_six_closures": {
      "canonical_classes": 42,
      "open_before": 36,
      "closed_before": 6,
      "open_after": 35,
      "closed_after": 7,
      "wave03_selected_attempts_terminal_after_promotion": 1,
      "wave_complete": false
    }
  },
  "schema": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://bigbirdreturns.github.io/clifford-number/schemas/status-sovereignty-rd-wave03-rd01-methodology-correction.schema.json",
    "title": "SSC RD-01 Wave 03 methodology-correction class receipt",
    "type": "object",
    "additionalProperties": false,
    "required": [
      "schema_version",
      "wave_id",
      "lane_id",
      "class_id",
      "issue",
      "source_pr",
      "class_label",
      "terminal_state",
      "class_closed",
      "closure_basis",
      "counts",
      "source_custody",
      "unresolved_limit",
      "authority"
    ],
    "properties": {
      "schema_version": {
        "const": "ssc-rd01-wave03-class-receipt@1"
      },
      "wave_id": {
        "const": "SSC-RD-W03"
      },
      "lane_id": {
        "const": "RD-01"
      },
      "class_id": {
        "const": "RD-01-C06"
      },
      "issue": {
        "const": 1014
      },
      "source_pr": {
        "const": 1022
      },
      "class_label": {
        "const": "methodology correction, appeal, and re-evaluation records"
      },
      "terminal_state": {
        "const": "bounded_source_unavailable"
      },
      "class_closed": {
        "const": true
      },
      "closure_basis": {
        "type": "array",
        "minItems": 6,
        "maxItems": 6,
        "items": {
          "type": "string",
          "minLength": 1
        }
      },
      "counts": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "edition_rows",
          "required_fields_per_row",
          "required_fields",
          "terminal_fields",
          "observed_fields",
          "not_publicly_recovered_fields",
          "source_restricted_fields",
          "source_unavailable_after_fixed_protocol_fields",
          "not_applicable_fields",
          "closed_rows",
          "fixed_routes",
          "direct_html_sources",
          "candidate_census_routes",
          "candidate_rows",
          "admitted_candidate_sources",
          "report_pdf_sources",
          "prospective_future_re_evaluation_statements",
          "completed_correction_or_errata_records",
          "published_formal_appeal_routes",
          "completed_reranking_or_changed_disposition_records",
          "external_contacts",
          "external_reviews"
        ],
        "properties": {
          "edition_rows": {
            "const": 3
          },
          "required_fields_per_row": {
            "const": 8
          },
          "required_fields": {
            "const": 24
          },
          "terminal_fields": {
            "const": 24
          },
          "observed_fields": {
            "const": 16
          },
          "not_publicly_recovered_fields": {
            "const": 8
          },
          "source_restricted_fields": {
            "const": 0
          },
          "source_unavailable_after_fixed_protocol_fields": {
            "const": 0
          },
          "not_applicable_fields": {
            "const": 0
          },
          "closed_rows": {
            "const": 3
          },
          "fixed_routes": {
            "const": 30
          },
          "direct_html_sources": {
            "const": 3
          },
          "candidate_census_routes": {
            "const": 27
          },
          "candidate_rows": {
            "const": 269
          },
          "admitted_candidate_sources": {
            "const": 0
          },
          "report_pdf_sources": {
            "const": 3
          },
          "prospective_future_re_evaluation_statements": {
            "const": 1
          },
          "completed_correction_or_errata_records": {
            "const": 0
          },
          "published_formal_appeal_routes": {
            "const": 0
          },
          "completed_reranking_or_changed_disposition_records": {
            "const": 0
          },
          "external_contacts": {
            "const": 0
          },
          "external_reviews": {
            "const": 0
          }
        }
      },
      "source_custody": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "capture_receipt_path",
          "capture_receipt_sha256",
          "fixed_route_capture_run",
          "fixed_route_capture_artifact_id",
          "fixed_route_capture_artifact_zip_sha256",
          "fixed_route_capture_manifest_sha256",
          "report_pdf_capture_run",
          "report_pdf_capture_artifact_id",
          "report_pdf_capture_artifact_zip_sha256",
          "report_pdf_capture_manifest_sha256"
        ],
        "properties": {
          "capture_receipt_path": {
            "const": "data/intake/status-sovereignty-rd-wave03-rd01-methodology-correction/capture-execution-receipt.json"
          },
          "capture_receipt_sha256": {
            "const": "8d20a5e257584c3ffe795e9983b8f6cbe4c7d0a7e3115ce53292f2af1b6b231a"
          },
          "fixed_route_capture_run": {
            "const": 30914248336
          },
          "fixed_route_capture_artifact_id": {
            "const": 8894359001
          },
          "fixed_route_capture_artifact_zip_sha256": {
            "const": "c247a5f9a3d8cd2bc6feb5c30dd643af0bbd3878a8712f7e4fadfdf24ad91291"
          },
          "fixed_route_capture_manifest_sha256": {
            "const": "a3c00b6bb04367646153b693ff229adc046f174c043e88b7dd3a949e670ac12c"
          },
          "report_pdf_capture_run": {
            "const": 30916279943
          },
          "report_pdf_capture_artifact_id": {
            "const": 8895179282
          },
          "report_pdf_capture_artifact_zip_sha256": {
            "const": "26c67041bbe69e2983c8733c58c062f808de8d803c8146238f63351db8e9de01"
          },
          "report_pdf_capture_manifest_sha256": {
            "const": "609a9e8e80fe257e2a253aa61dbcd6501e18f63b74d6a42d7d25ff61b1f1ceb9"
          }
        }
      },
      "unresolved_limit": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "not_publicly_recovered_fields",
          "prospective_future_re_evaluation_statements",
          "completed_correction_or_errata_records",
          "published_formal_appeal_routes",
          "completed_reranking_or_changed_disposition_records",
          "missing_records_are_not_event_absence",
          "prospective_re_evaluation_is_not_completed_re_evaluation",
          "automatic_additional_search_pass_authorized"
        ],
        "properties": {
          "not_publicly_recovered_fields": {
            "const": 8
          },
          "prospective_future_re_evaluation_statements": {
            "const": 1
          },
          "completed_correction_or_errata_records": {
            "const": 0
          },
          "published_formal_appeal_routes": {
            "const": 0
          },
          "completed_reranking_or_changed_disposition_records": {
            "const": 0
          },
          "missing_records_are_not_event_absence": {
            "const": true
          },
          "prospective_re_evaluation_is_not_completed_re_evaluation": {
            "const": true
          },
          "automatic_additional_search_pass_authorized": {
            "const": false
          }
        }
      },
      "authority": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "outside_human_dependency",
          "external_contacts",
          "external_reviews",
          "denominator_widened",
          "reviewed_disposition_changed",
          "selector_accuracy_finding",
          "technical_superiority_finding",
          "coordination_finding",
          "common_purpose_finding",
          "publication_effect",
          "adoption_effect",
          "graph_effect"
        ],
        "properties": {
          "outside_human_dependency": {
            "const": false
          },
          "external_contacts": {
            "const": 0
          },
          "external_reviews": {
            "const": 0
          },
          "denominator_widened": {
            "const": false
          },
          "reviewed_disposition_changed": {
            "const": false
          },
          "selector_accuracy_finding": {
            "const": false
          },
          "technical_superiority_finding": {
            "const": false
          },
          "coordination_finding": {
            "const": false
          },
          "common_purpose_finding": {
            "const": false
          },
          "publication_effect": {
            "const": "none"
          },
          "adoption_effect": {
            "const": "none"
          },
          "graph_effect": {
            "const": "none"
          }
        }
      }
    }
  }
};

export const stableJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
export const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const abs = (root, rel) => path.join(root, rel);

export function buildExpectedBundle() {
  const bundle = structuredClone(EXPECTED);
  const captureBytes = Buffer.from(stableJson(bundle.capture));
  assert.equal(sha256(captureBytes), bundle.matrix.source_product.capture_receipt_sha256, 'capture receipt digest drift');
  assert.equal(sha256(captureBytes), bundle.classReceipt.source_custody.capture_receipt_sha256, 'class receipt capture digest drift');
  const entries = [
    ['terminal-field-matrix.json', bundle.matrix],
    ['summary.json', bundle.summary],
    ['class-receipt.json', bundle.classReceipt]
  ].map(([entryPath, value]) => {
    const bytes = Buffer.from(stableJson(value));
    return { path: entryPath, bytes: bytes.length, sha256: sha256(bytes) };
  });
  assert.deepEqual(entries, bundle.manifest.entries, 'embedded manifest entries drift');
  const combined = sha256(Buffer.from(entries.map((entry) => `${entry.sha256}  ${entry.path}\n`).join('')));
  assert.equal(combined, bundle.manifest.combined_sha256, 'embedded manifest combined digest drift');
  assert.equal(combined, bundle.closure.product.manifest_combined_sha256, 'closure manifest digest drift');
  return bundle;
}

export function loadCommittedBundle(root = ROOT) {
  return Object.fromEntries(Object.entries(PATHS).map(([key, rel]) => [key, JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'))]));
}

export function checkCommittedBundle(root = ROOT) {
  const expected = buildExpectedBundle();
  for (const [key, rel] of Object.entries(PATHS)) {
    const actual = fs.readFileSync(abs(root, rel), 'utf8');
    assert.equal(actual, stableJson(expected[key]), `${rel} is not the deterministic terminal product`);
  }
  return expected;
}

export function writeExpectedBundle(root = ROOT) {
  const expected = buildExpectedBundle();
  for (const [key, rel] of Object.entries(PATHS)) {
    const out = abs(root, rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, stableJson(expected[key]));
  }
  return expected;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2] || '--check';
  const bundle = mode === '--write' ? writeExpectedBundle(ROOT) : checkCommittedBundle(ROOT);
  console.log(`RD-01 Wave-03 terminal product ${mode === '--write' ? 'written' : 'verified'}: ${bundle.matrix.counts.terminal_fields} / ${bundle.matrix.counts.required_fields} terminal; manifest ${bundle.manifest.combined_sha256}`);
}
