// Lesson 02 in 3D: the container yard. Uses the Course Hub engine (createStage, V, springTo, THREE).
const S = createStage({ home: { target: [0, 34, 12], dir: [1, 0.95, 1.05], zoom: 1 }, viewH: 330 });
const { box, cyl, lamp, crate, tray, housing, track, part, own, label } = S;

// ---- layout (same plan as the 2D lesson) ----
const NODES = [-58, 14, 86];
const SLOT_DX = [-14, 14], SLOT_DZ = [-19, 19];
const SLOTS = NODES.flatMap((cx, node) => SLOT_DX.flatMap((dx) => SLOT_DZ.map((dz) => ({ node, x: cx + dx, z: dz }))));
const TOP = 11, POD = { w: 22, h: 15, d: 32 };
const HOP = { x: -131, z: -27 }, BIN = { x: -131, z: 21 }, BOX_H = 22;
const TRACK_Z = 76, PORT_Z = 45.5;
const GATE = { x: 121, z: 77.5, w: 26, d: 21, h: 18 };
const ING = { x: 151, z: 77, w: 18, d: 30, h: 24 };
const DESK = { x: 139, z: 0, w: 30, d: 68, h: 30 };
const RAIL_Z = [-60, 60], LEG_TOP = 104, GIRDER_Y = 111, TRAVEL = 46;

part("cluster", { kind: "Cluster", title: "The cluster", noFrame: true, zoom: 1, desc: "Everything on this plate is one Kubernetes cluster: a control plane that decides, worker nodes that run pods, and the networking that lets traffic reach them.", yaml: "kubectl cluster-info\nkubectl get nodes", anchor: V(0, 40, 12) });
own("cluster", S.plate({ x: 0, z: 14, w: 330, d: 190 }));
own("cluster", ...RAIL_Z.map((z) => box(276, 3, 5, { x: -18, z })), ...RAIL_Z.flatMap((z) => [-158, 122].map((x) => box(5, 8, 10, { x, z, r: 0.8 }))));

part("registry", { kind: "Image registry", title: "Registry hopper", desc: "Where pod images come from. Each new pod starts from an image pulled from a registry; here the hopper lifts a fresh crate for the crane.", yaml: "image: ghcr.io/acme/web:1.4.2\nimagePullPolicy: IfNotPresent", anchor: V(HOP.x, BOX_H + 18, HOP.z) });
own("registry", housing({ x: HOP.x, z: HOP.z, w: 30, d: 38, h: BOX_H, plinth: false }));
part("bin", { kind: "Terminated pods", title: "Reclaim bin", desc: "Pods removed when you scale down end here. Pods are disposable: Kubernetes deletes and replaces them freely, which is why state belongs in volumes, not in the pod.", yaml: "kubectl scale deploy web --replicas=3", anchor: V(BIN.x, BOX_H + 8, BIN.z) });
own("bin", housing({ x: BIN.x, z: BIN.z, w: 30, d: 38, h: BOX_H, plinth: false }));

const trays = NODES.map((cx, n) => {
  const id = part("node-" + n, {
    kind: "Node", title: "node-" + (n + 1), zoom: 2.3, anchor: V(cx, TOP + 2, 46),
    desc: () => "A worker node: a machine that runs pods. Its kubelet starts the containers the scheduler assigns to it and reports their status. It has room for four pods." + (state.up[n] ? "" : " <b>It is down</b>: its pods were lost and are being rescheduled elsewhere."),
    yaml: `kubectl describe node node-${n + 1}\nkubectl drain node-${n + 1}`,
    actions: () => [state.up[n] ? { label: "Fail this node", danger: true, run: () => setNode(n, false) } : { label: "Bring it back", run: () => setNode(n, true) }],
  });
  const t = tray({ x: cx, z: 0, w: 60, d: 84, top: TOP, slots: SLOT_DX.flatMap((dx) => SLOT_DZ.map((dz) => [cx + dx, dz])) });
  own(id, t, ...[-18, 0, 18].map((dx) => box(5.2, 4.2, 1.8, { x: cx + dx, y0: 5.2, z: 42.9, r: 0.3 })), cyl(2.6, 1.4, { x: cx + 24, y0: TOP, z: 36 }));
  const l = lamp(cx + 24, TOP + 1.4, 36, { r: 1.7 });
  own(id, l.mesh);
  label(id, "node-" + (n + 1));
  return { t, l };
});

