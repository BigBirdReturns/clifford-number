#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateProduct, ROOT, DATA_REL } from './build-status-sovereignty-rd-wave03-rd04-five-state-source-field-adjudication.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
if(root!==ROOT)throw new Error('root mismatch');
const result=validateProduct(root);
const manifest=JSON.parse(fs.readFileSync(path.join(root,DATA_REL,'product-manifest.json'),'utf8'));
for(const e of manifest.entries){const b=fs.readFileSync(path.join(root,DATA_REL,e.path));if(b.length!==e.bytes)throw new Error(`${e.path}: byte count`);if(crypto.createHash('sha256').update(b).digest('hex')!==e.sha256)throw new Error(`${e.path}: SHA-256`);}
if(result.index.counts.matrix_updates!==0||result.index.counts.field_terminalizations!==0||result.index.counts.row_state_mutations!==0)throw new Error('authority changed');
if(result.index.current_result.class_closed!==false||result.index.current_result.cumulative_ledger_effect!=='none')throw new Error('class/cumulative authority changed');
console.log(`rd04_five_state_source_field_repository_validation=pass manifest_entries=${manifest.entries.length} terminal_cells=218 class_closed=false`);
