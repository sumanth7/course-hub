// Kubernetes cluster in 3D: the container-yard figure as a real scene you can orbit, zoom and take apart.
// World units follow the 2D figure: X along the yard, Z across it, Y up.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const viewer = document.getElementById("viewer");
const panel = document.getElementById("panel");
const readout = document.getElementById("readout");
const hint = document.getElementById("hint");
const still = matchMedia("(prefers-reduced-motion: reduce)");

// ---------- renderer, or a plain fallback ----------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
} catch (e) {
  viewer.innerHTML = '<p class="fallback">This 3D figure needs WebGL, which this browser or device does not provide. <a href="../../kubernetes/cluster-yard/">Open the 2D version</a>.</p>';
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.domElement.tabIndex = 0;
renderer.domElement.setAttribute("aria-label", "3D cluster: drag to rotate, scroll to zoom");
viewer.appendChild(renderer.domElement);
const labels = new CSS2DRenderer();
labels.domElement.style.position = "absolute";
labels.domElement.style.inset = "0";
labels.domElement.style.pointerEvents = "none";
viewer.appendChild(labels.domElement);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -2000, 4000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.09;
controls.minZoom = 0.55;
controls.maxZoom = 7;
controls.maxPolarAngle = Math.PI * 0.47;
controls.screenSpacePanning = true;
controls.target.set(0, 34, 12);
controls.listenToKeyEvents(renderer.domElement);
const HOME_DIR = new THREE.Vector3(1, 0.95, 1.05).normalize();
camera.position.copy(controls.target).addScaledVector(HOME_DIR, 900);
camera.zoom = 1;

// ---------- theme ----------
const PALETTE = {
  light: { bg: 0xf6f6f3, hi: 0xffffff, mid: 0xf0f0ed, lo: 0xdcdcd8, void: 0xbdbdb8, edgeHi: 0x1f1f24, edgeMid: 0x4f5056, edgeLo: 0x9a9ba0, lit: 0x1a1b1e, off: 0xcfcfcb, accent: 0x3557c9, bad: 0xc8363c, packet: 0x1a1b1e, sky: 0xffffff, ground: 0xb8b8b2 },
  dark: { bg: 0x121213, hi: 0x4a4a50, mid: 0x36363b, lo: 0x26262a, void: 0x0b0b0c, edgeHi: 0xf2f2f5, edgeMid: 0xb4b5bb, edgeLo: 0x75767c, lit: 0xffffff, off: 0x2a2a2c, accent: 0x8aa4ff, bad: 0xff6b6b, packet: 0xffffff, sky: 0xffffff, ground: 0x3a3a40 },
};
const isDark = () => (document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
const M = {
  hi: new THREE.MeshLambertMaterial(), mid: new THREE.MeshLambertMaterial(), lo: new THREE.MeshLambertMaterial(), void: new THREE.MeshBasicMaterial(),
  edgeHi: new THREE.LineBasicMaterial(), edgeMid: new THREE.LineBasicMaterial(), edgeLo: new THREE.LineBasicMaterial(),
  edgeSel: new THREE.LineBasicMaterial(), edgeHover: new THREE.LineBasicMaterial({ transparent: true, opacity: 0.7 }),
  packet: new THREE.MeshBasicMaterial(), packetAlt: new THREE.MeshBasicMaterial(),
};
const lamps = []; // { mat, on }
const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1.15);
const sun = new THREE.DirectionalLight(0xffffff, 1.05);
sun.position.set(-220, 380, 140);
scene.add(hemi, sun);
function applyTheme() {
  const p = PALETTE[isDark() ? "dark" : "light"];
  scene.background = new THREE.Color(p.bg);
  M.hi.color.set(p.hi); M.mid.color.set(p.mid); M.lo.color.set(p.lo); M.void.color.set(p.void);
  M.edgeHi.color.set(p.edgeHi); M.edgeMid.color.set(p.edgeMid); M.edgeLo.color.set(p.edgeLo);
  M.edgeSel.color.set(p.accent); M.edgeHover.color.set(p.accent);
  M.packet.color.set(p.packet); M.packetAlt.color.set(p.accent);
  hemi.color.set(p.sky); hemi.groundColor.set(p.ground);
  hemi.intensity = isDark() ? 0.55 : 0.75; sun.intensity = isDark() ? 1.25 : 1.6;
  PAL = p;
  lamps.forEach((l) => setLamp(l, l.on, l.bad));
  if (typeof pointer !== "undefined") pointer.material.color.set(p.lit);
  trayTint();
}
let PAL = PALETTE.light;

// ---------- geometry helpers ----------
const EDGE_FOR = { hi: "edgeHi", mid: "edgeMid", lo: "edgeLo" };
const geoCache = new Map();
function boxGeo(w, h, d, r) {
  const key = [w, h, d, r].join(",");
  if (!geoCache.has(key)) geoCache.set(key, r > 0 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01)) : new THREE.BoxGeometry(w, h, d));
  return geoCache.get(key);
}
const edgeCache = new Map();
function edgesOf(geo, angle = 35) {
  if (!edgeCache.has(geo)) edgeCache.set(geo, new THREE.EdgesGeometry(geo, angle));
  return edgeCache.get(geo);
}
// a box standing on y0, centred on (x, z)
function box(w, h, d, { x = 0, y0 = 0, z = 0, tone = "mid", r = 0.6, part } = {}) {
  const geo = boxGeo(w, h, d, r);
  const mesh = new THREE.Mesh(geo, M[tone]);
  mesh.position.set(x, y0 + h / 2, z);
  const edge = new THREE.LineSegments(edgesOf(geo), M[EDGE_FOR[tone] || "edgeMid"]);
  edge.userData.base = edge.material;
  mesh.add(edge);
  mesh.userData.edge = edge;
  if (part) tag(mesh, part);
  return mesh;
}
function cyl(rad, h, { x = 0, y0 = 0, z = 0, tone = "mid", seg = 24, part } = {}) {
  const key = "c" + rad + "," + h + "," + seg;
  if (!geoCache.has(key)) geoCache.set(key, new THREE.CylinderGeometry(rad, rad, h, seg));
  const geo = geoCache.get(key);
  const mesh = new THREE.Mesh(geo, M[tone]);
  mesh.position.set(x, y0 + h / 2, z);
  const edge = new THREE.LineSegments(edgesOf(geo, 40), M[EDGE_FOR[tone]]);
  edge.userData.base = edge.material;
  mesh.add(edge);
  mesh.userData.edge = edge;
  if (part) tag(mesh, part);
  return mesh;
}
function lamp(x, y0, z, { r = 1.6, part, bad = false } = {}) {
  const mat = new THREE.MeshBasicMaterial();
  const key = "l" + r;
  if (!geoCache.has(key)) geoCache.set(key, new THREE.CylinderGeometry(r, r, 1.4, 16));
  const mesh = new THREE.Mesh(geoCache.get(key), mat);
  mesh.position.set(x, y0 + 0.7, z);
  const l = { mat, on: true, bad, mesh };
  lamps.push(l);
  if (part) tag(mesh, part);
  return l;
}
function setLamp(l, on, bad = l.bad) { l.on = on; l.bad = bad; l.mat.color.set(on ? (bad ? PAL.bad : PAL.lit) : PAL.off); }
// lines drawn on a face: an array of [a, b] points in world space
function lines(pairs, tone = "edgeLo") {
  const g = new THREE.BufferGeometry().setFromPoints(pairs.flat());
  return new THREE.LineSegments(g, M[tone]);
}
const tag = (obj, part) => { obj.userData.part = part; };

