#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadInputs,
  validateInputs,
  readProducts,
  validateProducts,
  checkProducts,
} from './build-status-sovereignty-rd-wave03-rd04-field-promotion.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function main() {
  const inputs = loadInputs();
  validateInputs(inputs);
  const products = readProducts();
  validateProducts(products, inputs);
  checkProducts(inputs);
  console.log('rd04_field_promotion_validation=pass');
  console.log('candidate_findings=38');
  console.log('promoted_candidate_findings=32');
  console.log('held_candidate_findings=6');
  console.log('unique_candidate_cells=37');
  console.log('unique_cells_terminalized=31');
  console.log('terminal_cells=131/450');
  console.log('still_open_substantive_fields=269');
  console.log('terminal_units=0');
  console.log('class_closed=false');
  console.log('outside_human_dependency=false');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
