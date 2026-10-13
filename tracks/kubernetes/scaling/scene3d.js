// Lesson 13 in 3D: an HPA gauge, a Cluster Autoscaler node, a node label and a taint barrier.
const S = createStage({ home: { target: [10, 18, -6], dir: [0.9, 1.05, 1.1], zoom: 1 }, viewH: 260 });
const { box, cyl, lamp, crate, housing, part, own, label } = S;

const TOP = 12;
const NODE_X = [-92, -8, 76, 160];
const SLOT = (n, s) => [NODE_X[n] - 17 + (s % 2) * 34, -30 + Math.floor(s / 2) * 30];
const CR = { w: 28, h: 11, d: 22 };
const HPA = { x: -157, z: -12, w: 50, d: 64, h: 16 };
const GAUGE = { x: -157, z: -22, r: 15 };
const PEND = { x: -150, z: 40 };

part("plate", { kind: "Cluster", title: "Autoscaling and placement", noFrame: true, zoom: 1, anchor: V(10, 30, -6), desc: "Three nodes with four pod slots each, room for a fourth node, and the HPA's gauge on the left.", yaml: "kubectl get hpa,nodes" });
own("plate", S.plate({ x: 5, z: -2, w: 390, d: 140 }), box(46, 1, 26, { x: PEND.x, y0: 0, z: PEND.z, tone: "lo", r: 1 }));
label("plate", "Pending", { anchor: V(PEND.x, 6, PEND.z + 14) });
const ghost = S.rect(NODE_X[3] - 38, -48, NODE_X[3] + 38, 26, 0.3, "edgeMid");
S.world.add(ghost);

const trays = NODE_X.map((x, n) => {
  const info = [
    { desc: "A general node. Any pod may land here.", yaml: "" },
    { desc: "This node carries the label <b>disktype=ssd</b> (the plate on its front). The db pod's nodeSelector requires that label, so it can only run here.", yaml: "kubectl label nodes node-2 disktype=ssd" },
    { desc: () => `A GPU node with the taint <b>gpu=true:NoSchedule</b>${tainted ? " (the striped barrier)" : " (removed for now)"}. Only pods that tolerate the taint may be scheduled here; the trainer pod does.`, yaml: "kubectl taint nodes node-3 gpu=true:NoSchedule", actions: () => [{ label: tainted ? "Remove the taint" : "Taint it again", run: toggleTaint }] },
    { desc: "Added by the Cluster Autoscaler when pods could not fit anywhere they were allowed, and removed again once it sits empty.", yaml: "" },
  ][n];
  const id = part("node-" + n, { kind: "Node", title: "node-" + (n + 1), zoom: 1.9, anchor: V(x, TOP + 4, 28), ...info });
  const g = S.tray({ x, z: -11, w: 76, d: 74, top: TOP, slots: [0, 1, 2, 3].map((s) => SLOT(n, s)), slotSize: [30, 24] });
  own(id, g);
  label(id, "node-" + (n + 1));
  return g;
});
own("node-1", box(30, 6, 1.4, { x: NODE_X[1] + 16, y0: 5, z: 26.7, tone: "hi", r: 0.3 }));
S.label("node-1", "disktype=ssd", { small: true, anchor: V(NODE_X[1] + 16, 12, 30), lod: 1.2 });
// the taint: a striped barrier across node-3's front
const barrier = new THREE.Group();
barrier.add(cyl(1.4, 9, { x: NODE_X[2] - 35, y0: TOP, z: 20 }), cyl(1.4, 9, { x: NODE_X[2] + 35, y0: TOP, z: 20 }), box(72, 3, 2.4, { x: NODE_X[2], y0: TOP + 5, z: 20, tone: "hi", r: 0.5 }));
const stripeMat = new THREE.MeshBasicMaterial();
S.onTheme((p) => stripeMat.color.set(p.bad));
for (let i = 0; i < 8; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.1, 2.5), stripeMat); st.position.set(NODE_X[2] - 31 + i * 9, TOP + 6.5, 20); barrier.add(st); }
own("node-2", barrier);
S.label("node-2", "taint gpu=true:NoSchedule", { small: true, anchor: V(NODE_X[2], TOP + 12, 22), lod: 1.2 });