// ---------- the yard ----------
const world = new THREE.Group();
scene.add(world);
const PARTS = {}; // id → { meshes: [], anchor, title, ... }
function part(id, info) { PARTS[id] = { id, meshes: [], ...info }; return id; }
function own(id, ...objs) { for (const o of objs) { o.traverse((c) => { if (c.isMesh) { c.userData.part = id; PARTS[id].meshes.push(c); } }); world.add(o); } }

// layout constants (same plan as the 2D lesson)
const NODES = [-58, 14, 86];
const SLOT_DX = [-14, 14], SLOT_DZ = [-19, 19];
const SLOTS = NODES.flatMap((cx, node) => SLOT_DX.flatMap((dx) => SLOT_DZ.map((dz) => ({ node, x: cx + dx, z: dz }))));
const TRAY_TOP = 11;
const POD = { w: 22, h: 15, d: 32 };
const HOP = { x: -131, z: -27 }, BIN = { x: -131, z: 21 }, BOX_H = 22;
const TRACK_Z = 76, PORT_Z = 45.5;
const GATE = { x: 121, z: 77.5, w: 26, d: 21, h: 18 };
const ING = { x: 151, z: 77, w: 18, d: 30, h: 24 };
const DESK = { x: 139, z: 0, w: 30, d: 68, h: 30 };
const RAIL_Z = [-60, 60];
const LEG_TOP = 104, GIRDER_Y = 111, TRAVEL = 46;

part("cluster", { kind: "Cluster", title: "The cluster", desc: "Everything on this plate is one Kubernetes cluster: a control plane that decides, worker nodes that run pods, and the networking that lets traffic reach them.", yaml: "kubectl cluster-info\nkubectl get nodes", anchor: new THREE.Vector3(-150, 2, 100) });
own("cluster", box(330, 12, 190, { y0: -12, z: 14, tone: "mid", r: 3 }));
for (const [x, z] of [[-140, -60], [140, -60], [-140, 88], [140, 88]]) own("cluster", cyl(6, 5, { x, y0: -17, z, tone: "lo" }));
own("cluster", ...RAIL_Z.map((z) => box(276, 3, 5, { x: -18, z, tone: "mid", r: 0.6 })));
own("cluster", ...RAIL_Z.flatMap((z) => [-158, 122].map((x) => box(5, 8, 10, { x, z, tone: "mid", r: 0.8 }))));

// registry hopper and reclaim bin
part("registry", { kind: "Image registry", title: "Registry hopper", desc: "Where pod images come from. Each new pod the scheduler places starts from an image pulled from a registry; here the hopper lifts a fresh crate for the crane.", yaml: "image: ghcr.io/acme/web:1.4.2\nimagePullPolicy: IfNotPresent", anchor: new THREE.Vector3(HOP.x, BOX_H + 18, HOP.z) });
own("registry", box(30, BOX_H, 38, { x: HOP.x, z: HOP.z, tone: "mid", r: 1.2 }), box(25, 0.3, 33, { x: HOP.x, y0: BOX_H, z: HOP.z, tone: "lo", r: 0 }));
part("bin", { kind: "Terminated pods", title: "Reclaim bin", desc: "Pods removed when you scale down end here. Pods are disposable: Kubernetes deletes and replaces them freely, which is why state belongs in volumes, not in the pod.", yaml: "kubectl scale deploy web --replicas=3", anchor: new THREE.Vector3(BIN.x, BOX_H + 8, BIN.z) });
own("bin", box(30, BOX_H, 38, { x: BIN.x, z: BIN.z, tone: "mid", r: 1.2 }), box(25, 0.3, 33, { x: BIN.x, y0: BOX_H, z: BIN.z, tone: "lo", r: 0 }));

