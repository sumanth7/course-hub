// Lesson 21 in 3D: platform internals. At the back, the API server learns a new kind (a CRD) and an operator
// runs a Postgres cluster from it, with failover. At the front, two teams share the cluster under
// ResourceQuotas and LimitRanges, and Karpenter launches and consolidates nodes for their pods.
const S = createStage({ home: { target: [-6, 10, 6], dir: [0.9, 1.1, 1.15], zoom: 1 }, viewH: 305 });
const { box, cyl, lamp, crate, housing, track, part, own, label } = S;

const FY = 1.9, TOP = 11;
const API = { x: -180, z: -80 }, OP = { x: -90, z: -80 }, DB = { x: 30, z: -80 };
const TEAM = { a: { x: -180, z: 62 }, b: { x: -100, z: 62 } };
const DOCK = { x: -30, z: 62 }, KARP = { x: -30, z: 4 };
const NODE_AT = [{ x: 60, z: 30 }, { x: 160, z: 30 }, { x: 60, z: 104 }, { x: 160, z: 104 }];
const TYPES = [{ name: "m6i.large", cpu: 2, w: 46, price: 0.096 }, { name: "m6i.xlarge", cpu: 4, w: 62, price: 0.192 }, { name: "m6i.2xlarge", cpu: 8, w: 86, price: 0.384 }];

part("plate", { kind: "Platform", title: "The cluster as a platform", noFrame: true, zoom: 1, anchor: V(0, 30, 0),
  desc: "At the back: extending Kubernetes with a new kind of object and a controller (an operator) that runs it. At the front: sharing one cluster between teams, with quotas and defaults, on nodes Karpenter adds and removes to fit the pods." });
own("plate", S.plate({ x: 4, z: 8, w: 470, d: 276 }));
own("plate", track([[[API.x, API.z], [DB.x + 90, API.z]], [[TEAM.a.x, TEAM.a.z], [DOCK.x, DOCK.z]], [[DOCK.x, DOCK.z], [DOCK.x, KARP.z]], [[DOCK.x, 30], [200, 30]], [[DOCK.x, 104], [200, 104]], [[DOCK.x, 30], [DOCK.x, 104]]], { width: 4.2 }));

// ---- API server with its rack of resource types ----
part("api", { kind: "API server", title: "API server: resource types", zoom: 2.2, anchor: V(API.x, 30, API.z), desc: () => `Every kind the API server knows is a cartridge in this rack: Pod, Deployment, Service… A CustomResourceDefinition adds a new one. ${st.crd ? "<b>clusters.postgresql.cnpg.io</b> is installed: Cluster objects can now be stored and listed like any other." : "Install the CloudNativePG CRD to teach it a <b>Cluster</b> kind."}`,
  actions: () => [{ label: st.crd ? "CRD installed" : "Install the CRD + operator", run: installOperator }] });
own("api", housing({ x: API.x, z: API.z, w: 40, d: 40, h: 16 }));
const carts = ["Pod", "Deployment", "Service", "ConfigMap"].map((k, i) => own("api", box(30, 2, 5, { x: API.x - 2, y0: 16, z: API.z - 15 + i * 7, tone: "mid", r: 0.3 })));
const crdCart = box(30, 2.4, 5, { x: API.x - 2, y0: 16, z: API.z + 13, tone: "hi", r: 0.3 });
own("api", crdCart);
const crdLamp = lamp(API.x + 16, 16, API.z + 13, { r: 1.1, state: "off" });
own("api", crdLamp.mesh);
label("api", "API server");
part("op", { kind: "Operator", title: "cnpg-controller-manager", zoom: 2.4, anchor: V(OP.x, 28, OP.z), desc: () => `A controller that knows Postgres. It watches Cluster objects and does what a DBA would: creates instances with their volumes, sets up streaming replication, points the -rw Service at the primary, and on failure promotes a replica. ${st.operator ? "Running." : "Not installed."}` });
const opCrate = crate({ w: 30, h: 13, d: 22, ribs: 4 }); opCrate.position.set(OP.x, 0, OP.z); opCrate.visible = false;
const opLamp = lamp(OP.x + 10, 13, OP.z + 6, { r: 1.3, state: "off" });
own("op", opCrate, opLamp.mesh);
label("op", "operator (CloudNativePG)");
part("db", { kind: "Cluster (custom resource)", title: "Postgres cluster pg", zoom: 2, anchor: V(DB.x + 40, 26, DB.z), desc: () => (st.pg ? `Cluster <b>pg</b> asks for ${st.pg.instances} instances. Primary: <b>${st.pg.primary || "electing"}</b>. The operator turned that one object into pods, PVCs and Services pg-rw (writes, primary only) and pg-ro (reads, replicas).` : "No Cluster yet. Create one once the CRD and operator are installed."),
  actions: () => (st.pg ? [{ label: "Kill the primary", danger: true, run: killPrimary }] : [{ label: "Create Cluster pg", run: createPg }]) });