// HPA gauge
part("hpa", { kind: "HorizontalPodAutoscaler", title: "HPA web", zoom: 2.6, anchor: V(HPA.x, HPA.h + 12, HPA.z),
  desc: () => `Reads web's average CPU (<b>${Math.round(hpa.util)}%</b>) against its target, <b>${Math.round(TARGET / PER_POD * 100)}%</b>, and sets replicas = ceil(load ÷ ${TARGET} per pod), between ${MIN} and ${MAX}: <b>${hpa.replicas}</b> now. It scales up at once and down only after a stabilization window.`,
  yaml: "kind: HorizontalPodAutoscaler\nspec:\n  scaleTargetRef: { kind: Deployment, name: web }\n  minReplicas: 2\n  maxReplicas: 10\n  metrics: [{ type: Resource, resource: { name: cpu, target: { type: Utilization, averageUtilization: 50 } } }]",
  actions: () => [{ label: "More load", run: () => setLoad(100) }, { label: "Less load", run: () => setLoad(-100) }] });
own("hpa", housing({ x: HPA.x, z: HPA.z, w: HPA.w, d: HPA.d, h: HPA.h }), cyl(GAUGE.r, 0.6, { x: GAUGE.x, y0: HPA.h, z: GAUGE.z, tone: "hi", seg: 48 }));
const dial = S.lines(Array.from({ length: 11 }, (_, i) => { const a = -0.75 * Math.PI + (i / 10) * 1.5 * Math.PI; return [V(GAUGE.x + Math.sin(a) * 12, HPA.h + 0.7, GAUGE.z - Math.cos(a) * 12), V(GAUGE.x + Math.sin(a) * 14.4, HPA.h + 0.7, GAUGE.z - Math.cos(a) * 14.4)]; }), "edgeHi");
S.world.add(dial);
const targetMark = box(1.2, 0.8, 4, { x: GAUGE.x, y0: HPA.h + 0.6, z: GAUGE.z - 16.5, tone: "hi", r: 0, mat: stripeMat });
own("hpa", targetMark);
const needleMat = new THREE.MeshBasicMaterial();
S.onTheme((p) => needleMat.color.set(p.accent));
const needle = new THREE.Group();
const nb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 12), needleMat);
nb.position.z = -6;
needle.add(nb);
needle.position.set(GAUGE.x, HPA.h + 1.1, GAUGE.z);
own("hpa", needle);
label("hpa", "HPA · target CPU 50%");

// pods
const POOL = 14;
const podObjs = Array.from({ length: POOL }, (_, i) => {
  const id = part("pod-" + i, { kind: "Pod", dynamic: true, zoom: 3, anchor: () => { const p = pods[i]; return V(p?.x ?? 0, TOP + 20, p?.z ?? 0); },
    title: () => (pods[i] ? pods[i].name : ""),
    desc: () => { const p = pods[i]; if (!p) return ""; const rule = { db: "nodeSelector disktype=ssd: it may only run on node-2.", trainer: "It tolerates the gpu taint and requires a gpu node: it runs on node-3.", web: "No placement rules, but it does not tolerate the gpu taint." }[p.kind]; return `${p.state === "running" ? "Running on node-" + (p.node + 1) : "Pending: no allowed node has room"}. ${rule}`; } });
  const g = crate({ w: CR.w, h: CR.h, d: CR.d, ribs: 3 });
  const l = lamp(9, CR.h, -6, { r: 1.2 });
  g.add(l.mesh);
  own(id, g);
  g.visible = false;
  label(id, "", { small: true, lod: 1.5 });
  return { g, l, id };
});