// worker nodes
const trayMats = [];
NODES.forEach((cx, n) => {
  const id = part("node-" + n, { kind: "Node", title: "node-" + (n + 1), desc: "A worker node: a machine that runs pods. Its kubelet starts the containers the scheduler assigns to it and reports their status back to the control plane. This one has room for four pods.", yaml: "kubectl describe node node-" + (n + 1) + "\nkubectl drain node-" + (n + 1), anchor: new THREE.Vector3(cx, TRAY_TOP + 2, 46), node: n });
  const mat = new THREE.MeshLambertMaterial();
  trayMats.push(mat);
  const tray = box(60, 7, 84, { x: cx, y0: 4, tone: "mid", r: 1.5 });
  tray.material = mat;
  const feet = [[-24, -36], [24, -36], [-24, 36], [24, 36]].map(([dx, dz]) => cyl(3, 4, { x: cx + dx, z: dz, tone: "lo" }));
  const seats = lines(SLOT_DX.flatMap((dx) => SLOT_DZ.flatMap((dz) => {
    const x0 = cx + dx - 12.5, x1 = cx + dx + 12.5, z0 = dz - 17.5, z1 = dz + 17.5, y = TRAY_TOP + 0.05;
    return [[new THREE.Vector3(x0, y, z0), new THREE.Vector3(x1, y, z0)], [new THREE.Vector3(x1, y, z0), new THREE.Vector3(x1, y, z1)], [new THREE.Vector3(x1, y, z1), new THREE.Vector3(x0, y, z1)], [new THREE.Vector3(x0, y, z1), new THREE.Vector3(x0, y, z0)]];
  })), "edgeLo");
  const ports = [-18, 0, 18].map((dx) => box(5.2, 4.2, 1.8, { x: cx + dx, y0: 5.2, z: 42.9, tone: "mid", r: 0.3 }));
  own(id, tray, ...feet, ...ports);
  world.add(seats);
  PARTS[id].lamp = lamp(cx + 24, TRAY_TOP + 1.4, 36, { r: 1.7, part: id });
  own(id, cyl(2.6, 1.4, { x: cx + 24, y0: TRAY_TOP, z: 36, tone: "mid" }));
  world.add(PARTS[id].lamp.mesh);
});
function trayTint() { trayMats.forEach((m, n) => m.color.set(state && !state.up[n] ? PAL.lo : PAL.mid)); }

// control plane cabinet
part("control", { kind: "Control plane", title: "Control plane", desc: "The API server, etcd and the controllers. It stores the desired state (here: how many replicas you want) and keeps comparing it with what is running. The knob is the replica count; the drawers are etcd.", yaml: "apiVersion: apps/v1\nkind: Deployment\nmetadata: { name: web }\nspec:\n  replicas: 6", anchor: new THREE.Vector3(DESK.x, DESK.h + 14, DESK.z) });
own("control",
  box(DESK.w + 3, 3, DESK.d + 3, { x: DESK.x, z: DESK.z, tone: "lo", r: 1 }),
  box(DESK.w, DESK.h - 3, DESK.d, { x: DESK.x, y0: 3, z: DESK.z, tone: "mid", r: 1.6 }),
  ...[-20, 0, 20].map((dz) => box(1, 17, 17, { x: DESK.x + DESK.w / 2 + 0.5, y0: 7, z: DESK.z + dz, tone: "mid", r: 0.3 })),
  ...[-20, 0, 20].map((dz) => box(1.6, 1.8, 7, { x: DESK.x + DESK.w / 2 + 1.6, y0: 19, z: DESK.z + dz, tone: "hi", r: 0.4 })),
  cyl(7.2, 1.2, { x: DESK.x, y0: DESK.h, z: -14, tone: "lo", seg: 36 }),
);
const knob = cyl(6, 5, { x: DESK.x, y0: DESK.h + 1.2, z: -14, tone: "mid", seg: 36 });
own("control", knob);
const pointer = box(0.9, 0.6, 5, { x: 0, y0: 0, z: 0, tone: "hi", r: 0 });
pointer.material = new THREE.MeshBasicMaterial();
knob.add(pointer);
pointer.position.set(0, 2.9, -2.5);
const deskLamp = lamp(DESK.x, DESK.h, 14, { r: 1.7, part: "control" });
world.add(deskLamp.mesh);