own("db", S.tray({ x: DB.x + 40, z: DB.z, w: 130, d: 40, top: TOP }));
const pgObjs = [0, 1, 2].map((i) => { const x = DB.x + [-2, 40, 82][i]; const c = crate({ w: 30, h: 13, d: 22, ribs: 4 }); c.position.set(x, TOP, DB.z); c.visible = false; const l = lamp(x + 10, TOP + 13, DB.z - 6, { r: 1.3 }); c.add(l.mesh); l.mesh.position.set(10, 13.7, -6); own("db", c); return { c, l, x }; });
label("db", "Cluster pg");
const rwLamp = lamp(DB.x + 120, 0, DB.z - 26, { r: 1.4, state: "off" });
own("db", rwLamp.mesh);

// ---- tenants: two namespaces with quotas ----
const teamPart = (t) => {
  const at = TEAM[t];
  part("team-" + t, { kind: "Namespace", title: "team-" + t, zoom: 2.4, anchor: V(at.x, 34, at.z),
    desc: () => `Team ${t.toUpperCase()}'s namespace. Its ResourceQuota caps the total it may request: <b>${used(t).toFixed(1)} of ${Q[t].cpu} CPU</b>, <b>${teamPods(t).length} of ${Q[t].pods} pods</b>. Its LimitRange gives containers that set no requests a default of ${LR.req} CPU. Deployment web: <b>${Q[t].replicas}</b> replicas wanted.`,
    actions: () => [{ label: "+2 replicas", run: () => scaleTeam(t, Q[t].replicas + 2) }, { label: "−2 replicas", run: () => scaleTeam(t, Q[t].replicas - 2) }] });
  own("team-" + t, housing({ x: at.x, z: at.z, w: 56, d: 46, h: 6 }));
  const cpu = S.meter({ x: at.x - 12, z: at.z, y0: 6, h: 26, w: 5, d: 5 }), pods = S.meter({ x: at.x + 12, z: at.z, y0: 6, h: 26, w: 5, d: 5 });
  own("team-" + t, cpu, pods);
  label("team-" + t, "team-" + t);
  S.label("team-" + t, "cpu  pods", { small: true, anchor: V(at.x, 4, at.z + 26), lod: 1.6 });
  return { cpu: cpu.userData.meter, pods: pods.userData.meter };
};
const teamMeters = { a: teamPart("a"), b: teamPart("b") };
part("dock", { kind: "Scheduler", title: "Pending pods", zoom: 2.6, anchor: V(DOCK.x, 22, DOCK.z), desc: () => `Pods the scheduler can't place yet: no node has room for their requests. Karpenter watches for exactly these. Pending now: <b>${pods.filter((p) => p.state === "pending").length}</b>.` });
own("dock", box(30, 2, 40, { x: DOCK.x, y0: 0, z: DOCK.z, tone: "lo", r: 0.6 }));
label("dock", "pending");
part("karp", { kind: "Node autoscaler", title: "Karpenter", zoom: 2.4, anchor: V(KARP.x, 28, KARP.z), desc: () => `Sees pending pods, adds up what they request, and launches a node of the cheapest instance type that fits them (allowed by the NodePool). When pods could fit on fewer nodes, it <b>consolidates</b>: drains a node and removes it. Nodes: <b>${nodes.length}</b>, about <b>$${nodes.reduce((s, n) => s + TYPES[n.type].price, 0).toFixed(2)}/h</b>.` });
const kCrate = crate({ w: 28, h: 13, d: 22, ribs: 4 }); kCrate.position.set(KARP.x, 0, KARP.z);
const kLamp = lamp(KARP.x + 9, 13, KARP.z + 6, { r: 1.3, state: "on" });
own("karp", kCrate, kLamp.mesh);
label("karp", "Karpenter");

// node slots: a pool of trays sized per instance type, and a pool of small pod crates
const nodeTrays = NODE_AT.map((at, s) => TYPES.map((ty) => { const t = S.tray({ x: at.x, z: at.z, w: ty.w, d: 50, top: TOP }); t.visible = false; S.world.add(t); return t; }));
NODE_AT.forEach((at, s) => part("node-" + s, { kind: "Node", dynamic: true, zoom: 2.2, anchor: V(at.x, 30, at.z), title: () => (nodeAt(s) ? `${nodeAt(s).name} (${TYPES[nodeAt(s).type].name})` : "no node"), desc: () => { const n = nodeAt(s); return n ? `A ${TYPES[n.type].name} (${TYPES[n.type].cpu} CPU) launched by Karpenter. Requested: <b>${load(n).toFixed(1)} CPU</b>. ${n.state === "booting" ? "Booting." : n.state === "draining" ? "Being consolidated away." : ""}` : "Empty bay."; } }));
NODE_AT.forEach((at, s) => { label("node-" + s, "", { small: true }); nodeTrays[s].forEach((t) => own("node-" + s, t)); });
const POD_MAX = 32;
const podMeshes = Array.from({ length: POD_MAX }, () => { const c = crate({ w: 9, h: 8, d: 9, ribs: 2 }); c.visible = false; const l = lamp(0, 8, 0, { r: 1 }); c.add(l.mesh); l.mesh.position.set(0, 8.7, 0); S.world.add(c); return { c, l }; });

