import * as THREE from '../vendor/three-0.186.0.module.js';
import { buildSocialFieldModel, SOCIAL_FIELD_RADIUS, socialFieldClusterAnchor, socialFieldNeighbors, isSurfaceNode } from './social-field.js';

const FORCE_GRAPH_VENDOR = '../vendor/3d-force-graph-1.80.0.min.js';
const LINK_SEGMENTS = 18;
const NODE_SHAPES = Object.freeze({ person: 'sphere', surface: 'octahedron' });
const EVIDENCE_COLORS = Object.freeze({
  official: '#ffd061',
  confirmed: '#ffd061',
  primary_public: '#69b7ff',
  reported: '#b48eff',
  judgment: '#8f94a1',
  derived: '#6a707d',
  context: '#596170'
});

let vendorPromise = null;
let heatTexture = null;

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

function radialHeatTexture() {
  if (heatTexture) return heatTexture;
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
  heatTexture = new THREE.CanvasTexture(canvas);
  return heatTexture;
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

function makeNodeObject(node) {
  const group = new THREE.Group();
  const size = 2.3 + node.heat * 2.8;
  const coreMaterial = new THREE.MeshLambertMaterial({
    color: new THREE.Color(node.heat_color),
    transparent: true,
    opacity: .78 + node.heat * .2
  });
  coreMaterial.userData.baseOpacity = coreMaterial.opacity;
  const core = new THREE.Mesh(makeCoreGeometry(node, size), coreMaterial);
  core.userData.role = 'core';
  group.add(core);

  const haloMaterial = new THREE.SpriteMaterial({
    map: radialHeatTexture(),
    color: new THREE.Color(node.heat_color),
    transparent: true,
    opacity: .08 + node.heat * .34,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  haloMaterial.userData.baseOpacity = haloMaterial.opacity;
  const halo = new THREE.Sprite(haloMaterial);
  const haloSize = 12 + Math.pow(node.heat, .72) * 58;
  halo.scale.set(haloSize, haloSize, 1);
  halo.userData.role = 'heat';
  group.add(halo);
  group.userData.nodeId = node.id;
  return group;
}
function makeLinkObject(link, reducedMotion) {
  const group = new THREE.Group();
  const color = EVIDENCE_COLORS[link.evidence_class] ?? EVIDENCE_COLORS.context;
  const opacity = link.topology_only ? .12 + link.heat * .12 : .18 + link.evidence_weight * .24 + link.heat * .18;
  const positions = new Float32Array(LINK_SEGMENTS * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  material.userData.baseOpacity = opacity;
  const line = new THREE.Line(geometry, material);
  line.userData.role = 'line';
  group.add(line);

  const particleCount = reducedMotion || link.topology_only ? 0 : (link.heat > .72 ? 2 : link.heat > .42 ? 1 : 0);
  const particleGeometry = new THREE.SphereGeometry(.7 + link.heat * .7, 5, 4);
  for (let index = 0; index < particleCount; index += 1) {
    const particleMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .88, depthWrite: false, blending: THREE.AdditiveBlending });
    particleMaterial.userData.baseOpacity = .88;
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    particle.userData.role = 'particle';
    particle.userData.phase = index / Math.max(1, particleCount);
    group.add(particle);
  }
  group.userData.positions = positions;
  group.userData.lastEndpoints = null;
  group.userData.linkId = link.id;
  // Group callbacks are not guaranteed to run in Three's render list; attach
  // the animator to the rendered line so particles keep moving with a frozen layout.
  if (!reducedMotion && particleCount) line.onBeforeRender = () => updateParticles(group, link);
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
  const lift = (link.topology_only ? 6 : 11) + link.heat * 26;
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

function updateParticles(group, link) {
  const positions = group.userData.positions;
  const now = performance.now() * (.000035 + link.heat * .000035);
  for (const child of group.children) {
    if (child.userData.role !== 'particle') continue;
    const progress = (now + child.userData.phase) % 1;
    const scaled = progress * (LINK_SEGMENTS - 1);
    const index = Math.min(LINK_SEGMENTS - 2, Math.floor(scaled));
    const t = scaled - index, a = index * 3, b = (index + 1) * 3;
    child.position.set(
      positions[a] + (positions[b] - positions[a]) * t,
      positions[a + 1] + (positions[b + 1] - positions[a + 1]) * t,
      positions[a + 2] + (positions[b + 2] - positions[a + 2]) * t
    );
  }
}
function shellForce(radius = SOCIAL_FIELD_RADIUS, strength = .075) {
  let nodes = [];
  function force(alpha) {
    for (const node of nodes) {
      const x = node.x || .001, y = node.y || .001, z = node.z || .001;
      const current = Math.hypot(x, y, z) || 1;
      const target = radius * (isSurfaceNode(node) ? 1.035 : 1);
      const gain = ((target - current) / current) * strength * Math.max(.18, alpha);
      node.vx += x * gain; node.vy += y * gain; node.vz += z * gain;
    }
  }
  force.initialize = nextNodes => { nodes = nextNodes ?? []; };
  return force;
}

function clusterForce(radius = SOCIAL_FIELD_RADIUS, strength = .008) {
  let nodes = [];
  function force(alpha) {
    for (const node of nodes) {
      const anchor = socialFieldClusterAnchor(node.cluster, radius);
      if (!anchor) continue;
      const gain = strength * Math.max(.12, alpha) * (.65 + node.heat * .35);
      node.vx += (anchor.x - node.x) * gain;
      node.vy += (anchor.y - node.y) * gain;
      node.vz += (anchor.z - node.z) * gain;
    }
  }
  force.initialize = nextNodes => { nodes = nextNodes ?? []; };
  return force;
}

function makeShell(radius) {
  const geometry = new THREE.SphereGeometry(radius * 1.015, 44, 30);
  const material = new THREE.MeshBasicMaterial({ color: 0x55708f, wireframe: true, transparent: true, opacity: .032, depthWrite: false });
  const shell = new THREE.Mesh(geometry, material);
  shell.userData.cliffordShell = true;
  return shell;
}
function endpointId(value) { return typeof value === 'object' && value ? value.id : value; }

function setObjectStrength(object, factor, selected = false) {
  if (!object) return;
  object.scale.setScalar(selected ? 1.42 : 1);
  object.traverse(child => {
    const materials = child.material ? (Array.isArray(child.material) ? child.material : [child.material]) : [];
    for (const material of materials) {
      if (!material.transparent && factor < 1) material.transparent = true;
      const base = material.userData.baseOpacity ?? material.opacity ?? 1;
      material.opacity = Math.max(.012, base * factor);
      material.needsUpdate = true;
    }
  });
}

function tooltipForNode(node) {
  const heat = Math.round((node.heat ?? 0) * 100);
  const repeat = node.strongest_repeat ? ` · ${node.strongest_repeat}× repeated co-surface` : '';
  return `<div class="atlas-3d-tooltip"><strong>${escapeHtml(node.label)}</strong><br><span>reinforcement heat ${heat}%${repeat}</span></div>`;
}

function tooltipForLink(link) {
  const evidence = escapeHtml(link.evidence_class || 'context');
  const claim = link.claim ? `<br><span>${escapeHtml(link.claim)}</span>` : '';
  return `<div class="atlas-3d-tooltip"><strong>${evidence}</strong>${claim}<br><small>arc motion encodes field activity, not causality</small></div>`;
}

export async function createWebGlAtlasRenderer({ host, onNodeSelect, onLinkSelect, onInteraction, reducedMotion = false } = {}) {
  if (!host || !supportsWebGlAtlas()) throw new Error('WebGL atlas is unavailable');
  const ForceGraph3D = await loadForceGraphVendor();
  let field = null, selectedId = null;
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
    .linkThreeObject(link => makeLinkObject(link, reducedMotion))
    .linkPositionUpdate((object, { start, end }, link) => {
      if (vectorChanged(object.userData.lastEndpoints, start, end)) rebuildArc(object, start, end, link);
      return true;
    })
    .warmupTicks(0)
    .cooldownTicks(0);

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
  graph.scene().add(shell);

  function applyHighlight(id) {
    if (!field) return;
    const activeNodes = id ? socialFieldNeighbors(field, id) : null;
    for (const node of field.nodes) {
      const active = !activeNodes || activeNodes.has(node.id);
      setObjectStrength(node.__threeObj, active ? 1 : .09, node.id === id);
    }
    for (const link of field.links) {
      const source = endpointId(link.source), target = endpointId(link.target);
      const active = !id || source === id || target === id;
      setObjectStrength(link.__threeObj, active ? (id ? 1 : .78) : .05, false);
    }
  }
  function focus(nodeId, duration = reducedMotion ? 0 : 650) {
    const node = field?.nodes.find(item => item.id === nodeId);
    if (!node || !Number.isFinite(node.x) || !Number.isFinite(node.y) || !Number.isFinite(node.z)) return;
    const distance = 92;
    const length = Math.hypot(node.x, node.y, node.z) || 1;
    const ratio = 1 + distance / length;
    graph.cameraPosition({ x: node.x * ratio, y: node.y * ratio, z: node.z * ratio }, { x: node.x, y: node.y, z: node.z }, duration);
  }

  graph.onNodeHover(node => {
    host.style.cursor = node ? 'pointer' : 'grab';
    applyHighlight(node?.id || selectedId);
  });
  graph.onNodeClick(node => {
    selectedId = node.id;
    applyHighlight(selectedId);
    focus(selectedId);
    onInteraction?.('select');
    onNodeSelect?.(selectedId);
  });
  graph.onLinkClick(link => {
    onInteraction?.('select');
    onLinkSelect?.(link.id);
  });
  graph.onBackgroundClick(() => applyHighlight(selectedId));
  controls.addEventListener('change', () => onInteraction?.('zoom'));
  graph.onNodeDragEnd(() => onInteraction?.('drag'));

  function resize() {
    const width = Math.max(320, Math.floor(host.clientWidth || 900));
    const height = Math.max(420, Math.floor(host.clientHeight || 650));
    graph.width(width).height(height);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();
  let lastMode = null;
  function render(model, { selectedNodeId = null } = {}) {
    field = buildSocialFieldModel(model);
    graph.graphData({ nodes: field.nodes, links: field.links });
    selectedId = selectedNodeId && model.nodeById.has(selectedNodeId) ? selectedNodeId : null;
    requestAnimationFrame(() => applyHighlight(selectedId));
    if (lastMode !== model.mode) {
      lastMode = model.mode;
      graph.cameraPosition({ x: 0, y: 0, z: field.radius * 3.55 }, { x: 0, y: 0, z: 0 }, reducedMotion ? 0 : 520);
    }
    host.dataset.atlasEngine = 'force3d';
    return field;
  }

  function select(nodeId) {
    selectedId = nodeId && field?.nodes.some(node => node.id === nodeId) ? nodeId : null;
    applyHighlight(selectedId);
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
  function pause() { graph.pauseAnimation(); }
  function resume() { graph.resumeAnimation(); }
  function destroy() {
    resizeObserver.disconnect();
    graph.pauseAnimation();
    graph.scene().remove(shell);
    host.replaceChildren();
    delete host.dataset.atlasEngine;
  }

  return {
    engine: 'force3d',
    render,
    select,
    focus,
    zoom,
    resize,
    pause,
    resume,
    destroy,
    field: () => field,
    graph: () => graph
  };
}