part("control", { kind: "Control plane", title: "Control plane", zoom: 2.4, anchor: V(DESK.x, DESK.h + 14, DESK.z),
  desc: () => `The API server, etcd and the controllers. It stores the desired state, <b>${state.desired} replicas</b> of web, and keeps comparing it with what is running. The knob is the replica count; the drawers are etcd.`,
  yaml: () => `apiVersion: apps/v1\nkind: Deployment\nmetadata: { name: web }\nspec:\n  replicas: ${state.desired}`,
  actions: () => [{ label: "− replica", run: () => setDesired(state.desired - 1) }, { label: "+ replica", run: () => setDesired(state.desired + 1) }],
});
const knob = cyl(6, 5, { x: DESK.x, y0: DESK.h + 1.2, z: -14, seg: 36 });
own("control", housing({ x: DESK.x, z: DESK.z, w: DESK.w, d: DESK.d, h: DESK.h }),
  ...[-20, 0, 20].map((dz) => box(1, 17, 17, { x: DESK.x + DESK.w / 2 + 0.5, y0: 7, z: dz, r: 0.3 })),
  ...[-20, 0, 20].map((dz) => box(1.6, 1.8, 7, { x: DESK.x + DESK.w / 2 + 1.6, y0: 19, z: dz, tone: "hi", r: 0.4 })),
  cyl(7.2, 1.2, { x: DESK.x, y0: DESK.h, z: -14, tone: "lo", seg: 36 }), knob);
const pointer = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 5), new THREE.MeshBasicMaterial());
pointer.position.set(0, 2.9, -2.5);
knob.add(pointer);
S.onTheme((p) => pointer.material.color.set(p.lit));
label("control", "control plane");

part("service", { kind: "Service", title: "svc/web", zoom: 2.6, anchor: V(GATE.x - 8, GATE.h + 4, GATE.z + 4),
  desc: () => `A Service gives the pods one stable address. Its endpoint list, the lamps, holds every ready pod: <b>${endpoints().length} now</b>. Each request goes to one of them.`,
  yaml: "kind: Service\nmetadata: { name: web }\nspec:\n  selector: { app: web }\n  ports: [{ port: 80, targetPort: 8080 }]" });
own("service", housing({ x: GATE.x, z: GATE.z, w: GATE.w, d: GATE.d, h: GATE.h }));
const epLamps = Array.from({ length: 12 }, (_, i) => { const l = lamp(GATE.x - 8 + (i % 6) * 3.2, GATE.h, GATE.z - 6 + Math.floor(i / 6) * 3.4, { r: 1 }); own("service", l.mesh); return l; });
label("service", "svc/web");
part("ingress", { kind: "Ingress", title: "Ingress", zoom: 2.6, anchor: V(ING.x + 6, ING.h + 20, ING.z - 6), desc: "The way in from outside. The Ingress controller terminates TLS and routes requests by host and path; requests for / go to svc/web.", yaml: "kind: Ingress\nspec:\n  rules:\n  - http:\n      paths: [{ path: /, backend: { service: { name: web, port: { number: 80 } } } }]" });
own("ingress", housing({ x: ING.x, z: ING.z, w: ING.w, d: ING.d, h: ING.h }), cyl(3.6, 1.6, { x: ING.x + ING.w / 2, y0: 9, z: TRACK_Z, axis: "x" }));
label("ingress", "ingress");
part("network", { kind: "Pod network", title: "Service track", zoom: 1.6, anchor: V(-20, 3, TRACK_Z), desc: "Requests travel from the Service to whichever node runs the chosen pod. In a real cluster kube-proxy on each node does this routing; the track stands for the cluster network.", yaml: "kubectl get endpoints web" });
own("network", track([[[-62, TRACK_Z], [143, TRACK_Z]], ...NODES.map((cx) => [[cx, PORT_Z], [cx, TRACK_Z]])], { width: 5 }));

