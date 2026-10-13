// Lesson 03 in 3D: the control plane as a hub-and-spoke mailroom. Every message goes through the API server.
const S = createStage({ home: { target: [8, 16, -4], dir: [0.95, 1, 1.1], zoom: 1 }, viewH: 280 });
const { box, cyl, lamp, crate, housing, track, part, own, label } = S;

const FY = 1.9, TOP = 12;
const ST = {
  api: { x: 0, z: 0, w: 44, d: 36, h: 22 },
  etcd: { x: -100, z: -55, w: 44, d: 30, h: 26 },
  cm: { x: 51, z: -61, w: 58, d: 26, h: 18 },
  sched: { x: 119, z: -30, w: 46, d: 24, h: 16 },
  kubectl: { x: -126, z: 38, w: 40, d: 28, h: 8 },
};
const TRAY = { x: 94, z: 52, w: 132, d: 44 };
const KUBELET = { x: 47, z: 41.5 }, RUNTIME = { x: 47, z: 60.5 };
const SLOTS = [76, 94, 112, 130, 148];
const SPOKE = {
  etcd: [[-100, -38.2], [-100, -8], [-22, -8]],
  kubectl: [[-104 + 1.8, 38], [-62, 38], [-62, 8], [-22, 8]],
  cm: [[51, -46.2], [51, -8], [22, -8]],
  sched: [[119, -16.2], [119, 0], [22, 0]],
  kubelet: [[47, 27], [47, 22], [8, 22], [8, 18]],
};
const P3 = (pts) => pts.map(([x, z]) => V(x, FY, z));

part("plate", { kind: "Control plane", title: "The control plane", noFrame: true, zoom: 1, anchor: V(8, 30, -4), desc: "The parts that decide what runs where, and one node that runs it. They never talk to each other directly: every message travels a spoke to the API server.", yaml: "kubectl get componentstatuses   # deprecated, but shows the idea\nkubectl -n kube-system get pods" });
own("plate", S.plate({ x: 12, z: 1, w: 330, d: 170 }));
const segs = [];
for (const pts of Object.values(SPOKE)) for (let i = 1; i < pts.length; i++) segs.push([pts[i - 1], pts[i]]);
own("plate", track(segs, { width: 4.8 }));

const INFO = {
  api: { kind: "kube-apiserver", title: "API server", zoom: 2.4, desc: "The front door. It authenticates every request (who are you?), authorizes it with RBAC (may you?), runs admission (defaults and policies), and is the only part that reads and writes etcd. Everyone else, including you, talks to it.", yaml: "kubectl get --raw /healthz\nkubectl api-resources" },
  etcd: { kind: "etcd", title: "etcd", zoom: 2.6, desc: () => `A consistent key-value store holding every object in the cluster: the desired state. Each write bumps its revision (now <b>${db.rev}</b>). Only the API server talks to it.`, yaml: "etcdctl get /registry/deployments/default/web" },
  cm: { kind: "kube-controller-manager", title: "Controller manager", zoom: 2.6, desc: "Runs the controllers: loops that watch objects through the API server and act to make reality match. The deployment controller makes ReplicaSets; the replicaset controller makes Pods.", yaml: "kubectl -n kube-system logs kube-controller-manager-<node>" },
  sched: { kind: "kube-scheduler", title: "Scheduler", zoom: 2.6, desc: "Watches for pods without a node, picks one for each (resources, rules, spread), and writes that choice back as a binding.", yaml: "kubectl get events --field-selector reason=Scheduled" },
  kubectl: { kind: "You", title: "kubectl", zoom: 2.6, desc: () => `Sends your request to the API server and gets an answer back. That is all it does: <b>${cmd ? "$ kubectl " + cmd : "press kubectl apply below"}</b>. Everything after the answer happens by watching.`, yaml: "kubectl apply -f web.yaml" },
};
const busyLamps = {};
for (const id of Object.keys(ST)) {
  const s = ST[id];
  part(id, { ...INFO[id], anchor: V(s.x, s.h + 14, s.z) });
  own(id, housing({ x: s.x, z: s.z, w: s.w, d: s.d, h: s.h }));
  busyLamps[id] = lamp(s.x + s.w / 2 - 5, s.h, s.z - s.d / 2 + 5, { r: 1.3, state: "off" });
  own(id, busyLamps[id].mesh);
  label(id, INFO[id].title);
}
// API stamps: authn, authz, admission
const stamps = [0, 1, 2].map((i) => { const g = new THREE.Group(); g.add(cyl(3, 4, { tone: "hi", seg: 22 })); g.position.set(-14 + i * 14, ST.api.h + 1.6, -4); own("api", cyl(4, 1.6, { x: -14 + i * 14, y0: ST.api.h, z: -4, tone: "lo", seg: 22 }), g); return g; });
S.label("api", "authn · authz · admission", { small: true, anchor: V(0, ST.api.h + 10, -4), lod: 1.6 });
// etcd drawers and revision
own("etcd", ...[0, 1, 2].map((i) => box(1, 16, 7, { x: ST.etcd.x + ST.etcd.w / 2 + 0.5, y0: 5, z: ST.etcd.z - 9 + i * 9, r: 0.3 })));
const revLabel = S.label("etcd", "", { small: true, anchor: V(ST.etcd.x, ST.etcd.h + 4, ST.etcd.z + 6) });
const cmdLabel = S.label("kubectl", "", { small: true, anchor: V(ST.kubectl.x, ST.kubectl.h + 18, ST.kubectl.z) });
own("kubectl", box(32, 14, 3, { x: ST.kubectl.x, y0: ST.kubectl.h, z: ST.kubectl.z - 8, tone: "mid", r: 0.6 }));