// ---- the model ----
const st = { crd: false, operator: false, pg: null, clock: 0 };
const Q = { a: { cpu: 4, pods: 10, replicas: 4 }, b: { cpu: 2, pods: 6, replicas: 2 } };
const LR = { req: 0.25, lim: 0.5 };
const REQ = { a: 0.5, b: null }; // team-b's Deployment sets no requests: the LimitRange fills them in
const reqOf = (t) => REQ[t] ?? LR.req;
const pods = [], nodes = [];
let seq = 0, nodeSeq = 0, msg = "", karpIn = 0;
const teamPods = (t) => pods.filter((p) => p.team === t && p.state !== "terminating");
const used = (t) => teamPods(t).reduce((s, p) => s + p.req, 0);
const nodeAt = (s) => nodes.find((n) => n.slot === s);
const load = (n) => pods.filter((p) => p.node === n.id && p.state !== "terminating").reduce((s, p) => s + p.req, 0);
const sfx = (n) => { let h = (n * 2654435761) >>> 0, o = ""; for (let i = 0; i < 5; i++) { o += "bcdfghjklmnpqrstvwxz2456789"[h % 27]; h = Math.floor(h / 27) + n * 7; } return o; };
const quotaBlocked = { a: 0, b: 0 };
function reconcileTeams() {
  for (const t of ["a", "b"]) {
    const have = teamPods(t);
    if (have.length < Q[t].replicas) {
      // admission: the quota is checked when the ReplicaSet creates a pod
      const r = reqOf(t);
      if (used(t) + r > Q[t].cpu + 1e-9 || have.length + 1 > Q[t].pods) { if (!quotaBlocked[t]) { quotaBlocked[t] = 1; const why = used(t) + r > Q[t].cpu + 1e-9 ? `requested: requests.cpu=${r * 1000}m, used: requests.cpu=${Math.round(used(t) * 1000)}m, limited: requests.cpu=${Q[t].cpu}` : `requested: pods=1, used: pods=${have.length}, limited: pods=${Q[t].pods}`; S.event("Warning", "FailedCreate", `replicaset/web-${t === "a" ? "6f2d" : "9c1e"}`, `Error creating: pods "web-${t === "a" ? "6f2d" : "9c1e"}-${sfx(seq + 1)}" is forbidden: exceeded quota: compute, ${why}`, "replicaset-controller"); msg = `team-${t} wants ${Q[t].replicas} pods but its ResourceQuota stops at ${Math.min(Q[t].pods, Math.floor(Q[t].cpu / r + 1e-9))}: the API server refuses to create more (exceeded quota). They never reach the scheduler.`; } }
      else { quotaBlocked[t] = 0; const n = ++seq; pods.push({ id: n, team: t, name: `web-${t === "a" ? "6f2d" : "9c1e"}-${sfx(n)}`, req: r, state: "pending", node: null, t: 0 }); }
    } else if (have.length > Q[t].replicas) { const v = have.sort((x, y) => y.id - x.id)[0]; v.state = "terminating"; v.t = 0; quotaBlocked[t] = 0; }
  }
}
function schedule() {
  for (const p of pods.filter((q) => q.state === "pending")) {
    const n = nodes.filter((x) => x.state === "ready" && load(x) + p.req <= TYPES[x.type].cpu + 1e-9).sort((x, y) => load(y) - load(x))[0];
    if (n) { p.state = "running"; p.node = n.id; p.t = 0; }
  }
}
function karpenter(dt) {
  karpIn -= dt; if (karpIn > 0) return; karpIn = 1;
  const pending = pods.filter((p) => p.state === "pending");
  const booting = nodes.filter((n) => n.state === "booting");
  if (pending.length && !booting.length) {
    const need = pending.reduce((s, p) => s + p.req, 0), free = [0, 1, 2, 3].find((s) => !nodeAt(s));
    if (free !== undefined) {
      const type = TYPES.findIndex((ty) => ty.cpu >= need) >= 0 ? TYPES.findIndex((ty) => ty.cpu >= need) : 2;
      const id = ++nodeSeq, name = `ip-10-0-${10 + id}-${(id * 37) % 250}`;
      nodes.push({ id, slot: free, type, state: "booting", t: 0, name, idle: 0 });
      kBlink = 0.8;
      S.event("Normal", "Launched", `nodeclaim/default-${sfx(id).slice(0, 5)}`, `Launched ${TYPES[type].name} (on-demand, us-east-1${"abc"[id % 3]}) for ${pending.length} pending pod(s) requesting ${need.toFixed(2)} CPU`, "karpenter");
      msg = `${pending.length} pod(s) pending, requesting ${need.toFixed(2)} CPU in total. Karpenter launches the cheapest instance type that fits them all: ${TYPES[type].name}.`;
    }
    return;
  }
  // consolidation: a node whose pods would fit on the other nodes is drained and removed
  if (!pending.length) {
    for (const n of nodes.filter((x) => x.state === "ready").sort((x, y) => load(x) - load(y))) {
      const others = nodes.filter((x) => x !== n && x.state === "ready");
      const spare = others.reduce((s, x) => s + TYPES[x.type].cpu - load(x), 0);
      if (load(n) <= spare + 1e-9 && (load(n) === 0 || others.length)) { n.idle += 1; if (n.idle >= 4) { n.state = "draining"; n.t = 0; kBlink = 0.8; pods.filter((p) => p.node === n.id).forEach((p) => { p.state = "pending"; p.node = null; }); S.event("Normal", "DisruptionTerminating", "node/" + n.name, `Disrupting node: Underutilized (consolidation), ${TYPES[n.type].name}`, "karpenter"); msg = `Consolidation: ${n.name} is underused and its pods fit elsewhere, so Karpenter drains it and terminates the instance. Fewer nodes, smaller bill.`; } break; }
      else n.idle = 0;
    }
  }
}
function stepNodes(dt) {
  for (const n of nodes) { n.t += dt; if (n.state === "booting" && n.t > 2.5) { n.state = "ready"; S.event("Normal", "Registered", "node/" + n.name, `Node ${n.name} registered (${TYPES[n.type].name})`, "karpenter"); } }
  for (let i = nodes.length - 1; i >= 0; i--) if (nodes[i].state === "draining" && nodes[i].t > 1.5) nodes.splice(i, 1);
  for (const p of pods) p.t += dt;
  for (let i = pods.length - 1; i >= 0; i--) if (pods[i].state === "terminating" && pods[i].t > 0.8) pods.splice(i, 1);
}
function scaleTeam(t, r) { Q[t].replicas = Math.max(0, Math.min(16, r)); quotaBlocked[t] = 0; msg = `team-${t}'s Deployment now wants ${Q[t].replicas} replicas.`; }
// the operator
function installOperator() { if (st.crd) return; st.crd = true; msg = "helm install cnpg: the chart adds the CRD clusters.postgresql.cnpg.io (a new cartridge in the API server) and runs the operator that understands it."; S.event("Normal", "Established", "customresourcedefinition/clusters.postgresql.cnpg.io", "the API server now serves postgresql.cnpg.io/v1, Kind=Cluster", "apiextensions"); setTimeout(() => { st.operator = true; }, 1200); }
function createPg() { if (!st.crd) { msg = 'error: resource mapping not found for name: "pg": no matches for kind "Cluster" in version "postgresql.cnpg.io/v1". Install the CRD first.'; return false; } if (st.pg) return true; st.pg = { instances: 3, members: [], primary: null, t: 0 }; msg = "Cluster pg created: one object. The operator turns it into an initdb'd primary, then replicas cloned from it, each with its own PVC."; return true; }
function killPrimary() { const pg = st.pg; if (!pg || !pg.primary) return; const m = pg.members.find((x) => x.name === pg.primary); m.state = "dead"; m.t = 0; pg.primary = null; pg.failoverAt = st.clock + 1.5; msg = `${m.name}, the primary, died. Writes fail until the operator notices and promotes the most up-to-date replica, then moves pg-rw to it.`; S.event("Warning", "PrimaryFailure", "cluster/pg", `Primary ${m.name} is not responding`, "cloudnative-pg"); }
function stepPg(dt) {
  const pg = st.pg; if (!pg || !st.operator) return;
  pg.t += dt;
  for (const m of pg.members) { m.t += dt; if (m.state === "starting" && m.t > 1.6) m.state = "ready"; if (m.state === "dead" && m.t > 3) { m.state = "starting"; m.t = 0; m.role = "replica"; S.event("Normal", "InstanceRecreated", "cluster/pg", `${m.name} recreated as a replica of ${pg.primary}`, "cloudnative-pg"); } }
  const live = pg.members.filter((m) => m.state !== "dead");
  if (pg.members.length < pg.instances && pg.members.every((m) => m.state === "ready")) { const i = pg.members.length + 1; pg.members.push({ name: "pg-" + i, idx: i - 1, role: i === 1 ? "primary" : "replica", state: "starting", t: 0 }); if (i === 1) pg.primary = "pg-1"; S.event("Normal", "CreatingInstance", "cluster/pg", `Creating instance pg-${i} (${i === 1 ? "initdb" : "join as replica"})`, "cloudnative-pg"); }
  if (pg.members.length > pg.instances) { const v = pg.members.filter((m) => m.name !== pg.primary).sort((a, b) => b.idx - a.idx)[0]; if (v) pg.members.splice(pg.members.indexOf(v), 1); }
  if (!pg.primary && pg.failoverAt && st.clock > pg.failoverAt) { const c = live.find((m) => m.state === "ready"); if (c) { c.role = "primary"; pg.primary = c.name; pg.failoverAt = 0; pg.members.filter((m) => m.state === "dead").forEach((m) => (m.role = "replica")); msg = `Failover: the operator promoted ${c.name} to primary and pointed pg-rw at it. The old primary comes back as a replica.`; S.event("Normal", "FailoverCompleted", "cluster/pg", `Promoted ${c.name} to primary`, "cloudnative-pg"); } }
}