// Service gate and ingress, and the track that joins them to every node
part("service", { kind: "Service", title: "svc/web", desc: "A Service gives the pods one stable address. Its endpoint list (the lamps) holds every ready pod, and each request goes to one of them. Pods come and go; the Service's address stays.", yaml: "kind: Service\nmetadata: { name: web }\nspec:\n  selector: { app: web }\n  ports: [{ port: 80, targetPort: 8080 }]", anchor: new THREE.Vector3(GATE.x - 8, GATE.h + 4, GATE.z + 4) });
own("service", box(GATE.w + 3, 2, GATE.d + 3, { x: GATE.x, z: GATE.z, tone: "lo", r: 1 }), box(GATE.w, GATE.h - 2, GATE.d, { x: GATE.x, y0: 2, z: GATE.z, tone: "mid", r: 1.6 }));
const epLamps = [];
for (let i = 0; i < 12; i++) { const l = lamp(GATE.x - 8 + (i % 6) * 3.2, GATE.h, GATE.z - 6 + Math.floor(i / 6) * 3.4, { r: 1, part: "service" }); epLamps.push(l); world.add(l.mesh); }
part("ingress", { kind: "Ingress", title: "Ingress", desc: "The way in from outside. The Ingress controller terminates TLS and routes requests by host and path; requests for '/' go to svc/web. Anything else would get a 404.", yaml: "kind: Ingress\nspec:\n  rules:\n  - http:\n      paths: [{ path: /, backend: { service: { name: web, port: { number: 80 } } } }]", anchor: new THREE.Vector3(ING.x + 6, ING.h + 20, ING.z - 6) });
own("ingress", box(ING.w + 3, 2, ING.d + 3, { x: ING.x, z: ING.z, tone: "lo", r: 1 }), box(ING.w, ING.h - 2, ING.d, { x: ING.x, y0: 2, z: ING.z, tone: "mid", r: 1.6 }), cyl(3.6, 1.6, { x: ING.x + ING.w / 2 + 0.8, y0: 5.5, z: TRACK_Z, tone: "mid" }).rotateZ(Math.PI / 2));
part("network", { kind: "Pod network", title: "Service track", desc: "Requests travel from the Service to whichever node runs the chosen pod. In a real cluster kube-proxy on each node does this routing; the track stands for the cluster network.", yaml: "kubectl get endpoints web", anchor: new THREE.Vector3(-20, 3, TRACK_Z) });
own("network", box(205, 0.6, 6, { x: -62 + 102.5, z: TRACK_Z, tone: "lo", r: 0 }), ...NODES.map((cx) => box(4.8, 0.6, TRACK_Z - 3 - 43.8 + 1, { x: cx, z: (TRACK_Z - 3 + 43.8) / 2, tone: "lo", r: 0 })));

// the crane: the scheduler
part("crane", { kind: "Scheduler", title: "Scheduler (the crane)", desc: "The scheduler picks a node for every new pod: here the least-loaded node that is up. It does not start containers itself; it assigns the pod, and that node's kubelet starts it.", yaml: "kubectl get pods -o wide   # NODE column = the scheduler's choice\nkubectl get events --field-selector reason=Scheduled", anchor: new THREE.Vector3(0, GIRDER_Y + 16, 0) });
const gantry = new THREE.Group();
for (const z of RAIL_Z) {
  gantry.add(box(34, 7, 9, { y0: 4, z, tone: "mid", r: 1.2 }));
  for (const x of [-11, 11]) gantry.add(box(4.4, LEG_TOP - 11, 4.4, { x, y0: 11, z, tone: "mid", r: 0.6 }));
  gantry.add(box(32, 7, 8, { y0: LEG_TOP, z, tone: "mid", r: 0.8 }));
}
for (const x of [-6.5, 6.5]) gantry.add(box(5, 8, 128, { x, y0: GIRDER_Y, tone: "mid", r: 0.6 }));
const trolley = new THREE.Group();
trolley.add(box(20, 7, 18, { y0: GIRDER_Y + 8, tone: "mid", r: 1.2 }), cyl(4.4, 4.5, { x: -2, y0: GIRDER_Y + 15, tone: "mid" }));
const hook = new THREE.Group();
hook.add(box(24, 3, 34, { y0: 0, tone: "mid", r: 0.6 }), box(8, 5, 10, { y0: 3, tone: "mid", r: 0.8 }));
const cargo = crate(true);
cargo.position.y = -POD.h;
hook.add(cargo);
const cableGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]);
const cable = new THREE.LineSegments(cableGeo, M.edgeMid);
own("crane", gantry, trolley, hook);
world.add(cable);

// pods: one crate per slot, shown when a pod runs there
function crate(lit = false) {
  const g = new THREE.Group();
  const body = box(POD.w, POD.h, POD.d, { tone: "hi", r: 0.8 });
  g.add(body);
  const ribs = [];
  for (let i = 1; i < 8; i++) { const z = -POD.d / 2 + (i * POD.d) / 8; ribs.push([new THREE.Vector3(POD.w / 2 + 0.05, 1.2, z), new THREE.Vector3(POD.w / 2 + 0.05, POD.h - 1.2, z)]); }
  for (const dx of [-5.5, 0, 5.5]) ribs.push([new THREE.Vector3(dx, 1.2, POD.d / 2 + 0.05), new THREE.Vector3(dx, POD.h - 1.2, POD.d / 2 + 0.05)]);
  g.add(lines(ribs, "edgeLo"));
  if (lit) body.material = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x222222 });
  return g;
}
const podObjs = SLOTS.map((s, i) => {
  const id = part("pod-" + i, { kind: "Pod", title: "", desc: "", yaml: "", slot: i, anchor: new THREE.Vector3(s.x, TRAY_TOP + POD.h + 8, s.z) });
  const g = crate();
  g.position.set(s.x, TRAY_TOP, s.z);
  const l = lamp(6, POD.h, -11, { r: 1.5, part: id });
  g.add(l.mesh);
  own(id, g);
  g.visible = false;
  return { g, lamp: l, id };
});
const fresh = crate();
fresh.position.set(HOP.x, BOX_H, HOP.z);
own("registry", fresh);

// request packets
const packetGeo = new THREE.SphereGeometry(1.8, 12, 8);
const packetPool = Array.from({ length: 30 }, () => { const m = new THREE.Mesh(packetGeo, M.packet); m.visible = false; scene.add(m); return m; });

