// Course Hub 3D engine: a viewer, a parts library, picking and an inspector, request packets and guided tours.
// The build strips "export" and concatenates a lesson's scene script after this file into one module,
// so lessons call these functions directly. World units: X along the yard, Z across it, Y up.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
const still = matchMedia("(prefers-reduced-motion: reduce)");
export const reduced = () => still.matches;

const PALETTE = {
  light: { bg: 0xf6f6f3, hi: 0xffffff, mid: 0xf0f0ed, lo: 0xdcdcd8, edgeHi: 0x1f1f24, edgeMid: 0x4f5056, edgeLo: 0x9a9ba0, lit: 0x1a1b1e, off: 0xcfcfcb, accent: 0x3557c9, good: 0x2a8655, bad: 0xc8363c, packet: 0x1a1b1e, ground: 0xb8b8b2 },
  dark: { bg: 0x121213, hi: 0x4a4a50, mid: 0x36363b, lo: 0x26262a, edgeHi: 0xf2f2f5, edgeMid: 0xb4b5bb, edgeLo: 0x75767c, lit: 0xffffff, off: 0x2a2a2c, accent: 0x8aa4ff, good: 0x5cc28c, bad: 0xff6b6b, packet: 0xffffff, ground: 0x3a3a40 },
};
const EDGE_FOR = { hi: "edgeHi", mid: "edgeMid", lo: "edgeLo" };