// the node: kubelet, container runtime, pod slots
part("node", { kind: "Node", title: "node-1", zoom: 1.8, anchor: V(TRAY.x, TOP + 4, TRAY.z + 24), desc: "Where pods actually run.", yaml: "" });
own("node", S.tray({ x: TRAY.x, z: TRAY.z, w: TRAY.w, d: TRAY.d, top: TOP }));
part("kubelet", { kind: "kubelet", title: "kubelet", zoom: 3, anchor: V(KUBELET.x, TOP + 16, KUBELET.z), desc: "The agent on every node. It watches for pods bound to its node, has the container runtime start them, and reports their status back through the API server.", yaml: "journalctl -u kubelet" });
own("kubelet", housing({ x: KUBELET.x, z: KUBELET.z, w: 26, d: 15, h: 8, y0: TOP, plinth: false }));
busyLamps.kubelet = lamp(KUBELET.x + 9, TOP + 8, KUBELET.z - 4, { r: 1, state: "off" });
own("kubelet", busyLamps.kubelet.mesh);
label("kubelet", "kubelet");
part("runtime", { kind: "Container runtime", title: "containerd", zoom: 3, anchor: V(RUNTIME.x, TOP + 16, RUNTIME.z), desc: "Pulls images and runs containers when the kubelet asks.", yaml: "crictl ps" });
own("runtime", housing({ x: RUNTIME.x, z: RUNTIME.z, w: 26, d: 15, h: 8, y0: TOP, plinth: false }));
busyLamps.runtime = lamp(RUNTIME.x + 9, TOP + 8, RUNTIME.z - 4, { r: 1, state: "off" });
own("runtime", busyLamps.runtime.mesh);
label("runtime", "containerd");
const podObjs = SLOTS.map((x, i) => { const id = part("pod-" + i, { kind: "Pod", dynamic: true, zoom: 3.4, anchor: V(x, TOP + 20, 51), title: () => (db.pods[i] ? db.pods[i].name : "empty slot"), desc: () => { const p = db.pods[i]; return p ? `node: ${p.node || "(none yet)"} · phase: ${p.phase}` : ""; } }); const g = crate({ w: 15, h: 11, d: 22, ribs: 3 }); g.position.set(x, TOP, 51); const l = lamp(3.5, 11, -7, { r: 1 }); g.add(l.mesh); own(id, g); g.visible = false; label(id, "", { small: true, lod: 1.8 }); return { g, l, id }; });