let kBlink = 0;
S.onTick((dt) => {
  st.clock += dt;
  reconcileTeams(); stepNodes(dt); karpenter(dt); schedule(); stepPg(dt);
  // the CRD cartridge and the operator
  crdCart.visible = st.crd; crdLamp.set(st.crd ? "on" : "off"); opCrate.visible = st.operator; opLamp.set(st.operator ? (st.pg && (st.pg.failoverAt || st.pg.members.some((m) => m.state === "starting")) ? "accent" : "on") : "off");
  S.setLabel("api", st.crd ? "API server · + Cluster (CRD)" : "API server");
  const pg = st.pg;
  pgObjs.forEach((o, i) => { const m = pg && pg.members[i]; o.c.visible = !!m; if (m) { o.c.scale.y = m.state === "dead" ? 0.4 : m.state === "starting" ? Math.min(1, 0.3 + m.t / 1.6) : 1; o.l.set(m.state === "dead" ? "bad" : m.role === "primary" ? "accent" : m.state === "ready" ? "on" : "off"); } });
  rwLamp.set(pg ? (pg.primary ? "good" : "bad") : "off");
  S.setLabel("db", pg ? `Cluster pg · primary ${pg.primary || "— failing over"} · ${pg.members.filter((m) => m.state === "ready").length}/${pg.instances} ready` : "Cluster pg (not created)", { bad: !!pg && !pg.primary });
  // teams
  for (const t of ["a", "b"]) { const m = teamMeters[t]; m.cpu.set(used(t) / Q[t].cpu); m.cpu.lim(1); m.cpu.hot(quotaBlocked[t] > 0); m.pods.set(teamPods(t).length / Q[t].pods); m.pods.lim(1); S.setLabel("team-" + t, `team-${t} · ${teamPods(t).length}/${Q[t].replicas} pods`, { bad: quotaBlocked[t] > 0 }); }
  // nodes and pods
  NODE_AT.forEach((at, s) => { const n = nodeAt(s); nodeTrays[s].forEach((t, ti) => { t.visible = !!n && n.type === ti; if (t.visible) { const down = n.state !== "ready"; if (t.userData.down !== down) { t.userData.down = down; t.userData.setDown(down); } } }); S.setLabel("node-" + s, n ? `${TYPES[n.type].name} · ${load(n).toFixed(1)}/${TYPES[n.type].cpu} CPU${n.state !== "ready" ? " · " + n.state : ""}` : "", { show: !!n }); });
  const pend = pods.filter((p) => p.state === "pending");
  podMeshes.forEach((pm) => (pm.c.visible = false));
  let k = 0;
  for (const n of nodes) { const at = NODE_AT[n.slot], cols = Math.max(1, Math.floor((TYPES[n.type].w - 8) / 11)); pods.filter((p) => p.node === n.id).forEach((p, j) => { const pm = podMeshes[k++]; if (!pm) return; pm.c.visible = true; pm.c.position.set(at.x - TYPES[n.type].w / 2 + 9 + (j % cols) * 11, TOP, at.z - 14 + Math.floor(j / cols) * 12); pm.c.scale.y = p.state === "terminating" ? 0.3 : 1; pm.l.set(p.team === "a" ? "on" : "accent"); }); }
  pend.forEach((p, j) => { const pm = podMeshes[k++]; if (!pm) return; pm.c.visible = true; pm.c.position.set(DOCK.x - 6 + (j % 2) * 12, 2, DOCK.z - 14 + Math.floor(j / 2) * 11); pm.c.scale.y = 1; pm.l.set(p.team === "a" ? "on" : "accent"); });
  kBlink = Math.max(0, kBlink - dt); kLamp.set(kBlink > 0 ? "accent" : "on");
  S.say(`${nodes.length} nodes · $${nodes.reduce((s, n) => s + TYPES[n.type].price, 0).toFixed(2)}/h · ${pend.length} pending${pg ? ` · pg primary ${pg.primary || "—"}` : ""}`);
  syncUi();
});