// the crane: the scheduler
part("crane", { kind: "Scheduler", title: "Scheduler (the crane)", zoom: 1.5, anchor: () => V(crane.gx, GIRDER_Y + 16, 0), desc: "The scheduler picks a node for every new pod: here the least-loaded node that is up. It only assigns the pod; that node's kubelet then starts it.", yaml: "kubectl get pods -o wide   # NODE = the scheduler's choice" });
const gantry = new THREE.Group();
for (const z of RAIL_Z) {
  gantry.add(box(34, 7, 9, { y0: 4, z, r: 1.2 }));
  for (const x of [-11, 11]) gantry.add(box(4.4, LEG_TOP - 11, 4.4, { x, y0: 11, z }));
  gantry.add(box(32, 7, 8, { y0: LEG_TOP, z, r: 0.8 }));
}
for (const x of [-6.5, 6.5]) gantry.add(box(5, 8, 128, { x, y0: GIRDER_Y }));
const trolley = new THREE.Group();
trolley.add(box(20, 7, 18, { y0: GIRDER_Y + 8, r: 1.2 }), cyl(4.4, 4.5, { x: -2, y0: GIRDER_Y + 15 }));
const hook = new THREE.Group();
hook.add(box(24, 3, 34, { y0: 0 }), box(8, 5, 10, { y0: 3, r: 0.8 }));
const cargo = crate({ lit: true });
cargo.position.y = -POD.h;
hook.add(cargo);
own("crane", gantry, trolley, hook);
const cableGeo = new THREE.BufferGeometry().setFromPoints([V(), V(), V(), V()].map(() => V(0, 0, 0)));
S.world.add(new THREE.LineSegments(cableGeo, S.M.edgeMid));
label("crane", "scheduler", { anchor: V(0, GIRDER_Y + 16, 0) });

// pods: one crate per slot
const pods = SLOTS.map((s, i) => {
  const id = part("pod-" + i, {
    kind: "Pod", dynamic: true, zoom: 3.4, anchor: V(s.x, TOP + POD.h + 8, s.z),
    title: () => (state.slot[i] > 0 ? "pod/" + state.names[i] : "empty slot"),
    desc: () => (state.slot[i] > 0 ? `One replica of the web Deployment, on node-${s.node + 1}. It has its own IP, and the Service sends it requests while it is Ready. Delete it and the control plane notices one replica missing and makes a new pod, with a new name.` : "No pod here right now. The scheduler fills free slots on nodes that are up."),
    yaml: () => (state.slot[i] > 0 ? `kubectl get pod ${state.names[i]} -o wide\nkubectl delete pod ${state.names[i]}` : ""),
    actions: () => (state.slot[i] > 0 ? [{ label: "Delete this pod", danger: true, run: () => { state.slot[i] = 0; } }] : []),
  });
  const g = crate();
  g.position.set(s.x, TOP, s.z);
  const l = lamp(6, POD.h, -11, { r: 1.5 });
  g.add(l.mesh);
  own(id, g);
  g.visible = false;
  label(id, "", { small: true, lod: 2.1 });
  return { g, l, id };
});
const fresh = crate();
fresh.position.set(HOP.x, BOX_H, HOP.z);
own("registry", fresh);
label("registry", "registry");
label("bin", "terminated");

// ---- the model ----
const state = { desired: 6, up: [true, true, true], slot: SLOTS.map(() => 0), seq: 0, names: SLOTS.map(() => ""), ready: SLOTS.map(() => 0) };
const running = () => state.slot.filter((v) => v > 0).length;
const capacity = () => state.up.filter(Boolean).length * 4;
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
const crane = { gx: 14, tz: 0, hy: TRAVEL, vx: 0, vz: 0, vy: 0, holding: false };
const want = { gx: 14, tz: 0, hy: TRAVEL };
let plan = [], job = null, wait = 0, freshY = 0;
const NAMES = ["7d4f", "2k8x", "p9q1", "m3zt", "c8wn", "r5vj", "h2ld", "x7bq", "f4ks", "n6ty", "a1ce", "e9pu", "w3go", "b8rm"];
function schedule() {
  if (job) return;
  const r = running();
  if (r < state.desired) {
    const s = freeSlot();
    if (s < 0) return;
    state.slot[s] = -1;
    job = { kind: "create", slot: s };
    plan = [{ go: [HOP.x, HOP.z] }, { y: BOX_H }, { act: "grab" }, { y: TRAVEL }, { go: "slot" }, { y: TOP }, { act: "place" }, { y: TRAVEL }];
  } else if (r > state.desired) {
    let s = -1, top = 0;
    state.slot.forEach((v, i) => { if (v > top) { top = v; s = i; } });
    job = { kind: "delete", slot: s };
    plan = [{ go: "slot" }, { y: TOP }, { act: "lift" }, { y: TRAVEL }, { go: [BIN.x, BIN.z] }, { y: BOX_H }, { act: "drop" }, { y: TRAVEL }];
  }
}
function act(name) {
  const s = job.slot;
  if (name === "grab") { crane.holding = true; freshY = -POD.h; }
  if (name === "place") { crane.holding = false; state.slot[s] = ++state.seq; state.names[s] = "web-" + NAMES[state.seq % NAMES.length]; state.ready[s] = 0; job = null; }
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
    if (Math.abs(crane.gx - want.gx) < 0.5 && Math.abs(crane.tz - want.tz) < 0.5 && Math.abs(crane.vx) < 3 && Math.abs(crane.vz) < 3) plan.shift();
  } else if (st.y !== undefined) {
    want.hy = st.y;
    if (Math.abs(crane.hy - want.hy) < 0.15 && Math.abs(crane.vy) < 1.5) { plan.shift(); wait = 0.05; }
  } else if (st.act) { plan.shift(); act(st.act); wait = 0.1; }
}
function setNode(n, up) {
  if (state.up[n] === up) return;
  state.up[n] = up;
  if (!up) SLOTS.forEach((s, i) => { if (s.node === n && (state.slot[i] > 0 || (state.slot[i] === -1 && !(job && job.slot === i)))) state.slot[i] = 0; });
  if (!up && job && job.kind === "create" && SLOTS[job.slot].node === n && !crane.holding) { state.slot[job.slot] = 0; job = null; plan = [{ y: TRAVEL }]; }
  trays[n].t.userData.down = !up;
  trays[n].t.userData.setDown(!up);
  S.renderPanel();
}
const setDesired = (n) => { state.desired = Math.max(0, Math.min(12, n)); };