// ---------- labels ----------
const labelEls = {};
function label(id, text, { small = false } = {}) {
  const el = document.createElement("div");
  el.className = "lbl" + (small ? " is-small" : "");
  el.textContent = text;
  el.addEventListener("click", (e) => { e.stopPropagation(); select(id, true); });
  const obj = new CSS2DObject(el);
  obj.position.copy(PARTS[id].anchor);
  scene.add(obj);
  labelEls[id] = { el, obj, small };
}
label("control", "control plane");
label("crane", "scheduler");
label("registry", "registry");
label("bin", "terminated");
label("service", "svc/web");
label("ingress", "ingress");
NODES.forEach((_, n) => label("node-" + n, "node-" + (n + 1)));
podObjs.forEach((p) => label(p.id, "", { small: true }));

// ---------- the model (same rules as the 2D lesson) ----------
const state = { desired: 6, up: [true, true, true], slot: SLOTS.map(() => 0), seq: 0, names: SLOTS.map(() => ""), ready: SLOTS.map(() => 0) };
const running = () => state.slot.filter((v) => v > 0).length;
function freeSlot() {
  let best = -1, load = 99;
  NODES.forEach((_, n) => {
    if (!state.up[n]) return;
    const mine = SLOTS.map((s, i) => i).filter((i) => SLOTS[i].node === n);
    const used = mine.filter((i) => state.slot[i] !== 0).length;
    const open = mine.find((i) => state.slot[i] === 0);
    if (open !== undefined && used < load) { load = used; best = open; }
  });
  return best;
}
const crane = { gx: 14, tz: 0, hy: TRAVEL, v: [0, 0, 0], holding: false };
const want = { gx: 14, tz: 0, hy: TRAVEL };
let plan = [], job = null, wait = 0, freshY = 0;
const podName = () => "web-" + ["7d4f", "2k8x", "p9q1", "m3zt", "c8wn", "r5vj", "h2ld", "x7bq", "f4ks", "n6ty", "a1ce", "e9pu"][state.seq % 12];
function schedule() {
  if (job) return;
  const r = running();
  if (r < state.desired) {
    const s = freeSlot();
    if (s < 0) return;
    state.slot[s] = -1;
    job = { kind: "create", slot: s };
    plan = [{ go: [HOP.x, HOP.z] }, { y: BOX_H }, { act: "grab" }, { y: TRAVEL }, { go: "slot" }, { y: TRAY_TOP }, { act: "place" }, { y: TRAVEL }];
  } else if (r > state.desired) {
    let s = -1, top = 0;
    state.slot.forEach((v, i) => { if (v > top) { top = v; s = i; } });
    job = { kind: "delete", slot: s };
    plan = [{ go: "slot" }, { y: TRAY_TOP }, { act: "lift" }, { y: TRAVEL }, { go: [BIN.x, BIN.z] }, { y: BOX_H }, { act: "drop" }, { y: TRAVEL }];
  }
}
function act(name) {
  const s = job.slot;
  if (name === "grab") { crane.holding = true; freshY = -POD.h; }
  if (name === "place") { crane.holding = false; state.slot[s] = ++state.seq; state.names[s] = podName(); state.ready[s] = 0; job = null; }
  if (name === "lift") { if (state.slot[s] <= 0) { plan = [{ y: TRAVEL }]; job = null; return; } state.slot[s] = 0; crane.holding = true; }
  if (name === "drop") { crane.holding = false; job = null; }
}
function stepPlan(dt) {
  if (wait > 0) { wait -= dt; return; }
  if (!plan.length) { schedule(); return; }
  const st = plan[0];
  if (st.go) {
    let target = st.go;
    if (target === "slot") {
      if (job.kind === "create" && !state.up[SLOTS[job.slot].node]) { const s = freeSlot(); if (s >= 0) { state.slot[s] = -1; job.slot = s; } else { plan = [{ go: [BIN.x, BIN.z] }, { y: BOX_H }, { act: "drop" }, { y: TRAVEL }]; return; } }
      if (job.kind === "delete" && state.slot[job.slot] <= 0) { plan = []; job = null; return; }
      target = [SLOTS[job.slot].x, SLOTS[job.slot].z];
    }
    want.gx = target[0]; want.tz = target[1];
    if (Math.abs(crane.gx - want.gx) < 0.5 && Math.abs(crane.tz - want.tz) < 0.5 && Math.abs(crane.v[0]) < 3 && Math.abs(crane.v[1]) < 3) plan.shift();
  } else if (st.y !== undefined) {
    want.hy = st.y;
    if (Math.abs(crane.hy - want.hy) < 0.15 && Math.abs(crane.v[2]) < 1.5) { plan.shift(); wait = 0.05; }
  } else if (st.act) { plan.shift(); act(st.act); wait = 0.1; }
}
const spring = (key, i, target, dt, k) => {
  if (still.matches) { crane[key] = target; crane.v[i] = 0; return; }
  const c = 2 * Math.sqrt(k);
  for (let n = 0; n < 4; n++) { crane.v[i] += ((target - crane[key]) * k - crane.v[i] * c) * dt / 4; crane[key] += crane.v[i] * dt / 4; }
};
function setNode(n, up) {
  if (state.up[n] === up) return;
  state.up[n] = up;
  if (!up) SLOTS.forEach((s, i) => { if (s.node === n && (state.slot[i] > 0 || (state.slot[i] === -1 && !(job && job.slot === i)))) state.slot[i] = 0; });
  if (!up && job && job.kind === "create" && SLOTS[job.slot].node === n && !crane.holding) { state.slot[job.slot] = 0; job = null; plan = [{ y: TRAVEL }]; }
  trayTint();
}
function deletePod(slot) { if (state.slot[slot] > 0) { state.slot[slot] = 0; } }

