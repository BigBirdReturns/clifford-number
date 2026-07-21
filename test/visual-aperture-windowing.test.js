import assert from 'node:assert/strict';
import {
  APERTURE_DEFAULT_OVERVIEW_PAGE_SIZE,
  APERTURE_MAX_ROUTE_WINDOW_STEPS,
  APERTURE_OVERVIEW_PAGE_SIZES,
  paginateApertureRows,
  windowApertureRoute
} from '../src/visual-aperture-windowing.mjs';

assert.deepEqual(APERTURE_OVERVIEW_PAGE_SIZES, [25, 50, 100]);
assert.equal(APERTURE_DEFAULT_OVERVIEW_PAGE_SIZE, 50);
assert.equal(APERTURE_MAX_ROUTE_WINDOW_STEPS, 24);

const rows = Array.from({ length: 237 }, (_, index) => `row-${index + 1}`);
const first = paginateApertureRows(rows);
assert.equal(first.page, 1);
assert.equal(first.pageSize, 50);
assert.equal(first.totalPages, 5);
assert.deepEqual(first.rows, rows.slice(0, 50));
assert.equal(first.rangeStart, 1);
assert.equal(first.rangeEnd, 50);

const middle = paginateApertureRows(rows, { page: 3, pageSize: 100 });
assert.equal(middle.page, 3);
assert.equal(middle.totalPages, 3);
assert.deepEqual(middle.rows, rows.slice(200));
assert.equal(middle.rangeStart, 201);
assert.equal(middle.rangeEnd, 237);

const selected = paginateApertureRows(rows, { page: 1, pageSize: 25, selectedIndex: 126, followSelected: true });
assert.equal(selected.page, 6);
assert.equal(selected.rows[1], 'row-127');
assert.equal(selected.selectedIndex, 126);

const clamped = paginateApertureRows(rows, { page: 999, pageSize: 73 });
assert.equal(clamped.pageSize, 50);
assert.equal(clamped.page, 5);
assert.equal(clamped.rows.length, 37);

const path = {
  hops: Array.from({ length: 1000 }, (_, index) => ({
    from: `actor-${index}`,
    to: `actor-${index + 1}`,
    basis: { surface_id: `surface-${index + 1}` }
  }))
};

const routeFirst = windowApertureRoute(path);
assert.equal(routeFirst.start, 0);
assert.equal(routeFirst.end, 24);
assert.equal(routeFirst.hops.length, 24);
assert.equal(routeFirst.hops[0].originalIndex, 0);
assert.equal(routeFirst.hops.at(-1).originalIndex, 23);
assert.equal(routeFirst.hasPrevious, false);
assert.equal(routeFirst.hasNext, true);

const routeMiddle = windowApertureRoute(path, { start: 240, followSelected: false });
assert.equal(routeMiddle.start, 240);
assert.equal(routeMiddle.end, 264);
assert.equal(routeMiddle.rangeStart, 241);
assert.equal(routeMiddle.rangeEnd, 264);

const followed = windowApertureRoute(path, { selectedStep: 500, followSelected: true });
assert.equal(followed.start, 488);
assert.equal(followed.end, 512);
assert.equal(followed.hops[12].originalIndex, 500);

const routeEnd = windowApertureRoute(path, { start: 999, followSelected: false });
assert.equal(routeEnd.start, 976);
assert.equal(routeEnd.end, 1000);
assert.equal(routeEnd.hasNext, false);
assert.equal(routeEnd.hops.at(-1).originalIndex, 999);

assert.deepEqual(windowApertureRoute(null), {
  start: 0,
  end: 0,
  rangeStart: 0,
  rangeEnd: 0,
  totalSteps: 0,
  maxSteps: 24,
  hops: [],
  hasPrevious: false,
  hasNext: false,
  selectedStep: null
});

console.log('visual-aperture-windowing.test.js: OK');