// ---- the cluster state, as etcd holds it, and the steps that change it ----
const db = { rev: 1041, deploy: null, rs: null, pods: [] };
let podSeq = 0, cmd = "", stampT = -1;
const NAMES = ["x2k9", "p4tq", "m8zr", "c7wd", "h3nv", "q9ls", "b5je"];
const newPod = () => ({ name: "web-6b7f-" + NAMES[podSeq++ % 7], node: "", phase: "Pending" });
const write = () => db.rev++;
let pending = 0;
const busy = {};
const net = S.packets({ speed: 130, onArrive: () => pending-- });
const local = { "kubelet>runtime": [V(47, TOP + 1.5, 44), V(47, TOP + 1.5, 58)], "runtime>kubelet": [V(47, TOP + 1.5, 58), V(47, TOP + 1.5, 44)] };
const inApi = (q) => Math.abs(q.x) < 22 && Math.abs(q.z) < 18;
function hop(a, b) {
  const pts = local[a + ">" + b] || (b === "api" ? P3(SPOKE[a]) : P3(SPOKE[b]).reverse());
  busy[a] = 1; busy[b] = 1;
  net.add(pts, { hide: inApi, alt: a === "etcd" || b === "etcd", ring: a === "etcd" || b === "etcd" });
}
let queue = [], current = null, stepNo = 0, stepTotal = 0, auto = true, ready = true, wait = 0, lastSay = "";
const plan = (steps) => { queue = steps.slice(); current = null; stepNo = 0; stepTotal = steps.length; ready = true; };
const St = (say, hops, effect) => ({ say, hops, effect });
function apply() {
  if (db.deploy) return scale(db.deploy.replicas === 3 ? 5 : 3);
  plan([
    St("kubectl sends the manifest to the API server: POST /apis/apps/v1/namespaces/default/deployments", [["kubectl", "api"]], () => { cmd = "apply -f web.yaml"; }),
    St("The API server authenticates you, checks RBAC, then runs admission.", []),
    St("It stores the Deployment in etcd. Only the API server talks to etcd.", [["api", "etcd"], ["etcd", "api"]], () => { db.deploy = { replicas: 3 }; write(); }),
    St("201 Created goes back to kubectl. Your command is done; everything after this happens by watching.", [["api", "kubectl"]]),
    St("The deployment controller is watching Deployments. It sees the new one...", [["api", "cm"]]),
    St("...and asks the API server to create a ReplicaSet, which is stored in etcd.", [["cm", "api"], ["api", "etcd"]], () => { db.rs = { replicas: 3 }; write(); }),
    St("The replicaset controller sees 0 of 3 pods and creates 3 Pods, with no node yet.", [["api", "cm"], ["cm", "api"], ["api", "etcd"]], () => { for (let i = 0; i < 3; i++) db.pods.push(newPod()); write(); }),
    St("The scheduler watches for pods without a node, picks one for each and writes a binding.", [["api", "sched"], ["sched", "api"], ["api", "etcd"]], () => { db.pods.forEach((p) => { if (!p.node) p.node = "node-1"; }); write(); }),
    St("The kubelet on node-1 watches for pods bound to its node and sees three new ones.", [["api", "kubelet"]]),
    St("It asks the container runtime to pull the image and start the containers.", [["kubelet", "runtime"], ["runtime", "kubelet"]], () => db.pods.forEach((p) => { if (p.phase === "Pending") p.phase = "Running"; })),
    St("The kubelet reports status back through the API server into etcd. Desired state = actual state.", [["kubelet", "api"], ["api", "etcd"]], write),
  ]);
}
function scale(n) {
  plan([
    St(`kubectl scale deployment web --replicas=${n}: a PATCH to the API server`, [["kubectl", "api"]], () => { cmd = `scale deploy web --replicas=${n}`; }),
    St("Checked, admitted, and stored in etcd.", [["api", "etcd"], ["etcd", "api"]], () => { stampT = 0; db.deploy.replicas = n; write(); }),
    St("The deployment controller sees the change and updates the ReplicaSet.", [["api", "cm"], ["cm", "api"], ["api", "etcd"]], () => { db.rs.replicas = n; write(); }),
    St(`The replicaset controller compares ${n} wanted with what exists and ${n > db.pods.length ? "creates" : "deletes"} the difference.`, [["api", "cm"], ["cm", "api"], ["api", "etcd"]], () => { while (db.pods.length < n) db.pods.push(newPod()); while (db.pods.length > n) db.pods.pop(); write(); }),
    ...(n > 3 ? [St("The scheduler binds the new pods to a node.", [["api", "sched"], ["sched", "api"], ["api", "etcd"]], () => { db.pods.forEach((p) => { if (!p.node) p.node = "node-1"; }); write(); })] : []),
    St("The kubelet sees its pods change and starts or stops containers.", [["api", "kubelet"], ["kubelet", "runtime"], ["runtime", "kubelet"]], () => db.pods.forEach((p) => { if (p.phase === "Pending") p.phase = "Running"; })),
    St("Status flows back to etcd through the API server.", [["kubelet", "api"], ["api", "etcd"]], write),
  ]);
}
function deletePod() {
  if (!db.pods.length) return;
  const victim = db.pods[0].name;
  plan([
    St(`kubectl delete pod ${victim}`, [["kubectl", "api"]], () => { cmd = "delete pod " + victim; }),
    St("The API server records the deletion; the kubelet stops the containers.", [["api", "etcd"], ["api", "kubelet"], ["kubelet", "runtime"]], () => { stampT = 0; db.pods.shift(); write(); }),
    St(`The replicaset controller sees ${db.pods.length - 1} of ${db.rs ? db.rs.replicas : 3} pods and creates a replacement.`, [["api", "cm"], ["cm", "api"], ["api", "etcd"]], () => { db.pods.push(newPod()); write(); }),
    St("The scheduler binds it, and the kubelet starts it.", [["api", "sched"], ["sched", "api"], ["api", "kubelet"], ["kubelet", "runtime"]], () => { db.pods.forEach((p) => { p.node = "node-1"; if (p.phase === "Pending") p.phase = "Running"; }); write(); }),
    St("Back to the desired count. Nobody told it to; the controller noticed and fixed it.", [["kubelet", "api"], ["api", "etcd"]], write),
  ]);
}
function reset() { Object.assign(db, { deploy: null, rs: null, pods: [], rev: 1041 }); plan([]); cmd = ""; net.clear(); pending = 0; }
function engine(dt) {
  if (current && pending <= 0 && wait <= 0) { current.effect?.(); current = null; ready = auto; wait = 0.35; }
  if (wait > 0) { wait -= dt; return; }
  if (!current && queue.length && (auto || ready)) {
    current = queue.shift(); stepNo++; ready = false; lastSay = current.say;
    pending += current.hops.length;
    current.hops.forEach(([a, b], i) => setTimeout(() => hop(a, b), i * 450));
    if (!current.hops.length) { stampT = 0; wait = 1.2; }
  }
}