// requests: ingress → Service → a ready pod
const packets = [];
let spawnIn = 0, rr = 0;
const endpoints = () => state.slot.map((v, i) => (v > 0 && state.ready[i] > 1 ? i : -1)).filter((i) => i >= 0);
function stepPackets(dt) {
  spawnIn -= dt;
  const eps = endpoints();
  if (!still.matches && eps.length && spawnIn <= 0) {
    spawnIn = 0.45;
    const i = eps[rr++ % eps.length];
    const cx = NODES[SLOTS[i].node];
    const pts = [new THREE.Vector3(185, 9, TRACK_Z), new THREE.Vector3(ING.x, 9, TRACK_Z), new THREE.Vector3(ING.x, 1.9, TRACK_Z), new THREE.Vector3(cx, 1.9, TRACK_Z), new THREE.Vector3(cx, 1.9, PORT_Z)];
    const mesh = packetPool.find((m) => !m.visible);
    if (mesh) { mesh.visible = true; packets.push({ pts, s: 0, total: pathLen(pts), mesh, slot: i }); }
  }
  for (let n = packets.length - 1; n >= 0; n--) {
    const p = packets[n];
    p.s += 140 * dt;
    if (p.s >= p.total) { p.mesh.visible = false; packets.splice(n, 1); flash[p.slot] = 0.25; continue; }
    p.mesh.position.copy(pointAt(p.pts, p.s));
    const inside = Math.abs(p.mesh.position.x - ING.x) < ING.w / 2 && Math.abs(p.mesh.position.z - ING.z) < ING.d / 2;
    p.mesh.visible = !inside;
    if (!inside) p.mesh.visible = true;
  }
}
const flash = SLOTS.map(() => 0);
const pathLen = (pts) => pts.slice(1).reduce((s, b, i) => s + b.distanceTo(pts[i]), 0);
function pointAt(pts, s) {
  for (let i = 1; i < pts.length; i++) { const l = pts[i].distanceTo(pts[i - 1]); if (s <= l || i === pts.length - 1) return pts[i - 1].clone().lerp(pts[i], l ? Math.min(1, s / l) : 1); s -= l; }
}

// ---------- picking and selection ----------
const ray = new THREE.Raycaster();
ray.params.Line.threshold = 0;
const ndc = new THREE.Vector2();
let selected = null, hovered = null;
// a frame around the selected part, refit every frame so it follows moving parts
const selBox = new THREE.Box3();
const selFrame = new THREE.Box3Helper(selBox, 0x3557c9);
selFrame.material.depthTest = false;
selFrame.material.transparent = true;
selFrame.renderOrder = 10;
selFrame.visible = false;
scene.add(selFrame);
const tmpBox = new THREE.Box3();
function fitFrame() {
  if (!selected || selected === "cluster") { selFrame.visible = false; return; }
  selBox.makeEmpty();
  for (const m of PARTS[selected].meshes) if (visibleChain(m)) selBox.union(tmpBox.setFromObject(m));
  if (selBox.isEmpty()) { selFrame.visible = false; return; }
  selBox.expandByScalar(2.5);
  selFrame.visible = true;
  selFrame.material.color.set(PAL.accent);
  selFrame.material.opacity = 0.65 + 0.35 * Math.sin(performance.now() / 260);
}
function pick(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(world.children, true).filter((h) => h.object.isMesh && h.object.visible && visibleChain(h.object));
  for (const h of hits) { const id = h.object.userData.part; if (id) return id; }
  return null;
}
const visibleChain = (o) => { for (let c = o; c; c = c.parent) if (!c.visible) return false; return true; };
function paint(id, mat) { if (!id || !PARTS[id]) return; for (const m of PARTS[id].meshes) { const e = m.userData.edge; if (e) e.material = mat || e.userData.base; } }
function setHover(id) {
  if (id === hovered) return;
  if (hovered && hovered !== selected) paint(hovered, null);
  hovered = id;
  if (id && id !== selected) paint(id, M.edgeHover);
  renderer.domElement.style.cursor = id ? "pointer" : "grab";
  hint.textContent = id ? describeShort(id) : "Click a part";
}
function select(id, fly = false) {
  if (selected) { paint(selected, null); labelEls[selected]?.el.classList.remove("is-sel"); }
  selected = id;
  if (id) { paint(id, M.edgeSel); labelEls[id]?.el.classList.add("is-sel"); if (fly) focus(id); }
  renderPanel();
}
const describeShort = (id) => (PARTS[id].kind === "Pod" ? podTitle(PARTS[id].slot) : PARTS[id].title) + " · click for details";
let downAt = null;
renderer.domElement.addEventListener("pointerdown", (e) => { downAt = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener("pointerup", (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return; // a drag, not a click
  select(pick(e), true);
});
renderer.domElement.addEventListener("pointermove", (e) => { if (e.buttons) return; setHover(pick(e)); });
renderer.domElement.addEventListener("pointerleave", () => setHover(null));
renderer.domElement.addEventListener("dblclick", (e) => { const id = pick(e); if (id) { select(id); focus(id, 3.2); } });

// ---------- camera moves ----------
let tween = null;
function flyTo(target, dir, zoom) {
  const from = { t: controls.target.clone(), p: camera.position.clone(), z: camera.zoom };
  const dist = 900;
  const toT = target.clone();
  const toP = toT.clone().addScaledVector((dir || camera.position.clone().sub(controls.target)).clone().normalize(), dist);
  if (still.matches) { controls.target.copy(toT); camera.position.copy(toP); camera.zoom = zoom; camera.updateProjectionMatrix(); return; }
  tween = { from, to: { t: toT, p: toP, z: zoom }, k: 0 };
}
function focus(id, zoom) {
  const p = PARTS[id];
  const big = id === "cluster" ? 1 : p.kind === "Pod" ? 3.4 : p.kind === "Node" ? 2.3 : 2.1;
  flyTo(p.anchor.clone().setY(Math.max(8, p.anchor.y - 10)), null, zoom || big);
}
const VIEWS = { iso: HOME_DIR, top: new THREE.Vector3(0.0001, 1, 0.0002), front: new THREE.Vector3(0, 0.42, 1), side: new THREE.Vector3(1, 0.42, 0) };
document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => { flyTo(new THREE.Vector3(0, 34, 12), VIEWS[b.dataset.view], 1); }));
const spinBtn = document.getElementById("spin");
spinBtn.addEventListener("click", () => { controls.autoRotate = !controls.autoRotate; spinBtn.setAttribute("aria-pressed", String(controls.autoRotate)); });
controls.autoRotateSpeed = 0.8;
const labelsBtn = document.getElementById("labels");
labelsBtn.addEventListener("click", () => { const off = !viewer.classList.toggle("labels-off"); labelsBtn.setAttribute("aria-pressed", String(off)); });
document.getElementById("theme").addEventListener("click", () => {
  const root = document.documentElement;
  const next = isDark() ? "light" : "dark";
  root.dataset.theme = next;
  try { localStorage.setItem("coursehub:theme", next); } catch (e) {}
  applyTheme();
});
document.getElementById("full").addEventListener("click", () => { if (document.fullscreenElement) document.exitFullscreen(); else viewer.requestFullscreen?.().catch(() => {}); });
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);