// ---- model (same rules as the 2D lesson) ----
const PER_POD = 100;
let TARGET = 50, MIN = 2, MAX = 10; // the HPA spec: editable from the YAML editor
const hpa = { load: 150, replicas: 3, lowSince: 0, evalIn: 0, util: 0 };
let tainted = true, msg = "", clock = 0;
const nodes = [{ up: true }, { up: true }, { up: true }, { up: false, booting: 0, emptyFor: 0 }];
const pods = [];
let seq = 0;
const add = (kind) => { const p = { id: seq++, kind, node: -1, slot: -1, state: "pending", t: 0, name: kind === "web" ? "web-" + seq : kind }; pods.push(p); return p; };
add("db"); add("trainer"); for (let i = 0; i < 3; i++) add("web");
const allowed = (p, n) => { if (!nodes[n].up) return false; if (p.kind === "db") return n === 1; if (n === 2 && tainted && p.kind !== "trainer") return false; if (p.kind === "trainer") return n === 2; return true; };
const used = (n) => pods.filter((p) => p.node === n && p.state !== "pending").map((p) => p.slot);
function schedule() { for (const p of pods.filter((q) => q.state === "pending")) { let best = -1, free = 0; for (let n = 0; n < 4; n++) { if (!allowed(p, n)) continue; const f = 4 - used(n).length; if (f > free) { free = f; best = n; } } if (best >= 0) { p.node = best; p.slot = [0, 1, 2, 3].find((x) => !used(best).includes(x)); p.state = "running"; p.t = 0; } } }
function step(dt) {
  clock += dt;
  const web = pods.filter((p) => p.kind === "web" && p.state !== "terminating");
  hpa.util = (hpa.load / (web.filter((p) => p.state === "running").length || 1) / PER_POD) * 100;
  hpa.evalIn -= dt;
  if (hpa.evalIn <= 0) {
    hpa.evalIn = 1.5;
    const desired = Math.max(MIN, Math.min(MAX, Math.ceil(hpa.load / TARGET)));
    if (desired > hpa.replicas) { hpa.replicas = desired; hpa.lowSince = 0; msg = `CPU is above the ${Math.round(TARGET / PER_POD * 100)}% target: the HPA raises replicas to ${desired} (load ${hpa.load} req/s ÷ ${TARGET} per pod).`; }
    else if (desired < hpa.replicas) { hpa.lowSince += 1.5; if (hpa.lowSince >= 6) { hpa.replicas = desired; hpa.lowSince = 0; msg = `Load stayed low through the stabilization window, so the HPA scales down to ${desired}.`; } }
    else hpa.lowSince = 0;
  }
  while (web.length < hpa.replicas) web.push(add("web"));
  if (web.length > hpa.replicas) { const v = web.filter((p) => p.state === "pending").concat(web.filter((p) => p.node === 3), web).find(Boolean); if (v) { v.state = "terminating"; v.t = 0; } }
  pods.forEach((p) => (p.t += dt));
  for (let i = pods.length - 1; i >= 0; i--) if (pods[i].state === "terminating" && pods[i].t > 0.8) pods.splice(i, 1);
  schedule();
  const pending = pods.filter((p) => p.state === "pending"), n4 = nodes[3];
  if (!n4.up && pending.some((p) => p.kind === "web")) { if (n4.booting < dt * 1.5) msg = `${pending.length} web pod(s) are Pending: no allowed node has room. The Cluster Autoscaler is adding a node...`; n4.booting += dt; if (n4.booting > 3.5) { n4.up = true; n4.booting = 0; n4.emptyFor = 0; msg = "The Cluster Autoscaler added node-4, and the scheduler places the pending pods there."; } }
  else if (!pending.length) n4.booting = 0;
  if (n4.up) { n4.emptyFor = used(3).length ? 0 : n4.emptyFor + dt; if (n4.emptyFor > 6) { n4.up = false; n4.emptyFor = 0; msg = "node-4 sat empty, so the Cluster Autoscaler removed it."; } }
}
function setLoad(d) { hpa.load = Math.max(0, Math.min(500, hpa.load + d)); }
function toggleTaint() { tainted = !tainted; msg = tainted ? "Taint back on node-3: new web pods can no longer land there (running pods stay; NoSchedule does not evict)." : "Taint removed: node-3 now accepts any pod."; }