// ---- controls ----
S.overview = () => `<h2>The cluster as a platform</h2><p class="muted">Teach the API a new kind and let an operator run Postgres from it, then scale the teams' apps and watch quotas and Karpenter respond. Team A's pods have white lamps, team B's accent. Pick a part:</p>`;
const ui = { status: document.getElementById("pf-status"), inst: document.getElementById("pf-install"), pg: document.getElementById("pf-pg"), a: document.getElementById("pf-a"), b: document.getElementById("pf-b") };
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => {
  S.stopTour();
  const a = b.dataset.do;
  if (a === "install") { S.shellEcho?.("helm install cnpg cnpg/cloudnative-pg -n cnpg-system --create-namespace", "button"); installOperator(); }
  if (a === "pg") { if (st.pg) killPrimary(); else { S.shellEcho?.("kubectl apply -f pg.yaml", "button"); createPg(); } }
  if (a === "a+") scaleTeam("a", Q.a.replicas + 2); if (a === "a-") scaleTeam("a", Q.a.replicas - 2);
  if (a === "b+") scaleTeam("b", Q.b.replicas + 2); if (a === "b-") scaleTeam("b", Q.b.replicas - 2);
  S.renderPanel();
}));
function syncUi() {
  const set = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
  set(ui.inst, st.crd ? "CRD + operator installed" : "Install CRD + operator"); ui.inst.disabled = st.crd;
  set(ui.pg, st.pg ? "Kill the Postgres primary" : "Create Cluster pg"); ui.pg.classList.toggle("danger", !!st.pg);
  set(ui.a, `team-a web ${Q.a.replicas}`); set(ui.b, `team-b web ${Q.b.replicas}`);
  set(ui.status, msg || "Two teams share the cluster on two Karpenter nodes. Scale their apps, or extend the API with a Postgres operator.");
  ui.status.dataset.tone = /forbidden|exceeded|no matches|died/.test(msg) ? "bad" : "";
}
// a starting set of pods and nodes
for (let i = 0; i < 2; i++) nodes.push({ id: ++nodeSeq, slot: i, type: 0, state: "ready", t: 9, name: `ip-10-0-${10 + nodeSeq}-${(nodeSeq * 37) % 250}`, idle: 0 });
reconcileTeams(); reconcileTeams(); for (let i = 0; i < 8; i++) reconcileTeams(); schedule();

