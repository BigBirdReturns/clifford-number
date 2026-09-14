const APERTURE_FIELD_LEGEND = `
  <span><i class="aperture-key aperture-key--heat"></i> reinforcement heat</span>
  <span><i class="aperture-key aperture-key--actor"></i> actor</span>
  <span><i class="aperture-key aperture-key--surface"></i> bounded surface</span>
  <span><i class="aperture-key aperture-key--activity"></i> sourced activity</span>`;

function setApertureFieldActive(active) {
  const host = $('#aperture-webgl', state.root);
  const svg = $('#aperture-stage', state.root);
  const legend = $('#aperture-stage-legend', state.root);
  const badge = $('#aperture-renderer-badge', state.root);
  if (!host || !svg) return;
  if (legend && !legend.dataset.defaultMarkup) legend.dataset.defaultMarkup = legend.innerHTML;
  host.hidden = !active;
  host.classList.toggle('is-active', active);
  host.style.display = active ? 'block' : 'none';
  svg.hidden = active;
  svg.style.display = active ? 'none' : 'block';
  if (legend) legend.innerHTML = active ? APERTURE_FIELD_LEGEND : legend.dataset.defaultMarkup;
  if (badge) {
    badge.textContent = active ? 'GPU social field' : 'SVG semantic map';
    badge.dataset.engine = active ? 'webgl' : 'svg';
  }
  if (active) state.webgl?.renderer?.resume?.();
  else state.webgl?.renderer?.pause?.();
}

function deactivateApertureSocialField() {
  setApertureFieldActive(false);
}
function inspectApertureFieldNode(id) {
  const renderer = state.webgl?.renderer;
  const node = renderer?.field?.()?.nodes?.find(item => item.id === id);
  if (!node) return;
  const heat = Math.round((node.heat ?? 0) * 100);
  const actor = state.actors.get(id);
  const canonicalSurfaceId = String(id).startsWith('surface-') ? String(id).slice(8) : null;
  if (canonicalSurfaceId && state.surfaces.has(canonicalSurfaceId)) {
    selectMapSurface(canonicalSurfaceId);
    return;
  }
  state.selectedActorId = actor ? id : state.selectedActorId;
  const description = actor?.description || node.description || 'Public topology object in the Research projection.';
  const actions = actor ? `<div class="aperture-actions">
    <button type="button" data-ap-action="open-record" data-actor-id="${esc(id)}">Open public record</button>
    ${routeActorIds().includes(id) ? `<button type="button" data-ap-action="route-from-selection" data-actor-id="${esc(id)}">Route from actor</button>` : ''}
  </div>` : '';
  setInspector(node.label, `<p class="aperture-kicker">Social-field object</p><h3>${esc(node.label)}</h3>
    <p>${esc(description)}</p>
    <div class="aperture-metric-grid"><div><strong>${heat}%</strong><span>reinforcement heat</span></div><div><strong>${node.documented_degree ?? 0}</strong><span>documented neighbors</span></div><div><strong>${node.surface_count ?? 0}</strong><span>bounded surfaces</span></div><div><strong>${node.strongest_repeat ?? 0}×</strong><span>strongest repeated co-surface</span></div></div>
    <p class="aperture-muted">Heat changes visual prominence only. It does not create an actor-to-actor edge, a hop, or a causal claim.</p>${actions}`, { openOnMobile: true });
}
async function renderApertureSocialField() {
  if (!state.root || state.mode !== 'map' || state.map.level !== 'corpus' || state.webgl?.failed) return;
  if (typeof globalThis.loadCliffordSocialField !== 'function') return;
  const host = $('#aperture-webgl', state.root);
  if (!host) return;
  try {
    if (!state.webgl) state.webgl = { renderer: null, model: null, failed: false, rendered: false };
    if (!state.webgl.renderer) {
      const api = await globalThis.loadCliffordSocialField();
      if (!api.supportsWebGlAtlas()) return;
      state.webgl.model = api.buildResearchNetworkModel(state.data.legacyGraph);
      state.webgl.renderer = await api.createWebGlAtlasRenderer({
        host,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        onNodeSelect: inspectApertureFieldNode,
        onLinkSelect: () => {},
        onInteraction: () => {}
      });
    }
    if (!state.webgl.rendered) {
      state.webgl.renderer.render(state.webgl.model);
      state.webgl.rendered = true;
    }
    setApertureFieldActive(true);
  } catch (error) {
    state.webgl.failed = true;
    setApertureFieldActive(false);
    console.warn('GPU social field unavailable; retaining semantic SVG map.', error);
  }
}