S.onTick((dt) => {
  engine(dt); net.step(dt);
  for (const id in busyLamps) { busy[id] = Math.max(0, (busy[id] || 0) - dt * 1.2); busyLamps[id].set(busy[id] > 0.05 ? "accent" : "off"); }
  if (stampT >= 0) stampT += dt;
  stamps.forEach((g, i) => { const t = stampT - i * 0.35; g.position.y = ST.api.h + 1.6 - (t > 0 && t < 0.3 ? 1.6 : 0); });
  revLabel.el.textContent = "revision " + db.rev;
  cmdLabel.el.textContent = cmd ? "$ kubectl " + cmd : "$ kubectl";
  podObjs.forEach((o, i) => { const p = db.pods[i]; o.g.visible = !!(p && p.node); o.l.set(p && p.phase === "Running" ? "on" : "off"); S.setLabel(o.id, p ? p.name.slice(-4) : "", { show: !!(p && p.node) }); });
  S.say(stepTotal && (current || queue.length) ? `step ${stepNo} of ${stepTotal}` : db.deploy ? `${db.pods.filter((p) => p.phase === "Running").length} pods running · etcd rev ${db.rev}` : "empty cluster");
  syncUi();
});

S.overview = () => `<h2>Inside the control plane</h2><p class="muted">Press <b>kubectl apply</b> below and follow the messages. Turn off auto-play to step through it. Pick a part:</p>`;
const ui = { status: document.getElementById("cp-status"), objs: document.getElementById("cp-objs"), mode: document.getElementById("cp-mode"), next: document.getElementById("cp-next") };
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => {
  S.stopTour();
  const a = b.dataset.do;
  if (a === "apply") apply(); if (a === "del") deletePod(); if (a === "reset") reset();
  if (a === "mode") { auto = !auto; ready = auto; } if (a === "next") ready = true;
  S.renderPanel();
}));
function syncUi() {
  const m = current ? current.say : queue.length ? lastSay + (auto ? "" : "  Press Next step to continue.") : db.deploy ? "Settled. Try scaling or deleting a pod." : "Press kubectl apply to send a Deployment with 3 replicas.";
  if (ui.status.textContent !== m) ui.status.textContent = m;
  const rows = [];
  if (db.deploy) rows.push(["Deployment", "web", "replicas: " + db.deploy.replicas]);
  if (db.rs) rows.push(["ReplicaSet", "web-6b7f", "replicas: " + db.rs.replicas]);
  db.pods.forEach((p) => rows.push(["Pod", p.name, `node: ${p.node || "(none yet)"} · phase: ${p.phase}`]));
  const html = rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("") || "<tr><td colspan=3>(no objects yet)</td></tr>";
  if (ui.objs.__h !== html) { ui.objs.innerHTML = html; ui.objs.__h = html; }
  const t = auto ? "Auto-play: on" : "Auto-play: off (step mode)";
  if (ui.mode.textContent !== t) { ui.mode.textContent = t; ui.mode.setAttribute("aria-pressed", String(auto)); }
  ui.next.disabled = auto || !queue.length || !!current;
}
const idle = () => !queue.length && !current;
// ---- what the inspector shows ----
const keys = () => ["/registry/namespaces/default", ...(db.deploy ? ["/registry/deployments/default/web"] : []), ...(db.rs ? ["/registry/replicasets/default/web-6b7f"] : []), ...db.pods.map((p) => "/registry/pods/default/" + p.name)];
Object.assign(S.PARTS.api, { manifest: K.apiserver(), facts: () => [["Last request", cmd ? "kubectl " + cmd : "none yet"]], kubectl: "kubectl get --raw /healthz\nkubectl api-resources\nkubectl get --raw /apis/apps/v1/namespaces/default/deployments" });
Object.assign(S.PARTS.etcd, { manifest: () => K.etcd({ rev: db.rev, keys: keys() }), facts: () => [["Revision", db.rev], ["Keys", keys().length]] });
Object.assign(S.PARTS.cm, { manifest: () => (db.rs ? K.replicaset({ name: "web-6b7f", replicas: db.rs.replicas, ready: db.pods.filter((p) => p.phase === "Running").length }) + "\n# ← the ReplicaSet the deployment controller created\n" : "") + K.controllerManager() });
Object.assign(S.PARTS.sched, { manifest: K.schedulerConfig(), facts: () => [["Unscheduled pods", db.pods.filter((p) => !p.node).length]] });
Object.assign(S.PARTS.kubectl, { manifest: () => (db.deploy ? K.deployment({ name: "web", replicas: db.deploy.replicas, ready: db.pods.filter((p) => p.phase === "Running").length, updated: db.pods.length, available: db.pods.filter((p) => p.phase === "Running").length }) : "# web.yaml — what kubectl apply will send:\n" + K.deployment({ name: "web", replicas: 3, ready: 0, updated: 0, available: 0 })), facts: () => [["Last command", cmd ? "kubectl " + cmd : "none"]] });
Object.assign(S.PARTS.kubelet, { manifest: K.kubeletConfig() });
Object.assign(S.PARTS.runtime, { manifest: () => `# containerd, seen through crictl on node-1\n$ crictl ps\nCONTAINER  IMAGE        STATE    NAME  POD\n${db.pods.filter((p) => p.phase === "Running").map((p, i) => `${(0xa1c3 + i * 977).toString(16)}       nginx:1.27   Running  web   ${p.name}`).join("\n") || "(none)"}`, kubectl: "crictl ps\ncrictl images" });
Object.assign(S.PARTS.node, { manifest: () => K.node({ name: "node-1" }) });
podObjs.forEach((o, i) => Object.assign(S.PARTS[o.id], { manifest: () => { const p = db.pods[i]; return p ? K.pod({ name: p.name, labels: { app: "web", "pod-template-hash": "6b7f" }, image: "nginx:1.27", node: p.node, ip: p.node ? `10.244.1.${50 + i}` : "", phase: p.phase, ready: p.phase === "Running", owner: { kind: "ReplicaSet", name: "web-6b7f" } }) : ""; } }));

