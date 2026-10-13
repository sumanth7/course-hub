import { k, scene, RUNTIME, writeLesson } from "../shared.mjs";

const PLATE = { x: -158, y: -84, w: 330, d: 170, r: 9 };
const ST = {
  api: { x: -22, y: -18, w: 44, d: 36, r: 3, h: 22 },
  etcd: { x: -122, y: -70, w: 44, d: 30, r: 3, h: 26 },
  cm: { x: 22, y: -74, w: 58, d: 26, r: 3, h: 18 },
  sched: { x: 96, y: -42, w: 46, d: 24, r: 3, h: 16 },
  kubectl: { x: -146, y: 24, w: 40, d: 28, r: 3, h: 8 },
};
const TRAY = { x: 28, y: 30, w: 132, d: 44, r: 3 };
const TRAY_Z = 4, TOP = 12;
const KUBELET = { x: 34, y: 34, w: 26, d: 15, r: 2 };
const RUNTIME_BOX = { x: 34, y: 53, w: 26, d: 15, r: 2 };
const SLOTS = [76, 94, 112, 130, 148];
const POD = (x) => ({ x: x - 7.5, y: 40, w: 15, d: 22, r: 0.6 });
const POD_H = 11;
const FZ = 1.9; // packets on the floor
// spokes: each station's path to the API server, floor level, ending at the API's faces
const SPOKE = {
  etcd: [[-100, -38.2, FZ], [-100, -8, FZ], [-22, -8, FZ]],
  kubectl: [[-104 + 1.8, 38, FZ], [-62, 38, FZ], [-62, 8, FZ], [-22, 8, FZ]],
  cm: [[51, -46.2, FZ], [51, -8, FZ], [22, -8, FZ]],
  sched: [[119, -16.2, FZ], [119, 0, FZ], [22, 0, FZ]],
  kubelet: [[47, 27, FZ], [47, 22, FZ], [8, 22, FZ], [8, 18, FZ]],
};

const C = scene({ width: 640, height: 400, elevation: 34, pad: 14, fit: [...k.boxCorners(PLATE, -17, 0), [ST.etcd.x, ST.etcd.y, ST.etcd.h + 6]] });
const { P, at, S, L, D, byDepth, plate, housing, crate, lampSvg, topText, frontText, faceRect, inlay, port } = C;

