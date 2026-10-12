// Optional records-request lifecycle. Run when changing that workflow.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const finalizerRun = spawnSync(process.execPath, ['test/electric-twin-register-request-finalizer.test.js'], {
  encoding: 'utf8',
});
if (finalizerRun.status !== 0) {
  console.error(finalizerRun.stdout);
  console.error(finalizerRun.stderr);
}
assert.equal(finalizerRun.status, 0, 'Electric Twin register-request finalizer test failed');

const pdfRun = spawnSync(process.execPath, ['test/electric-twin-register-request-pdf.test.js'], {
  encoding: 'utf8',
});
if (pdfRun.status !== 0) {
  console.error(pdfRun.stdout);
  console.error(pdfRun.stderr);
}
assert.equal(pdfRun.status, 0, 'Electric Twin register-request PDF custody test failed');

const dispatchRun = spawnSync(process.execPath, ['test/electric-twin-register-request-dispatch.test.js'], {
  encoding: 'utf8',
});
if (dispatchRun.status !== 0) {
  console.error(dispatchRun.stdout);
  console.error(dispatchRun.stderr);
}
assert.equal(dispatchRun.status, 0, 'Electric Twin register-request dispatch custody test failed');

const deliveryRun = spawnSync(process.execPath, ['test/electric-twin-register-request-delivery.test.js'], {
  encoding: 'utf8',
});
if (deliveryRun.status !== 0) {
  console.error(deliveryRun.stdout);
  console.error(deliveryRun.stderr);
}
assert.equal(deliveryRun.status, 0, 'Electric Twin register-request delivery custody test failed');

const responseRun = spawnSync(process.execPath, ['test/electric-twin-register-request-response.test.js'], {
  encoding: 'utf8',
});
if (responseRun.status !== 0) {
  console.error(responseRun.stdout);
  console.error(responseRun.stderr);
}
assert.equal(responseRun.status, 0, 'Electric Twin register-request response custody test failed');

const responseAdjudicationRun = spawnSync(process.execPath, ['test/electric-twin-register-request-response-adjudication.test.js'], {
  encoding: 'utf8',
});
if (responseAdjudicationRun.status !== 0) {
  console.error(responseAdjudicationRun.stdout);
  console.error(responseAdjudicationRun.stderr);
}
assert.equal(responseAdjudicationRun.status, 0,
  'Electric Twin register-request response adjudication test failed');

const responseSecondPartyReviewRun = spawnSync(
  process.execPath,
  ['test/electric-twin-register-request-response-second-party-review.test.js'],
  { encoding: 'utf8' },
);
if (responseSecondPartyReviewRun.status !== 0) {
  console.error(responseSecondPartyReviewRun.stdout);
  console.error(responseSecondPartyReviewRun.stderr);
}
assert.equal(responseSecondPartyReviewRun.status, 0,
  'Electric Twin register-request response second-party review test failed');

console.log('electric-twin-register-request.test: OK');
