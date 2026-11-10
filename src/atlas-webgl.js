import * as THREE from '../vendor/three-0.186.0.module.js';
import { applyFieldHeat, buildSocialFieldModel, eventInWindow, heatTimeForWindow, nodeCountLabel, nodeHeatLabel, normalizeEcologyWindow, ONTOLOGY_COLORS, SOCIAL_FIELD_RADIUS, socialFieldNeighbors, isSurfaceNode } from './social-field.js';
// The field runtime reads the whole social-field model API (ledger index,
// window helpers, day formatting) through the renderer module, so the loader
// in visual-aperture.js needs no edit when this API grows. The two modules
// share no export name.
export * from './social-field.js';

const FORCE_GRAPH_VENDOR = '../vendor/3d-force-graph-1.80.0.min.js';
const LINK_SEGMENTS = 18;
// Radial lift of an arc above the sphere at its midpoint. A pulse bead rides a
// topology arc, so it uses the same constant and sits on the line it claims.
const ARC_LIFT = Object.freeze({ topology: 8, research: 12 });
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

function nodeShape(node) {
  if (node.type === 'person') return NODE_SHAPES.person;
  if (isSurfaceNode(node)) return NODE_SHAPES.surface;
  return 'box';
}
function spriteShapeKind(node) {
  const shape = nodeShape(node);
  return shape === 'sphere' ? 0 : shape === 'octahedron' ? 2 : 1;
}
// World units to device pixels at depth 1 for a sprite shader, which divides by depth.
function perspectiveSpriteScale(host, graph) {
  const camera = graph.camera();
  return ((host.clientHeight / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov || 75) / 2)) * graph.renderer().getPixelRatio();
}
const spriteColor = new THREE.Color();
// One Points draw for every node of a field. style() writes a slot's
// accumulation channels (size, glow, colour from the printed heat); strength()
// writes the view factor (semantic focus, time window, hover) and the selected
// scale that setObjectStrength used to write per object.
function createSpriteStore(scene) {
  return {
    geometry: null, points: null, glows: null, slots: new Map(), baseCore: null, baseGlow: null,
    slotOf(id) { return this.slots.get(id) ?? -1; },
    allocate(nodes, scale) {
      this.dispose();
      const count = nodes.length;
      this.slots = new Map();
      nodes.forEach((node, index) => this.slots.set(node.id, index));
      this.baseCore = new Float32Array(count);
      this.baseGlow = new Float32Array(count);
      const geometry = new THREE.BufferGeometry();
      const attribute = (size, dynamic) => {
        const buffer = new THREE.BufferAttribute(new Float32Array(count * size), size);
        if (dynamic) buffer.setUsage(THREE.DynamicDrawUsage);
        return buffer;
      };
      geometry.setAttribute('position', attribute(3));
      geometry.setAttribute('nodeColor', attribute(3, true));
      geometry.setAttribute('coreSize', attribute(1, true));
      geometry.setAttribute('haloSize', attribute(1, true));
      geometry.setAttribute('haloAlpha', attribute(1, true));
      geometry.setAttribute('nodeAlpha', attribute(1, true));
      geometry.setAttribute('shapeKind', attribute(1));
      geometry.setAttribute('nodeStyle', attribute(1));
      nodes.forEach((node, index) => {
        geometry.attributes.position.setXYZ(index, node.x || 0, node.y || 0, node.z || 0);
        geometry.attributes.shapeKind.setX(index, spriteShapeKind(node));
        geometry.attributes.nodeAlpha.setX(index, .86);
      });
      this.geometry = geometry;
      // Cores blend normally (thousands of additive discs on a sphere sum to
      // white); glows add. The library's hover raycast must find the pick
      // proxies, not these clouds.
      this.points = new THREE.Points(geometry, galaxyNodeMaterial(scale, 1));
      this.glows = new THREE.Points(geometry, galaxyNodeMaterial(scale, 2));
      for (const [object, order] of [[this.glows, -1], [this.points, 0]]) {
        object.frustumCulled = false;
        object.renderOrder = order;
        object.raycast = () => {};
        scene.add(object);
      }
    },
    style(slot, node, values) {
      if (slot < 0 || !this.geometry) return;
      const { nodeColor, coreSize, haloSize, haloAlpha } = this.geometry.attributes;
      this.baseCore[slot] = values.core;
      this.baseGlow[slot] = values.haloOpacity;
      spriteColor.set(node.color || '#b8c0cf');
      nodeColor.setXYZ(slot, spriteColor.r, spriteColor.g, spriteColor.b);
      coreSize.setX(slot, values.core);
      haloSize.setX(slot, values.halo > 0 ? values.halo : values.core * 2.2);
      haloAlpha.setX(slot, values.haloOpacity);
      nodeColor.needsUpdate = coreSize.needsUpdate = haloSize.needsUpdate = haloAlpha.needsUpdate = true;
    },
    strength(slot, factor, selected) {
      if (slot < 0 || !this.geometry) return;
      const { coreSize, haloAlpha, nodeAlpha } = this.geometry.attributes;
      coreSize.setX(slot, this.baseCore[slot] * (selected ? 1.42 : 1));
      haloAlpha.setX(slot, this.baseGlow[slot] * factor);
      nodeAlpha.setX(slot, Math.max(.012, .86 * factor));
      coreSize.needsUpdate = haloAlpha.needsUpdate = nodeAlpha.needsUpdate = true;
    },
    setScale(scale) {
      for (const object of [this.points, this.glows]) if (object) object.material.uniforms.scale.value = scale;
    },
    setZoom(value) {
      for (const object of [this.points, this.glows]) if (object) object.material.uniforms.zoomScale.value = value;
    },
    dispose() {
      if (!this.points) return;
      for (const object of [this.points, this.glows]) {
        scene.remove(object);
        object.material.dispose();
      }
      this.geometry.dispose();
      this.points = this.glows = this.geometry = null;
    }
  };
}
// One LineSegments draw for every arc of a field: LINK_SEGMENTS points per
// slot, written by rebuildArc. With additive blending the colour level stands
// in for opacity, so strength() writes colour × level into the slot's vertices.
const ARC_VERTICES = (LINK_SEGMENTS - 1) * 2;
function createArcStore(scene) {
  return {
    geometry: null, lines: null, slots: new Map(), base: null, level: null, rgb: null, samples: null,
    slotOf(id) { return this.slots.get(id) ?? -1; },
    allocate(links) {
      this.dispose();
      const count = links.length;
      this.slots = new Map();
      links.forEach((link, index) => this.slots.set(link.id, index));
      this.base = new Float32Array(count);
      this.level = new Float32Array(count);
      this.rgb = new Float32Array(count * 3);
      this.samples = new Float32Array(count * LINK_SEGMENTS * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * ARC_VERTICES * 3), 3).setUsage(THREE.DynamicDrawUsage));
      geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * ARC_VERTICES * 3), 3).setUsage(THREE.DynamicDrawUsage));
      this.geometry = geometry;
      links.forEach((link, index) => {
        spriteColor.set(EVIDENCE_COLORS[link.evidence_class] ?? EVIDENCE_COLORS.context);
        this.rgb[index * 3] = spriteColor.r; this.rgb[index * 3 + 1] = spriteColor.g; this.rgb[index * 3 + 2] = spriteColor.b;
        this.base[index] = link.topology_only ? .16 + link.evidence_weight * .12 : .14 + link.evidence_weight * .2;
        this.paint(index, this.base[index]);
      });
      geometry.attributes.color.needsUpdate = true;
      this.lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }));
      this.lines.frustumCulled = false;
      this.lines.renderOrder = -2;
      this.lines.raycast = () => {};
      scene.add(this.lines);
    },
    // points: LINK_SEGMENTS * 3 floats along the arc, start to end.
    write(slot, points) {
      if (slot < 0 || !this.geometry) return;
      this.samples.set(points, slot * LINK_SEGMENTS * 3);
      const position = this.geometry.attributes.position.array;
      let offset = slot * ARC_VERTICES * 3;
      for (let index = 0; index < LINK_SEGMENTS - 1; index += 1) {
        const a = index * 3, b = a + 3;
        position[offset] = points[a]; position[offset + 1] = points[a + 1]; position[offset + 2] = points[a + 2];
        position[offset + 3] = points[b]; position[offset + 4] = points[b + 1]; position[offset + 5] = points[b + 2];
        offset += 6;
      }
    },
    paint(slot, level) {
      this.level[slot] = level;
      const color = this.geometry.attributes.color.array;
      const r = this.rgb[slot * 3] * level, g = this.rgb[slot * 3 + 1] * level, b = this.rgb[slot * 3 + 2] * level;
      let offset = slot * ARC_VERTICES * 3;
      for (let index = 0; index < ARC_VERTICES; index += 1) { color[offset] = r; color[offset + 1] = g; color[offset + 2] = b; offset += 3; }
    },
    strength(slot, factor, emphasis) {
      if (slot < 0 || !this.geometry) return;
      const base = this.base[slot];
      const level = emphasis ? Math.min(1, Math.max(base, .92) * factor) : Math.max(.012, base * factor);
      if (Math.abs(this.level[slot] - level) < OPACITY_EPSILON) return;
      this.paint(slot, level);
      this.geometry.attributes.color.needsUpdate = true;
    },
    sample(slot, pointIndex, out) {
      const offset = (slot * LINK_SEGMENTS + pointIndex) * 3;
      return out.set(this.samples[offset], this.samples[offset + 1], this.samples[offset + 2]);
    },
    dispose() {
      if (!this.lines) return;
      scene.remove(this.lines);
      this.lines.geometry.dispose();
      this.lines.material.dispose();
      this.lines = this.geometry = null;
    }
  };
}