// requests: ingress → Service → a ready pod
const endpoints = () => state.slot.map((v, i) => (v > 0 && state.ready[i] > 1 ? i : -1)).filter((i) => i >= 0);
const flash = SLOTS.map(() => 0);
const net = S.packets({ speed: 140, onArrive: (d) => { flash[d.slot] = 0.25; } });
let spawnIn = 0, rr = 0;
const inIngress = (p) => Math.abs(p.x - ING.x) < ING.w / 2 && Math.abs(p.z - ING.z) < ING.d / 2;

S.onTick((dt) => {
  stepPlan(dt);
  springTo(crane, "gx", "vx", want.gx, dt, 110); springTo(crane, "tz", "vz", want.tz, dt, 150); springTo(crane, "hy", "vy", want.hy, dt, 260);
  gantry.position.x = crane.gx;
  trolley.position.set(crane.gx, 0, crane.tz);
  hook.position.set(crane.gx, crane.hy, crane.tz);
  cargo.visible = crane.holding;
  const top = crane.hy + 8, pos = cableGeo.attributes.position;
  pos.setXYZ(0, crane.gx - 1, top, crane.tz + 3); pos.setXYZ(1, crane.gx - 1, GIRDER_Y, crane.tz + 3);
  pos.setXYZ(2, crane.gx + 1, top, crane.tz - 3); pos.setXYZ(3, crane.gx + 1, GIRDER_Y, crane.tz - 3);
  pos.needsUpdate = true;
  S.labels.crane.obj.position.set(crane.gx, GIRDER_Y + 16, 0);
  freshY = Math.min(0, freshY + dt * 22);
  fresh.position.y = BOX_H + freshY;
  fresh.visible = !(crane.holding && job && job.kind === "create" && freshY < -POD.h + 0.5);
  // traffic
  spawnIn -= dt;
  const eps = endpoints();
  if (!reduced() && eps.length && spawnIn <= 0) {
    spawnIn = 0.45;
    const i = eps[rr++ % eps.length], cx = NODES[SLOTS[i].node];
    net.add([V(185, 9, TRACK_Z), V(ING.x, 9, TRACK_Z), V(ING.x, 1.9, TRACK_Z), V(cx, 1.9, TRACK_Z), V(cx, 1.9, PORT_Z)], { slot: i, hide: inIngress });
  }
  net.step(dt);
  pods.forEach((p, i) => {
    const on = state.slot[i] > 0;
    if (on) state.ready[i] += dt;
    if (on && !p.g.visible) { p.g.visible = true; p.g.scale.set(1, 0.01, 1); }
    if (!on) p.g.visible = false;
    if (p.g.visible) p.g.scale.y = Math.min(1, p.g.scale.y + dt * 4);
    flash[i] = Math.max(0, flash[i] - dt);
    p.l.set(on && state.ready[i] > 1 ? (flash[i] > 0 ? "accent" : "on") : "off");
    S.setLabel(p.id, state.names[i], { show: on });
  });
  NODES.forEach((_, n) => { trays[n].l.set(state.up[n] ? "on" : "off"); S.setLabel("node-" + n, "node-" + (n + 1) + (state.up[n] ? "" : " · down"), { bad: !state.up[n] }); });
  const e = eps.length;
  epLamps.forEach((l, i) => l.set(i < e ? "on" : "off"));
  knob.rotation.y = -(-0.75 * Math.PI + (state.desired / 12) * 1.5 * Math.PI);
  const r = running(), pending = Math.max(0, state.desired - r);
  S.say(`pods ${r}/${state.desired}` + (pending ? ` · ${pending} pending` : "") + (state.up.every(Boolean) ? "" : ` · ${state.up.filter((u) => !u).length} node down`));
  syncControls();
});

