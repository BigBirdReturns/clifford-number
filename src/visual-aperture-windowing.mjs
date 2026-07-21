export const APERTURE_OVERVIEW_PAGE_SIZES = Object.freeze([25, 50, 100]);
export const APERTURE_DEFAULT_OVERVIEW_PAGE_SIZE = 50;
export const APERTURE_MAX_ROUTE_WINDOW_STEPS = 24;

function integer(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function allowedPageSize(value) {
  const candidate = integer(value, APERTURE_DEFAULT_OVERVIEW_PAGE_SIZE);
  return APERTURE_OVERVIEW_PAGE_SIZES.includes(candidate)
    ? candidate
    : APERTURE_DEFAULT_OVERVIEW_PAGE_SIZE;
}

export function paginateApertureRows(rows, {
  page = 1,
  pageSize = APERTURE_DEFAULT_OVERVIEW_PAGE_SIZE,
  selectedIndex = null,
  followSelected = false
} = {}) {
  const values = Array.isArray(rows) ? rows : [];
  const normalizedPageSize = allowedPageSize(pageSize);
  const totalRows = values.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / normalizedPageSize));
  let normalizedPage = Math.max(1, Math.min(totalPages, integer(page, 1)));
  const normalizedSelectedIndex = Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < totalRows
    ? selectedIndex
    : null;
  if (followSelected && normalizedSelectedIndex !== null) {
    normalizedPage = Math.floor(normalizedSelectedIndex / normalizedPageSize) + 1;
  }
  const startIndex = totalRows ? (normalizedPage - 1) * normalizedPageSize : 0;
  const endIndex = Math.min(totalRows, startIndex + normalizedPageSize);
  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
    totalRows,
    totalPages,
    startIndex,
    endIndex,
    rangeStart: totalRows ? startIndex + 1 : 0,
    rangeEnd: endIndex,
    rows: values.slice(startIndex, endIndex),
    hasPrevious: normalizedPage > 1,
    hasNext: normalizedPage < totalPages,
    selectedIndex: normalizedSelectedIndex
  };
}

export function windowApertureRoute(path, {
  start = 0,
  selectedStep = null,
  maxSteps = APERTURE_MAX_ROUTE_WINDOW_STEPS,
  followSelected = true
} = {}) {
  const hops = Array.isArray(path?.hops) ? path.hops : [];
  const totalSteps = hops.length;
  const normalizedMax = Math.max(1, Math.min(APERTURE_MAX_ROUTE_WINDOW_STEPS, integer(maxSteps, APERTURE_MAX_ROUTE_WINDOW_STEPS)));
  const maximumStart = Math.max(0, totalSteps - normalizedMax);
  const normalizedSelectedStep = Number.isInteger(selectedStep) && selectedStep >= 0 && selectedStep < totalSteps
    ? selectedStep
    : null;
  let normalizedStart = Math.max(0, Math.min(maximumStart, integer(start, 0)));
  if (followSelected && normalizedSelectedStep !== null) {
    normalizedStart = Math.max(0, Math.min(maximumStart, normalizedSelectedStep - Math.floor(normalizedMax / 2)));
  }
  const end = Math.min(totalSteps, normalizedStart + normalizedMax);
  const visibleHops = hops.slice(normalizedStart, end).map((hop, offset) => ({
    ...hop,
    originalIndex: normalizedStart + offset
  }));
  return {
    start: normalizedStart,
    end,
    rangeStart: totalSteps ? normalizedStart + 1 : 0,
    rangeEnd: end,
    totalSteps,
    maxSteps: normalizedMax,
    hops: visibleHops,
    hasPrevious: normalizedStart > 0,
    hasNext: end < totalSteps,
    selectedStep: normalizedSelectedStep
  };
}
