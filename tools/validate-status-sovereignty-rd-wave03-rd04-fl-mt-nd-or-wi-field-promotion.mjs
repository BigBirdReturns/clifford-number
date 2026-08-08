#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadInputs,
  validateInputs,
  readProducts,
  validateProducts,
  checkProducts,
} from './build-status-sovereignty-rd-wave03-rd04-fl-mt-nd-or-wi-field-promotion.mjs';

function main() {
  const inputs = loadInputs();
  validateInputs(inputs);
  const products = readProducts();
  validateProducts(products, inputs);
  checkProducts(inputs);
  console.log('rd04_five_state_field_promotion_validation=pass');
  console.log('exact_input_files=5');
  console.log('exact_current_cell_validations=4');
  console.log('promotion_candidates=4');
  console.log('matrix_updates=4');
  console.log('field_terminalizations=4');
  console.log('terminal_cells=222/450');
  console.log('still_open_cells=228/450');
  console.log('terminal_substantive_cells=112');
  console.log('still_open_substantive_cells=188');
  console.log('row_state_transitions=0');
  console.log('terminal_units=10');
  console.log('class_closed=false');
  console.log('outside_human_dependency=false');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