S.onTick((dt) => {
  step(dt);
  trays[3].visible = nodes[3].up || (nodes[3].booting > 0 && Math.sin(clock * 8) > 0);
  ghost.visible = !nodes[3].up;
  S.setLabel("node-3", nodes[3].up ? "node-4" : "node-4 · booting", { show: nodes[3].up || nodes[3].booting > 0 });
  barrier.visible = tainted;
  needle.rotation.y = -(-0.75 * Math.PI + 1.5 * Math.PI * Math.min(1.05, hpa.util / 100));
  const pend = pods.filter((p) => p.state === "pending");
  podObjs.forEach((o, i) => {
    const p = pods[i];
    o.g.visible = !!p;
    if (!p) { S.setLabel(o.id, "", { show: false }); return; }
    let x, z, y = TOP;
    if (p.node >= 0) [x, z] = SLOT(p.node, p.slot); else { const k = pend.indexOf(p); x = PEND.x - 12 + (k % 2) * 24; z = PEND.z; y = 1 + Math.floor(k / 2) * (CR.h + 1); }
    p.x = p.x === undefined ? x : easeTo(p.x, x, dt, 0.2); p.z = p.z === undefined ? z : easeTo(p.z, z, dt, 0.2); p.y = p.y === undefined ? y : easeTo(p.y, y, dt, 0.2);
    o.g.position.set(p.x, p.y, p.z);
    o.g.scale.y = p.state === "terminating" ? Math.max(0.01, 1 - p.t / 0.8) : Math.min(1, p.t / 0.4 + 0.05);
    o.l.set(p.state === "running" ? (p.kind === "web" && hpa.util > 75 ? "bad" : "on") : "off");
    S.labels[o.id].obj.position.set(p.x, p.y + CR.h + 6, p.z);
    S.setLabel(o.id, p.name + (p.state === "pending" ? " · Pending" : ""), { bad: p.state === "pending" });
  });
  const web = pods.filter((p) => p.kind === "web" && p.state !== "terminating");
  S.say(`CPU ${Math.round(hpa.util)}% of target ${Math.round(TARGET / PER_POD * 100)}% · web ${web.filter((p) => p.state === "running").length}/${hpa.replicas}` + (pend.length ? ` · ${pend.length} pending` : "") + ` · nodes ${nodes[3].up ? 4 : 3}`);
  syncUi();
});

S.overview = () => `<h2>Autoscaling and placement</h2><p class="muted">Raise the load and watch pods, then nodes, being added. Click node-2 or node-3 to see the placement rules. Pick a part:</p>`;
const ui = { status: document.getElementById("sc-status"), load: document.getElementById("sc-load"), taint: document.getElementById("sc-taint"), rows: document.getElementById("sc-rows") };
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => { S.stopTour(); const a = b.dataset.do; if (a === "up") setLoad(100); if (a === "down") setLoad(-100); if (a === "taint") toggleTaint(); S.renderPanel(); }));
function syncUi() {
  const set = (el, t) => { if (el.textContent !== t) el.textContent = t; };
  set(ui.status, msg || "Raise the load and watch the HPA add web pods. When they no longer fit on the nodes they are allowed on, the Cluster Autoscaler adds one.");
  ui.status.dataset.tone = /Pending/.test(msg) ? "bad" : "";
  set(ui.load, "load " + hpa.load + " req/s");
  set(ui.taint, tainted ? "Remove taint from node-3" : "Taint node-3 again");
  const rule = { db: "nodeSelector disktype=ssd", trainer: "tolerates gpu taint + affinity gpu", web: "none (no toleration)" };
  const html = pods.filter((p) => p.state !== "terminating").map((p) => `<tr><td>${p.name}</td><td>${rule[p.kind]}</td><td data-tone="${p.state === "running" ? "good" : "bad"}">${p.state === "running" ? "node-" + (p.node + 1) : "Pending"}</td></tr>`).join("");
  if (ui.rows.__h !== html) { ui.rows.innerHTML = html; ui.rows.__h = html; }
}