// ---------- inspector panel ----------
const podTitle = (slot) => (state.slot[slot] > 0 ? "pod/" + state.names[slot] : "empty slot");
function renderPanel() {
  const id = selected;
  if (!id) {
    panel.innerHTML = `<span class="kind">Overview</span><h2>A cluster you can take apart</h2>
      <p class="muted">Every part of this yard is a piece of Kubernetes. Pick one in the scene, or from this list:</p>
      <div class="parts">${["control", "crane", "node-0", "node-1", "node-2", "service", "ingress", "network", "registry", "bin", "cluster"].map((p) => `<button type="button" data-pick="${p}">${PARTS[p].title}</button>`).join("")}</div>
      <div class="actions"><button type="button" data-act="minus">− replica</button><button type="button" data-act="plus">+ replica</button></div>
      <p class="stats" id="stats"></p>`;
  } else if (PARTS[id].kind === "Pod") {
    const slot = PARTS[id].slot, live = state.slot[slot] > 0, n = SLOTS[slot].node;
    panel.innerHTML = `<span class="kind">Pod</span><h2>${podTitle(slot)}</h2>
      <p>${live ? "One replica of the web Deployment, running on node-" + (n + 1) + ". It has its own IP, and the Service sends it requests while it is Ready." : "No pod here right now. The scheduler fills free slots on nodes that are up."}</p>
      <div class="actions">${live ? '<button type="button" class="danger" data-act="delpod">Delete this pod</button>' : ""}<button type="button" data-act="back">← Overview</button></div>
      <pre>kubectl get pod ${live ? state.names[slot] : "&lt;name&gt;"} -o wide\nkubectl logs ${live ? state.names[slot] : "&lt;name&gt;"}</pre>
      <p class="muted">${live ? "Delete it and watch: the control plane sees one replica missing and the scheduler places a new pod, with a new name." : ""}</p>`;
  } else {
    const p = PARTS[id];
    const acts = [];
    if (p.kind === "Node") acts.push(state.up[p.node] ? `<button type="button" class="danger" data-act="fail">Fail this node</button>` : `<button type="button" data-act="recover">Bring it back</button>`);
    if (id === "control") acts.push('<button type="button" data-act="minus">− replica</button><button type="button" data-act="plus">+ replica</button>');
    acts.push('<button type="button" data-act="back">← Overview</button>');
    panel.innerHTML = `<span class="kind">${p.kind}</span><h2>${p.title}</h2><p>${p.desc}</p><div class="actions">${acts.join("")}</div><pre>${p.yaml.replace(/</g, "&lt;")}</pre>`;
  }
  panel.querySelectorAll("[data-pick]").forEach((b) => b.addEventListener("click", () => select(b.dataset.pick, true)));
  panel.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => {
    const a = b.dataset.act;
    if (a === "plus") state.desired = Math.min(12, state.desired + 1);
    if (a === "minus") state.desired = Math.max(0, state.desired - 1);
    if (a === "fail") setNode(PARTS[selected].node, false);
    if (a === "recover") setNode(PARTS[selected].node, true);
    if (a === "delpod") deletePod(PARTS[selected].slot);
    if (a === "back") { select(null); flyTo(new THREE.Vector3(0, 34, 12), HOME_DIR, 1); return; }
    renderPanel();
  }));
}