// ---- what the inspector shows ----
const quotaY = (t) => `apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute
  namespace: team-${t}
spec:
  hard:
    requests.cpu: "${Q[t].cpu}"   # ← the sum of all pods' CPU requests in the namespace
    pods: "${Q[t].pods}"
status:
  used: { requests.cpu: ${Math.round(used(t) * 1000)}m, pods: "${teamPods(t).length}" }`;
const limitY = (t) => `apiVersion: v1
kind: LimitRange
metadata:
  name: defaults
  namespace: team-${t}
spec:
  limits:
  - type: Container
    defaultRequest: { cpu: ${LR.req * 1000}m }   # ← filled in for containers that set no request
    default: { cpu: ${LR.lim * 1000}m }   # ← and the default limit
    max: { cpu: "2" }`;
const teamDeployY = (t) => K.deployment({ name: "web", ns: "team-" + t, replicas: Q[t].replicas, image: `web-${t}:1.0`, ready: teamPods(t).filter((p) => p.state === "running").length }).replace("        ports: [{ containerPort: 8080 }]", REQ[t] ? `        ports: [{ containerPort: 8080 }]\n        resources: { requests: { cpu: ${REQ[t] * 1000}m } }` : "        ports: [{ containerPort: 8080 }]\n        # no resources: the LimitRange admission plugin adds requests.cpu 250m and limits.cpu 500m to each pod");
const QF = (t) => ({ "spec.hard.requests.cpu": { check: (v) => (!(+v > 0 && +v <= 16) ? "1–16 here" : ""), set: (v) => { Q[t].cpu = +v; quotaBlocked[t] = 0; } }, "spec.hard.pods": { check: (v) => (!(+v >= 1 && +v <= 20) ? "1–20 here" : ""), set: (v) => { Q[t].pods = +v; quotaBlocked[t] = 0; } } });
["a", "b"].forEach((t) => Object.assign(S.PARTS["team-" + t], { manifest: () => quotaY(t) + "\n---\n" + limitY(t) + "\n---\n" + teamDeployY(t), fields: (kind) => (kind === "ResourceQuota" ? QF(t) : kind === "Deployment" ? { "spec.replicas": { check: (v) => (!Number.isInteger(v) || v < 0 || v > 16 ? "0–16 here" : ""), set: (v) => scaleTeam(t, v) } } : kind === "LimitRange" ? {} : null) }));
const crdY = () => `apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: clusters.postgresql.cnpg.io
spec:
  group: postgresql.cnpg.io
  names: { kind: Cluster, plural: clusters, singular: cluster }   # ← kubectl get clusters now works
  scope: Namespaced
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:   # ← the API server validates Cluster objects against this
        properties:
          spec:
            properties:
              instances: { type: integer, minimum: 1 }
              storage: { properties: { size: { type: string } } }`;
Object.assign(S.PARTS.api, { manifest: () => (st.crd ? crdY() : "# kubectl api-resources | grep cnpg\n# (nothing: the API server doesn't know a Cluster kind yet)") });
const pgY = () => `apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: pg
  namespace: db
spec:
  instances: ${st.pg.instances}   # ← one primary, the rest streaming replicas
  storage: { size: 20Gi }   # ← a PVC per instance
  postgresql: { parameters: { max_connections: "200" } }
status:
  phase: ${st.pg.primary ? (st.pg.members.every((m) => m.state === "ready") && st.pg.members.length === st.pg.instances ? "Cluster in healthy state" : "Creating replica") : "Failing over"}
  readyInstances: ${st.pg.members.filter((m) => m.state === "ready").length}
  currentPrimary: ${st.pg.primary || '""'}   # ← pg-rw always points here`;