// ---- what the inspector shows ----
const webCount = () => pods.filter((p) => p.kind === "web" && p.state !== "terminating").length;
Object.assign(S.PARTS.hpa, { manifest: () => K.hpa({ min: MIN, max: MAX, cpu: Math.round((TARGET / PER_POD) * 100), current: Math.round(hpa.util), replicas: webCount(), desired: Math.max(MIN, Math.min(MAX, Math.ceil(hpa.load / TARGET))) }), facts: () => [["Load", hpa.load + " req/s"], ["CPU", Math.round(hpa.util) + "% (target 50%)"], ["Replicas", hpa.replicas]], kubectl: "kubectl get hpa web -w\nkubectl describe hpa web   # Events: New size: …; reason: cpu resource utilization above target" });
const nodeY = (n) => K.node({ name: "node-" + (n + 1), cidr: `10.244.${n + 1}.0/24`, ready: nodes[n].up, labels: n === 1 ? { disktype: "ssd" } : n === 2 ? { "nvidia.com/gpu": "true" } : {}, taints: n === 2 && tainted ? [{ key: "gpu", value: "true", effect: "NoSchedule" }] : [], allocated: `${used(n).length} of 4 pods` }) + (n === 3 ? "\n# ← added by the Cluster Autoscaler; removed when it sits empty" : "");
NODE_X.forEach((_, n) => Object.assign(S.PARTS["node-" + n], { manifest: () => nodeY(n), facts: () => [["Pods", `${used(n).length} / 4`], ["Labels", n === 1 ? "disktype=ssd" : n === 2 ? "nvidia.com/gpu=true" : "–"], ["Taints", n === 2 && tainted ? "gpu=true:NoSchedule" : "none"]] }));
podObjs.forEach((o, i) => Object.assign(S.PARTS[o.id], { manifest: () => { const p = pods[i]; if (!p) return ""; const base = K.pod({ name: p.name, labels: { app: p.kind }, node: p.node >= 0 ? "node-" + (p.node + 1) : "", ip: p.node >= 0 ? `10.244.${p.node + 1}.${30 + i}` : "", phase: p.state === "pending" ? "Pending" : "Running", ready: p.state === "running", reason: p.state === "pending" ? "Unschedulable" : undefined, resources: { reqCpu: "1", reqMem: "1Gi", limCpu: "1", limMem: "1Gi" }, owner: p.kind === "web" ? { kind: "ReplicaSet", name: "web-5f6a" } : undefined }); const rule = p.kind === "db" ? "\n# spec.nodeSelector: { disktype: ssd }   ← only nodes with this label" : p.kind === "trainer" ? "\n# spec.tolerations: [{ key: gpu, value: \"true\", effect: NoSchedule }]   ← may pass the taint\n# spec.affinity.nodeAffinity: required nvidia.com/gpu=true   ← and must land on a GPU node" : "\n# no nodeSelector, no tolerations   ← anywhere except tainted nodes"; return base + rule + (p.state === "pending" ? "\n# Events: FailedScheduling  0/3 nodes are available: 1 node(s) had untolerated taint {gpu: true}, 2 Insufficient cpu.   → triggers the Cluster Autoscaler" : ""); } }));

