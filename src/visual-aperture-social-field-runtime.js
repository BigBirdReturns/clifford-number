const APERTURE_FIELD_LEGEND = `
  <span><i class="aperture-key aperture-key--heat"></i> reinforcement heat</span>
  <span><i class="aperture-key aperture-key--actor"></i> actor</span>
  <span><i class="aperture-key aperture-key--surface"></i> bounded surface</span>
  <span><i class="aperture-key aperture-key--activity"></i> dated activity pulse</span>`;

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
    badge.textContent = active ? 'Live evidence field' : 'SVG evidence map';
    badge.dataset.engine = active ? 'webgl' : 'svg';
  }
  if (active) {
    state.webgl?.renderer?.resume?.();
    startEcologyClock();
  } else {
    state.webgl?.renderer?.pause?.();
    stopEcologyClock();
  }
}

function deactivateApertureSocialField() {
  setApertureFieldActive(false);
}
function ecologyClockLabel() {
  return state.webgl?.eventApi?.ecologyPlayheadLabel?.(state.webgl.events, state.ecology.position) || 'Evidence timeline';
}
function syncEcologyClockControls() {
  const input = $('#ap-ecology-time', state.root);
  const output = $('#ap-ecology-date', state.root);
  const button = $('[data-ap-action="ecology-toggle"]', state.root);
  if (input) input.value = String(Math.round(state.ecology.position * 1000));
  if (output) output.textContent = ecologyClockLabel();
  if (button) {
    button.textContent = state.ecology.playing ? 'Pause time' : 'Play time';
    button.setAttribute('aria-pressed', String(state.ecology.playing));
  }
}
function stopEcologyClock() {
  if (state.ecology.frame) cancelAnimationFrame(state.ecology.frame);
  state.ecology.frame = 0;
  state.ecology.lastTimestamp = 0;
}
function ecologyClockFrame(timestamp) {
  state.ecology.frame = 0;
  if (!state.ecology.playing || state.mode !== 'map') return;
  if (state.ecology.lastTimestamp) {
    const delta = Math.min(250, timestamp - state.ecology.lastTimestamp);
    state.ecology.position = (state.ecology.position + delta / state.ecology.cycleMs) % 1;
    state.webgl?.renderer?.setEcologyPosition?.(state.ecology.position);
    syncEcologyClockControls();
  }
  state.ecology.lastTimestamp = timestamp;
  state.ecology.frame = requestAnimationFrame(ecologyClockFrame);
}
function startEcologyClock() {
  if (!state.ecology.playing || state.ecology.frame || state.mode !== 'map') return;
  state.ecology.lastTimestamp = 0;
  state.ecology.frame = requestAnimationFrame(ecologyClockFrame);
}
function setEcologyClockPosition(position, { pause = false } = {}) {
  state.ecology.position = Math.max(0, Math.min(1, Number(position) || 0));
  if (pause) state.ecology.playing = false;
  state.webgl?.renderer?.setEcologyPosition?.(state.ecology.position);
  if (pause) stopEcologyClock(); else startEcologyClock();
  syncEcologyClockControls();
}
function setEcologyPlaying(playing) {
  state.ecology.playing = Boolean(playing);
  if (state.ecology.playing) startEcologyClock(); else stopEcologyClock();
  syncEcologyClockControls();
}
function apertureFieldSurfaceNodeId(surfaceId) {
  return surfaceId ? `surface-${surfaceId}` : null;
}
function apertureFieldNeighbors(model, id) {
  const ids = new Set(id ? [id] : []);
  if (!id) return ids;
  for (const edge of model?.edges ?? []) {
    const from = typeof edge.from === 'object' ? edge.from?.id : edge.from ?? edge.source;
    const to = typeof edge.to === 'object' ? edge.to?.id : edge.to ?? edge.target;
    if (from === id && to) ids.add(typeof to === 'object' ? to.id : to);
    if (to === id && from) ids.add(typeof from === 'object' ? from.id : from);
  }
  return ids;
}
function apertureFieldSurfaceIds(surfaceId) {
  const surfaceNodeId = apertureFieldSurfaceNodeId(surfaceId);
  return apertureFieldNeighbors(state.webgl?.model, surfaceNodeId);
}
function apertureFieldClusterIds(clusterId) {
  const ids = new Set();
  if (!clusterId) return ids;
  for (const surface of state.surfaces.values()) {
    if (clusterForSurface(surface) !== clusterId) continue;
    for (const id of apertureFieldSurfaceIds(surface.surface_id)) ids.add(id);
  }
  return ids;
}
function apertureFieldView() {
  const level = state.map.level;
  const surfaceNodeId = apertureFieldSurfaceNodeId(state.map.selectedSurfaceId);
  const fieldNodeId = state.map.selectedFieldNodeId || state.map.selectedActorId || null;
  let focusIds = new Set();
  let focusNodeId = null;
  if (level === 'machine') {
    if (fieldNodeId) {
      focusIds = apertureFieldNeighbors(state.webgl?.model, fieldNodeId);
      focusNodeId = fieldNodeId;
    } else if (state.map.hasExplicitFocus) {
      focusIds = apertureFieldClusterIds(state.map.selectedClusterId);
    }
  } else if (level === 'surface' || level === 'evidence') {
    focusIds = apertureFieldSurfaceIds(state.map.selectedSurfaceId);
    focusNodeId = level === 'evidence' && fieldNodeId ? fieldNodeId : surfaceNodeId;
  }
  const primaryIds = [surfaceNodeId, fieldNodeId].filter(Boolean);
  return {
    level,
    focusIds: [...focusIds],
    primaryIds,
    focusNodeId,
    fade: level === 'corpus' ? .2 : level === 'machine' ? .065 : .022
  };
}
function bestSurfaceForFieldNode(id) {
  const candidates = [...state.surfaces.values()].filter(surface => actorParticipants(surface).some(participant => participant.actor_id === id));
  return candidates.sort((a, b) => Number(b.hop_eligible) - Number(a.hop_eligible) || actorParticipants(a).length - actorParticipants(b).length || a.surface_label.localeCompare(b.surface_label))[0] ?? null;
}
function selectApertureFieldActor(id) {
  const actor = state.actors.get(id);
  if (!actor) return;
  const surface = bestSurfaceForFieldNode(id);
  state.selectedActorId = id;
  state.map.selectedActorId = id;
  state.map.selectedFieldNodeId = id;
  state.map.hasExplicitFocus = true;
  if (surface) {
    state.map.selectedClusterId = clusterForSurface(surface);
    state.map.selectedTypeId = surface.surface_type;
    state.map.selectedSurfaceId = surface.surface_id;
    state.selectedSurfaceId = surface.surface_id;
  }
  state.map.scale = Math.max(state.map.scale, 1.9);
  state.map.level = semanticLevelForScale(state.map.scale, state.map.level);
  renderModeControls();
  renderMapMode();
  commitApertureAddress('push');
}
function ecologyActivityMarkup(id) {
  const api = state.webgl?.eventApi;
  const model = state.webgl?.events;
  if (!api || !model) return '';
  const events = api.ecologyEventsForNode(model, id)
    .filter(event => event.participant_node_id === id || event.event_kind === 'surface_activity')
    .sort((a, b) => b.end_day - a.end_day || b.start_day - a.start_day || a.id.localeCompare(b.id));
  if (!events.length) return '<h4>Documented activity</h4><p class="aperture-muted">No dated participation event in this release resolves onto the public field for this object.</p>';
  const activeIds = new Set(api.activeEcologyEvents?.(model, state.ecology.position).map(event => event.id) ?? []);
  const visible = events.slice(0, 7);
  return `<h4>Documented activity</h4><p class="aperture-muted">Playhead ${esc(ecologyClockLabel())}. Pulses replay these dated records on existing topology; they create no new edge or direction.</p><ul class="aperture-activity-list">${visible.map(event => `<li${activeIds.has(event.id) ? ' class="is-active"' : ''}><strong>${esc(humanLabel(event.channel))}</strong><span>${esc(event.time_label)} · ${esc(event.surface_label)}</span><small>${esc(event.role)} · ${(event.receipt_ids ?? []).length} receipt${event.receipt_ids?.length === 1 ? '' : 's'}</small></li>`).join('')}</ul>${events.length > visible.length ? `<p class="aperture-muted">+${events.length - visible.length} additional dated records</p>` : ''}`;
}
function inspectApertureFieldNode(id, { select = true } = {}) {
  const renderer = state.webgl?.renderer;
  const node = renderer?.field?.()?.nodes?.find(item => item.id === id);
  if (!node) return false;
  const heat = Math.round((node.heat ?? 0) * 100);
  const actor = state.actors.get(id);
  const canonicalSurfaceId = String(id).startsWith('surface-') ? String(id).slice(8) : null;
  if (canonicalSurfaceId && state.surfaces.has(canonicalSurfaceId)) {
    if (select) {
      state.map.hasExplicitFocus = true;
      selectMapSurface(canonicalSurfaceId);
    }
    return false;
  }
  if (select) {
    state.map.selectedFieldNodeId = id;
    state.map.hasExplicitFocus = true;
    if (actor) selectApertureFieldActor(id);
  }
  const description = actor?.description || node.description || 'Public topology object in the Research projection.';
  const actions = actor ? `<div class="aperture-actions">
    <button type="button" data-ap-action="open-record" data-actor-id="${esc(id)}">Open public record</button>
    ${routeActorIds().includes(id) ? `<button type="button" data-ap-action="route-from-selection" data-actor-id="${esc(id)}">Find route from here</button>` : ''}
  </div>` : '';
  setInspector(node.label, `<p class="aperture-kicker">Selected public object</p><h3>${esc(node.label)}</h3>
    <p>${esc(description)}</p>
    <div class="aperture-metric-grid"><div><strong>${heat}%</strong><span>reinforcement heat</span></div><div><strong>${node.documented_degree ?? 0}</strong><span>documented neighbors</span></div><div><strong>${node.surface_count ?? 0}</strong><span>bounded surfaces</span></div><div><strong>${node.strongest_repeat ?? 0}x</strong><span>strongest repeated co-surface</span></div></div>
    <p class="aperture-muted">Heat changes visual prominence only. It does not create an actor-to-actor edge, a hop, or a causal claim.</p>${ecologyActivityMarkup(id)}${actions}`, { openOnMobile: true });
  return true;
}
async function renderApertureSocialField() {
  if (!state.root || state.mode !== 'map' || state.webgl?.failed) return;
  if (typeof globalThis.loadCliffordSocialField !== 'function') return;
  const host = $('#aperture-webgl', state.root);
  if (!host) return;
  try {
    if (!state.webgl) state.webgl = { renderer: null, model: null, failed: false, rendered: false };
    if (!state.webgl.renderer) {
      const api = await globalThis.loadCliffordSocialField();
      if (!api.supportsWebGlAtlas()) return;
      state.webgl.model = api.buildResearchNetworkModel(state.data.legacyGraph);
      state.webgl.events = api.buildEcologyEventModel(state.data.surfaceGraph, state.webgl.model);
      state.webgl.eventApi = api;
      state.webgl.renderer = await api.createWebGlAtlasRenderer({
        host,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        onNodeSelect: inspectApertureFieldNode,
        onLinkSelect: () => {},
        onInteraction: event => {
          if (event?.type !== 'scale' || state.mode !== 'map') return;
          state.webgl.cameraOwnsScale = true;
          setMapScale(event.scale, { history: 'replace' });
        }
      });
    }
    if (!state.webgl.rendered) {
      state.webgl.renderer.render(state.webgl.model);
      state.webgl.rendered = true;
    }
    if (!state.webgl.ecologyBound && state.webgl.events) {
      state.webgl.renderer.setEcology(state.webgl.events, state.ecology.position);
      state.webgl.ecologyBound = true;
    }
    setApertureFieldActive(true);
    syncEcologyClockControls();
    const view = apertureFieldView();
    state.webgl.renderer.setView(view);
    state.webgl.renderer.select(state.map.selectedFieldNodeId || state.map.selectedActorId || null);
    const focusKey = `${view.level}:${view.focusNodeId || ''}`;
    const focusChanged = focusKey !== state.webgl.lastFocusKey;
    if (state.webgl.cameraOwnsScale) {
      state.webgl.cameraOwnsScale = false;
    } else if (focusChanged && view.level === 'corpus') {
      state.webgl.renderer.home(state.map.scale);
    } else if (focusChanged && view.focusNodeId) {
      state.webgl.renderer.focus(view.focusNodeId, undefined, state.map.scale);
    } else {
      state.webgl.renderer.setScale(state.map.scale, { duration: 0 });
    }
    state.webgl.lastFocusKey = focusKey;
  } catch (error) {
    state.webgl.failed = true;
    setApertureFieldActive(false);
    console.warn('GPU social field unavailable; retaining semantic SVG map.', error);
  }
}