// ---------- sizing, loop, visibility ----------
function resize() {
  const w = viewer.clientWidth, h = viewer.clientHeight;
  renderer.setSize(w, h, false);
  renderer.domElement.style.width = w + "px"; renderer.domElement.style.height = h + "px";
  labels.setSize(w, h);
  const viewH = 330, aspect = w / h;
  const viewW = Math.max(viewH * aspect, w < 600 ? 330 : 420);
  const vh = viewW / aspect;
  camera.left = -viewW / 2; camera.right = viewW / 2; camera.top = vh / 2; camera.bottom = -vh / 2;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewer);
resize();
applyTheme();
renderPanel();

let visible = true, last = 0, fpsAcc = 0, fpsN = 0, fps = 0, looping = false;
function start() { if (!looping) { looping = true; last = 0; requestAnimationFrame(loop); } }
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) start(); }, { rootMargin: "100px" }).observe(viewer);
document.addEventListener("visibilitychange", () => { if (!document.hidden && visible) start(); });
function loop(t) {
  if (!visible || document.hidden) { looping = false; return; }
  const dt = last ? Math.min((t - last) / 1000, 1 / 30) : 1 / 60;
  if (last) { fpsAcc += t - last; fpsN++; if (fpsAcc > 1000) { fps = Math.round((fpsN * 1000) / fpsAcc); fpsAcc = 0; fpsN = 0; } }
  last = t;
  step(dt);
  if (tween) {
    tween.k = Math.min(1, tween.k + dt / 0.7);
    const e = 1 - Math.pow(1 - tween.k, 3);
    controls.target.lerpVectors(tween.from.t, tween.to.t, e);
    camera.position.lerpVectors(tween.from.p, tween.to.p, e);
    camera.zoom = tween.from.z + (tween.to.z - tween.from.z) * e;
    camera.updateProjectionMatrix();
    if (tween.k >= 1) tween = null;
  }
  controls.update();
  fitFrame();
  renderer.render(scene, camera);
  labels.render(scene, camera);
  requestAnimationFrame(loop);
}
function step(dt) {
  stepPlan(dt);
  spring("gx", 0, want.gx, dt, 110); spring("tz", 1, want.tz, dt, 150); spring("hy", 2, want.hy, dt, 260);
  gantry.position.x = crane.gx;
  trolley.position.set(crane.gx, 0, crane.tz);
  hook.position.set(crane.gx, crane.hy, crane.tz);
  cargo.visible = crane.holding;
  const top = crane.hy + 8;
  const pos = cableGeo.attributes.position;
  pos.setXYZ(0, crane.gx - 1, top, crane.tz + 3); pos.setXYZ(1, crane.gx - 1, GIRDER_Y, crane.tz + 3);
  pos.setXYZ(2, crane.gx + 1, top, crane.tz - 3); pos.setXYZ(3, crane.gx + 1, GIRDER_Y, crane.tz - 3);
  pos.needsUpdate = true;
  freshY = Math.min(0, freshY + dt * 22);
  fresh.position.y = BOX_H + freshY;
  fresh.visible = !(crane.holding && job && job.kind === "create" && freshY < -POD.h + 0.5);
  stepPackets(dt);
  podObjs.forEach((p, i) => {
    const on = state.slot[i] > 0;
    if (on) state.ready[i] += dt;
    if (on && !p.g.visible) { p.g.visible = true; p.g.scale.set(1, 0.01, 1); }
    if (!on) p.g.visible = false;
    if (p.g.visible) p.g.scale.y = Math.min(1, p.g.scale.y + dt * 4);
    flash[i] = Math.max(0, flash[i] - dt);
    setLamp(p.lamp, on && state.ready[i] > 1 && (flash[i] > 0 || true), false);
    p.lamp.mat.color.set(on && state.ready[i] > 1 ? (flash[i] > 0 ? PAL.accent : PAL.lit) : PAL.off);
    const L = labelEls[p.id];
    const show = on && camera.zoom > 2.1;
    L.obj.visible = show || selected === p.id;
    if (L.el.textContent !== state.names[i]) L.el.textContent = state.names[i];
  });
  NODES.forEach((_, n) => { setLamp(PARTS["node-" + n].lamp, state.up[n], false); labelEls["node-" + n].el.classList.toggle("is-bad", !state.up[n]); labelEls["node-" + n].el.textContent = "node-" + (n + 1) + (state.up[n] ? "" : " · down"); });
  const eps = endpoints().length;
  epLamps.forEach((l, i) => setLamp(l, i < eps, false));
  knob.rotation.y = -(-0.75 * Math.PI + (state.desired / 12) * 1.5 * Math.PI);
  setLamp(deskLamp, true, false);
  // on small screens, labels wait until you zoom in so they do not pile up
  const crowded = viewer.clientWidth < 600 && camera.zoom < 1.45;
  if (viewer.classList.contains("labels-crowded") !== crowded) viewer.classList.toggle("labels-crowded", crowded);
  const r = running(), pending = Math.max(0, state.desired - r);
  const text = `pods ${r}/${state.desired}` + (pending ? ` · ${pending} pending` : "") + (state.up.every(Boolean) ? "" : ` · ${state.up.filter((u) => !u).length} node down`);
  if (readout.textContent !== text) readout.textContent = text;
  const s = document.getElementById("stats");
  if (s) { const t = `Rendering at ${fps || "…"} fps on this device · ${renderer.info.render.calls} draw calls · ${renderer.info.render.triangles} triangles`; if (s.textContent !== t) s.textContent = t; }
}
start();
window.__k3d = { state, renderer, camera, controls, select, PARTS, setNode };