// ---- panel overview and the controls under the figure ----
S.overview = () => `<h2>A cluster you can take apart</h2><p class="muted">Every part of this yard is a piece of Kubernetes. Pick one in the scene, or from this list:</p>`;
const ui = { replicas: document.getElementById("cy-replicas"), nodes: [...document.querySelectorAll("[data-node]")], status: document.getElementById("cy-status") };
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => {
  S.stopTour();
  const a = b.dataset.do;
  if (a === "plus") setDesired(state.desired + 1);
  if (a === "minus") setDesired(state.desired - 1);
  if (a === "node") { const n = +b.dataset.node; setNode(n, !state.up[n]); }
}));
function syncControls() {
  const t = "replicas " + state.desired;
  if (ui.replicas.textContent !== t) ui.replicas.textContent = t;
  ui.nodes.forEach((b) => { const n = +b.dataset.node; const s = state.up[n] ? `Fail node-${n + 1}` : `Recover node-${n + 1}`; if (b.textContent !== s) b.textContent = s; b.classList.toggle("danger", state.up[n]); });
  const r = running(), cap = capacity();
  const msg = r < Math.min(state.desired, cap) ? "Reconciling: the scheduler is placing pods until running matches desired." : state.desired > cap ? `Desired ${state.desired}, but the nodes that are up only fit ${cap}. The rest wait as Pending.` : r > state.desired ? "Scaling down: extra pods are being removed." : "In sync: running matches desired.";
  if (ui.status.textContent !== msg) { ui.status.textContent = msg; ui.status.dataset.tone = msg.startsWith("In sync") ? "good" : state.desired > cap ? "bad" : ""; }
}