export function createStage({ home = { target: [0, 30, 0], dir: [1, 0.95, 1.05], zoom: 1 }, viewH = 320, minW = 420, phoneMinW = 330, fallback = "../" } = {}) {
  const viewer = document.getElementById("viewer");
  const panel = document.getElementById("panel");
  const readout = document.getElementById("readout");
  const hint = document.getElementById("hint");
  const S = { viewer, panel, PARTS: {}, ticks: [], themeHooks: [], tourSteps: [] };

  // ---------- renderer ----------
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" }); }
  catch (e) {
    viewer.innerHTML = `<p class="fallback">This 3D figure needs WebGL, which this browser or device does not provide. <a href="${fallback}">Open the 2D version</a>.</p>`;
    throw e;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute("aria-label", "3D figure: drag to rotate, scroll to zoom, arrow keys to pan");
  viewer.appendChild(renderer.domElement);
  const labels = new CSS2DRenderer();
  Object.assign(labels.domElement.style, { position: "absolute", inset: "0", pointerEvents: "none", zIndex: "2" });
  viewer.appendChild(labels.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -3000, 5000);
  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.09, minZoom: 0.5, maxZoom: 8, maxPolarAngle: Math.PI * 0.47, screenSpacePanning: true, autoRotateSpeed: 0.8 });
  controls.listenToKeyEvents(renderer.domElement);
  const HOME = { t: V(...home.target), dir: V(...home.dir).normalize(), zoom: home.zoom || 1 };
  controls.target.copy(HOME.t);
  camera.position.copy(HOME.t).addScaledVector(HOME.dir, 1200);
  camera.zoom = HOME.zoom;
  const world = new THREE.Group();
  scene.add(world);
  Object.assign(S, { THREE, renderer, scene, camera, controls, world });

  // ---------- theme ----------
  const M = {
    hi: new THREE.MeshLambertMaterial(), mid: new THREE.MeshLambertMaterial(), lo: new THREE.MeshLambertMaterial(),
    edgeHi: new THREE.LineBasicMaterial(), edgeMid: new THREE.LineBasicMaterial(), edgeLo: new THREE.LineBasicMaterial(),
    edgeSel: new THREE.LineBasicMaterial(), edgeHover: new THREE.LineBasicMaterial({ transparent: true, opacity: 0.75 }),
    packet: new THREE.MeshBasicMaterial(), packetAlt: new THREE.MeshBasicMaterial(), packetBad: new THREE.MeshBasicMaterial(),
    ring: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9 }),
  };
  S.M = M;
  const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1);
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.position.set(-220, 380, 140);
  scene.add(hemi, sun);
  const lamps = [];
  const isDark = () => (document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
  S.isDark = isDark;
  function applyTheme() {
    const p = PALETTE[isDark() ? "dark" : "light"];
    S.PAL = p;
    scene.background = new THREE.Color(p.bg);
    for (const k of ["hi", "mid", "lo", "edgeHi", "edgeMid", "edgeLo"]) M[k].color.set(p[k]);
    M.edgeSel.color.set(p.accent); M.edgeHover.color.set(p.accent);
    M.packet.color.set(p.packet); M.packetAlt.color.set(p.accent); M.packetBad.color.set(p.bad); M.ring.color.set(p.packet);
    hemi.groundColor.set(p.ground);
    hemi.intensity = isDark() ? 0.55 : 0.75; sun.intensity = isDark() ? 1.25 : 1.6;
    lamps.forEach((l) => l.set(l.state));
    S.themeHooks.forEach((f) => f(p));
  }
  S.onTheme = (f) => { S.themeHooks.push(f); if (S.PAL) f(S.PAL); };

  // ---------- geometry helpers ----------
  const geoCache = new Map(), edgeCache = new Map();
  const boxGeo = (w, h, d, r) => {
    const key = [w, h, d, r].join(",");
    if (!geoCache.has(key)) geoCache.set(key, r > 0 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01)) : new THREE.BoxGeometry(w, h, d));
    return geoCache.get(key);
  };
  const edgesOf = (geo, angle = 35) => { if (!edgeCache.has(geo)) edgeCache.set(geo, new THREE.EdgesGeometry(geo, angle)); return edgeCache.get(geo); };
  function withEdges(mesh, tone) {
    const edge = new THREE.LineSegments(edgesOf(mesh.geometry, 38), M[EDGE_FOR[tone] || "edgeMid"]);
    edge.userData.base = edge.material;
    mesh.add(edge);
    mesh.userData.edge = edge;
    return mesh;
  }
  // a box standing on y0, centred on x, z
  S.box = (w, h, d, { x = 0, y0 = 0, z = 0, tone = "mid", r = 0.6, mat } = {}) => {
    const mesh = new THREE.Mesh(boxGeo(w, h, d, r), mat || M[tone]);
    mesh.position.set(x, y0 + h / 2, z);
    return withEdges(mesh, tone);
  };
  S.cyl = (rad, h, { x = 0, y0 = 0, z = 0, tone = "mid", seg = 24, axis = "y", mat } = {}) => {
    const key = "c" + rad + "," + h + "," + seg;
    if (!geoCache.has(key)) geoCache.set(key, new THREE.CylinderGeometry(rad, rad, h, seg));
    const mesh = new THREE.Mesh(geoCache.get(key), mat || M[tone]);
    if (axis === "x") { mesh.rotation.z = Math.PI / 2; mesh.position.set(x + h / 2, y0, z); }
    else if (axis === "z") { mesh.rotation.x = Math.PI / 2; mesh.position.set(x, y0, z + h / 2); }
    else mesh.position.set(x, y0 + h / 2, z);
    return withEdges(mesh, tone);
  };
  S.lines = (pairs, tone = "edgeLo") => new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pairs.flat()), M[tone]);
  S.rect = (x0, z0, x1, z1, y, tone = "edgeLo") => S.lines([[V(x0, y, z0), V(x1, y, z0)], [V(x1, y, z0), V(x1, y, z1)], [V(x1, y, z1), V(x0, y, z1)], [V(x0, y, z1), V(x0, y, z0)]], tone);
  // a status lamp: state "on" | "off" | "bad" | "good" | "accent"
  S.lamp = (x, y0, z, { r = 1.6, state = "on" } = {}) => {
    const key = "l" + r;
    if (!geoCache.has(key)) geoCache.set(key, new THREE.CylinderGeometry(r, r, 1.4, 16));
    const mat = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geoCache.get(key), mat);
    mesh.position.set(x, y0 + 0.7, z);
    const l = { mesh, mat, state, set(s) { l.state = s; const p = S.PAL || PALETTE.light; mat.color.set(s === "on" ? p.lit : s === "bad" ? p.bad : s === "good" ? p.good : s === "accent" ? p.accent : p.off); } };
    lamps.push(l);
    l.set(state);
    return l;
  };
  // a ribbed crate (a pod). Its origin is the centre of its base.
  S.crate = ({ w = 22, h = 15, d = 32, lit = false, ribs = 7, tone = "hi" } = {}) => {
    const g = new THREE.Group();
    const body = S.box(w, h, d, { tone, r: 0.8, mat: lit ? new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x2a2a2a }) : undefined });
    g.add(body);
    const pairs = [];
    for (let i = 1; i <= ribs; i++) { const z = -d / 2 + (i * d) / (ribs + 1); pairs.push([V(w / 2 + 0.05, 1.2, z), V(w / 2 + 0.05, h - 1.2, z)]); }
    for (const dx of [-w / 4, 0, w / 4]) pairs.push([V(dx, 1.2, d / 2 + 0.05), V(dx, h - 1.2, d / 2 + 0.05)]);
    g.add(S.lines(pairs, "edgeLo"));
    g.userData.body = body;
    return g;
  };
  // a housing: plinth, body, optional seam line
  S.housing = ({ x, z, w, d, h, y0 = 0, tone = "mid", plinth = true }) => {
    const g = new THREE.Group();
    if (plinth) g.add(S.box(w + 3, 2, d + 3, { x, y0, z, tone: "lo", r: 1 }));
    g.add(S.box(w, h - (plinth ? 2 : 0), d, { x, y0: y0 + (plinth ? 2 : 0), z, tone, r: 1.6 }));
    return g;
  };
  // an open-topped box: a floor and four walls, so you can look inside
  S.openBox = ({ x, z, w, d, h, y0 = 0, t = 1.6, tone = "hi" }) => {
    const g = new THREE.Group();
    g.add(S.box(w, t, d, { x, y0, z, tone: "mid", r: 0.4 }));
    g.add(S.box(w, h, t, { x, y0, z: z - d / 2 + t / 2, tone, r: 0.3 }), S.box(w, h, t, { x, y0, z: z + d / 2 - t / 2, tone, r: 0.3 }));
    g.add(S.box(t, h, d - 2 * t, { x: x - w / 2 + t / 2, y0, z, tone, r: 0.3 }), S.box(t, h, d - 2 * t, { x: x + w / 2 - t / 2, y0, z, tone, r: 0.3 }));
    return g;
  };
  // a node tray on feet, with slot outlines
  S.tray = ({ x, z, w, d, slots = [], slotSize = [25, 35], top = 11 }) => {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial();
    g.add(S.box(w, top - 4, d, { x, y0: 4, z, tone: "mid", r: 1.5, mat }));
    for (const [dx, dz] of [[-w / 2 + 6, -d / 2 + 6], [w / 2 - 6, -d / 2 + 6], [-w / 2 + 6, d / 2 - 6], [w / 2 - 6, d / 2 - 6]]) g.add(S.cyl(3, 4, { x: x + dx, z: z + dz, tone: "lo" }));
    for (const [sx, sz] of slots) g.add(S.rect(sx - slotSize[0] / 2, sz - slotSize[1] / 2, sx + slotSize[0] / 2, sz + slotSize[1] / 2, top + 0.05));
    g.userData.mat = mat;
    g.userData.setDown = (down) => mat.color.set(down ? S.PAL.lo : S.PAL.mid);
    S.onTheme(() => g.userData.setDown(g.userData.down));
    return g;
  };
  // a flat strip in the floor, from a list of axis-aligned segments
  S.track = (segs, { width = 5, y = 0, tone = "lo" } = {}) => {
    const g = new THREE.Group();
    for (const [[x0, z0], [x1, z1]] of segs) {
      const w = Math.abs(x1 - x0) + width, d = Math.abs(z1 - z0) + width;
      g.add(S.box(w, 0.6, d, { x: (x0 + x1) / 2, y0: y, z: (z0 + z1) / 2, tone, r: 0 }));
    }
    return g;
  };
  // the base plate on feet with two rails optional
  S.plate = ({ x = 0, z = 0, w, d, rails = null }) => {
    const g = new THREE.Group();
    g.add(S.box(w, 12, d, { x, y0: -12, z, tone: "mid", r: 3 }));
    for (const [dx, dz] of [[-w / 2 + 22, -d / 2 + 22], [w / 2 - 22, -d / 2 + 22], [-w / 2 + 22, d / 2 - 22], [w / 2 - 22, d / 2 - 22]]) g.add(S.cyl(6, 5, { x: x + dx, y0: -17, z: z + dz, tone: "lo" }));
    return g;
  };

  // ---------- parts, labels ----------
  S.part = (id, info) => { S.PARTS[id] = { id, meshes: [], kind: "", title: id, desc: "", yaml: "", actions: [], anchor: V(0, 0, 0), ...info }; return id; };
  S.own = (id, ...objs) => { for (const o of objs) { o.traverse((c) => { if (c.isMesh) { c.userData.part = id; S.PARTS[id].meshes.push(c); } }); if (!o.parent) world.add(o); } return objs[0]; };
  const labelEls = {};
  S.labels = labelEls;
  S.label = (id, text, { small = false, anchor, lod = 0 } = {}) => {
    const el = document.createElement("div");
    el.className = "lbl" + (small ? " is-small" : "");
    el.textContent = text;
    el.addEventListener("click", (e) => { e.stopPropagation(); S.select(id, true); });
    const obj = new CSS2DObject(el);
    obj.position.copy(anchor || S.PARTS[id].anchor);
    scene.add(obj);
    labelEls[id] = { el, obj, small, lod, show: true };
    return labelEls[id];
  };
  S.setLabel = (id, text, { bad = false, show = true } = {}) => {
    const L = labelEls[id]; if (!L) return;
    if (L.el.textContent !== text) L.el.textContent = text;
    L.el.classList.toggle("is-bad", bad);
    L.show = show;
  };

  // ---------- picking, hover, selection ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let selected = null, hovered = null;
  const visibleChain = (o) => { for (let c = o; c; c = c.parent) if (!c.visible) return false; return true; };
  function pick(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    for (const h of ray.intersectObjects(world.children, true)) if (h.object.isMesh && visibleChain(h.object) && h.object.userData.part) return h.object.userData.part;
    return null;
  }
  const paint = (id, mat) => { if (!id || !S.PARTS[id]) return; for (const m of S.PARTS[id].meshes) { const e = m.userData.edge; if (e) e.material = mat || e.userData.base; } };
  function setHover(id) {
    if (id === hovered) return;
    if (hovered && hovered !== selected) paint(hovered, null);
    hovered = id;
    if (id && id !== selected) paint(id, M.edgeHover);
    renderer.domElement.style.cursor = id ? "pointer" : "grab";
    if (hint) hint.textContent = id ? titleOf(id) + " · click for details" : "Drag to rotate · click a part";
  }
  const titleOf = (id) => { const p = S.PARTS[id]; return typeof p.title === "function" ? p.title() : p.title; };
  S.select = (id, fly = false) => {
    if (selected) { paint(selected, null); labelEls[selected]?.el.classList.remove("is-sel"); }
    selected = id && S.PARTS[id] ? id : null;
    if (selected) { paint(selected, M.edgeSel); labelEls[selected]?.el.classList.add("is-sel"); if (fly) S.focus(selected); }
    S.renderPanel();
  };
  S.selected = () => selected;
  let downAt = null;
  renderer.domElement.addEventListener("pointerdown", (e) => { downAt = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener("pointerup", (e) => { if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) <= 5) { S.stopTour?.(); S.select(pick(e), true); } });
  renderer.domElement.addEventListener("pointermove", (e) => { if (!e.buttons) setHover(pick(e)); });
  renderer.domElement.addEventListener("pointerleave", () => setHover(null));
  renderer.domElement.addEventListener("dblclick", (e) => { const id = pick(e); if (id) { S.select(id); S.focus(id, 3.4); } });
  // selection frame
  const selBox = new THREE.Box3(), tmpBox = new THREE.Box3();
  const selFrame = new THREE.Box3Helper(selBox, 0x3557c9);
  Object.assign(selFrame.material, { depthTest: false, transparent: true });
  selFrame.renderOrder = 10;
  selFrame.visible = false;
  scene.add(selFrame);
  function fitFrame() {
    const p = selected && S.PARTS[selected];
    if (!p || p.noFrame) { selFrame.visible = false; return; }
    selBox.makeEmpty();
    for (const m of p.meshes) if (visibleChain(m)) selBox.union(tmpBox.setFromObject(m));
    if (selBox.isEmpty()) { selFrame.visible = false; return; }
    selBox.expandByScalar(2.5);
    selFrame.visible = true;
    selFrame.material.color.set(S.PAL.accent);
    selFrame.material.opacity = 0.6 + 0.35 * Math.sin(performance.now() / 260);
  }

  // ---------- inspector panel ----------
  S.overview = () => "";
  S.renderPanel = () => {
    const p = selected && S.PARTS[selected];
    const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
    if (!p) {
      const ids = Object.values(S.PARTS).filter((q) => q.listed !== false && !q.dynamic);
      panel.innerHTML = `<span class="kind">Overview</span>${S.overview()}
        <div class="parts">${ids.map((q) => `<button type="button" data-pick="${q.id}">${esc(titleOf(q.id))}</button>`).join("")}</div>
        <p class="stats" id="stats"></p>`;
    } else {
      const desc = typeof p.desc === "function" ? p.desc() : p.desc;
      const yaml = typeof p.yaml === "function" ? p.yaml() : p.yaml;
      const acts = (typeof p.actions === "function" ? p.actions() : p.actions) || [];
      panel.innerHTML = `<span class="kind">${esc(p.kind)}</span><h2>${esc(titleOf(p.id))}</h2><p>${desc}</p>
        <div class="actions">${acts.map((a, i) => `<button type="button" data-act="${i}"${a.danger ? ' class="danger"' : ""}>${esc(a.label)}</button>`).join("")}<button type="button" data-back>← Overview</button></div>
        ${yaml ? `<pre>${esc(yaml)}</pre>` : ""}`;
      panel.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => { acts[+b.dataset.act].run(); S.renderPanel(); }));
    }
    panel.querySelectorAll("[data-pick]").forEach((b) => b.addEventListener("click", () => S.select(b.dataset.pick, true)));
    panel.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", () => { S.select(null); S.home(); }));
    S.afterPanel?.(panel);
  };

  // ---------- camera ----------
  let tween = null;
  S.flyTo = ({ target, dir, zoom }) => {
    const toT = target ? target.clone() : controls.target.clone();
    const d = (dir ? dir.clone() : camera.position.clone().sub(controls.target)).normalize();
    const toP = toT.clone().addScaledVector(d, 1200);
    const toZ = zoom ?? camera.zoom;
    if (reduced()) { controls.target.copy(toT); camera.position.copy(toP); camera.zoom = toZ; camera.updateProjectionMatrix(); return; }
    tween = { from: { t: controls.target.clone(), p: camera.position.clone(), z: camera.zoom }, to: { t: toT, p: toP, z: toZ }, k: 0 };
  };
  S.focus = (id, zoom) => {
    const p = S.PARTS[id];
    const a = typeof p.anchor === "function" ? p.anchor() : p.anchor;
    S.flyTo({ target: a.clone().setY(Math.max(6, a.y - 10)), zoom: zoom || p.zoom || 2.2 });
  };
  S.home = () => S.flyTo({ target: HOME.t, dir: HOME.dir, zoom: HOME.zoom });
  S.views = { iso: HOME.dir, top: V(0.0001, 1, 0.0002), front: V(0, 0.42, 1), side: V(1, 0.42, 0) };
  document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => S.flyTo({ target: HOME.t, dir: S.views[b.dataset.view], zoom: HOME.zoom })));
  const spin = document.getElementById("spin");
  spin?.addEventListener("click", () => { controls.autoRotate = !controls.autoRotate; spin.setAttribute("aria-pressed", String(controls.autoRotate)); });
  const lb = document.getElementById("labels");
  lb?.addEventListener("click", () => { const off = !viewer.classList.toggle("labels-off"); lb.setAttribute("aria-pressed", String(off)); });
  document.getElementById("theme")?.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("coursehub:theme", next); } catch (e) {}
    applyTheme();
  });
  document.getElementById("full")?.addEventListener("click", () => { if (document.fullscreenElement) document.exitFullscreen(); else viewer.requestFullscreen?.().catch(() => {}); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);

  // ---------- packets: dots that travel 3D polylines ----------
  const packetGeo = new THREE.SphereGeometry(1.8, 12, 8);
  const ringGeo = new THREE.TorusGeometry(3, 0.45, 6, 20);
  S.packets = ({ speed = 120, onArrive } = {}) => {
    const list = [];
    return {
      list,
      add(pts, data = {}) {
        const mesh = new THREE.Mesh(packetGeo, data.bad ? M.packetBad : data.alt ? M.packetAlt : M.packet);
        if (data.ring) { const r = new THREE.Mesh(ringGeo, M.ring); r.rotation.x = Math.PI / 2; mesh.add(r); }
        mesh.position.copy(pts[0]);
        scene.add(mesh);
        const total = pts.slice(1).reduce((s, b, i) => s + b.distanceTo(pts[i]), 0);
        list.push({ pts, s: 0, total, mesh, data });
      },
      step(dt) {
        for (let i = list.length - 1; i >= 0; i--) {
          const p = list[i];
          p.s += (p.data.speed || speed) * dt;
          if (p.s >= p.total) { scene.remove(p.mesh); list.splice(i, 1); onArrive?.(p.data); continue; }
          let s = p.s;
          for (let k = 1; k < p.pts.length; k++) { const l = p.pts[k].distanceTo(p.pts[k - 1]); if (s <= l) { p.mesh.position.lerpVectors(p.pts[k - 1], p.pts[k], l ? s / l : 1); break; } s -= l; }
          p.mesh.visible = !(p.data.hide && p.data.hide(p.mesh.position));
          if (p.data.fade) p.mesh.scale.setScalar(Math.max(0.05, Math.min(1, (p.total - p.s) / p.data.fade)));
        }
      },
      clear() { list.forEach((p) => scene.remove(p.mesh)); list.length = 0; },
    };
  };

  // ---------- guided tours ----------
  const bar = document.getElementById("tourbar");
  let tour = null;
  S.setTour = (steps) => { S.tourSteps = steps; bar.hidden = false; renderBar(); };
  function renderBar() {
    if (!tour) { bar.innerHTML = `<button type="button" data-tour="play">▶ Guided tour</button><span class="tour-text">${S.tourSteps.length} steps: the camera flies through the story and runs it for you.</span>`; }
    else {
      const st = S.tourSteps[tour.i];
      bar.innerHTML = `<button type="button" data-tour="prev" aria-label="Previous step">‹</button><button type="button" data-tour="pause">${tour.paused ? "▶" : "❚❚"}</button><button type="button" data-tour="next" aria-label="Next step">›</button><span class="tour-n">${tour.i + 1}/${S.tourSteps.length}</span><span class="tour-text">${st.say}</span><button type="button" data-tour="stop" aria-label="End tour">✕</button>`;
    }
    bar.querySelectorAll("[data-tour]").forEach((b) => b.addEventListener("click", () => {
      const a = b.dataset.tour;
      if (a === "play") S.playTour(0);
      if (a === "stop") S.stopTour();
      if (a === "pause") { tour.paused = !tour.paused; renderBar(); }
      if (a === "next") goStep(Math.min(S.tourSteps.length - 1, tour.i + 1));
      if (a === "prev") goStep(Math.max(0, tour.i - 1));
    }));
  }
  function goStep(i) {
    tour.i = i; tour.t = 0;
    const st = S.tourSteps[i];
    st.run?.();
    if (st.focus) { S.select(st.select === false ? null : st.focus, false); S.focus(st.focus, st.zoom); }
    else if (st.target) { S.select(null); S.flyTo({ target: V(...st.target), dir: st.dir ? V(...st.dir) : null, zoom: st.zoom }); }
    else if (st.home) { S.select(null); S.home(); }
    renderBar();
  }
  S.playTour = (i = 0) => { tour = { i: 0, t: 0, paused: false }; S.onTourStart?.(); goStep(i); };
  S.stopTour = () => { if (!tour) return; tour = null; renderBar(); };
  S.touring = () => !!tour;
  function stepTour(dt) {
    if (!tour || tour.paused) return;
    tour.t += dt;
    const st = S.tourSteps[tour.i];
    const ready = !st.until || st.until();
    if (tour.t >= (st.hold || 5) && ready) { if (tour.i + 1 < S.tourSteps.length) goStep(tour.i + 1); else { S.stopTour(); S.home(); } }
  }

  // ---------- readout, sizing, loop ----------
  S.say = (t) => { if (readout && readout.textContent !== t) readout.textContent = t; };
  S.onTick = (f) => S.ticks.push(f);
  function resize() {
    const w = viewer.clientWidth, h = viewer.clientHeight;
    renderer.setSize(w, h, false);
    Object.assign(renderer.domElement.style, { width: w + "px", height: h + "px" });
    labels.setSize(w, h);
    const aspect = w / h;
    const vw = Math.max(viewH * aspect, w < 600 ? phoneMinW : minW);
    const vh = vw / aspect;
    Object.assign(camera, { left: -vw / 2, right: vw / 2, top: vh / 2, bottom: -vh / 2 });
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(viewer);
  resize();
  let visible = true, last = 0, looping = false, fpsAcc = 0, fpsN = 0;
  S.fps = 0;
  const start = () => { if (!looping) { looping = true; last = 0; requestAnimationFrame(loop); } };
  new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) start(); }, { rootMargin: "100px" }).observe(viewer);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && visible) start(); });
  function loop(t) {
    if (!visible || document.hidden) { looping = false; return; }
    const dt = last ? Math.min((t - last) / 1000, 1 / 30) : 1 / 60;
    if (last) { fpsAcc += t - last; fpsN++; if (fpsAcc > 1000) { S.fps = Math.round((fpsN * 1000) / fpsAcc); fpsAcc = 0; fpsN = 0; } }
    last = t;
    for (const f of S.ticks) f(dt);
    stepTour(dt);
    if (tween) {
      tween.k = Math.min(1, tween.k + dt / 0.75);
      const e = 1 - Math.pow(1 - tween.k, 3);
      controls.target.lerpVectors(tween.from.t, tween.to.t, e);
      camera.position.lerpVectors(tween.from.p, tween.to.p, e);
      camera.zoom = tween.from.z + (tween.to.z - tween.from.z) * e;
      camera.updateProjectionMatrix();
      if (tween.k >= 1) tween = null;
    }
    controls.update();
    // labels: hide the small ones until zoomed in, and all of them on a crowded phone view
    const crowded = viewer.clientWidth < 600 && camera.zoom < 1.45;
    viewer.classList.toggle("labels-crowded", crowded);
    for (const id in labelEls) { const L = labelEls[id]; L.obj.visible = (L.show && camera.zoom >= L.lod) || id === selected; }
    fitFrame();
    renderer.render(scene, camera);
    labels.render(scene, camera);
    const st = document.getElementById("stats");
    if (st) { const s = `Rendering at ${S.fps || "…"} fps on this device · ${renderer.info.render.calls} draw calls · ${renderer.info.render.triangles} triangles`; if (st.textContent !== s) st.textContent = s; }
    requestAnimationFrame(loop);
  }
  S.start = () => { applyTheme(); S.renderPanel(); if (S.tourSteps.length) renderBar(); start(); };
  return S;
}

// a spring that eases one value toward a target
export function springTo(o, key, vkey, target, dt, k) {
  if (reduced()) { o[key] = target; o[vkey] = 0; return; }
  const c = 2 * Math.sqrt(k);
  for (let n = 0; n < 4; n++) { o[vkey] += ((target - o[key]) * k - o[vkey] * c) * dt / 4; o[key] += o[vkey] * dt / 4; }
}
export const easeTo = (v, to, dt, tau) => (reduced() ? to : v + (to - v) * (1 - Math.exp(-dt / tau)));
