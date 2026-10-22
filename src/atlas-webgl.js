import * as THREE from '../vendor/three-0.186.0.module.js';
import { buildSocialFieldModel, eventInWindow, normalizeEcologyWindow, SOCIAL_FIELD_RADIUS, socialFieldNeighbors, isSurfaceNode } from './social-field.js';

const FORCE_GRAPH_VENDOR = '../vendor/3d-force-graph-1.80.0.min.js';
const LINK_SEGMENTS = 18;
const NODE_SHAPES = Object.freeze({ person: 'sphere', surface: 'octahedron' });
// Arc colour names the evidence class of the documented edge. Pulse colour
// names the role category derived from the recorded role text (a labelled
// derived category, not a score).
export const EVIDENCE_COLORS = Object.freeze({
  official: '#ffd061',
  confirmed: '#ffd061',
  primary_public: '#69b7ff',
  reported: '#b48eff',
  judgment: '#8f94a1',
  derived: '#6a707d',
  context: '#596170'
});
const ECOLOGY_CHANNEL_COLORS = Object.freeze({
  capital: '#ffd061',
  procurement: '#5ad7ff',
  governance: '#cb97ff',
  policy: '#69b7ff',
  forum: '#f3efe6',
  commercial: '#62d3bd',
  context: '#7d8797'
});
// Opacity factors for the time window. Dated objects outside the window fade
// but are never removed; objects with no dated ledger row are held at a
// constant mid value because the window cannot say anything about them.
export const TIME_FACTORS = Object.freeze({ inWindow: 1, outOfWindow: .18, undated: .55, linkOutOfWindow: .1 });
const OPACITY_EPSILON = .002;

let vendorPromise = null;
let haloTexture = null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

export function supportsWebGlAtlas() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
function loadForceGraphVendor() {
  if (window.ForceGraph3D) return Promise.resolve(window.ForceGraph3D);
  if (vendorPromise) return vendorPromise;
  vendorPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL(FORCE_GRAPH_VENDOR, import.meta.url).href;
    script.async = true;
    script.dataset.cliffordAtlasVendor = 'force3d';
    script.addEventListener('load', () => window.ForceGraph3D ? resolve(window.ForceGraph3D) : reject(new Error('ForceGraph3D global was not registered')));
    script.addEventListener('error', () => reject(new Error('Failed to load local 3d-force-graph vendor bundle')));
    document.head.appendChild(script);
  });
  return vendorPromise;
}

function radialHaloTexture() {
  if (haloTexture) return haloTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,.95)');
  gradient.addColorStop(.18, 'rgba(255,255,255,.5)');
  gradient.addColorStop(.52, 'rgba(255,255,255,.12)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  haloTexture = new THREE.CanvasTexture(canvas);
  return haloTexture;
}

function nodeShape(node) {
  if (node.type === 'person') return NODE_SHAPES.person;
  if (isSurfaceNode(node)) return NODE_SHAPES.surface;
  return 'box';
}
function makeCoreGeometry(node, size) {
  const shape = nodeShape(node);
  if (shape === 'sphere') return new THREE.SphereGeometry(size, 12, 9);
  if (shape === 'octahedron') return new THREE.OctahedronGeometry(size * 1.2, 0);
  return new THREE.BoxGeometry(size * 1.65, size * 1.65, size * 1.65);
}

// Node size and halo derive from one documented count (size_count: the number
// of surfaces a person or organization is documented on, or the number of
// documented participants for a surface). The legend names this count.
export function nodeSizeForCount(count) {
  return 2.3 + Math.log2(1 + Math.max(0, Number(count) || 0)) * 1.15;
}
export function haloSizeForCount(count) {
  const safe = Math.max(0, Number(count) || 0);
  return safe > 0 ? 10 + Math.log2(1 + safe) * 8 : 0;
}