// ---- guided tour ----
// ---- what the inspector shows: each object's YAML, live ----
const ipOf = (i) => `10.244.${SLOTS[i].node + 1}.${10 + i}`;
const podIdx = () => state.slot.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0);
const podsOn = (n) => podIdx().filter((i) => SLOTS[i].node === n).length;
Object.assign(S.PARTS.cluster, { manifest: () => K.namespace({ name: "default" }), kubectl: "kubectl get nodes\nkubectl get pods -A -o wide\nkubectl cluster-info", facts: () => [["Nodes", `${state.up.filter(Boolean).length} of 3 Ready`], ["Pods", `${running()} running, ${Math.max(0, state.desired - running())} pending`], ["Kubernetes", "v1.31"]] });
NODES.forEach((_, n) => Object.assign(S.PARTS["node-" + n], { manifest: () => K.node({ name: `node-${n + 1}`, cidr: `10.244.${n + 1}.0/24`, ready: state.up[n], allocated: `${podsOn(n)} of 4 pods` }), facts: () => [["Status", state.up[n] ? "Ready" : "NotReady (down)"], ["Pods", `${podsOn(n)} / 4`], ["Pod CIDR", `10.244.${n + 1}.0/24`]] }));
Object.assign(S.PARTS.control, { manifest: () => K.deployment({ name: "web", replicas: state.desired, ready: endpoints().length, updated: running(), available: endpoints().length }), facts: () => [["Desired", state.desired], ["Running", running()], ["Ready", endpoints().length], ["Pending", Math.max(0, state.desired - running())]] });
Object.assign(S.PARTS.service, { manifest: () => K.service({ name: "web", endpoints: endpoints().map((i) => ipOf(i) + ":8080") }), facts: () => [["ClusterIP", "10.96.0.20"], ["Endpoints", endpoints().length], ["DNS name", "web.default.svc.cluster.local"]] });
Object.assign(S.PARTS.ingress, { manifest: () => K.ingress({ name: "web", rules: [{ host: "shop.example.com", paths: [{ path: "/", svc: "web" }] }], tls: { hosts: ["shop.example.com"], secret: "shop-cert" } }), facts: () => [["Class", "nginx"], ["Host", "shop.example.com"], ["Backend", "svc/web:80"]] });
Object.assign(S.PARTS.network, { manifest: () => K.endpointslice({ service: "web", endpoints: podIdx().map((i) => ({ ip: ipOf(i), ready: state.ready[i] > 1, node: `node-${SLOTS[i].node + 1}`, pod: state.names[i] })) }) });
Object.assign(S.PARTS.crane, { manifest: K.schedulerConfig(), kubectl: "kubectl get pods -o wide   # NODE column\nkubectl get events --field-selector reason=Scheduled", facts: () => [["Pods waiting", Math.max(0, state.desired - running())], ["Policy", "least-loaded node that is up"]] });
Object.assign(S.PARTS.registry, { manifest: "# images live in a registry; the pod template names one:\nspec:\n  template:\n    spec:\n      containers:\n      - name: web\n        image: ghcr.io/acme/web:1.4.2   # ← registry/repository:tag\n        imagePullPolicy: IfNotPresent   # ← pull only if the node lacks it", kubectl: "kubectl get pods -o jsonpath='{..image}'\ncrictl images   # on a node" });
Object.assign(S.PARTS.bin, { manifest: "# scaling down: the ReplicaSet deletes its newest pods first\n$ kubectl scale deployment web --replicas=3\ndeployment.apps/web scaled\n$ kubectl get pods\nNAME      READY   STATUS        RESTARTS\nweb-x7bq  1/1     Terminating   0   # ← gets SIGTERM, 30s grace period" });
pods.forEach((p, i) => Object.assign(S.PARTS[p.id], {
  manifest: () => (state.slot[i] > 0 ? K.pod({ name: state.names[i], labels: { app: "web", "pod-template-hash": "6b7f" }, node: `node-${SLOTS[i].node + 1}`, ip: ipOf(i), ready: state.ready[i] > 1, owner: { kind: "ReplicaSet", name: "web-6b7f" } }) : ""),
  facts: () => (state.slot[i] > 0 ? [["Node", `node-${SLOTS[i].node + 1}`], ["Pod IP", ipOf(i)], ["Ready", state.ready[i] > 1 ? "yes" : "starting"], ["Owner", "ReplicaSet web-6b7f"]] : []),
}));

S.setTour([
  { home: true, say: "This yard is a Kubernetes cluster. Watch the crane: it keeps the number of running pods equal to what you asked for.", hold: 6, run: () => setDesired(6) },
  { focus: "control", zoom: 2.4, say: "The control plane stores the desired state: 6 replicas of the web app. The knob is that number.", hold: 6 },
  { focus: "crane", zoom: 1.5, say: "The scheduler, drawn as a crane, picks a node for every pod that has none yet and sets it there.", hold: 6 },
  { focus: "node-0", zoom: 2.3, say: "Nodes are the machines that run pods. Each has room for four here; its kubelet starts what it is given.", hold: 5 },
  { focus: "service", zoom: 2.6, say: "The Service gives the pods one address. Its lamps are its endpoints: every ready pod.", hold: 5 },
  { focus: "ingress", zoom: 2.6, say: "Outside requests come in through the Ingress and travel along the track to a ready pod.", hold: 5 },
  { focus: "node-1", zoom: 2.3, say: "Now node-2 fails. Its pods are gone with it.", run: () => setNode(1, false), hold: 4 },
  { focus: "crane", zoom: 1.4, say: "Nobody pressed anything: the control plane sees too few pods and the scheduler places replacements on the nodes that are left.", hold: 4, until: () => running() >= Math.min(state.desired, capacity()) && !job },
  { focus: "control", zoom: 2.2, say: "Bring node-2 back and ask for 9 replicas. The same loop fills the free slots.", run: () => { setNode(1, true); setDesired(9); }, hold: 4, until: () => running() >= 9 && !job },
  { home: true, say: "Compare what should be with what is, and fix the difference. That loop is most of Kubernetes.", run: () => setDesired(6), hold: 7 },
]);
S.start();