S.setTour([
  { home: true, say: "The control plane, and one node. Every part connects only to the API server in the middle.", run: reset, hold: 5 },
  { focus: "kubectl", zoom: 2.4, say: "You run kubectl apply. kubectl sends the Deployment to the API server, and that is all it does.", run: apply, hold: 4 },
  { focus: "api", zoom: 2.4, say: "The API server stamps it: authentication, authorization, admission. Then it writes it to etcd.", hold: 5 },
  { focus: "etcd", zoom: 2.6, say: "etcd holds the desired state. Watch its revision count up with every write.", hold: 5 },
  { focus: "cm", zoom: 2.4, say: "The controllers notice: a Deployment needs a ReplicaSet, and a ReplicaSet needs pods.", hold: 7 },
  { focus: "sched", zoom: 2.4, say: "The scheduler notices pods with no node, and binds each one to node-1.", hold: 6 },
  { focus: "kubelet", zoom: 2.6, say: "node-1's kubelet notices pods bound to it and has containerd start them, then reports back.", hold: 4, until: idle },
  { home: true, say: "Now delete a pod. Nobody tells the cluster to replace it: the same watching fixes the difference.", run: deletePod, hold: 4, until: idle },
  { home: true, say: "Watch, compare, act: every part works this way, and only through the API server.", hold: 5 },
]);
S.start();