// Node size and halo. With a ledger they come from the node's printed
// accumulation (heat_value: heat for a surface, residue for a person or an
// organization; social-field.js HEAT_FORMULA). Without a ledger they fall back
// to the one documented count (size_count) the tooltip names. No degree or
// other hidden composite enters either.
export function nodeSizeForCount(count) {
  return 2.3 + Math.log2(1 + Math.max(0, Number(count) || 0)) * 1.15;
}
export function haloSizeForCount(count) {
  const safe = Math.max(0, Number(count) || 0);
  return safe > 0 ? 10 + Math.log2(1 + safe) * 8 : 0;
}
export function nodeSizeForHeat(value) {
  return 2.3 + Math.log2(1 + Math.max(0, Number(value) || 0)) * 1.6;
}
export function haloSizeForHeat(value) {
  const safe = Math.max(0, Number(value) || 0);
  return safe > 0.01 ? 9 + Math.log2(1 + safe) * 11 : 0;
}
function haloOpacityForHeat(value) {
  const safe = Math.max(0, Number(value) || 0);
  return safe > 0.01 ? Math.min(.55, .12 + Math.log2(1 + safe) * .09) : 0;
}
function nodeChannelValues(node) {
  if (node.heat) {
    return { core: nodeSizeForHeat(node.heat_value), halo: haloSizeForHeat(node.heat_value), haloOpacity: haloOpacityForHeat(node.heat_value) };
  }
  const count = node.size_count ?? 0;
  return { core: nodeSizeForCount(count), halo: haloSizeForCount(count), haloOpacity: count > 0 ? Math.min(.4, .1 + Math.log2(1 + count) * .07) : 0 };
}

// Every node is one sprite in the shared Points draw (createSpriteStore): the
// kind as the shape, the printed accumulation as size and glow. The Group the
// library binds to the node carries only an invisible pick proxy, so hover and
// click keep working through the library while the node costs no draw call.
const PICK_PROXY_GEOMETRY = new THREE.SphereGeometry(1, 8, 6);
function makeNodeObject(node, store) {
  const group = new THREE.Group();
  const pickMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: .86 });
  pickMaterial.userData.baseOpacity = pickMaterial.opacity;
  const core = new THREE.Mesh(PICK_PROXY_GEOMETRY, pickMaterial);
  core.visible = false;
  core.userData.role = 'core';
  group.add(core);
  group.userData.nodeId = node.id;
  group.userData.store = store;
  group.userData.slot = store ? store.slotOf(node.id) : -1;
  styleNodeObject(group, node);
  return group;
}
// Moving t (the window end) restyles a node in place: its heat channels are
// rewritten into its sprite slot and the pick proxy takes the core size.
function styleNodeObject(group, node) {
  if (!group) return;
  const values = nodeChannelValues(node);
  for (const child of group.children) {
    if (child.userData.role === 'core' && child.scale.x !== values.core) child.scale.setScalar(values.core);
  }
  group.userData.store?.style(group.userData.slot, node, values);
}
// Every arc is a slot in the shared LineSegments draw (createArcStore): the
// Group the library binds to the link carries no geometry of its own.
function makeLinkObject(link, store) {
  const group = new THREE.Group();
  group.userData.lastEndpoints = null;
  group.userData.linkId = link.id;
  group.userData.arcs = store;
  group.userData.slot = store ? store.slotOf(link.id) : -1;
  return group;
}

