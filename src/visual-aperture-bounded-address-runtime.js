const boundedOriginalApertureSnapshot = apertureSnapshot;
const boundedOriginalApplyApertureSnapshot = applyApertureSnapshot;

apertureSnapshot = function boundedApertureSnapshot() {
  const snapshot = boundedOriginalApertureSnapshot();
  return {
    ...snapshot,
    overview: {
      page: state.overview.page,
      pageSize: state.overview.pageSize
    },
    route: {
      ...snapshot.route,
      windowStart: state.route.windowStart
    }
  };
};

applyApertureSnapshot = function boundedApplyApertureSnapshot(snapshot) {
  const applied = boundedOriginalApplyApertureSnapshot(snapshot);
  if (!applied) return false;
  if (Number.isInteger(snapshot?.overview?.page)) state.overview.page = Math.max(1, snapshot.overview.page);
  if (APERTURE_OVERVIEW_PAGE_SIZES.includes(snapshot?.overview?.pageSize)) state.overview.pageSize = snapshot.overview.pageSize;
  if (Number.isInteger(snapshot?.route?.windowStart)) state.route.windowStart = Math.max(0, snapshot.route.windowStart);
  state.route.windowFollowSelected = false;
  state.overview.preserveNextKey = true;
  state.overview.followSelected = false;
  return true;
};

function applyBoundedAddressStateFromLocation() {
  if (!state.root || !state.address.ready) return;
  const snapshot = readApertureState(location.search);
  if (!snapshot) return;
  if (snapshot.overview) {
    if (Number.isInteger(snapshot.overview.page)) state.overview.page = Math.max(1, snapshot.overview.page);
    if (APERTURE_OVERVIEW_PAGE_SIZES.includes(snapshot.overview.pageSize)) state.overview.pageSize = snapshot.overview.pageSize;
  }
  if (Number.isInteger(snapshot.route?.windowStart)) state.route.windowStart = Math.max(0, snapshot.route.windowStart);
  state.route.windowFollowSelected = false;
  state.overview.preserveNextKey = true;
  renderCurrent();
}

if (state.root?.dataset.apertureMounted === 'true') {
  state.address.ready = true;
  applyBoundedAddressStateFromLocation();
} else {
  const boundedMountObserver = new MutationObserver(() => {
    const root = document.getElementById(ROOT_ID);
    if (root?.dataset.apertureMounted !== 'true' || !state.address.ready) return;
    boundedMountObserver.disconnect();
    applyBoundedAddressStateFromLocation();
  });
  boundedMountObserver.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['data-aperture-mounted'] });
}

window.addEventListener('popstate', () => setTimeout(applyBoundedAddressStateFromLocation, 0));