// floor inlays under every spoke
function spokes() {
  const out = [];
  for (const pts of Object.values(SPOKE)) {
    for (let i = 1; i < pts.length; i++) {
      const [a, b] = [pts[i - 1], pts[i]];
      const x0 = Math.min(a[0], b[0]) - 2.4, y0 = Math.min(a[1], b[1]) - 2.4;
      out.push(inlay({ x: x0, y: y0, w: Math.abs(a[0] - b[0]) + 4.8, d: Math.abs(a[1] - b[1]) + 4.8, r: 0.8 }, { groove: false }));
    }
  }
  return out.join("");
}
function station(id, title, extra = "") {
  const s = ST[id];
  const out = [housing(s, 0, s.h, { seam: 0.4 })];
  out.push(frontText(s.x + 3, s.y + s.d, 4, title, { size: 3, tone: "hi" }));
  out.push(lampSvg(s.x + s.w - 4.5, s.y + 4.5, s.h, { r: 1.2, attr: `data-busy="${id}"` }));
  return out.join("") + extra;
}
function api() {
  const s = ST.api;
  const out = [];
  ["authn", "authz", "admission"].forEach((name, i) => {
    const x = s.x + 8 + i * 14;
    out.push(S(k.cylinder(x, s.y + 12, 4, s.h, 2, P, 24), { tone: "lo" }));
    out.push(`<g data-stamp="${i}">${S(k.cylinder(x, s.y + 12, 3, s.h + 2, 3.5, P, 24, 0.3), { tone: "hi", lit: true })}</g>`);
    out.push(topText(x - 5, s.y + 22, s.h, name, { size: 2.4, tone: "mid" }));
  });
  out.push(topText(s.x + 3, s.y + s.d - 4, s.h, "kube-apiserver", { size: 3, tone: "hi" }));
  return station("api", "API server", out.join(""));
}
function etcd() {
  const s = ST.etcd;
  const out = [];
  const fx = s.x + s.w;
  for (let i = 0; i < 3; i++) out.push(L(faceRect("x", fx, s.y + 3 + i * 9, s.y + 10 + i * 9, 5, 21), { tone: "lo" }));
  out.push(topText(s.x + 3, s.y + 10, s.h, "etcd", { size: 4, tone: "hi" }));
  out.push(topText(s.x + 3, s.y + 17, s.h, "revision 1041", { size: 2.8, tone: "mid", attrs: "data-rev" }));
  return station("etcd", "etcd (only the API writes)", out.join(""));
}
function cm() {
  const s = ST.cm;
  return station("cm", "controller-manager", topText(s.x + 3, s.y + 9, s.h, "deployment ctrl", { size: 2.8, tone: "mid" }) + topText(s.x + 3, s.y + 15, s.h, "replicaset ctrl", { size: 2.8, tone: "mid" }) + topText(s.x + 3, s.y + 21, s.h, "watches → acts", { size: 2.6, tone: "lo" }));
}
function sched() {
  const s = ST.sched;
  return station("sched", "kube-scheduler", topText(s.x + 3, s.y + 10, s.h, "pod → node", { size: 3, tone: "mid" }));
}
function kubectl() {
  const s = ST.kubectl;
  const out = [];
  const screen = { x: s.x + 4, y: s.y + 3, w: s.w - 8, d: 8, r: 0.8 };
  out.push(S(k.slabOf(screen, s.h, 14, P, 2, 0.4), { tone: "mid" }));
  out.push(L(faceRect("y", screen.y + screen.d, screen.x + 2, screen.x + screen.w - 2, s.h + 2, s.h + 12), { tone: "lo" }));
  out.push(frontText(screen.x + 3, screen.y + screen.d, s.h + 8.5, "$ kubectl", { size: 3, tone: "hi" }));
  out.push(frontText(screen.x + 3, screen.y + screen.d, s.h + 4.5, "", { size: 2.6, tone: "mid", attrs: "data-cmd" }));
  return station("kubectl", "you: kubectl", out.join(""));
}
function node() {
  const out = [`<path class="iso-halo" d="${k.haloOf(TRAY, 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  for (const [x, y] of byDepth(k.corners(TRAY, 6))) out.push(S(k.cylinder(x, y, 3, 0, TRAY_Z, P, 18), { tone: "lo" }));
  out.push(S(k.slabOf(TRAY, TRAY_Z, TOP - TRAY_Z, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(TRAY, TRAY_Z + 2.4, P, 4), { tone: "faint" }) }));
  out.push(frontText(TRAY.x + 4, TRAY.y + TRAY.d, TRAY_Z + 2.2, "node-1", { size: 2.8, tone: "mid" }));
  out.push(housing(KUBELET, TOP, 8, { seam: 0.5, plinth: false }));
  out.push(topText(KUBELET.x + 2.5, KUBELET.y + 9.5, TOP + 8, "kubelet", { size: 3, tone: "hi" }));
  out.push(lampSvg(KUBELET.x + KUBELET.w - 3.5, KUBELET.y + 3.5, TOP + 8, { r: 1, attr: 'data-busy="kubelet"' }));
  out.push(housing(RUNTIME_BOX, TOP, 8, { seam: 0.5, plinth: false }));
  out.push(topText(RUNTIME_BOX.x + 2.5, RUNTIME_BOX.y + 9.5, TOP + 8, "containerd", { size: 2.8, tone: "hi" }));
  out.push(lampSvg(RUNTIME_BOX.x + RUNTIME_BOX.w - 3.5, RUNTIME_BOX.y + 3.5, TOP + 8, { r: 1, attr: 'data-busy="runtime"' }));
  SLOTS.forEach((x) => out.push(L(k.planOutline(k.insetPlan(POD(x), -1.2), TOP, P, 2), { tone: "faint" })));
  return out.join("");
}
const podSvg = (i) => `<g data-pod="${i}" style="opacity:0">${crate(POD(SLOTS[i]), TOP, POD_H, { ribs: 3, doors: false, lamp: [SLOTS[i] + 3.5, 44], lampAttr: `data-plamp="${i}"` })}${topText(SLOTS[i] - 6, 59, TOP + POD_H, "", { size: 2.6, tone: "hi", attrs: `data-pname="${i}"` })}</g>`;

const body = [
  plate(PLATE, { ruler: false }),
  spokes(),
  etcd(),
  cm(),
  `<g data-lane="back"></g>`,
  api(),
  sched(),
  kubectl(),
  node(),
  SLOTS.map((_, i) => podSvg(i)).join(""),
  `<g data-lane="front"></g>`,
].join("");

const live = `
const P = ${JSON.stringify(P)};
${RUNTIME}
const SPOKE = ${JSON.stringify(SPOKE)}, ST = ${JSON.stringify(ST)}, SLOTS = ${JSON.stringify(SLOTS)}, TOP = ${TOP};
const KUBELET = ${JSON.stringify(KUBELET)}, RUNTIME_BOX = ${JSON.stringify(RUNTIME_BOX)};
const ui = { status: document.getElementById("cp-status"), steps: document.getElementById("cp-steps"), objs: document.getElementById("cp-objs"), mode: document.getElementById("cp-mode"), next: document.getElementById("cp-next") };
const lanes = { back: $('[data-lane="back"]'), front: $('[data-lane="front"]') };
const inApi = ([x, y]) => x > ST.api.x && x < ST.api.x + ST.api.w && y > ST.api.y && y < ST.api.y + ST.api.d;
const laneOf = ([x, y, z]) => (y < -10 && x < 60 ? lanes.back : lanes.front);
let pending = 0;
const net = packets({ speed: 130, layer: laneOf, onArrive: () => { pending--; } });

// a hop between a station and the API server follows that station's spoke
const local = {
  "kubelet>runtime": [[47, 44, TOP + 1.5], [47, 58, TOP + 1.5]],
  "runtime>kubelet": [[47, 58, TOP + 1.5], [47, 44, TOP + 1.5]],
};
function hop(from, to, cls = "") {
  let pts;
  if (local[from + ">" + to]) pts = local[from + ">" + to];
  else if (to === "api") pts = SPOKE[from];
  else pts = SPOKE[to].slice().reverse();
  busy[from] = 1; busy[to] = 1;
  net.add(pts, { hide: inApi }, cls);
}
const busy = {};

// ---- the cluster state, as etcd holds it ----
const db = { rev: 1041, deploy: null, rs: null, pods: [] };
let podSeq = 0;
const newPodName = () => "web-6b7f-" + ["x2k9", "p4tq", "m8zr", "c7wd", "h3nv", "q9ls", "b5je"][podSeq++ % 7];
const write = () => { db.rev++; };

// each step: what to say, the hops to animate, and what changes once they land
let lastSay = "", queue = [], current = null, stepNo = 0, stepTotal = 0, auto = true, wait = 0, ready = true;
function plan(steps) { queue = steps.slice(); current = null; stepNo = 0; stepTotal = steps.length; ready = true; }
const S_ = (say, hops, effect) => ({ say, hops, effect });
function apply() {
  if (db.deploy) return scale(db.deploy.replicas === 3 ? 5 : 3);
  plan([
    S_("kubectl sends the manifest to the API server: POST /apis/apps/v1/namespaces/default/deployments", [["kubectl", "api"]], () => setCmd("apply -f web.yaml")),
    S_("The API server authenticates you, checks RBAC (authorization), then runs admission (defaults, policies)", [], () => stamp()),
    S_("It stores the Deployment in etcd. Only the API server talks to etcd.", [["api", "etcd"], ["etcd", "api"]], () => { db.deploy = { replicas: 3 }; write(); }),
    S_("201 Created goes back to kubectl. Your command is done; everything after this happens by watching.", [["api", "kubectl"]]),
    S_("The deployment controller is watching Deployments. It sees the new one...", [["api", "cm"]]),
    S_("...and asks the API server to create a ReplicaSet, which is stored in etcd.", [["cm", "api"], ["api", "etcd"]], () => { db.rs = { replicas: 3 }; write(); }),
    S_("The replicaset controller sees a ReplicaSet with 0 of 3 pods and creates 3 Pods, with no node yet.", [["api", "cm"], ["cm", "api"], ["api", "etcd"]], () => { for (let i = 0; i < 3; i++) db.pods.push({ name: newPodName(), node: "", phase: "Pending" }); write(); }),
    S_("The scheduler watches for pods without a node, picks one for each and writes a binding.", [["api", "sched"], ["sched", "api"], ["api", "etcd"]], () => { db.pods.forEach((p) => { if (!p.node) p.node = "node-1"; }); write(); }),
    S_("The kubelet on node-1 watches for pods bound to its node and sees three new ones.", [["api", "kubelet"]]),
    S_("It asks the container runtime to pull the image and start the containers.", [["kubelet", "runtime"], ["runtime", "kubelet"]], () => db.pods.forEach((p) => { if (p.phase === "Pending") p.phase = "Running"; })),
    S_("The kubelet reports the pods' status back through the API server, which stores it in etcd. Desired state = actual state.", [["kubelet", "api"], ["api", "etcd"]], () => write()),
  ]);
}
function scale(n) {
  plan([
    S_("kubectl scale deployment web --replicas=" + n + ": a PATCH to the API server", [["kubectl", "api"]], () => setCmd("scale deploy web --replicas=" + n)),
    S_("Checked, admitted and stored in etcd", [["api", "etcd"], ["etcd", "api"]], () => { stamp(); db.deploy.replicas = n; write(); }),
    S_("The deployment controller sees the change and updates the ReplicaSet's replicas", [["api", "cm"], ["cm", "api"], ["api", "etcd"]], () => { db.rs.replicas = n; write(); }),
    S_("The replicaset controller compares " + n + " wanted with " + db.pods.length + " existing and " + (n > db.pods.length ? "creates" : "deletes") + " the difference", [["api", "cm"], ["cm", "api"], ["api", "etcd"]], () => {
      while (db.pods.length < n) db.pods.push({ name: newPodName(), node: "", phase: "Pending" });
      while (db.pods.length > n) db.pods.pop();
      write();
    }),
    ...(n > 3 ? [S_("The scheduler binds the new pods to a node", [["api", "sched"], ["sched", "api"], ["api", "etcd"]], () => { db.pods.forEach((p) => { if (!p.node) p.node = "node-1"; }); write(); })] : []),
    S_("The kubelet sees its pods change and starts or stops containers through the runtime", [["api", "kubelet"], ["kubelet", "runtime"], ["runtime", "kubelet"]], () => db.pods.forEach((p) => { if (p.phase === "Pending") p.phase = "Running"; })),
    S_("Status flows back to etcd through the API server", [["kubelet", "api"], ["api", "etcd"]], () => write()),
  ]);
}
function deletePod() {
  if (!db.pods.length) return;
  const victim = db.pods[0].name;
  plan([
    S_("kubectl delete pod " + victim, [["kubectl", "api"]], () => setCmd("delete pod " + victim)),
    S_("The API server marks it deleted in etcd; the kubelet stops its containers", [["api", "etcd"], ["api", "kubelet"], ["kubelet", "runtime"]], () => { stamp(); db.pods.shift(); write(); }),
    S_("The replicaset controller sees " + (db.pods.length) + " of " + db.rs.replicas + " pods and creates a replacement", [["api", "cm"], ["cm", "api"], ["api", "etcd"]], () => { db.pods.push({ name: newPodName(), node: "", phase: "Pending" }); write(); }),
    S_("The scheduler binds it, and the kubelet starts it", [["api", "sched"], ["sched", "api"], ["api", "kubelet"], ["kubelet", "runtime"]], () => { db.pods.forEach((p) => { p.node = "node-1"; if (p.phase === "Pending") p.phase = "Running"; }); write(); }),
    S_("Back to 3 running pods. Nobody told it to; the controller noticed the difference and fixed it.", [["kubelet", "api"], ["api", "etcd"]], () => write()),
  ]);
}
function reset() { db.deploy = null; db.rs = null; db.pods = []; db.rev = 1041; plan([]); setCmd(""); net.clear(); pending = 0; }
let stampT = -1;
const stamp = () => { stampT = 0; };
let cmd = "";
const setCmd = (c) => { cmd = c; };

function stepEngine(dt) {
  if (current && pending <= 0 && wait <= 0) {
    if (current.effect) current.effect();
    current = null; ready = !auto ? false : true; wait = 0.35;
  }
  if (wait > 0) { wait -= dt; return; }
  if (!current && queue.length && (auto || ready)) {
    current = queue.shift(); stepNo++; ready = false; lastSay = current.say;
    current.hops.forEach(([a, b], i) => setTimeout(() => hop(a, b, b === "etcd" || a === "etcd" ? "is-alt" : ""), i * 450));
    if (!current.hops.length) { stamp(); wait = 1.2; }
    pending += current.hops.length;
  }
}
// hops queued with setTimeout count as pending from the start
const _hop = hop;

function draw(dt) {
  net.draw();
  for (const id of ["api", "etcd", "cm", "sched", "kubectl", "kubelet", "runtime"]) {
    busy[id] = Math.max(0, (busy[id] || 0) - dt * 1.2);
    const el = $('[data-busy="' + id + '"]');
    if (el) el.style.opacity = (0.15 + 0.85 * busy[id]).toFixed(2);
  }
  if (stampT >= 0) stampT += dt;
  [0, 1, 2].forEach((i) => {
    const t = stampT - i * 0.35;
    const down = t > 0 && t < 0.3 ? 1 : 0;
    const el = $('[data-stamp="' + i + '"]');
    el.setAttribute("transform", down ? translateAlong(P, [0, 0, -1.6]) : "");
    el.style.opacity = stampT >= 0 && t > 0 && stampT < 3 ? 1 : 0.35;
  });
  setText($("[data-rev]"), "revision " + db.rev);
  setText($("[data-cmd]"), cmd);
  SLOTS.forEach((_, i) => {
    const p = db.pods[i];
    const g = $('[data-pod="' + i + '"]');
    const show = p && p.node;
    g.style.opacity = show ? (p.phase === "Running" ? 1 : 0.45) : 0;
    $('[data-plamp="' + i + '"]').style.opacity = p && p.phase === "Running" ? 1 : 0.1;
    setText(g.querySelector("[data-pname]"), p ? p.name.slice(-4) : "");
  });
  setText(ui.status, current ? current.say : queue.length ? (auto ? lastSay : lastSay + "  Press Next step to continue.") : db.deploy ? "Settled. Try scaling or deleting a pod." : "Press kubectl apply to send a Deployment with 3 replicas.");
  say(stepTotal && (current || queue.length) ? "step " + stepNo + " of " + stepTotal : db.deploy ? db.pods.filter((p) => p.phase === "Running").length + " pods running · etcd rev " + db.rev : "empty cluster");
  const rows = [];
  if (db.deploy) rows.push(["Deployment", "web", "replicas: " + db.deploy.replicas]);
  if (db.rs) rows.push(["ReplicaSet", "web-6b7f", "replicas: " + db.rs.replicas]);
  db.pods.forEach((p) => rows.push(["Pod", p.name, "node: " + (p.node || "(none yet)") + " · phase: " + p.phase]));
  const html = rows.map((r) => "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td><td>" + r[2] + "</td></tr>").join("") || "<tr><td colspan=3>(no objects yet)</td></tr>";
  if (ui.objs.__h !== html) { ui.objs.innerHTML = html; ui.objs.__h = html; }
  ui.mode.textContent = auto ? "Auto-play: on" : "Auto-play: off (step mode)";
  ui.mode.setAttribute("aria-pressed", String(auto));
  ui.next.disabled = auto || !queue.length || !!current;
}

const A = animate({
  tick(dt) { stepEngine(dt); net.step(dt); draw(dt); },
  tour: [{ hold: 2 }, { apply: 1 }, { until: () => !queue.length && !current, min: 3 }, { scale: 5 }, { until: () => !queue.length && !current, min: 3 }, { del: 1 }, { until: () => !queue.length && !current, min: 3 }, { scale: 3 }, { until: () => !queue.length && !current, min: 3 }, { reset: 1 }],
  act(s) { if (s.apply) apply(); if (s.scale) scale(s.scale); if (s.del) deletePod(); if (s.reset) reset(); },
});
controls({
  apply: () => apply(),
  del: () => deletePod(),
  reset: () => reset(),
  mode: () => { auto = !auto; ready = auto; },
  next: () => { ready = true; },
}, A.takeOver);
draw(0);
`;

const controls = `<div class="lx-controls" role="group" aria-label="Control plane controls">
  <button type="button" data-do="apply">kubectl apply / scale</button>
  <button type="button" data-do="del" class="is-danger">kubectl delete pod</button>
  <button type="button" data-do="reset">Reset cluster</button>
  <button type="button" data-do="mode" id="cp-mode" aria-pressed="true">Auto-play: on</button>
  <button type="button" data-do="next" id="cp-next" disabled>Next step →</button>
  <p class="lx-status" id="cp-status" aria-live="polite"></p>
</div>
<div class="lx-table-wrap"><table class="lx-table"><thead><tr><th>Kind (in etcd)</th><th>Name</th><th>State</th></tr></thead><tbody id="cp-objs"></tbody></table></div>
<pre class="lx-yaml"><b>apiVersion:</b> apps/v1          # web.yaml
<b>kind:</b> Deployment
<b>metadata:</b> { name: web }
<b>spec:</b>
  <b>replicas:</b> 3
  <b>selector:</b> { matchLabels: { app: web } }
  <b>template:</b>
    <b>metadata:</b> { labels: { app: web } }
    <b>spec:</b> { containers: [{ name: web, image: nginx:1.27 }] }</pre>`;

writeLesson({
  slug: "control-plane",
  pageTitle: "Inside the Control Plane",
  fig: "Fig 3",
  title: "Inside the control plane",
  hint: "Run kubectl apply below; turn off auto-play to step",
  readout: "empty cluster",
  label:
    "The control plane drawn as a hub-and-spoke mailroom. The API server stands in the middle with three stamps, authentication, authorization and admission; every other part connects to it by its own floor track: etcd, the only store, at the back left; the controller manager and the scheduler at the back and right; your kubectl terminal at the front left; and a node at the front right with its kubelet, its container runtime and pod slots. Messages travel as dots along the tracks, always through the API server.",
  keys: [
    { mark: "lit", label: "A request or a watch event travelling a spoke, always to or from the API server" },
    { mark: "edge", label: "Ringed dot: a read or write of etcd, which only the API server makes" },
    { mark: "raised", label: "Lamps: which component is working right now" },
  ],
  caption:
    "kubectl only talks to the API server, and so does every other component: the API server authenticates and authorizes each request, runs admission, and is the only part that reads and writes etcd. The rest of the work happens by watching. The deployment controller sees a new Deployment and creates a ReplicaSet; the replicaset controller sees too few pods and creates them; the scheduler sees pods without a node and binds them; the kubelet sees pods bound to its node and has the container runtime start them, then reports their status. Each part compares what it sees with what should be and closes the gap, so deleting a pod is repaired the same way.",
  body,
  controls,
  live,
});