function vectorChanged(previous, start, end) {
  if (!previous) return true;
  return Math.abs(previous[0] - start.x) > .03 || Math.abs(previous[1] - start.y) > .03 || Math.abs(previous[2] - start.z) > .03 ||
    Math.abs(previous[3] - end.x) > .03 || Math.abs(previous[4] - end.y) > .03 || Math.abs(previous[5] - end.z) > .03;
}
const arcScratch = new Float32Array(LINK_SEGMENTS * 3);
function rebuildArc(group, start, end, link) {
  const store = group.userData.arcs;
  if (!store || group.userData.slot < 0) return;
  const positions = arcScratch;
  const a = new THREE.Vector3(start.x, start.y, start.z);
  const b = new THREE.Vector3(end.x, end.y, end.z);
  const ra = Math.max(1, a.length()), rb = Math.max(1, b.length());
  const ua = a.clone().normalize(), ub = b.clone().normalize();
  const dot = THREE.MathUtils.clamp(ua.dot(ub), -.9995, .9995);
  const theta = Math.acos(dot), sinTheta = Math.sin(theta);
  const lift = link.topology_only ? ARC_LIFT.topology : ARC_LIFT.research;
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
  store.write(group.userData.slot, positions);
  store.geometry.attributes.position.needsUpdate = true;
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
  // A node sprite or an arc slot in a shared draw takes its factor directly.
  if (object.userData.store) object.userData.store.strength(object.userData.slot, factor, selected);
  if (object.userData.arcs) { object.userData.arcs.strength(object.userData.slot, factor, emphasis); return; }
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

// The tooltip names the same ledger count the inspector names (nodeCountLabel
// reads size_count and ledger_row_count, both set from the ledger by
// buildSocialFieldModel); it never prints a count the inspector would contradict.
function tooltipForNode(node) {
  const kind = node.ontology === 'surface' ? 'bounded surface' : node.ontology === 'person' ? 'actor' : 'organization';
  const heatLine = nodeHeatLabel(node);
  return `<div class="atlas-3d-tooltip"><strong>${escapeHtml(node.label)}</strong><br><span>${escapeHtml(kind)} · ${escapeHtml(nodeCountLabel(node))}</span>${heatLine ? `<br><small>${escapeHtml(heatLine)}</small>` : ''}</div>`;
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
  let fieldLedger = null;
  let heatDay = null;
  let animationRunning = true;
  const ecologyPulses = [];
  let labelLayer = null;
  const labelButtons = new Map();
  const graph = new ForceGraph3D(host, {
    controlType: 'orbit',
    rendererConfig: { antialias: true, alpha: true, powerPreference: 'high-performance' }
  });
  const nodeStore = createSpriteStore(graph.scene());
  const arcStore = createArcStore(graph.scene());
  // The social-field projection already owns deterministic spherical positions.
  // Disable the library's layout tick: the adapter uses it as a GPU renderer,
  // camera/picking surface, and animation host rather than as a fact-producing layout engine.
  graph
    .backgroundColor('rgba(0,0,0,0)')
    .showNavInfo(false)
    .nodeLabel(tooltipForNode)
    .nodeThreeObject(node => makeNodeObject(node, nodeStore))
    .linkLabel(tooltipForLink)
    .linkThreeObject(link => makeLinkObject(link, arcStore))
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

  // A few screen-space names make the web readable before hover. They are
  // labels for existing nodes, never new edges or a score. Suppress overlaps.
  function updateLabels() {
    if (!field || !labelLayer) return;
    const width = host.clientWidth, height = host.clientHeight;
    const camera = graph.camera();
    camera.updateMatrixWorld();
    const focus = selectedId ? socialFieldNeighbors(field, selectedId) : null;
    const candidates = field.nodes.filter(node => node.id === selectedId ||
      (node.size_count > 0 && (!focus || focus.has(node.id))))
      .sort((a, b) => Number(b.id === selectedId) - Number(a.id === selectedId) || (b.heat_value || 0) - (a.heat_value || 0) || b.size_count - a.size_count || a.label.localeCompare(b.label));
    const boxes = [];
    const visibleIds = new Set();
    for (const node of candidates) {
      const point = new THREE.Vector3(node.x, node.y, node.z).project(camera);
      if (point.z < -1 || point.z > 1) continue;
      const x = (point.x + 1) * width / 2 + 9, y = (1 - point.y) * height / 2 - 10;
      const labelWidth = Math.min(176, 14 + node.label.length * 6.3);
      if (x < 8 || x + labelWidth > width - 8 || y < 8 || y > height - 30) continue;
      const box = { x, y, right: x + labelWidth, bottom: y + 24 };
      if (boxes.some(b => box.x < b.right + 12 && box.right + 12 > b.x && box.y < b.bottom + 8 && box.bottom + 8 > b.y)) continue;
      boxes.push(box);
      let button = labelButtons.get(node.id);
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'network-node-label';
        button.textContent = node.label;
        button.title = node.label;
        button.dataset.networkNode = node.id;
        button.addEventListener('click', () => selectNode(node));
        labelButtons.set(node.id, button);
        labelLayer.append(button);
      }
      button.style.left = `${x}px`; button.style.top = `${y}px`;
      visibleIds.add(node.id);
      if (boxes.length >= 7) break;
    }
    for (const [id, button] of labelButtons) button.hidden = !visibleIds.has(id);
  }

  labelLayer = document.createElement('div');
  labelLayer.className = 'network-node-labels';
  labelLayer.setAttribute('aria-label', 'Named network nodes');
  host.append(labelLayer);

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
    // 3d-force-graph binds a custom link object at link.__lineObj (nodes use
    // __threeObj). Reading the node property here left every arc factor inert.
    for (const link of field.links) {
      const source = endpointId(link.source), target = endpointId(link.target);
      const hoverFactor = !id || source === id || target === id ? 1 : .06;
      const emphasis = link.id === selectedLinkId;
      setObjectStrength(link.__lineObj, emphasis ? 1 : semanticLinkFactor(link) * hoverFactor * timeLinkFactor(link), { emphasis });
    }
    host.dataset.atlasDrawCalls = String(graph.renderer().info.render.calls);
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
      pulse.userData.lift = ARC_LIFT.topology;
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
    applyHeatAt(heatTimeForWindow(fieldLedger?.range ?? ecologyModel?.range, window));
    applyHighlight(selectedId);
    updateEcologyPulses();
  }
  // t is the window end (end of record with no window). The accumulation is
  // recomputed only when t moves by a whole day, then written into each node.
  function applyHeatAt(day) {
    if (!field || !fieldLedger || day == null || day === heatDay) return;
    heatDay = day;
    applyFieldHeat(field, fieldLedger, day);
    for (const node of field.nodes) styleNodeObject(node.__threeObj, node);
    updateLabels();
  }
  function cameraDistance() {
    const camera = graph.camera(), target = controls.target;
    return Math.hypot(camera.position.x - target.x, camera.position.y - target.y, camera.position.z - target.z);
  }
  function distanceForScale(value) {
    const scale = Math.max(1, Math.min(5.4, Number(value) || 1));
    const far = SOCIAL_FIELD_RADIUS * 3.05, near = SOCIAL_FIELD_RADIUS * 1.24;
    const t = (scale - 1) / 4.4;
    return far + (near - far) * t;
  }
  function scaleForDistance(distance) {
    const far = SOCIAL_FIELD_RADIUS * 3.05, near = SOCIAL_FIELD_RADIUS * 1.24;
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
  function selectNode(node) {
    selectedId = node.id;
    selectedLinkId = null;
    applyHighlight(selectedId);
    focus(selectedId);
    onInteraction?.('select');
    onNodeSelect?.(selectedId);
    updateLabels();
  }
  graph.onNodeClick(selectNode);
  // A click on an arc hands the whole field link (graph edge fields plus its
  // ledger rows) to the runtime, which opens the participation row or the claim.
  // Arcs share one draw, so the arc nearest the click (within 9 px of one of
  // its sampled points) is found in screen space on a background click.
  const pickVector = new THREE.Vector3();
  function linkAt(clientX, clientY) {
    if (!field || !arcStore.geometry) return null;
    const rect = host.getBoundingClientRect();
    const px = clientX - rect.left, py = clientY - rect.top;
    const camera = graph.camera();
    camera.updateMatrixWorld();
    const width = host.clientWidth, height = host.clientHeight;
    const samples = [Math.round(LINK_SEGMENTS * .25), Math.round(LINK_SEGMENTS * .5), Math.round(LINK_SEGMENTS * .75)];
    let best = null, bestDistance = 81;
    for (let slot = 0; slot < field.links.length; slot += 1) {
      if (arcStore.level[slot] < .05) continue;
      for (const pointIndex of samples) {
        arcStore.sample(slot, pointIndex, pickVector).project(camera);
        if (pickVector.z > 1) continue;
        const dx = (pickVector.x + 1) * width / 2 - px, dy = (1 - pickVector.y) * height / 2 - py;
        const distance = dx * dx + dy * dy;
        if (distance < bestDistance) { bestDistance = distance; best = field.links[slot]; }
      }
    }
    return best;
  }
  graph.onBackgroundClick(event => {
    const link = event ? linkAt(event.clientX, event.clientY) : null;
    if (link) {
      selectedLinkId = link.id;
      applyHighlight(selectedId);
      onInteraction?.('select');
      onLinkSelect?.(link);
      return;
    }
    applyHighlight(selectedId);
  });
  // The library builds node and link objects on its first tick after
  // graphData(), which cannot happen while the stage is off-screen and paused.
  // The engine stops on that same tick (cooldownTicks 0), so this is the first
  // moment every arc factor can actually be written.
  graph.onEngineStop(() => {
    applyHighlight(selectedId);
    host.dataset.networkNodes = String(field?.nodes.filter(node => node.__threeObj).length ?? 0);
    host.dataset.networkLinks = String(field?.links.filter(link => link.__lineObj).length ?? 0);
    updateLabels();
  });
  controls.addEventListener('change', () => {
    updateLabels();
    const distance = cameraDistance();
    nodeStore.setZoom(distance / ((field?.radius || SOCIAL_FIELD_RADIUS) * 3.05));
    const distanceChanged = lastCameraDistance == null || Math.abs(distance - lastCameraDistance) > .35;
    lastCameraDistance = distance;
    if (distanceChanged && performance.now() > programmaticCameraUntil) onInteraction?.({ type: 'scale', scale: scaleForDistance(distance) });
    else onInteraction?.({ type: 'orbit' });
  });

  function resize() {
    const width = Math.max(320, Math.floor(host.clientWidth || 900));
    const height = Math.max(420, Math.floor(host.clientHeight || 650));
    graph.width(width).height(height);
    nodeStore.setScale(perspectiveSpriteScale(host, graph));
    updateLabels();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();
  let lastMode = null;
  function render(model, { selectedNodeId = null, ledger = null } = {}) {
    fieldLedger = ledger || null;
    heatDay = ledger ? heatTimeForWindow(ledger.range, timeView.window) : null;
    field = buildSocialFieldModel(model, { ledger, atDay: heatDay });
    field.linkById = new Map(field.links.map(link => [link.id, link]));
    nodeStore.allocate(field.nodes, perspectiveSpriteScale(host, graph));
    arcStore.allocate(field.links);
    graph.graphData({ nodes: field.nodes, links: field.links });
    selectedId = selectedNodeId && field.nodeById.has(selectedNodeId) ? selectedNodeId : null;
    selectedLinkId = null;
    requestAnimationFrame(() => applyHighlight(selectedId));
    if (lastMode !== model.mode) {
      const initialPlacement = lastMode === null;
      lastMode = model.mode;
      const duration = initialPlacement || reducedMotion ? 0 : 520;
      programmaticCameraUntil = performance.now() + duration + 80;
      lastCameraDistance = field.radius * 3.05;
      graph.cameraPosition(
        { x: 0, y: 0, z: field.radius * 3.05 },
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
    updateLabels();
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
    updateLabels();
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
      graph.cameraPosition({ x: 0, y: 0, z: SOCIAL_FIELD_RADIUS * 3.05 }, { x: 0, y: 0, z: 0 }, reducedMotion ? 0 : 420);
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
    nodeStore.dispose();
    arcStore.dispose();
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
    heatDay: () => heatDay,
    graph: () => graph
  };
}

// --- The ledger field (the Field tab) ----------------------------------------
// The whole ledger as a force-directed field on the same engine: the library
// runs the d3 layout, the camera, the controls and the render loop; the field
// draws its own objects so a ledger of several thousand rows stays a handful
// of draw calls (one instanced mesh per node kind, one Points draw for every
// halo, one LineSegments for every participation row). Size, halo and colour
// are the printed heat of social-field.js (nodeSizeForHeat, haloSizeForHeat,
// node.color written by applyFieldHeat); nothing else sizes or colours a node,
// and a link is one ledger row. Layout position carries no meaning and no
// channel reads it.
const GALAXY_BACKGROUND = new THREE.Color('#07090d');
const GALAXY_SELECTION = new THREE.Color('#ffd061');
const GALAXY_CORE_SCALE = 1.1;
const GALAXY_DIM = Object.freeze({ node: .72, alpha: .22, halo: .12, link: .05, selectedScale: 1.5 });
// Outside a lens the field goes darker than outside a selection: a lens lights
// hundreds of nodes, so the rest must recede further for the lit set to read.
const GALAXY_LENS_DIM = Object.freeze({ node: .82, alpha: .1, halo: .04, link: .01, muted: .45 });
const GALAXY_LINK_LEVEL = .26;
// The camera fits the body of the field: the span between these quantiles of
// node x and y, so a few far specks do not shrink everything else.
const GALAXY_FIT_QUANTILES = Object.freeze({ low: .01, high: .99, pad: 1.12 });
// Every node glows a little so the field reads as one body; the floor is the
// same for all of them and encodes nothing. Above it, glow size and strength
// are the heat halo.
const GALAXY_GLOW_FLOOR = Object.freeze({ alpha: .09, sizeFactor: 3.2 });
const GALAXY_LABEL_LIMITS = Object.freeze({ phone: 5, desktop: 14 });
// Edge locality (atlas interaction contract, close range): nearer than this
// share of the fitted distance, a row whose two ends are both off-screen is
// faded out, and a chip on the stage names how many rows that is.
const GALAXY_LOCALITY = Object.freeze({ zoom: .55, margin: 48 });
const GALAXY_CLICK_SLOP_PX = 8;
// The sprite shader draws the kind as a shape: disc for a person, square for
// an organization, diamond for a surface.
const GALAXY_SHAPE_KIND = Object.freeze({ person: 0, organization: 1, surface: 2 });
// A surface with this many participants or more is a dense roster: its rows
// get a short rest length in the layout so the roster stays one object.
const GALAXY_DENSE_ROSTER = 40;

function galaxyStableHash(value) {
  let hash = 2166136261;
  for (const ch of String(value)) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}
// Deterministic starting positions for the layout: surfaces on a disc, each
// participant at the mean of its surfaces plus a small offset. The forces take
// it from here; the seed only makes the arrival reproducible.
function galaxySeedPositions(field) {
  const radius = 40 + Math.sqrt(field.nodes.length) * 7;
  const surfacePosition = new Map();
  for (const node of field.nodes) {
    if (node.ontology !== 'surface') continue;
    const angle = galaxyStableHash(`${node.id}:a`) * Math.PI * 2;
    const r = Math.sqrt(galaxyStableHash(`${node.id}:r`)) * radius;
    node.x = Math.cos(angle) * r;
    node.y = Math.sin(angle) * r;
    node.z = 0;
    surfacePosition.set(node.id, node);
  }
  const sums = new Map();
  for (const link of field.links) {
    const source = endpointId(link.source), target = endpointId(link.target);
    const surface = surfacePosition.get(target) ?? surfacePosition.get(source);
    const member = surface && surface.id === target ? source : target;
    if (!surface || member === surface.id) continue;
    const sum = sums.get(member) ?? { x: 0, y: 0, n: 0 };
    sum.x += surface.x; sum.y += surface.y; sum.n += 1;
    sums.set(member, sum);
  }
  for (const node of field.nodes) {
    if (node.ontology === 'surface') continue;
    const sum = sums.get(node.id);
    const angle = galaxyStableHash(`${node.id}:a`) * Math.PI * 2;
    const jitter = 6 + galaxyStableHash(`${node.id}:j`) * 10;
    if (sum) {
      node.x = sum.x / sum.n + Math.cos(angle) * jitter;
      node.y = sum.y / sum.n + Math.sin(angle) * jitter;
    } else {
      const r = radius * (1.05 + galaxyStableHash(`${node.id}:r`) * .15);
      node.x = Math.cos(angle) * r;
      node.y = Math.sin(angle) * r;
    }
    node.z = 0;
  }
}
// One sprite per node, one draw for the whole field: the core is the kind's
// shape at the node's heat size with a hot centre, the glow around it is the
// heat halo. Sizes arrive in world units and become pixels by the camera's
// perspective factor, so a node keeps its size relative to the field.
function galaxyNodeMaterial(scale, layer = 0) {
  return new THREE.ShaderMaterial({
    uniforms: { scale: { value: scale }, layer: { value: layer }, zoomScale: { value: 1 } },
    vertexShader: `attribute vec3 nodeColor; attribute float coreSize; attribute float haloSize; attribute float haloAlpha; attribute float nodeAlpha; attribute float shapeKind; attribute float nodeStyle;
      uniform float scale; uniform float zoomScale;
      varying vec3 vColor; varying float vCore; varying float vGlow; varying float vAlpha; varying float vShape; varying float vPx; varying float vStyle;
      void main() {
        vColor = nodeColor; vGlow = haloAlpha; vAlpha = nodeAlpha; vShape = shapeKind; vStyle = nodeStyle;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        // Ink never magnifies: the camera's distance to its reference view
        // cancels out of the pixel size, so zoom changes spacing, not glyphs.
        float depth = max(1.0, -mv.z) / max(0.05, zoomScale);
        float outer = max(haloSize, coreSize * 2.0);
        float px = clamp(outer * scale / depth, 2.0, 300.0);
        float corePx = max(1.7, coreSize * scale / depth);
        vCore = min(0.98, corePx / px);
        vPx = px;
        gl_PointSize = px;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform float layer;
      varying vec3 vColor; varying float vCore; varying float vGlow; varying float vAlpha; varying float vShape; varying float vPx; varying float vStyle;
      float shapeDistance(vec2 p, float kind) {
        if (kind < 0.5) return length(p);
        if (kind < 1.5) return max(abs(p.x), abs(p.y)) * 1.12;
        return (abs(p.x) + abs(p.y)) * 0.86;
      }
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;
        float glow = pow(1.0 - r, 2.4) * vGlow;
        float d = shapeDistance(p, vShape) / vCore;
        float edge = 1.6 / max(1.0, vPx * vCore);
        float core = 1.0 - smoothstep(1.0 - edge, 1.0 + edge, d);
        // A hollow node (a lens marks it) keeps its outline and opens its centre.
        if (vStyle > 0.5) core *= smoothstep(0.5 - edge, 0.5 + edge, d);
        // layer 0 draws core and glow together; 1 the cores alone; 2 the glows alone.
        if (layer > 1.5) core = 0.0;
        if (layer > 0.5 && layer < 1.5) glow = 0.0;
        vec3 coreColor = mix(vColor, vec3(1.0), 0.5 * (1.0 - clamp(d, 0.0, 1.0)));
        vec3 color = coreColor * core + vColor * glow;
        float alpha = (core + glow) * vAlpha;
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(color, alpha);
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: layer === 1 ? THREE.NormalBlending : THREE.AdditiveBlending
  });
}

export async function createGalaxyFieldRenderer({ host, onNodeSelect, onNodeHover, onViewChange, reducedMotion = false } = {}) {
  if (!host || !supportsWebGlAtlas()) throw new Error('WebGL field is unavailable');
  const ForceGraph3D = await loadForceGraphVendor();
  let field = null, selectedId = null, highlight = null, settled = false, animationRunning = true, tick = 0, fitDistance = 600, cameraTaken = false;
  let nodeIndex = new Map(), linkEnds = null, scales = null, screen = null, screenDirty = true;
  let points = null, pointGeometry = null, lines = null, lineGeometry = null, ring = null, outerRing = null, hoverRing = null, ringRadius = 1, labelOrder = [];
  let lens = null, denseSurfaceIds = new Set(), localityMask = null, localityChip = null;
  let pulseFrame = 0, viewSyncFrame = 0, hoverFrame = 0, pointerDown = null, hoveredId = null;
  const labelButtons = new Map();
  const scratchPosition = new THREE.Vector3(), scratchColor = new THREE.Color();
  const graph = new ForceGraph3D(host, {
    controlType: 'orbit',
    rendererConfig: { antialias: true, alpha: true, powerPreference: 'high-performance' }
  });
  graph
    .numDimensions(2)
    .backgroundColor('rgba(0,0,0,0)')
    .showNavInfo(false)
    .enablePointerInteraction(false)
    .nodeVisibility(false)
    .linkVisibility(false)
    // A short synchronous warm-up shapes the field before the first paint; the
    // cooldown then settles it on screen (the layout is computation, not
    // decoration, so it runs under reduced motion too, but there it completes
    // before the first paint and the camera never animates).
    .warmupTicks(reducedMotion ? 200 : 30)
    .cooldownTicks(reducedMotion ? 0 : 280)
    .d3AlphaDecay(.026)
    .d3VelocityDecay(.3)
    .onEngineTick(() => {
      tick += 1;
      syncPositions();
      if (tick % 8 === 0) updateLabels();
      // While the layout grows, keep the whole field in frame until the
      // visitor takes the camera.
      if (!cameraTaken && tick % 40 === 0) fit(reducedMotion ? 0 : 400);
      onViewChange?.({ type: 'tick', settled: false });
    })
    .onEngineStop(() => {
      syncPositions();
      const first = !settled;
      settled = true;
      if (first) fit(reducedMotion ? 0 : 700);
      updateLabels();
      host.dataset.fieldLayout = 'settled';
      onViewChange?.({ type: 'settled', settled: true, first });
    });
  if (typeof graph.enableNodeDrag === 'function') graph.enableNodeDrag(false);
  // The forces open the field enough for its structure to show while the whole
  // stays one body. Every participation row is one link; a row into a dense
  // roster (GALAXY_DENSE_ROSTER participants or more) has a short rest length so
  // the roster stays one object with its spokes.
  const denseLink = link => denseSurfaceIds.has(endpointId(link.target));
  graph.d3Force('charge').strength(-18).distanceMax(260);
  graph.d3Force('link').distance(link => denseLink(link) ? 6 : 22).strength(link => denseLink(link) ? .9 : .5);
  graph.renderer().setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

  // A flat field: left drag and one finger pan, wheel and pinch zoom, no orbit.
  const controls = graph.controls();
  controls.enableRotate = false;
  controls.screenSpacePanning = true;
  controls.enableDamping = true;
  controls.dampingFactor = .09;
  controls.zoomSpeed = .9;
  controls.panSpeed = .9;
  controls.minDistance = 14;
  controls.maxDistance = 4000;
  // Wheel and pinch zoom toward the pointer (the world point under the cursor
  // stays under it); the +/− buttons zoom toward the view centre.
  controls.zoomToCursor = true;
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };

  const labelLayer = document.createElement('div');
  labelLayer.className = 'network-node-labels aperture-field-labels';
  labelLayer.setAttribute('aria-label', 'Named field nodes');
  host.append(labelLayer);
  const tooltip = document.createElement('div');
  tooltip.className = 'aperture-field-tooltip';
  tooltip.hidden = true;
  host.append(tooltip);
  localityChip = document.createElement('p');
  localityChip.className = 'aperture-field-locality';
  localityChip.hidden = true;
  host.append(localityChip);

  // World units to device pixels at depth 1: the sprite shader divides by depth.
  function spriteScale() {
    const camera = graph.camera();
    return ((host.clientHeight / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov || 75) / 2)) * graph.renderer().getPixelRatio();
  }
  function disposeObjects() {
    for (const object of [points, lines, ring, outerRing, hoverRing]) {
      if (!object) continue;
      graph.scene().remove(object);
      object.geometry.dispose();
      object.material.dispose();
    }
    points = lines = ring = outerRing = hoverRing = null;
    pointGeometry = lineGeometry = null;
  }
  function buildObjects() {
    disposeObjects();
    const count = field.nodes.length;
    // Built once per render, never per frame: every per-frame path reads it.
    nodeIndex = new Map();
    field.nodes.forEach((node, index) => nodeIndex.set(node.id, index));
    scales = new Float32Array(count);
    screen = new Float32Array(count * 2);
    pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
    pointGeometry.setAttribute('nodeColor', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    pointGeometry.setAttribute('coreSize', new THREE.BufferAttribute(new Float32Array(count), 1));
    pointGeometry.setAttribute('haloSize', new THREE.BufferAttribute(new Float32Array(count), 1));
    pointGeometry.setAttribute('haloAlpha', new THREE.BufferAttribute(new Float32Array(count), 1));
    pointGeometry.setAttribute('nodeAlpha', new THREE.BufferAttribute(new Float32Array(count), 1));
    pointGeometry.setAttribute('nodeStyle', new THREE.BufferAttribute(new Float32Array(count), 1));
    const shapeKind = new Float32Array(count);
    field.nodes.forEach((node, index) => { shapeKind[index] = GALAXY_SHAPE_KIND[node.ontology] ?? GALAXY_SHAPE_KIND.organization; });
    pointGeometry.setAttribute('shapeKind', new THREE.BufferAttribute(shapeKind, 1));
    points = new THREE.Points(pointGeometry, galaxyNodeMaterial(spriteScale()));
    points.frustumCulled = false;
    points.renderOrder = -1;
    graph.scene().add(points);
    const linkCount = field.links.length;
    linkEnds = new Int32Array(linkCount * 2);
    field.links.forEach((link, index) => {
      linkEnds[index * 2] = nodeIndex.get(endpointId(link.source)) ?? -1;
      linkEnds[index * 2 + 1] = nodeIndex.get(endpointId(link.target)) ?? -1;
    });
    lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linkCount * 6), 3).setUsage(THREE.DynamicDrawUsage));
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(linkCount * 6), 3));
    lines = new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .85, depthWrite: false, blending: THREE.AdditiveBlending }));
    lines.frustumCulled = false;
    lines.renderOrder = -2;
    graph.scene().add(lines);
    ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.14, 64), new THREE.MeshBasicMaterial({ color: GALAXY_SELECTION, transparent: true, opacity: .95, side: THREE.DoubleSide, depthTest: false, depthWrite: false }));
    outerRing = new THREE.Mesh(new THREE.RingGeometry(1, 1.05, 64), new THREE.MeshBasicMaterial({ color: GALAXY_SELECTION, transparent: true, opacity: .3, side: THREE.DoubleSide, depthTest: false, depthWrite: false }));
    hoverRing = new THREE.Mesh(new THREE.RingGeometry(1, 1.1, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .55, side: THREE.DoubleSide, depthTest: false, depthWrite: false }));
    ring.visible = outerRing.visible = hoverRing.visible = false;
    ring.renderOrder = outerRing.renderOrder = hoverRing.renderOrder = 5;
    graph.scene().add(ring);
    graph.scene().add(outerRing);
    graph.scene().add(hoverRing);
    labelOrder = field.nodes.map((node, index) => index).sort((a, b) => {
      const na = field.nodes[a], nb = field.nodes[b];
      return (nb.heat_value || 0) - (na.heat_value || 0) || (nb.size_count || 0) - (na.size_count || 0) || String(na.label).localeCompare(String(nb.label));
    });
  }
  function nodeChannels(node) {
    if (node.heat) return { core: nodeSizeForHeat(node.heat_value), halo: haloSizeForHeat(node.heat_value), alpha: haloOpacityForHeat(node.heat_value) };
    const count = node.size_count ?? 0;
    return { core: nodeSizeForCount(count), halo: haloSizeForCount(count), alpha: count > 0 ? Math.min(.4, .1 + Math.log2(1 + count) * .07) : 0 };
  }
  // Writes colour, scale and halo for every node from its printed heat and the
  // current highlight. A node outside the highlight is drawn toward the
  // background; it is never removed.
  function restyle() {
    if (!field || !points) return;
    const { nodeColor, coreSize, haloSize, haloAlpha, nodeAlpha, nodeStyle } = pointGeometry.attributes;
    // A lens (set by the runtime from one recorded field) keeps its nodes and
    // rows lit and dims the rest; it may recolour a node by a recorded value
    // and draw it hollow. Nothing is removed.
    const lensNodes = lens?.nodes ?? null, lensLinks = lens?.links ?? null, lensColors = lens?.colors ?? null, lensHollow = lens?.hollow ?? null, lensMuted = lens?.muted ?? null;
    const lensLinkLevel = GALAXY_LINK_LEVEL * (lens?.linkLevel ?? 1);
    field.nodes.forEach((node, index) => {
      const channels = nodeChannels(node);
      const inLens = !lensNodes || lensNodes.has(node.id);
      const inFocus = inLens && (!highlight || highlight.has(node.id));
      const selected = node.id === selectedId;
      scratchColor.set(lensColors?.get(node.id) || node.color || ONTOLOGY_COLORS[node.ontology] || '#b8c0cf');
      if (!inFocus) scratchColor.lerp(GALAXY_BACKGROUND, inLens ? GALAXY_DIM.node : GALAXY_LENS_DIM.node);
      // scales[] holds the core diameter in world units; picking, the ring and
      // the labels read it.
      let core = Math.max(1.6, channels.core) * GALAXY_CORE_SCALE;
      let halo = Math.max(channels.halo, core * GALAXY_GLOW_FLOOR.sizeFactor);
      let glow = Math.max(channels.alpha, GALAXY_GLOW_FLOOR.alpha);
      let alpha = 1;
      if (!inLens) { core *= .85; glow *= GALAXY_LENS_DIM.halo; alpha = GALAXY_LENS_DIM.alpha; }
      else if (!inFocus) { core *= .9; glow *= GALAXY_DIM.halo; alpha = GALAXY_DIM.alpha; }
      else if (lensMuted?.has(node.id) && !selected) { glow *= GALAXY_LENS_DIM.muted; alpha = GALAXY_LENS_DIM.muted; }
      if (selected) { core *= GALAXY_DIM.selectedScale; halo = Math.max(halo, 30); glow = Math.max(glow, .6); }
      scales[index] = core;
      nodeColor.setXYZ(index, scratchColor.r, scratchColor.g, scratchColor.b);
      coreSize.setX(index, core);
      haloSize.setX(index, halo);
      haloAlpha.setX(index, glow);
      nodeAlpha.setX(index, alpha);
      nodeStyle.setX(index, lensHollow?.has(node.id) ? 1 : 0);
    });
    nodeColor.needsUpdate = coreSize.needsUpdate = haloSize.needsUpdate = haloAlpha.needsUpdate = nodeAlpha.needsUpdate = nodeStyle.needsUpdate = true;
    restyleLinks();
    syncPositions();
  }
  // Every row's colour level: the selection, the lens and, at close range,
  // locality (a row with both ends off-screen is faded to nothing until the
  // camera brings one end back).
  function restyleLinks() {
    if (!field || !lines) return;
    const lensLinks = lens?.links ?? null;
    const lensLinkLevel = GALAXY_LINK_LEVEL * (lens?.linkLevel ?? 1);
    const lineColor = lineGeometry.attributes.color;
    field.links.forEach((link, index) => {
      const source = endpointId(link.source), target = endpointId(link.target);
      const inLens = !lensLinks || lensLinks.has(link.id);
      const incident = inLens && selectedId && (source === selectedId || target === selectedId);
      scratchColor.set(EVIDENCE_COLORS[link.evidence_class] ?? EVIDENCE_COLORS.context);
      scratchColor.multiplyScalar(localityMask?.[index] ? 0 : incident ? 1 : !inLens ? GALAXY_LENS_DIM.link : highlight ? GALAXY_DIM.link : lensLinkLevel);
      lineColor.setXYZ(index * 2, scratchColor.r, scratchColor.g, scratchColor.b);
      lineColor.setXYZ(index * 2 + 1, scratchColor.r, scratchColor.g, scratchColor.b);
    });
    lineColor.needsUpdate = true;
  }
  function applyLocality() {
    if (!field || !lines) return;
    const close = cameraDistance() < fitDistance * GALAXY_LOCALITY.zoom;
    if (!close) {
      if (!localityMask) return;
      localityMask = null;
      restyleLinks();
      updateLocalityChip(0);
      return;
    }
    refreshScreen();
    const margin = GALAXY_LOCALITY.margin, width = host.clientWidth + margin, height = host.clientHeight + margin;
    const onScreen = index => index >= 0 && screen[index * 2] >= -margin && screen[index * 2] <= width && screen[index * 2 + 1] >= -margin && screen[index * 2 + 1] <= height;
    if (!localityMask || localityMask.length !== field.links.length) localityMask = new Uint8Array(field.links.length);
    let faded = 0;
    for (let index = 0; index < field.links.length; index += 1) {
      const hidden = !(onScreen(linkEnds[index * 2]) || onScreen(linkEnds[index * 2 + 1]));
      localityMask[index] = hidden ? 1 : 0;
      if (hidden) faded += 1;
    }
    restyleLinks();
    updateLocalityChip(faded);
  }
  function updateLocalityChip(faded) {
    if (!localityChip) return;
    localityChip.hidden = faded === 0;
    if (faded) localityChip.textContent = `${faded.toLocaleString('en-GB')} of ${field.links.length.toLocaleString('en-GB')} rows lead off-screen at both ends · faded until you pan`;
  }
  // Ink never magnifies: a node's on-screen radius is fixed at its size in the
  // fitted view, whatever the camera distance now.
  function fitPixelsPerUnit() {
    const camera = graph.camera();
    return (host.clientHeight / 2) / (Math.max(1, fitDistance) * Math.tan(THREE.MathUtils.degToRad(camera.fov || 75) / 2));
  }
  function nodeRadiusPx(index) {
    return (scales[index] || 1) / 2 * fitPixelsPerUnit();
  }
  function syncZoomScale() {
    if (!points) return;
    points.material.uniforms.zoomScale.value = cameraDistance() / Math.max(1, fitDistance);
  }
  // Positions follow the layout: instance matrices, halo points, line ends and
  // the selection ring are rewritten from node.x/y on every engine tick.
  function syncPositions() {
    if (!field || !points) return;
    const position = pointGeometry.attributes.position;
    field.nodes.forEach((node, index) => position.setXYZ(index, node.x || 0, node.y || 0, node.z || 0));
    position.needsUpdate = true;
    const linePosition = lineGeometry.attributes.position;
    for (let index = 0; index < field.links.length; index += 1) {
      const a = field.nodes[linkEnds[index * 2]], b = field.nodes[linkEnds[index * 2 + 1]];
      if (!a || !b) continue;
      linePosition.setXYZ(index * 2, a.x || 0, a.y || 0, a.z || 0);
      linePosition.setXYZ(index * 2 + 1, b.x || 0, b.y || 0, b.z || 0);
    }
    linePosition.needsUpdate = true;
    placeRing();
    screenDirty = true;
  }
  // The selection ring reads at any zoom: at least 14 px of radius, or the
  // core plus 6 px. The hover ring says which node a click would take.
  function placeRing() {
    const node = selectedId ? field?.nodeById.get(selectedId) : null;
    if (!node || !ring) { if (ring) ring.visible = outerRing.visible = false; return; }
    const perUnit = pixelsPerUnit();
    ringRadius = Math.max(14, nodeRadiusPx(nodeIndex.get(node.id)) + 6) / perUnit;
    ring.position.set(node.x || 0, node.y || 0, (node.z || 0) + .5);
    outerRing.position.copy(ring.position);
    ring.scale.setScalar(ringRadius);
    outerRing.scale.setScalar(ringRadius * 1.45);
    ring.visible = outerRing.visible = true;
  }
  function placeHoverRing() {
    if (!hoverRing) return;
    const node = hoveredId && hoveredId !== selectedId ? field?.nodeById.get(hoveredId) : null;
    if (!node) { hoverRing.visible = false; return; }
    const perUnit = pixelsPerUnit();
    hoverRing.position.set(node.x || 0, node.y || 0, (node.z || 0) + .4);
    hoverRing.scale.setScalar(Math.max(11, nodeRadiusPx(nodeIndex.get(node.id)) + 5) / perUnit);
    hoverRing.visible = true;
  }
  function pulse(timestamp) {
    pulseFrame = 0;
    if (!animationRunning) return;
    if (ring?.visible && !reducedMotion) {
      const phase = (Math.sin(timestamp / 900) + 1) / 2;
      outerRing.scale.setScalar(ringRadius * (1.35 + phase * .45));
      outerRing.material.opacity = .14 + (1 - phase) * .3;
    }
    pulseFrame = requestAnimationFrame(pulse);
  }
  function refreshScreen() {
    if (!field || !screenDirty) return;
    const camera = graph.camera();
    camera.updateMatrixWorld();
    const width = host.clientWidth, height = host.clientHeight;
    field.nodes.forEach((node, index) => {
      scratchPosition.set(node.x || 0, node.y || 0, node.z || 0).project(camera);
      screen[index * 2] = (scratchPosition.x + 1) * width / 2;
      screen[index * 2 + 1] = (1 - scratchPosition.y) * height / 2;
    });
    screenDirty = false;
  }
  function pixelsPerUnit() {
    const camera = graph.camera();
    const distance = Math.max(1, Math.abs(camera.position.z - (controls.target?.z ?? 0)));
    return (host.clientHeight / 2) / (distance * Math.tan(THREE.MathUtils.degToRad(camera.fov || 75) / 2));
  }
  function screenPosition(id) {
    const index = nodeIndex.get(id);
    if (index === undefined) return null;
    refreshScreen();
    const x = screen[index * 2], y = screen[index * 2 + 1];
    const radius = nodeRadiusPx(index);
    return { x, y, radius, visible: x >= 0 && y >= 0 && x <= host.clientWidth && y <= host.clientHeight };
  }
  function nodeAt(px, py) {
    if (!field) return null;
    refreshScreen();
    let best = null, bestDistance = Infinity;
    for (let index = 0; index < field.nodes.length; index += 1) {
      const dx = screen[index * 2] - px, dy = screen[index * 2 + 1] - py;
      const radius = Math.max(10, nodeRadiusPx(index) * 1.2) + 4;
      const distance = Math.hypot(dx, dy);
      if (distance > radius || distance >= bestDistance) continue;
      best = field.nodes[index];
      bestDistance = distance;
    }
    return best;
  }
  // A few names make the field readable before hover: the selected node, its
  // neighbours, then nodes in order of printed heat, without overlaps.
  function updateLabels() {
    if (!field) return;
    refreshScreen();
    const width = host.clientWidth, height = host.clientHeight;
    const limit = width < 700 ? GALAXY_LABEL_LIMITS.phone : GALAXY_LABEL_LIMITS.desktop;
    const seen = new Set();
    const candidates = [];
    const push = index => { if (index !== undefined && !seen.has(index)) { seen.add(index); candidates.push(index); } };
    if (selectedId) push(nodeIndex.get(selectedId));
    if (hoveredId) push(nodeIndex.get(hoveredId));
    if (highlight) {
      [...highlight].map(id => nodeIndex.get(id)).filter(index => index !== undefined)
        .sort((a, b) => (field.nodes[b].heat_value || 0) - (field.nodes[a].heat_value || 0)).forEach(push);
    }
    labelOrder.forEach(push);
    const boxes = [];
    const visibleIds = new Set();
    for (const index of candidates) {
      if (boxes.length >= limit) break;
      const node = field.nodes[index];
      const pinned = node.id === selectedId || node.id === hoveredId;
      if (highlight && !highlight.has(node.id) && !pinned) continue;
      if (lens?.nodes && !lens.nodes.has(node.id) && !pinned) continue;
      const radius = nodeRadiusPx(index);
      const x = screen[index * 2] + radius + 5, y = screen[index * 2 + 1] - 8;
      const labelWidth = Math.min(170, 4 + String(node.label).length * 6.2);
      if (x < 4 || x + labelWidth > width - 4 || y < 4 || y > height - 24) continue;
      const box = { x, y, right: x + labelWidth, bottom: y + 20 };
      if (boxes.some(b => box.x < b.right + 10 && box.right + 10 > b.x && box.y < b.bottom + 6 && box.bottom + 6 > b.y)) continue;
      boxes.push(box);
      let button = labelButtons.get(node.id);
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'network-node-label aperture-field-label';
        button.textContent = node.label;
        button.title = node.label;
        button.dataset.networkNode = node.id;
        button.addEventListener('click', event => { event.stopPropagation(); onNodeSelect?.(node.id, node); });
        labelButtons.set(node.id, button);
        labelLayer.append(button);
      }
      button.style.left = `${x}px`;
      button.style.top = `${y}px`;
      button.classList.toggle('is-selected', node.id === selectedId);
      visibleIds.add(node.id);
    }
    for (const [id, button] of labelButtons) button.hidden = !visibleIds.has(id);
  }
  function scheduleViewSync() {
    if (viewSyncFrame) return;
    viewSyncFrame = requestAnimationFrame(() => {
      viewSyncFrame = 0;
      screenDirty = true;
      syncZoomScale();
      placeRing();
      placeHoverRing();
      applyLocality();
      updateLabels();
      onViewChange?.({ type: 'camera', settled });
    });
  }
  controls.addEventListener('change', scheduleViewSync);

  function tooltipMarkup(node) {
    const kind = node.ontology === 'surface' ? 'bounded surface' : node.ontology === 'person' ? 'actor' : 'organization';
    const heatLine = nodeHeatLabel(node);
    return `<strong>${escapeHtml(node.label)}</strong><span>${escapeHtml(kind)} · ${escapeHtml(nodeCountLabel(node))}</span>${heatLine ? `<small>${escapeHtml(heatLine)}</small>` : ''}`;
  }
  function setHover(node, px, py) {
    const id = node?.id ?? null;
    if (id !== hoveredId) {
      hoveredId = id;
      host.style.cursor = node ? 'pointer' : 'grab';
      onNodeHover?.(node);
      placeHoverRing();
      updateLabels();
    }
    if (!node) { tooltip.hidden = true; return; }
    tooltip.innerHTML = tooltipMarkup(node);
    tooltip.hidden = false;
    const width = host.clientWidth;
    tooltip.style.left = `${Math.min(width - 260, px + 14)}px`;
    tooltip.style.top = `${py + 14}px`;
  }
  function pointerPosition(event) {
    const rect = host.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  host.addEventListener('pointermove', event => {
    if (hoverFrame || !field) return;
    hoverFrame = requestAnimationFrame(() => {
      hoverFrame = 0;
      const { x, y } = pointerPosition(event);
      setHover(nodeAt(x, y), x, y);
    });
  });
  host.addEventListener('pointerleave', () => setHover(null));
  host.addEventListener('pointerdown', event => {
    cameraTaken = true;
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const { x, y } = pointerPosition(event);
    pointerDown = { x, y, time: performance.now() };
  });
  host.addEventListener('wheel', () => { cameraTaken = true; }, { passive: true });
  host.addEventListener('pointerup', event => {
    if (!pointerDown || !field) return;
    const { x, y } = pointerPosition(event);
    const moved = Math.hypot(x - pointerDown.x, y - pointerDown.y) > GALAXY_CLICK_SLOP_PX;
    pointerDown = null;
    if (moved) return;
    if (event.target instanceof Element && event.target.closest('.aperture-field-label')) return;
    const node = nodeAt(x, y);
    onNodeSelect?.(node?.id ?? null, node ?? null);
  });
  host.addEventListener('pointercancel', () => { pointerDown = null; });

  function bounds() {
    const nodes = field?.nodes ?? [];
    if (!nodes.length) return { cx: 0, cy: 0, width: 200, height: 200 };
    const xs = Float64Array.from(nodes, node => node.x || 0).sort();
    const ys = Float64Array.from(nodes, node => node.y || 0).sort();
    const at = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];
    const minX = at(xs, GALAXY_FIT_QUANTILES.low), maxX = at(xs, GALAXY_FIT_QUANTILES.high);
    const minY = at(ys, GALAXY_FIT_QUANTILES.low), maxY = at(ys, GALAXY_FIT_QUANTILES.high);
    const pad = GALAXY_FIT_QUANTILES.pad;
    return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, width: Math.max(40, (maxX - minX) * pad), height: Math.max(40, (maxY - minY) * pad) };
  }
  function distanceFor(width, height) {
    const camera = graph.camera();
    const vertical = Math.tan(THREE.MathUtils.degToRad(camera.fov || 75) / 2);
    const aspect = Math.max(.2, host.clientWidth / Math.max(1, host.clientHeight));
    return Math.max(height / (2 * vertical), width / (2 * vertical * aspect)) * 1.12 + 10;
  }
  function moveCamera(position, target, duration) {
    graph.cameraPosition(position, target, duration);
    if (duration === 0) { scheduleViewSync(); return; }
    // The controls report the tween frame by frame; one more sync after it
    // ends leaves the rings, the labels and the callout on the final frame.
    setTimeout(() => { screenDirty = true; scheduleViewSync(); }, duration + 80);
  }
  function fit(duration = reducedMotion ? 0 : 500) {
    const box = bounds();
    fitDistance = distanceFor(box.width, box.height);
    controls.maxDistance = fitDistance * 2.6;
    moveCamera({ x: box.cx, y: box.cy, z: fitDistance }, { x: box.cx, y: box.cy, z: 0 }, duration);
    syncZoomScale();
  }
  function cameraDistance() {
    const camera = graph.camera();
    return Math.abs(camera.position.z - (controls.target?.z ?? 0)) || fitDistance;
  }
  function focus(id, duration = reducedMotion ? 0 : 520) {
    const node = field?.nodeById.get(id);
    if (!node) return false;
    cameraTaken = true;
    const z = Math.min(cameraDistance(), Math.max(controls.minDistance * 3, fitDistance * .55));
    moveCamera({ x: node.x || 0, y: node.y || 0, z }, { x: node.x || 0, y: node.y || 0, z: 0 }, duration);
    return true;
  }
  function zoom(action, duration = reducedMotion ? 0 : 260) {
    if (action === 'fit' || action === 'reset') { fit(duration); return; }
    const camera = graph.camera(), target = controls.target;
    const factor = action === 'in' ? .7 : 1.42;
    const z = Math.max(controls.minDistance, Math.min(controls.maxDistance, cameraDistance() * factor));
    moveCamera({ x: camera.position.x, y: camera.position.y, z: target.z + z }, { x: target.x, y: target.y, z: target.z }, duration);
  }
  function resize() {
    const width = Math.max(300, Math.floor(host.clientWidth || 900));
    const height = Math.max(360, Math.floor(host.clientHeight || 600));
    graph.width(width).height(height);
    if (points) points.material.uniforms.scale.value = spriteScale();
    syncZoomScale();
    scheduleViewSync();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();

  function render(nextField) {
    field = nextField;
    field.linkById = new Map(field.links.map(link => [link.id, link]));
    settled = false;
    cameraTaken = false;
    tick = 0;
    delete host.dataset.fieldLayout;
    galaxySeedPositions(field);
    denseSurfaceIds = new Set(field.nodes.filter(node => node.ontology === 'surface' && (node.participant_count ?? 0) >= GALAXY_DENSE_ROSTER).map(node => node.id));
    buildObjects();
    restyle();
    const box = bounds();
    fitDistance = distanceFor(box.width, box.height);
    controls.maxDistance = fitDistance * 2.6;
    moveCamera({ x: box.cx, y: box.cy, z: fitDistance }, { x: box.cx, y: box.cy, z: 0 }, 0);
    graph.graphData({ nodes: field.nodes, links: field.links });
    host.dataset.atlasEngine = 'force3d-galaxy';
    host.dataset.fieldNodes = String(field.nodes.length);
    host.dataset.fieldLinks = String(field.links.length);
    if (!pulseFrame && animationRunning) pulseFrame = requestAnimationFrame(pulse);
    return field;
  }
  function select(id) {
    selectedId = id && field?.nodeById.has(id) ? id : null;
    highlight = selectedId ? socialFieldNeighbors(field, selectedId) : null;
    restyle();
    updateLabels();
    return selectedId;
  }
  // spec: { nodes: Set<id>, links: Set<linkId>, colors: Map<id, css colour>,
  // hollow: Set<id>, muted: Set<id>, linkLevel: number } or null. The runtime
  // builds it from one recorded field.
  function setLens(spec) {
    lens = spec && (spec.nodes || spec.links || spec.colors || spec.hollow) ? spec : null;
    if (!field || !points) return lens;
    restyle();
    updateLabels();
    return lens;
  }
  function pause() {
    if (!animationRunning) return;
    animationRunning = false;
    graph.pauseAnimation();
    if (pulseFrame) cancelAnimationFrame(pulseFrame);
    pulseFrame = 0;
  }
  function resume() {
    if (animationRunning) return;
    animationRunning = true;
    graph.resumeAnimation();
    if (!pulseFrame) pulseFrame = requestAnimationFrame(pulse);
  }
  function destroy() {
    resizeObserver.disconnect();
    controls.removeEventListener('change', scheduleViewSync);
    pause();
    disposeObjects();
    labelLayer.remove();
    tooltip.remove();
    localityChip?.remove();
    host.replaceChildren();
    delete host.dataset.atlasEngine;
  }

  return {
    engine: 'force3d-galaxy',
    render,
    select,
    setLens,
    focus,
    fit,
    zoom,
    resize,
    pause,
    resume,
    destroy,
    screenPosition,
    nodeAt,
    isRunning: () => animationRunning,
    settled: () => settled,
    selectedId: () => selectedId,
    lens: () => lens,
    field: () => field,
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