Object.assign(S.PARTS.db, { manifest: () => (st.pg ? pgY() : ""), fields: (kind) => (kind === "Cluster" ? { "spec.instances": { check: (v) => (!Number.isInteger(v) || v < 1 ? "spec.instances in body should be greater than or equal to 1" : v > 3 ? "this lesson's node has room for 3 instances" : ""), set: (v) => { st.pg.instances = v; } } } : null) });
Object.assign(S.PARTS.op, { manifest: () => K.deployment({ name: "cnpg-controller-manager", ns: "cnpg-system", replicas: 1, image: "ghcr.io/cloudnative-pg/cloudnative-pg:1.24.1", ready: st.operator ? 1 : 0 }) });
Object.assign(S.PARTS.karp, { manifest: () => `apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: default
spec:
  template:
    spec:
      nodeClassRef: { group: karpenter.k8s.aws, kind: EC2NodeClass, name: default }
      requirements:
      - { key: karpenter.k8s.aws/instance-family, operator: In, values: [m6i] }
      - { key: karpenter.sh/capacity-type, operator: In, values: [on-demand, spot] }   # ← spot when allowed: cheaper
  limits: { cpu: "40" }   # ← never more than this in total
  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized   # ← remove or replace nodes that aren't earning their keep
    consolidateAfter: 30s
status:
  nodes: ${nodes.length}` });

// ---- kubectl and the YAML editor ----
S.kube({
  ns: "team-a",
  help: ["helm install cnpg cnpg/cloudnative-pg   ·   kubectl apply -f pg.yaml   ·   kubectl get clusters -n db", "kubectl delete pod pg-1 -n db   (kill the primary)   ·   kubectl edit cluster pg -n db   (instances)", "kubectl scale deploy web -n team-a --replicas=12   ·   kubectl describe quota -n team-a", "kubectl edit quota compute -n team-a   ·   kubectl get pods -n team-b -o yaml   (LimitRange defaults)", "kubectl get nodes,nodeclaims   ·   kubectl api-resources | grep cnpg"],
  examples: ["kubectl get nodes", "kubectl scale deploy web -n team-a --replicas=12", "kubectl get events -n team-a", "kubectl describe quota compute -n team-a", "helm install cnpg cnpg/cloudnative-pg", "kubectl apply -f pg.yaml", "kubectl get clusters -n db", "kubectl delete pod pg-1 -n db"],
  objects: () => [
    ...nodes.map((n) => ({ kind: "Node", name: n.name, part: "node-" + n.slot, labels: { "node.kubernetes.io/instance-type": TYPES[n.type].name, "karpenter.sh/nodepool": "default" }, row: { STATUS: n.state === "ready" ? "Ready" : n.state === "booting" ? "NotReady" : "Ready,SchedulingDisabled", ROLES: "<none>", VERSION: "v1.31.2" }, wide: { "INSTANCE-TYPE": TYPES[n.type].name } })),
    ...nodes.map((n) => ({ kind: "NodeClaim", name: "default-" + sfx(n.id).slice(0, 5), part: "karp", labels: {}, row: { TYPE: TYPES[n.type].name, CAPACITY: "on-demand", ZONE: "us-east-1" + "abc"[n.id % 3], NODE: n.name, READY: n.state === "ready" ? "True" : "Unknown" } })),
    ...pods.map((p) => ({ kind: "Pod", name: p.name, ns: "team-" + p.team, labels: { app: "web" }, row: { READY: p.state === "running" ? "1/1" : "0/1", STATUS: p.state === "running" ? "Running" : p.state === "pending" ? "Pending" : "Terminating", RESTARTS: 0 }, wide: { NODE: (nodes.find((n) => n.id === p.node) || {}).name || "<none>" }, manifest: () => K.pod({ name: p.name, ns: "team-" + p.team, labels: { app: "web" }, image: `web-${p.team}:1.0`, node: (nodes.find((n) => n.id === p.node) || {}).name || "", phase: p.state === "running" ? "Running" : "Pending", reason: "Unschedulable", resources: { reqCpu: p.req * 1000 + "m", reqMem: "", limCpu: p.team === "b" ? "500m" : "", limMem: "" } }) + (p.team === "b" ? "\n# ← requests and limits were added by the LimitRange: the Deployment set none" : "") })),
    ...(st.pg ? st.pg.members.map((m) => ({ kind: "Pod", name: m.name, ns: "db", labels: { "cnpg.io/cluster": "pg", role: m.role }, row: { READY: m.state === "ready" ? "1/1" : "0/1", STATUS: m.state === "dead" ? "Error" : m.state === "starting" ? "Init:0/1" : "Running", RESTARTS: 0 } })).concat([{ kind: "Service", name: "pg-rw", ns: "db", labels: {}, row: { TYPE: "ClusterIP", "CLUSTER-IP": "172.20.9.10", "EXTERNAL-IP": "<none>", "PORT(S)": "5432/TCP" }, wide: { SELECTOR: `cnpg.io/cluster=pg,role=primary (→ ${st.pg.primary || "none"})` } }, { kind: "Service", name: "pg-ro", ns: "db", labels: {}, row: { TYPE: "ClusterIP", "CLUSTER-IP": "172.20.9.11", "EXTERNAL-IP": "<none>", "PORT(S)": "5432/TCP" } }]) : []),
    { kind: "ResourceQuota", name: "compute", ns: "team-b", part: "team-b", manifest: () => quotaY("b"), labels: {}, describe: () => [["Resource", "Used  Hard"], ["requests.cpu", `${Math.round(used("b") * 1000)}m  ${Q.b.cpu}`], ["pods", `${teamPods("b").length}  ${Q.b.pods}`]] },
    { kind: "ResourceQuota", name: "compute", ns: "team-a", part: "team-a", manifest: () => quotaY("a"), labels: {}, describe: () => [["Resource", "Used  Hard"], ["requests.cpu", `${Math.round(used("a") * 1000)}m  ${Q.a.cpu}`], ["pods", `${teamPods("a").length}  ${Q.a.pods}`]] },
  ],
  verbs: {
    scale({ pos, f }) { const t = { "team-a": "a", "team-b": "b" }[f["-n"] || "team-a"]; if (!t || !/web$/.test(pos.join("/"))) return undefined; const n = +f["--replicas"]; if (!Number.isInteger(n) || n < 0 || n > 16) return { err: "0–16 replicas here" }; S.stopTour(); scaleTeam(t, n); return [`deployment.apps/web scaled   # the quota decides how many pods actually get created`]; },
    apply({ f }) { if (f["-f"] !== "pg.yaml") return f["-f"] === "-" ? undefined : { err: `error: the path "${f["-f"]}" does not exist. This lesson has pg.yaml` }; S.stopTour(); return createPg() ? ["cluster.postgresql.cnpg.io/pg created"] : { err: 'error: resource mapping not found for name: "pg" namespace: "db" from "pg.yaml": no matches for kind "Cluster" in version "postgresql.cnpg.io/v1"\nensure CRDs are installed first' }; },
    delete({ pos, f }) { let [what, name] = pos; if (what && what.includes("/")) [what, name] = what.split("/"); if (/^(po|pods?)$/.test(what || "") && st.pg && st.pg.members.some((m) => m.name === name)) { S.stopTour(); if (name === st.pg.primary) killPrimary(); else { const m = st.pg.members.find((x) => x.name === name); m.state = "dead"; m.t = 0; } return [`pod "${name}" deleted   # the operator, not a ReplicaSet, decides what happens next`]; } return { err: "This lesson models deleting Postgres pods: kubectl delete pod pg-1 -n db" }; },
    "api-resources"() { return ["NAME        SHORTNAMES   APIVERSION              NAMESPACED   KIND", "pods        po           v1                      true         Pod", "deployments deploy       apps/v1                 true         Deployment", ...(st.crd ? ["clusters                 postgresql.cnpg.io/v1   true         Cluster   # ← added by the CRD"] : []), "nodepools                karpenter.sh/v1         false        NodePool", "nodeclaims               karpenter.sh/v1         false        NodeClaim"]; },
  },
  tools: { helm({ pos }) { if (pos[0] !== "install" || !/cnpg|cloudnative/.test(pos.join(" "))) return { err: "this lesson simulates: helm install cnpg cnpg/cloudnative-pg" }; if (st.crd) return { err: "Error: INSTALLATION FAILED: cannot re-use a name that is still in use" }; S.stopTour(); installOperator(); return ["NAME: cnpg", "STATUS: deployed", "# installed: CustomResourceDefinition clusters.postgresql.cnpg.io (+ others) and Deployment cnpg-controller-manager"]; } },
});
// ---- end kubectl ----

