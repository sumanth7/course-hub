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
  desc: () => `Reads web's average CPU (<b>${Math.round(hpa.util)}%</b>) against its target, <b>50%</b>, and sets replicas = ceil(load ÷ 50 per pod), between 2 and 10: <b>${hpa.replicas}</b> now. It scales up at once and down only after a stabilization window.`,
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
const PER_POD = 100, TARGET = 50, MIN = 2, MAX = 10;
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
    if (desired > hpa.replicas) { hpa.replicas = desired; hpa.lowSince = 0; msg = `CPU is above the 50% target: the HPA raises replicas to ${desired} (load ${hpa.load} req/s ÷ 50 per pod).`; }
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
  S.say(`CPU ${Math.round(hpa.util)}% of target 50% · web ${web.filter((p) => p.state === "running").length}/${hpa.replicas}` + (pend.length ? ` · ${pend.length} pending` : "") + ` · nodes ${nodes[3].up ? 4 : 3}`);
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