// ---- kubectl and the YAML editor ----
// the HPA's min, max and CPU target are editable; node-3's taint follows kubectl taint
const intIn = (lo, hi) => (v) => (!Number.isInteger(v) ? "must be a whole number" : v < lo || v > hi ? `this lesson allows ${lo}–${hi}` : "");
Object.assign(S.PARTS.hpa, { fields: {
  "spec.minReplicas": { check: (v, all) => intIn(1, 6)(v) || (v > all["spec.maxReplicas"] ? "must be less than or equal to maxReplicas" : ""), set: (v) => { MIN = v; hpa.evalIn = 0; } },
  "spec.maxReplicas": { check: intIn(2, 10), set: (v) => { MAX = v; hpa.evalIn = 0; } },
  "spec.metrics[0].resource.target.averageUtilization": { check: intIn(10, 100), set: (v) => { TARGET = (v / 100) * PER_POD; hpa.evalIn = 0; } },
} });
let loadGens = 0;
const loadRow = () => Array.from({ length: loadGens }, (_, k) => ({ kind: "Pod", name: "load-" + (k + 1), labels: { run: "load" }, row: { READY: "1/1", STATUS: "Running", RESTARTS: 0 }, wide: { IP: "10.244.1." + (90 + k), NODE: "node-1" }, logs: () => ["Connecting to web (10.96.0.30:80)", "writing to stdout", "-                    100% |********************************|   612  0:00:00 ETA"] }));
S.kube({
  ns: "default",
  help: ["kubectl get hpa web -w   ·   kubectl edit hpa web   (min, max, CPU target)", "kubectl run load-1 --image=busybox -- /bin/sh -c 'while true; do wget -q -O- http://web; done'   (+100 req/s)", "kubectl delete pod load-1   (−100 req/s)", "kubectl taint nodes node-3 gpu=true:NoSchedule-   (remove the taint; without - to add it back)", "kubectl describe pod <pending web pod>   ·   kubectl get nodes"],
  examples: ["kubectl get hpa web", "kubectl run load-1 --image=busybox -- /bin/sh -c 'while true; do wget -q -O- http://web; done'", "kubectl get hpa web -w", "kubectl get pods -o wide", "kubectl edit hpa web", "kubectl taint nodes node-3 gpu=true:NoSchedule-", "kubectl get nodes", "kubectl delete pod load-1"],
  objects: () => [
    { kind: "Deployment", name: "web", part: "hpa", labels: { app: "web" }, row: { READY: `${pods.filter((p) => p.kind === "web" && p.state === "running").length}/${hpa.replicas}`, "UP-TO-DATE": webCount(), AVAILABLE: pods.filter((p) => p.kind === "web" && p.state === "running").length }, manifest: () => K.deployment({ name: "web", replicas: hpa.replicas, image: "web:2.0" }) + "\n# ← spec.replicas is set by the HPA" },
    ...pods.filter((p) => p.state !== "terminating").map((p, i) => ({ kind: "Pod", name: p.name, part: podObjs[pods.indexOf(p)]?.id, labels: { app: p.kind }, row: { READY: p.state === "running" ? "1/1" : "0/1", STATUS: p.state === "running" ? "Running" : "Pending", RESTARTS: 0 }, wide: { IP: p.node >= 0 ? `10.244.${p.node + 1}.${30 + pods.indexOf(p)}` : "<none>", NODE: p.node >= 0 ? "node-" + (p.node + 1) : "<none>" },
      describe: p.state === "pending" ? () => [["Status:", "Pending"], ["Events:"], [`  Warning  FailedScheduling  default-scheduler  0/${nodes.filter((n) => n.up).length} nodes are available: ${[0, 1, 2, 3].filter((n) => nodes[n].up && allowed(p, n)).length ? "Insufficient pods on the nodes it may use" : ""}${tainted ? ", 1 node(s) had untolerated taint {gpu: true}" : ""}. preemption: not helpful.`], ["  Normal   TriggeredScaleUp  cluster-autoscaler  pod triggered scale-up: [node-group-1 3->4 (max: 4)]"]] : undefined })),
    ...loadRow(),
  ],
  verbs: {
    run({ pos, f }) {
      const name = pos[0];
      if (!f["--image"]) return { err: 'error: required flag(s) "image" not set' };
      if (!/^load-\d+$/.test(name || "")) return { err: "This lesson's extra pods are load generators: kubectl run load-1 --image=busybox -- /bin/sh -c 'while true; do wget -q -O- http://web; done'" };
      if (+name.split("-")[1] !== loadGens + 1) return { err: `Error from server (AlreadyExists): pods "${name}" already exists, or skips a number: next is load-${loadGens + 1}` };
      S.stopTour(); loadGens++; setLoad(100); return `pod/${name} created   # +100 req/s on web (now ${hpa.load})`;
    },
    delete({ pos }) {
      let [what, name] = pos; if (what && what.includes("/")) [what, name] = what.split("/");
      if (/^(po|pods?)$/.test(what || "") && /^load-\d+$/.test(name || "")) { if (+name.split("-")[1] !== loadGens) return { err: `Error from server (NotFound): pods "${name}" not found   # delete the newest: load-${loadGens}` }; S.stopTour(); loadGens--; setLoad(-100); return `pod "${name}" deleted   # −100 req/s (now ${hpa.load})`; }
      return { err: "This lesson lets you delete the load generators (kubectl delete pod load-N); the HPA owns the web pods." };
    },
    taint({ pos }) {
      const [what, node, spec] = pos;
      if (!/^(no|nodes?)$/.test(what || "")) return { err: "error: taint applies to nodes: kubectl taint nodes node-3 gpu=true:NoSchedule" };
      if (node !== "node-3") return { err: `This lesson's taint lives on node-3 (${node} has none to change)` };
      if (!spec) return { err: "error: at least one taint update is required" };
      const off = spec.endsWith("-"), key = spec.replace(/-$/, "").split(/[=:]/)[0];
      if (key !== "gpu") return { err: `error: taint "${key}" not found on node-3; it has gpu=true:NoSchedule` };
      if (off === !tainted) return { err: off ? 'error: taint "gpu:NoSchedule" not found' : 'error: node node-3 already has gpu taint(s) with same effect(s) and --overwrite is false' };
      S.stopTour(); toggleTaint(); return `node/node-3 ${off ? "untainted" : "tainted"}`;
    },
  },
});
// ---- end kubectl ----
S.setTour([
  { home: true, say: "Three nodes. db must run on the ssd node; trainer is the only pod allowed past node-3's taint barrier.", hold: 6 },
  { focus: "hpa", zoom: 2.6, say: "The HPA reads web's CPU against a 50% target. Raise the load...", run: () => setLoad(150), hold: 5 },
  { home: true, say: "...and it adds web pods. They spread over node-1 and node-2; the taint keeps them off node-3.", hold: 7 },
  { home: true, say: "More load: pods no longer fit anywhere they are allowed. They wait Pending, and the Cluster Autoscaler adds node-4.", run: () => setLoad(150), hold: 4, until: () => nodes[3].up },
  { focus: "node-3", zoom: 1.8, say: "Pods land on the new node.", hold: 5 },
  { focus: "node-2", zoom: 1.9, say: "Lift node-3's taint, and web pods may use the GPU node too.", run: () => { if (tainted) toggleTaint(); }, hold: 5 },
  { home: true, say: "Drop the load. After the stabilization window the HPA scales down, and the empty node-4 is removed.", run: () => { if (!tainted) toggleTaint(); setLoad(-250); }, hold: 16 },
  { home: true, say: "Pods scale with load, nodes scale with pods, and labels, affinity and taints decide where they go.", hold: 5 },
]);
S.start();