function makeNodeObject(node) {
  const group = new THREE.Group();
  const count = node.size_count ?? 0;
  const size = nodeSizeForCount(count);
  const coreMaterial = new THREE.MeshLambertMaterial({
    color: new THREE.Color(node.color || '#b8c0cf'),
    transparent: true,
    opacity: .84
  });
  coreMaterial.userData.baseOpacity = coreMaterial.opacity;
  const core = new THREE.Mesh(makeCoreGeometry(node, size), coreMaterial);
  core.userData.role = 'core';
  group.add(core);

  const haloSize = haloSizeForCount(count);
  if (haloSize > 0) {
    const haloMaterial = new THREE.SpriteMaterial({
      map: radialHaloTexture(),
      color: new THREE.Color(node.color || '#b8c0cf'),
      transparent: true,
      opacity: Math.min(.4, .1 + Math.log2(1 + count) * .07),
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    haloMaterial.userData.baseOpacity = haloMaterial.opacity;
    const halo = new THREE.Sprite(haloMaterial);
    halo.scale.set(haloSize, haloSize, 1);
    halo.userData.role = 'count-halo';
    group.add(halo);
  }
  group.userData.nodeId = node.id;
  return group;
}
function makeLinkObject(link) {
  const group = new THREE.Group();
  const color = EVIDENCE_COLORS[link.evidence_class] ?? EVIDENCE_COLORS.context;
  const opacity = link.topology_only ? .16 + link.evidence_weight * .12 : .14 + link.evidence_weight * .2;
  const positions = new Float32Array(LINK_SEGMENTS * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  material.userData.baseOpacity = opacity;
  const line = new THREE.Line(geometry, material);
  line.userData.role = 'line';
  group.add(line);

  group.userData.positions = positions;
  group.userData.lastEndpoints = null;
  group.userData.linkId = link.id;
  return group;
}

function vectorChanged(previous, start, end) {
  if (!previous) return true;
  return Math.abs(previous[0] - start.x) > .03 || Math.abs(previous[1] - start.y) > .03 || Math.abs(previous[2] - start.z) > .03 ||
    Math.abs(previous[3] - end.x) > .03 || Math.abs(previous[4] - end.y) > .03 || Math.abs(previous[5] - end.z) > .03;
}
function rebuildArc(group, start, end, link) {
  const positions = group.userData.positions;
  const a = new THREE.Vector3(start.x, start.y, start.z);
  const b = new THREE.Vector3(end.x, end.y, end.z);
  const ra = Math.max(1, a.length()), rb = Math.max(1, b.length());
  const ua = a.clone().normalize(), ub = b.clone().normalize();
  const dot = THREE.MathUtils.clamp(ua.dot(ub), -.9995, .9995);
  const theta = Math.acos(dot), sinTheta = Math.sin(theta);
  const lift = link.topology_only ? 8 : 12;
  for (let index = 0; index < LINK_SEGMENTS; index += 1) {
    const t = index / (LINK_SEGMENTS - 1);
    let point;
    if (sinTheta > .02) {
      const wa = Math.sin((1 - t) * theta) / sinTheta;
      const wb = Math.sin(t * theta) / sinTheta;
      point = ua.clone().multiplyScalar(wa).add(ub.clone().multiplyScalar(wb)).normalize();
    } else {
      point = ua.clone().lerp(ub, t).normalize();
    }
    const radial = ra * (1 - t) + rb * t + Math.sin(Math.PI * t) * lift;
    point.multiplyScalar(radial);
    const offset = index * 3;
    positions[offset] = point.x; positions[offset + 1] = point.y; positions[offset + 2] = point.z;
  }
  const line = group.children.find(child => child.userData.role === 'line');
  if (line) line.geometry.attributes.position.needsUpdate = true;
  group.userData.lastEndpoints = [start.x, start.y, start.z, end.x, end.y, end.z];
}

function makeShell(radius) {
  const geometry = new THREE.SphereGeometry(radius * 1.015, 44, 30);
  const material = new THREE.MeshBasicMaterial({ color: 0x55708f, wireframe: true, transparent: true, opacity: .032, depthWrite: false });
  const shell = new THREE.Mesh(geometry, material);
  shell.userData.cliffordShell = true;
  return shell;
}
function endpointId(value) { return typeof value === 'object' && value ? value.id : value; }

// Opacity is written only when it actually changes (beyond OPACITY_EPSILON).
// Changing opacity never needs the material update flag; only flipping the
// transparent flag does, and every field material is created transparent.
function setObjectStrength(object, factor, { selected = false, emphasis = false } = {}) {
  if (!object) return;
  const scale = selected ? 1.42 : 1;
  if (object.scale.x !== scale) object.scale.setScalar(scale);
  object.traverse(child => {
    const materials = child.material ? (Array.isArray(child.material) ? child.material : [child.material]) : [];
    for (const material of materials) {
      if (!material.transparent && factor < 1) {
        material.transparent = true;
        material.needsUpdate = true;
      }
      const base = material.userData.baseOpacity ?? material.opacity ?? 1;
      const next = emphasis ? Math.min(1, Math.max(base, .92) * factor) : Math.max(.012, base * factor);
      if (Math.abs(material.opacity - next) >= OPACITY_EPSILON) material.opacity = next;
    }
  });
}

function countLabel(node) {
  if (node.ontology === 'surface') return `${node.size_count ?? 0} documented participant${node.size_count === 1 ? '' : 's'}`;
  return `${node.size_count ?? 0} documented surface${node.size_count === 1 ? '' : 's'}`;
}
function tooltipForNode(node) {
  const kind = node.ontology === 'surface' ? 'bounded surface' : node.ontology === 'person' ? 'actor' : 'organization';
  const dated = node.size_count ? '' : ' · research context · no ledger rows';
  return `<div class="atlas-3d-tooltip"><strong>${escapeHtml(node.label)}</strong><br><span>${escapeHtml(kind)} · ${escapeHtml(countLabel(node))}${dated}</span></div>`;
}

function tooltipForLink(link) {
  const evidence = escapeHtml(link.evidence_class || 'context');
  const row = link.rows?.[0];
  if (link.topology_only && row) {
    return `<div class="atlas-3d-tooltip"><strong>${escapeHtml(row.role)}</strong><br><span>${escapeHtml(row.time_label)} · ${evidence}</span><br><small>participation row on ${escapeHtml(row.surface_label)} · select to read receipts</small></div>`;
  }
  const claim = link.claim ? `<br><span>${escapeHtml(link.claim)}</span>` : '';
  return `<div class="atlas-3d-tooltip"><strong>${evidence}</strong>${claim}<br><small>${link.topology_only ? 'documented topology' : 'research context · undated · not a hop'} · select to read the claim</small></div>`;
}

// Scratch vectors for the per-frame arc-point math: no allocation per pulse.
const scratchA = new THREE.Vector3();
const scratchB = new THREE.Vector3();
const scratchUa = new THREE.Vector3();
const scratchUb = new THREE.Vector3();

export async function createWebGlAtlasRenderer({ host, onNodeSelect, onLinkSelect, onInteraction, reducedMotion = false } = {}) {
  if (!host || !supportsWebGlAtlas()) throw new Error('WebGL atlas is unavailable');
  const ForceGraph3D = await loadForceGraphVendor();
  let field = null, selectedId = null, selectedLinkId = null;
  let semanticView = { level: 'corpus', focusIds: new Set(), primaryIds: new Set(), fade: .08 };
  let timeView = { unbounded: true, window: null, datedNodeIds: new Set(), inWindowNodeIds: new Set(), inWindowLinkKeys: new Set() };
  let programmaticCameraUntil = 0;
  let lastCameraDistance = null;
  let ecologyModel = null;
  let animationRunning = true;
  const ecologyPulses = [];
  const graph = new ForceGraph3D(host, {
    controlType: 'orbit',
    rendererConfig: { antialias: true, alpha: true, powerPreference: 'high-performance' }
  });
  // The social-field projection already owns deterministic spherical positions.
  // Disable the library's layout tick: the adapter uses it as a GPU renderer,
  // camera/picking surface, and animation host rather than as a fact-producing layout engine.
  graph
    .backgroundColor('rgba(0,0,0,0)')
    .showNavInfo(false)
    .nodeLabel(tooltipForNode)
    .nodeThreeObject(node => makeNodeObject(node))
    .linkLabel(tooltipForLink)
    .linkThreeObject(link => makeLinkObject(link))
    .linkPositionUpdate((object, { start, end }, link) => {
      if (vectorChanged(object.userData.lastEndpoints, start, end)) rebuildArc(object, start, end, link);
      return true;
    })
    .warmupTicks(0)
    .cooldownTicks(0);
  if (typeof graph.enableNodeDrag === 'function') graph.enableNodeDrag(false);

  graph.renderer().setPixelRatio(Math.min(1.7, window.devicePixelRatio || 1));
  const controls = graph.controls();
  controls.enableDamping = true;
  controls.dampingFactor = .07;
  controls.rotateSpeed = .55;
  controls.zoomSpeed = .72;
  controls.panSpeed = .45;
  controls.minDistance = SOCIAL_FIELD_RADIUS * 1.15;
  controls.maxDistance = SOCIAL_FIELD_RADIUS * 7;

  const shell = makeShell(SOCIAL_FIELD_RADIUS);
  const ecologyLayer = new THREE.Group();
  const ecologyPulseGeometry = new THREE.SphereGeometry(1.55, 8, 6);
  const ecologySurfaceGeometry = new THREE.SphereGeometry(3.2, 10, 8);
  ecologyLayer.userData.cliffordEcology = true;
  graph.scene().add(shell);
  graph.scene().add(ecologyLayer);

  function semanticNodeFactor(id) {
    const focus = semanticView.focusIds;
    if (!focus?.size) return 1;
    return focus.has(id) ? 1 : semanticView.fade;
  }
  function semanticLinkFactor(link) {
    const focus = semanticView.focusIds;
    if (!focus?.size) return semanticView.level === 'corpus' ? .78 : 1;
    const source = endpointId(link.source), target = endpointId(link.target);
    return focus.has(source) && focus.has(target) ? 1 : Math.max(.012, semanticView.fade * .45);
  }
  // Time factors: only objects that carry a dated ledger row are sliced by the
  // window. Research-context arcs and legacy-only nodes carry no date, so the
  // window never claims anything about them.
  function timeNodeFactor(id) {
    if (timeView.unbounded) return 1;
    if (!timeView.datedNodeIds.has(id)) return TIME_FACTORS.undated;
    return timeView.inWindowNodeIds.has(id) ? TIME_FACTORS.inWindow : TIME_FACTORS.outOfWindow;
  }
  function timeLinkFactor(link) {
    if (timeView.unbounded || !link.rows?.length) return 1;
    return timeView.inWindowLinkKeys.has(link.link_key) ? TIME_FACTORS.inWindow : TIME_FACTORS.linkOutOfWindow;
  }
  function applyHighlight(id) {
    if (!field) return;
    const activeNodes = id ? socialFieldNeighbors(field, id) : null;
    const selectedLink = selectedLinkId ? field.linkById.get(selectedLinkId) : null;
    const linkEndpoints = selectedLink ? [endpointId(selectedLink.source), endpointId(selectedLink.target)] : null;
    for (const node of field.nodes) {
      const hoverFactor = !activeNodes || activeNodes.has(node.id) ? 1 : .08;
      const selected = node.id === id || semanticView.primaryIds?.has(node.id) || (linkEndpoints?.includes(node.id) ?? false);
      setObjectStrength(node.__threeObj, semanticNodeFactor(node.id) * hoverFactor * timeNodeFactor(node.id), { selected });
    }
    for (const link of field.links) {
      const source = endpointId(link.source), target = endpointId(link.target);
      const hoverFactor = !id || source === id || target === id ? 1 : .06;
      const emphasis = link.id === selectedLinkId;
      setObjectStrength(link.__threeObj, emphasis ? 1 : semanticLinkFactor(link) * hoverFactor * timeLinkFactor(link), { emphasis });
    }
  }
  function clearEcologyLayer() {
    for (const pulse of ecologyPulses) pulse.material?.dispose?.();
    ecologyPulses.length = 0;
    ecologyLayer.clear();
  }
  // Pulses resolve their nodes once, here, from the field's hoisted nodeById map.
  // The per-frame loop then touches only the precomputed references.
  function buildEcologyPulses(model) {
    clearEcologyLayer();
    ecologyModel = model || null;
    if (!field) return;
    for (const event of ecologyModel?.events ?? []) {
      const participant = event.participant_node_id ? field.nodeById.get(event.participant_node_id) ?? null : null;
      const surface = event.surface_node_id ? field.nodeById.get(event.surface_node_id) ?? null : null;
      const dense = event.event_kind === 'surface_activity';
      if (!surface || (!dense && !participant)) continue;
      const color = ECOLOGY_CHANNEL_COLORS[event.channel] ?? ECOLOGY_CHANNEL_COLORS.context;
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      material.userData.baseOpacity = .92;
      const pulse = new THREE.Mesh(dense ? ecologySurfaceGeometry : ecologyPulseGeometry, material);
      pulse.visible = false;
      pulse.userData.event = event;
      pulse.userData.participant = participant;
      pulse.userData.surface = surface;
      pulse.userData.dense = dense;
      pulse.userData.lift = 12 + Math.min(22, (event.weight ?? 1) * 18);
      pulse.userData.denseScale = 1 + Math.min(2.4, Math.log2(Math.max(1, event.aggregate_count || 1)) * .22);
      ecologyPulses.push(pulse);
      ecologyLayer.add(pulse);
    }
  }
  function ecologyFocusFactor(event) {
    const focus = semanticView.focusIds;
    if (!focus?.size) return 1;
    if (event.participant_node_id && focus.has(event.participant_node_id)) return 1;
    if (event.surface_node_id && focus.has(event.surface_node_id)) return 1;
    return .035;
  }
  // A pulse is drawn only for a row inside the current window; in the all-time
  // state no window is set and no pulse is drawn. Pulses are static beads on the
  // documented arc (no flicker, no wave), so this runs on demand, not per frame.
  function updateEcologyPulses() {
    if (!ecologyModel || !field) return;
    const window = timeView.window;
    for (let index = 0; index < ecologyPulses.length; index += 1) {
      const pulse = ecologyPulses[index];
      const event = pulse.userData.event;
      const intensity = eventInWindow(event, window) ? (event.weight ?? 1) * ecologyFocusFactor(event) : 0;
      const visible = intensity > .025;
      if (pulse.visible !== visible) pulse.visible = visible;
      if (!visible) continue;
      const opacity = Math.min(.96, Math.max(.04, intensity));
      if (Math.abs(pulse.material.opacity - opacity) >= OPACITY_EPSILON) pulse.material.opacity = opacity;
      const surface = pulse.userData.surface;
      if (pulse.userData.dense) {
        pulse.position.set(surface.x, surface.y, surface.z);
        pulse.scale.setScalar(1 + (pulse.userData.denseScale - 1) * intensity);
        continue;
      }
      writeFieldArcPoint(pulse.userData.participant, surface, .5, pulse.userData.lift, pulse.position);
      pulse.scale.setScalar(.8 + intensity * 1.35);
    }
  }
  function setEcology(model) {
    buildEcologyPulses(model);
    updateEcologyPulses();
  }
  function setTimeWindow(view = {}) {
    const window = view.window && typeof view.window === 'object' && 'unbounded' in view.window
      ? view.window
      : normalizeEcologyWindow(view.range ?? ecologyModel?.range, view.window ?? view);
    timeView = {
      unbounded: window.unbounded,
      window,
      datedNodeIds: view.datedNodeIds instanceof Set ? view.datedNodeIds : new Set(view.datedNodeIds || []),
      inWindowNodeIds: view.inWindowNodeIds instanceof Set ? view.inWindowNodeIds : new Set(view.inWindowNodeIds || []),
      inWindowLinkKeys: view.inWindowLinkKeys instanceof Set ? view.inWindowLinkKeys : new Set(view.inWindowLinkKeys || [])
    };
    applyHighlight(selectedId);
    updateEcologyPulses();
  }
  function cameraDistance() {
    const camera = graph.camera(), target = controls.target;
    return Math.hypot(camera.position.x - target.x, camera.position.y - target.y, camera.position.z - target.z);
  }
  function distanceForScale(value) {
    const scale = Math.max(1, Math.min(5.4, Number(value) || 1));
    const far = SOCIAL_FIELD_RADIUS * 3.55, near = SOCIAL_FIELD_RADIUS * 1.24;
    const t = (scale - 1) / 4.4;
    return far + (near - far) * t;
  }
  function scaleForDistance(distance) {
    const far = SOCIAL_FIELD_RADIUS * 3.55, near = SOCIAL_FIELD_RADIUS * 1.24;
    const t = Math.max(0, Math.min(1, (far - distance) / Math.max(1, far - near)));
    return 1 + t * 4.4;
  }
  function setScale(value, { duration = reducedMotion ? 0 : 180 } = {}) {
    const target = controls.target, camera = graph.camera();
    const dx = camera.position.x - target.x, dy = camera.position.y - target.y, dz = camera.position.z - target.z;
    const length = Math.hypot(dx, dy, dz) || 1;
    const distance = distanceForScale(value);
    const next = { x: target.x + dx / length * distance, y: target.y + dy / length * distance, z: target.z + dz / length * distance };
    programmaticCameraUntil = performance.now() + duration + 80;
    lastCameraDistance = distance;
    graph.cameraPosition(next, { x: target.x, y: target.y, z: target.z }, duration);
  }
  function focus(nodeId, duration = reducedMotion ? 0 : 520, scale = null) {
    const node = field?.nodeById.get(nodeId);
    if (!node || !Number.isFinite(node.x) || !Number.isFinite(node.y) || !Number.isFinite(node.z)) return;
    const currentScale = scaleForDistance(cameraDistance());
    const targetScale = scale == null ? Math.max(currentScale, 1.9) : scale;
    const distance = distanceForScale(targetScale);
    const length = Math.hypot(node.x, node.y, node.z) || 1;
    const position = { x: node.x + node.x / length * distance, y: node.y + node.y / length * distance, z: node.z + node.z / length * distance };
    programmaticCameraUntil = performance.now() + duration + 80;
    lastCameraDistance = distance;
    graph.cameraPosition(position, { x: node.x, y: node.y, z: node.z }, duration);
  }

  graph.onNodeHover(node => {
    host.style.cursor = node ? 'pointer' : 'grab';
    applyHighlight(node?.id || selectedId);
  });
  graph.onNodeClick(node => {
    selectedId = node.id;
    selectedLinkId = null;
    applyHighlight(selectedId);
    focus(selectedId);
    onInteraction?.('select');
    onNodeSelect?.(selectedId);
  });
  // A click on an arc hands the whole field link (graph edge fields plus its
  // ledger rows) to the runtime, which opens the participation row or the claim.
  graph.onLinkClick(link => {
    selectedLinkId = link.id;
    applyHighlight(selectedId);
    onInteraction?.('select');
    onLinkSelect?.(link);
  });
  graph.onBackgroundClick(() => applyHighlight(selectedId));
  controls.addEventListener('change', () => {
    const distance = cameraDistance();
    const distanceChanged = lastCameraDistance == null || Math.abs(distance - lastCameraDistance) > .35;
    lastCameraDistance = distance;
    if (distanceChanged && performance.now() > programmaticCameraUntil) onInteraction?.({ type: 'scale', scale: scaleForDistance(distance) });
    else onInteraction?.({ type: 'orbit' });
  });

  function resize() {
    const width = Math.max(320, Math.floor(host.clientWidth || 900));
    const height = Math.max(420, Math.floor(host.clientHeight || 650));
    graph.width(width).height(height);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();
  let lastMode = null;
  function render(model, { selectedNodeId = null, ledger = null } = {}) {
    field = buildSocialFieldModel(model, { ledger });
    field.linkById = new Map(field.links.map(link => [link.id, link]));
    graph.graphData({ nodes: field.nodes, links: field.links });
    selectedId = selectedNodeId && field.nodeById.has(selectedNodeId) ? selectedNodeId : null;
    selectedLinkId = null;
    requestAnimationFrame(() => applyHighlight(selectedId));
    if (lastMode !== model.mode) {
      const initialPlacement = lastMode === null;
      lastMode = model.mode;
      const duration = initialPlacement || reducedMotion ? 0 : 520;
      programmaticCameraUntil = performance.now() + duration + 80;
      lastCameraDistance = field.radius * 3.55;
      graph.cameraPosition(
        { x: 0, y: 0, z: field.radius * 3.55 },
        { x: 0, y: 0, z: 0 },
        duration
      );
    }
    host.dataset.atlasEngine = 'force3d';
    return field;
  }


  function setView(view = {}) {
    semanticView = {
      level: view.level || 'corpus',
      focusIds: new Set(view.focusIds || []),
      primaryIds: new Set(view.primaryIds || []),
      fade: Number.isFinite(view.fade) ? Math.max(.012, Math.min(1, view.fade)) : (view.level === 'corpus' ? .2 : view.level === 'machine' ? .065 : .025)
    };
    applyHighlight(selectedId);
    updateEcologyPulses();
  }
  function home(scale = 1, duration = reducedMotion ? 0 : 420) {
    const distance = distanceForScale(scale);
    programmaticCameraUntil = performance.now() + duration + 80;
    lastCameraDistance = distance;
    graph.cameraPosition({ x: 0, y: 0, z: distance }, { x: 0, y: 0, z: 0 }, duration);
  }

  function select(nodeId) {
    selectedId = nodeId && field?.nodeById.has(nodeId) ? nodeId : null;
    if (nodeId) selectedLinkId = null;
    applyHighlight(selectedId);
  }
  function selectLink(linkId) {
    selectedLinkId = linkId && field?.linkById.has(linkId) ? linkId : null;
    applyHighlight(selectedId);
    return selectedLinkId ? field.linkById.get(selectedLinkId) : null;
  }
  function linkById(linkId) {
    return field?.linkById.get(linkId) ?? null;
  }

  function zoom(action) {
    if (action === 'reset') {
      graph.cameraPosition({ x: 0, y: 0, z: SOCIAL_FIELD_RADIUS * 3.55 }, { x: 0, y: 0, z: 0 }, reducedMotion ? 0 : 420);
      return;
    }
    const camera = graph.cameraPosition();
    const factor = action === 'in' ? .78 : 1.28;
    graph.cameraPosition({ x: camera.x * factor, y: camera.y * factor, z: camera.z * factor }, undefined, reducedMotion ? 0 : 240);
  }
  // pause/resume stop and restart the library's render loop (the only
  // continuous loop the field runs). The runtime calls them when the stage is
  // off-screen, the document is hidden, or the mode leaves the field.
  function pause() {
    if (!animationRunning) return;
    animationRunning = false;
    graph.pauseAnimation();
  }
  function resume() {
    if (animationRunning) return;
    animationRunning = true;
    graph.resumeAnimation();
  }
  function destroy() {
    resizeObserver.disconnect();
    clearEcologyLayer();
    ecologyPulseGeometry.dispose();
    ecologySurfaceGeometry.dispose();
    graph.pauseAnimation();
    animationRunning = false;
    graph.scene().remove(ecologyLayer);
    graph.scene().remove(shell);
    host.replaceChildren();
    delete host.dataset.atlasEngine;
  }

  return {
    engine: 'force3d',
    render,
    select,
    selectLink,
    linkById,
    focus,
    setView,
    setTimeWindow,
    setScale,
    setEcology,
    home,
    zoom,
    resize,
    pause,
    resume,
    destroy,
    isRunning: () => animationRunning,
    field: () => field,
    ecology: () => ecologyModel,
    timeView: () => timeView,
    graph: () => graph
  };
}

// Writes the point at parameter t along the lifted great-circle arc between
// two field nodes into `out`, using module scratch vectors (zero allocations).
export function writeFieldArcPoint(start, end, t, lift, out) {
  scratchA.set(start.x, start.y, start.z);
  scratchB.set(end.x, end.y, end.z);
  const ra = Math.max(1, scratchA.length()), rb = Math.max(1, scratchB.length());
  scratchUa.copy(scratchA).normalize();
  scratchUb.copy(scratchB).normalize();
  const dot = THREE.MathUtils.clamp(scratchUa.dot(scratchUb), -.9995, .9995);
  const theta = Math.acos(dot), sinTheta = Math.sin(theta);
  if (sinTheta > .02) {
    const wa = Math.sin((1 - t) * theta) / sinTheta;
    const wb = Math.sin(t * theta) / sinTheta;
    out.copy(scratchUa).multiplyScalar(wa).addScaledVector(scratchUb, wb).normalize();
  } else out.copy(scratchUa).lerp(scratchUb, t).normalize();
  const radial = ra * (1 - t) + rb * t + Math.sin(Math.PI * t) * lift;
  return out.multiplyScalar(radial);
}