S.setTour([
  { home: true, say: "Two teams share the cluster, on two nodes Karpenter launched. At the back, an API server that only knows the built-in kinds.", hold: 6 },
  { focus: "team-a", zoom: 2.2, say: "Team A scales to 12 replicas. Each pod requests 500m CPU, and the team's ResourceQuota allows 4 CPU in total...", run: () => scaleTeam("a", 12), hold: 5 },
  { focus: "team-a", zoom: 2.2, say: "...so the API server refuses pods past 8: exceeded quota. One team can't starve the others.", hold: 5 },
  { focus: "dock", zoom: 2, say: "The pods it did accept don't fit on the nodes: they wait as Pending...", hold: 3 },
  { focus: "karp", zoom: 2, say: "...and Karpenter launches a node sized for exactly what's pending.", hold: 6, until: () => !pods.some((p) => p.state === "pending") },
  { home: true, say: "Scale back down. Karpenter notices the pods fit on fewer nodes, drains one and removes it: consolidation.", run: () => scaleTeam("a", 2), hold: 12 },
  { focus: "api", zoom: 2, say: "Now extend Kubernetes: a CRD teaches the API server a new kind, Cluster, and an operator learns to run it.", run: installOperator, hold: 6 },
  { focus: "db", zoom: 1.8, say: "One Cluster object, and the operator builds a primary and two streaming replicas.", run: createPg, hold: 6, until: () => st.pg && st.pg.members.filter((m) => m.state === "ready").length === 3 },
  { focus: "db", zoom: 1.8, say: "Kill the primary. The operator promotes a replica and moves the pg-rw Service to it: that's an operator encoding a DBA's runbook.", run: killPrimary, hold: 9 },
  { home: true, say: "CRDs and operators extend the platform; quotas and limit ranges share it fairly; Karpenter fits the machines to the pods.", hold: 6 },
]);
S.start();
