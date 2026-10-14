// Lesson 20 in 3D: observability and reliability. A three-tier app (frontend → checkout → payments) on three
// nodes in three zones, watched by Prometheus (metrics), Loki (logs) and Tempo (traces), shown on a Grafana
// screen, with Alertmanager. Then a node upgrade that drains nodes, held back by PodDisruptionBudgets.
const S = createStage({ home: { target: [6, 12, 4], dir: [0.9, 1.1, 1.15], zoom: 1 }, viewH: 280 });
const { box, cyl, lamp, crate, housing, track, part, own, label } = S;

const FY = 1.9, TOP = 11, LANE = 92;
const NODES = [{ x: -118, zone: "us-east-1a" }, { x: -10, zone: "us-east-1b" }, { x: 98, zone: "us-east-1c" }];
const NZ = 58, SLOT = [[-22, -11], [22, -11], [-22, 13], [22, 13]];
const APPS = { frontend: { n: 2, ms: 12 }, checkout: { n: 3, ms: 28 }, payments: { n: 2, ms: 45 } };
const OBS = { prom: { x: -170, z: -78 }, loki: { x: -100, z: -78 }, tempo: { x: -30, z: -78 }, graf: { x: 70, z: -86 }, am: { x: 170, z: -78 } };
const USERS = { x: 200, z: LANE };

part("plate", { kind: "Observability", title: "Watching a running system", noFrame: true, zoom: 1, anchor: V(0, 30, 0),
  desc: "At the front, the app on three nodes in three zones. At the back, what watches it: Prometheus scrapes metrics, Loki stores logs, Tempo stores traces, Grafana shows all three, and Alertmanager pages someone when a rule fires." });
own("plate", S.plate({ x: 10, z: 4, w: 450, d: 262 }));
own("plate", track([[[-160, LANE], [USERS.x, LANE]], ...NODES.map((n) => [[n.x, LANE], [n.x, NZ + 26]]), [[-170, -52], [170, -52]]], { width: 4.2 }));

// ---- nodes and pods ----
const trays = NODES.map((n, i) => {
  const id = part("node-" + i, { kind: "Node", title: `node-${"abc"[i]} (${n.zone})`, zoom: 1.9, anchor: V(n.x, TOP + 26, NZ),
    desc: () => `Kubelet <b>${nodes[i].version}</b>${nodes[i].cordoned ? ", <b>cordoned</b>: no new pods land here" : ""}. ${nodes[i].state === "replacing" ? "Being replaced by a new node on the new version." : ""}`,
    actions: () => [{ label: nodes[i].cordoned ? "Uncordon" : "Drain this node", danger: !nodes[i].cordoned, run: () => (nodes[i].cordoned ? uncordon(i) : drain(i)) }] });
  const t = S.tray({ x: n.x, z: NZ, w: 84, d: 50, top: TOP, slots: SLOT.map(([dx, dz]) => [n.x + dx, NZ + dz]), slotSize: [26, 22] });
  own(id, t);
  label(id, `node-${"abc"[i]} · ${n.zone}`);
  return t;
});
const slotObjs = NODES.flatMap((n, i) => SLOT.map(([dx, dz], k) => {
  const id = part(`slot-${i}-${k}`, { kind: "Pod", dynamic: true, zoom: 3.4, anchor: V(n.x + dx, TOP + 22, NZ + dz), title: () => podAt(i, k)?.name || "empty slot",
    desc: () => { const p = podAt(i, k); return p ? `A <b>${p.app}</b> pod on node-${"abc"[i]}. ${p.state === "terminating" ? "Being evicted." : p.state === "starting" ? "Starting." : ""} Its metrics, logs and spans flow to the back row.` : "No pod here."; },
    actions: () => (podAt(i, k) ? [{ label: "Crash this pod", danger: true, run: () => crash(podAt(i, k)) }] : []) });
  const c = crate({ w: 22, h: 12, d: 18, ribs: 3 });
  c.position.set(n.x + dx, TOP, NZ + dz); c.visible = false;
  const l = lamp(n.x + dx + 7, TOP + 12, NZ + dz - 4, { r: 1.2 });
  own(id, c, l.mesh);
  label(id, "", { small: true, lod: 1.9 });
  return { id, i, k, c, l };
}));
part("users", { kind: "Clients", title: "Users", zoom: 2.6, anchor: V(USERS.x, 22, USERS.z), desc: "Checkout requests: frontend → checkout → payments." });
own("users", housing({ x: USERS.x, z: USERS.z, w: 22, d: 22, h: 6 }), box(2, 11, 18, { x: USERS.x - 10, y0: 6, z: USERS.z, tone: "hi", r: 0.4 }));
const userLamp = lamp(USERS.x + 5, 6, USERS.z, { r: 1.5 });
own("users", userLamp.mesh);
label("users", "users");

// ---- the watchers ----
const watcher = (id, at, title, kind, desc, h = 16) => { part(id, { kind, title, zoom: 2.4, anchor: V(at.x, h + 14, at.z), desc }); own(id, housing({ x: at.x, z: at.z, w: 40, d: 26, h })); const l = lamp(at.x + 14, h, at.z + 6, { r: 1.3, state: "off" }); own(id, l.mesh); label(id, title); return l; };
const promLamp = watcher("prom", OBS.prom, "Prometheus", "Metrics", () => `Every few seconds it scrapes each pod's /metrics (the dots it sends). PromQL turns the counters into rates and percentiles. Now: <b>${rate().toFixed(1)} req/s</b>, errors <b>${errPct()}%</b>, p99 <b>${p99()} ms</b>.`);
const lokiLamp = watcher("loki", OBS.loki, "Loki", "Logs", "Fluent Bit, a DaemonSet with one pod per node, tails every container's log file and ships the lines here, labelled by namespace, app and pod.");
const tempoLamp = watcher("tempo", OBS.tempo, "Tempo", "Traces", () => `Each request carries a trace ID; every service sends a span (start, duration, parent) through the OpenTelemetry collector. Tempo stitches them into one trace. Last trace: <b>${lastTrace ? lastTrace.total + " ms" : "none yet"}</b>${lastTrace && lastTrace.slow ? ", slow in <b>payments</b>" : ""}.`);
const amLamp = watcher("am", OBS.am, "Alertmanager", "Alerts", () => `Prometheus evaluates alert rules; firing alerts come here to be grouped, silenced and routed to a pager. Firing: <b>${alerts().join(", ") || "nothing"}</b>.`, 14);
part("graf", { kind: "Dashboards", title: "Grafana", zoom: 1.9, anchor: V(OBS.graf.x, 46, OBS.graf.z), desc: "One screen for all three signals: request rate, error rate and p99 latency from Prometheus, with links to the logs (Loki) and traces (Tempo) of the same moment." });
own("graf", box(84, 34, 4, { x: OBS.graf.x, y0: 4, z: OBS.graf.z, tone: "mid", r: 0.8 }), box(10, 4, 10, { x: OBS.graf.x, y0: 0, z: OBS.graf.z, tone: "lo", r: 0.6 }));
const barMat = new THREE.MeshBasicMaterial(), barBad = new THREE.MeshBasicMaterial();
S.onTheme((p) => { barMat.color.set(p.accent); barBad.color.set(p.bad); });
const BARS = 12, graphs = ["rate", "errors", "p99"].map((g, gi) => { const x0 = OBS.graf.x - 36 + gi * 26; const bars = Array.from({ length: BARS }, (_, b) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1, 1), barMat); m.position.set(x0 + b * 1.8, 8, OBS.graf.z + 2.6); S.world.add(m); return m; }); S.label("graf", g, { small: true, anchor: V(x0 + 10, 36, OBS.graf.z + 3), lod: 1.6 }); return { bars, hist: Array(BARS).fill(0) }; });
label("graf", "Grafana");

// ---- the model ----
const nodes = NODES.map(() => ({ version: "v1.30", cordoned: false, state: "ready" }));
const pods = [];
let seq = 0, msg = "", clock = 0;
const M = { spread: true, pdb: true, minAvail: { frontend: 1, checkout: 2, payments: 1 }, latency: false, upgrading: -1 };
const podAt = (i, k) => pods.find((p) => p.node === i && p.slot === k && !p.gone);
const ready = (app) => pods.filter((p) => p.app === app && p.state === "ready");
const HASH = { frontend: "7f9c", checkout: "5d2b", payments: "8a41" };
const sfx = (n) => { let h = (n * 2654435761) >>> 0, o = ""; for (let i = 0; i < 5; i++) { o += "bcdfghjklmnpqrstvwxz2456789"[h % 27]; h = Math.floor(h / 27) + n * 7; } return o; };
function place(app) {
  const free = (i) => [0, 1, 2, 3].find((k) => !podAt(i, k));
  const ok = [0, 1, 2].filter((i) => !nodes[i].cordoned && nodes[i].state === "ready" && free(i) !== undefined);
  if (!ok.length) return null;
  // with topology spread: the zone with fewest pods of this app; without: pack the first node with room
  const i = M.spread ? ok.sort((a, b) => pods.filter((p) => p.app === app && p.node === a && !p.gone).length - pods.filter((p) => p.app === app && p.node === b && !p.gone).length || a - b)[0] : ok[0];
  const n = ++seq, p = { app, node: i, slot: free(i), n, name: `${app}-${HASH[app]}-${sfx(n)}`, state: "starting", t: 0, restarts: 0, f: 0 };
  pods.push(p);
  S.event("Normal", "Scheduled", "pod/" + p.name, `Successfully assigned shop/${p.name} to node-${"abc"[i]}`, "default-scheduler");
  return p;
}
function seed() { pods.length = 0; for (const app of ["frontend", "checkout", "payments"]) for (let k = 0; k < APPS[app].n; k++) { const p = place(app); if (p) Object.assign(p, { state: "ready", t: 9 }); } }
seed();
function reconcile(dt) {
  for (const app in APPS) { const live = pods.filter((p) => p.app === app && p.state !== "terminating" && !p.gone).length; if (live < APPS[app].n) place(app); }
  for (const p of pods) { p.t += dt; p.f = Math.max(0, p.f - dt); if (p.state === "starting" && p.t > 1.4) p.state = "ready"; if (p.state === "crashed" && p.t > 1.6) { p.state = "ready"; p.restarts++; } if (p.state === "terminating" && p.t > 1) p.gone = true; }
  for (let i = pods.length - 1; i >= 0; i--) if (pods[i].gone) pods.splice(i, 1);
}
// eviction through the API respects PodDisruptionBudgets
const canEvict = (p) => !M.pdb || ready(p.app).length - 1 >= M.minAvail[p.app] || p.state !== "ready";
function evict(p) { if (!canEvict(p)) return false; p.state = "terminating"; p.t = 0; S.event("Normal", "Evicted", "pod/" + p.name, `Evicted from node-${"abc"[p.node]} (drain)`, "kubectl"); return true; }
const blocked = new Set();
function drainStep() {
  if (M.upgrading < 0) return;
  const i = M.upgrading, n = nodes[i];
  if (n.state === "replacing") { n.t += 0.5; if (n.t > 3) { n.state = "ready"; n.version = "v1.31"; n.cordoned = false; S.event("Normal", "NodeReady", "node/node-" + "abc"[i], `Node node-${"abc"[i]} (kubelet v1.31) is Ready`, "node-controller"); const next = nodes.findIndex((x) => x.version === "v1.30"); if (next >= 0 && M.rolling) { msg = `node-${"abc"[i]} is back on v1.31. Next: node-${"abc"[next]}.`; drain(next); } else { M.upgrading = -1; M.rolling = false; msg = next < 0 ? "All three nodes run v1.31. With spread and PDBs, the app never dropped below its minimum." : `node-${"abc"[i]} is on v1.31.`; } } return; }
  const mine = pods.filter((p) => p.node === i && !p.gone && p.state !== "terminating");
  if (!mine.length) { n.state = "replacing"; n.t = 0; msg = `node-${"abc"[i]} is empty: it is replaced with a new node running v1.31.`; return; }
  if (!M.pdb) { mine.forEach(evict); return; } // without PDBs, drain evicts everything at once
  for (const p of mine) { if (evict(p)) { blocked.delete(p.name); return; } if (!blocked.has(p.name)) { blocked.add(p.name); S.event("Warning", "EvictionBlocked", "pod/" + p.name, "Cannot evict pod as it would violate the pod's disruption budget.", "kubectl"); msg = `Eviction of ${p.name} is refused: its PodDisruptionBudget needs ${M.minAvail[p.app]} ready ${p.app} pod(s). Drain waits for a replacement to be Ready elsewhere, then retries.`; } }
}
function drain(i) { if (M.upgrading >= 0 && M.upgrading !== i) return; nodes[i].cordoned = true; M.upgrading = i; msg = `Draining node-${"abc"[i]}: cordon it, then evict its pods one at a time${M.pdb ? ", as the PodDisruptionBudgets allow" : " (no PDBs: all at once)"}.`; S.event("Normal", "NodeNotSchedulable", "node/node-" + "abc"[i], "Node is cordoned", "kubectl"); }
function uncordon(i) { nodes[i].cordoned = false; if (M.upgrading === i) M.upgrading = -1; msg = `node-${"abc"[i]} accepts pods again.`; }
function upgradeAll() { if (M.upgrading >= 0) return; const first = nodes.findIndex((x) => x.version === "v1.30"); if (first < 0) { nodes.forEach((n) => (n.version = "v1.30")); msg = "Reset to v1.30. Press again to upgrade."; return; } M.rolling = true; drain(first); }
function crash(p) { if (!p || p.state !== "ready") return; p.state = "crashed"; p.t = 0; logLines.push({ app: p.app, pod: p.name, line: "panic: runtime error: invalid memory address or nil pointer dereference" }); S.event("Warning", "BackOff", "pod/" + p.name, "Back-off restarting failed container", "kubelet"); msg = `${p.name} crashed. Prometheus sees kube_pod_container_status_restarts_total go up, and the panic is in Loki.`; }
function setSpread(on) { M.spread = on; for (const p of pods) { p.state = "terminating"; p.t = 0; } msg = on ? "Topology spread on: replicas are kept even across the three zones. Pods recreated." : "Topology spread off: the scheduler packs pods onto the first nodes with room. Pods recreated: look where they land."; }
function setPdb(on) { M.pdb = on; msg = on ? "PodDisruptionBudgets on: a drain may only evict a pod if enough replicas stay ready." : "No PodDisruptionBudgets: a drain evicts everything on the node at once."; }
function setLatency(on) { M.latency = on; msg = on ? "payments now takes ~600 ms (a slow database). p99 climbs; the trace shows exactly which span is slow; the alert fires after it stays high." : "payments is fast again."; }

// ---- requests, metrics, logs, traces ----
const net = S.packets({ speed: 200, onArrive: arrive });
const reqs = [], logLines = [];
let lastTrace = null, spawnIn = 0, scrapeIn = 0, shipIn = 0, uf = { t: 0, ok: true };
const podXZ = (p) => ({ x: NODES[p.node].x + SLOT[p.slot][0], z: NZ + SLOT[p.slot][1] });
const pick = (app) => { const r = ready(app); return r.length ? r[Math.floor(Math.random() * r.length)] : null; };
function hopTo(from, p, data) { const to = podXZ(p); net.add([V(from.x, FY, LANE), V(to.x, FY, LANE), V(to.x, FY, to.z + 10)], data); }
function arrive(d) {
  if (d.kind === "scrape" || d.kind === "ship" || d.kind === "span") return;
  const tiers = ["frontend", "checkout", "payments"], next = tiers[d.tier + 1];
  d.p.f = 0.25;
  d.spans.push({ app: d.p.app, ms: APPS[d.p.app].ms + (d.p.app === "payments" && M.latency ? 560 + Math.random() * 120 : Math.random() * 10) });
  // each service sends its span to Tempo
  const at = podXZ(d.p); net.add([V(at.x, TOP + 12, at.z), V(at.x, 30, at.z), V(OBS.tempo.x, 30, OBS.tempo.z)], { kind: "span", alt: true, speed: 260 });
  if (!next) return done(d, true);
  const q = pick(next);
  if (!q) { logLines.push({ app: d.p.app, pod: d.p.name, line: `error calling ${next}: no endpoints available for service "${next}"` }); return done(d, false); }
  hopTo(podXZ(d.p), q, { tier: d.tier + 1, p: q, spans: d.spans, t0: d.t0 });
}
function done(d, ok) {
  const total = Math.round(d.spans.reduce((s, x) => s + x.ms, 0) + 4);
  reqs.push({ t: clock, ok, ms: total });
  lastTrace = { id: Math.random().toString(16).slice(2, 18), spans: d.spans, total, ok, slow: d.spans.some((s) => s.ms > 300) };
  uf = { t: 0.35, ok };
  if (!ok) S.event("Warning", "5xx", "service/frontend", "POST /checkout returned 503", "frontend");
}
const win = () => reqs.filter((r) => r.t > clock - 10);
const rate = () => win().length / 10;
const errPct = () => { const w = win(); return w.length ? Math.round((100 * w.filter((r) => !r.ok).length) / w.length) : 0; };
const p99 = () => { const w = win().map((r) => r.ms).sort((a, b) => a - b); return w.length ? w[Math.min(w.length - 1, Math.floor(w.length * 0.99))] : 0; };
const highSince = { p99: null, err: null };
const alerts = () => [...(highSince.p99 !== null && clock - highSince.p99 > 4 ? ["CheckoutLatencyHigh"] : []), ...(highSince.err !== null && clock - highSince.err > 2 ? ["CheckoutErrorsHigh"] : [])];
function spawn(dt) {
  if (reduced()) return;
  spawnIn -= dt; scrapeIn -= dt; shipIn -= dt;
  if (spawnIn <= 0) { spawnIn = 0.5; const p = pick("frontend"); if (!p) { done({ spans: [] }, false); return; } hopTo({ x: USERS.x }, p, { tier: 0, p, spans: [], t0: clock }); }
  if (scrapeIn <= 0) { scrapeIn = 2.5; promBlink = 0.4; pods.filter((p) => p.state === "ready").forEach((p) => { const a = podXZ(p); net.add([V(OBS.prom.x, 24, OBS.prom.z), V(a.x, 24, a.z)], { kind: "scrape", alt: true, speed: 300 }); }); }
  if (shipIn <= 0) { shipIn = 1.6; NODES.forEach((n) => net.add([V(n.x + 38, TOP, NZ - 24), V(n.x + 38, 4, -52), V(OBS.loki.x, 4, -52), V(OBS.loki.x, 4, OBS.loki.z + 13)], { kind: "ship", speed: 260 })); lokiBlink = 0.4; }
}
let promBlink = 0, lokiBlink = 0;
const LOG = { frontend: ["POST /checkout 200 64ms", "GET /cart 200 8ms"], checkout: ["order 9f2c created", "calling payments"], payments: ["charge ok card=****4242", "charge ok card=****1881"] };

S.onTick((dt) => {
  clock += dt;
  while (reqs.length && reqs[0].t < clock - 12) reqs.shift();
  reconcile(dt); spawn(dt); net.step(dt);
  M.drainIn = (M.drainIn || 0) - dt; if (M.drainIn <= 0) { M.drainIn = 0.5; drainStep(); }
  highSince.p99 = p99() > 400 ? highSince.p99 ?? clock : null; highSince.err = errPct() > 5 ? highSince.err ?? clock : null;
  promBlink = Math.max(0, promBlink - dt); lokiBlink = Math.max(0, lokiBlink - dt);
  promLamp.set(promBlink > 0 ? "accent" : "on"); lokiLamp.set(lokiBlink > 0 ? "accent" : "on"); tempoLamp.set(lastTrace && lastTrace.slow ? "bad" : "on");
  const firing = alerts(); amLamp.set(firing.length ? (Math.sin(clock * 10) > 0 ? "bad" : "off") : "off");
  S.setLabel("am", firing.length ? "Alertmanager · FIRING" : "Alertmanager", { bad: firing.length > 0 });
  // Grafana: one bar per second
  M.barIn = (M.barIn || 0) - dt;
  if (M.barIn <= 0) { M.barIn = 1; const vals = [rate() / 3, errPct() / 40, p99() / 800]; graphs.forEach((g, gi) => { g.hist.push(Math.min(1, vals[gi])); g.hist.shift(); g.bars.forEach((m, b) => { const h = Math.max(0.3, g.hist[b] * 24); m.scale.y = h; m.position.y = 8 + h / 2; m.material = gi > 0 && g.hist[b] > 0.5 ? barBad : barMat; }); }); }
  trays.forEach((t, i) => { const down = nodes[i].cordoned || nodes[i].state !== "ready"; if (t.userData.down !== down) { t.userData.down = down; t.userData.setDown(down); } S.setLabel("node-" + i, `node-${"abc"[i]} · ${NODES[i].zone} · ${nodes[i].version}${nodes[i].state === "replacing" ? " · replacing" : nodes[i].cordoned ? " · cordoned" : ""}`, { bad: nodes[i].cordoned }); });
  slotObjs.forEach((o) => {
    const p = podAt(o.i, o.k);
    o.c.visible = !!p; o.l.mesh.visible = !!p;
    if (!p) { S.setLabel(o.id, "", { show: false }); return; }
    o.c.scale.y = p.state === "terminating" ? Math.max(0.05, 1 - p.t) : p.state === "starting" ? Math.min(1, 0.2 + p.t) : p.state === "crashed" ? 0.8 : 1;
    o.l.set(p.state === "crashed" ? "bad" : p.f > 0 ? "accent" : p.state === "ready" ? "on" : "off");
    S.setLabel(o.id, p.app, { show: true, bad: p.state === "crashed" });
  });
  uf.t = Math.max(0, uf.t - dt); userLamp.set(uf.t > 0 ? (uf.ok ? "good" : "bad") : "on");
  S.say(`${rate().toFixed(1)} req/s · errors ${errPct()}% · p99 ${p99()} ms${firing.length ? " · ALERT " + firing.join(", ") : ""}`);
  syncUi();
});

// ---- controls ----
S.overview = () => `<h2>Watching a running system</h2><p class="muted">Pale dots going to the back are scrapes, log shipments and spans. Break something, then find it in the metrics, logs and traces. Pick a part:</p>`;
const ui = { status: document.getElementById("ob-status"), lat: document.getElementById("ob-lat"), spread: document.getElementById("ob-spread"), pdb: document.getElementById("ob-pdb"), up: document.getElementById("ob-up") };
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => {
  S.stopTour();
  const a = b.dataset.do;
  if (a === "lat") setLatency(!M.latency);
  if (a === "crash") crash(pick("payments") || pick("checkout"));
  if (a === "up") { S.shellEcho?.("eksctl upgrade nodegroup --cluster shop --name workers --kubernetes-version 1.31", "button"); upgradeAll(); }
  if (a === "spread") setSpread(!M.spread);
  if (a === "pdb") setPdb(!M.pdb);
  S.renderPanel();
}));
function syncUi() {
  const set = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
  set(ui.lat, M.latency ? "Fix payments latency" : "Slow down payments");
  set(ui.spread, `Topology spread: ${M.spread ? "on" : "off"}`); ui.spread.setAttribute("aria-pressed", String(M.spread));
  set(ui.pdb, `PodDisruptionBudgets: ${M.pdb ? "on" : "off"}`); ui.pdb.setAttribute("aria-pressed", String(M.pdb));
  ui.up.disabled = M.upgrading >= 0;
  set(ui.status, msg || "Three services on three nodes in three zones, all watched. Slow something down, crash a pod, or upgrade the nodes.");
  ui.status.dataset.tone = alerts().length || errPct() > 5 ? "bad" : "";
}

// ---- what the inspector shows ----
const pdbY = (app) => `apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: ${app}
  namespace: shop
spec:
  minAvailable: ${M.minAvail[app]}   # ← voluntary evictions (drains) must leave this many ready
  selector: { matchLabels: { app: ${app} } }
status:
  currentHealthy: ${ready(app).length}
  desiredHealthy: ${M.minAvail[app]}
  disruptionsAllowed: ${Math.max(0, ready(app).length - M.minAvail[app])}   # ← how many may go right now`;
const PDB_FIELDS = { "spec.minAvailable": { check: (v, all) => (!Number.isInteger(v) || v < 0 ? "must be a whole number ≥ 0" : v > APPS[all["metadata.name"]]?.n ? `more than the ${APPS[all["metadata.name"]].n} replicas: no drain could ever evict one` : ""), set: (v, all) => { M.minAvail[all["metadata.name"]] = v; } } };
const deployY = (app) => K.deployment({ name: app, ns: "shop", replicas: APPS[app].n, image: `111122223333.dkr.ecr.us-east-1.amazonaws.com/${app}:2.4.0`, ready: ready(app).length }).replace("        ports: [{ containerPort: 8080 }]", `        ports: [{ containerPort: 8080, name: metrics }]\n${M.spread ? "      topologySpreadConstraints:   # ← keep replicas even across zones\n      - { maxSkew: 1, topologyKey: topology.kubernetes.io/zone, whenUnsatisfiable: DoNotSchedule, labelSelector: { matchLabels: { app: " + app + " } } }" : "      # no topologySpreadConstraints: the scheduler may pack replicas together"}`);
Object.assign(S.PARTS.plate, { manifest: () => ["frontend", "checkout", "payments"].map((a) => pdbY(a)).join("\n---\n") + "\n---\n" + ["frontend", "checkout", "payments"].map(deployY).join("\n---\n"), fields: (kind) => (kind === "PodDisruptionBudget" ? PDB_FIELDS : null) });
Object.assign(S.PARTS.prom, { manifest: () => `apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: shop
  namespace: shop
spec:
  selector: { matchLabels: { team: shop } }   # ← which Services to scrape
  endpoints: [{ port: metrics, interval: 15s }]
---
# the queries behind the Grafana panels (PromQL)
# rate:   sum(rate(http_requests_total{app="frontend"}[1m]))                                  → ${rate().toFixed(1)} req/s
# errors: sum(rate(http_requests_total{code=~"5.."}[1m])) / sum(rate(http_requests_total[1m]))  → ${errPct()}%
# p99:    histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))  → ${p99()} ms` });
Object.assign(S.PARTS.am, { manifest: () => `apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: checkout-slo
  namespace: shop
spec:
  groups:
  - name: checkout
    rules:
    - alert: CheckoutLatencyHigh
      expr: histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket{app="frontend"}[5m]))) > 0.4
      for: 5m   # ← must stay high this long (4 s in the demo) before it fires
      labels: { severity: page }
    - alert: CheckoutErrorsHigh
      expr: sum(rate(http_requests_total{code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05
      for: 2m
      labels: { severity: page }
# firing now: ${alerts().join(", ") || "none"}` });
const traceText = () => { if (!lastTrace) return "# no trace yet"; const t = lastTrace; let at = 0; return `# trace ${t.id} · POST /checkout · ${t.total} ms · ${t.ok ? "OK" : "ERROR"}\n` + t.spans.map((s, k) => { const line = `${"  ".repeat(k)}${k ? "└─ " : ""}${s.app.padEnd(10)} ${String(Math.round(s.ms)).padStart(4)} ms ${"█".repeat(Math.max(1, Math.round(s.ms / 25)))}${s.ms > 300 ? "   # ← the slow span" : ""}`; at += s.ms; return line; }).join("\n") + (t.ok ? "" : "\n# └─ (the next service had no ready pods)"); };
Object.assign(S.PARTS.tempo, { manifest: traceText });
Object.assign(S.PARTS.loki, { manifest: () => `# logcli query '{namespace="shop"}' --limit 8\n` + [...logLines.slice(-4).map((l) => `${l.pod}  ${l.line}`), ...pods.filter((p) => p.state === "ready").slice(0, 4).map((p) => `${p.name}  ${LOG[p.app][p.n % 2]}`)].join("\n") });
NODES.forEach((n, i) => Object.assign(S.PARTS["node-" + i], { manifest: () => K.node({ name: "node-" + "abc"[i], cpu: "2", mem: "8Gi", ready: nodes[i].state === "ready", labels: { "topology.kubernetes.io/zone": n.zone } }).replace("spec:\n", `spec:\n${nodes[i].cordoned ? "  unschedulable: true   # ← cordoned\n" : ""}`) + `\n# kubelet ${nodes[i].version}` }));

// ---- kubectl and the YAML editor ----
S.kube({
  ns: "shop",
  help: ["kubectl get pods -o wide   ·   kubectl get pdb", "kubectl drain node-b --ignore-daemonsets   ·   kubectl uncordon node-b", "kubectl edit pdb checkout   (minAvailable)", "logcli query '{app=\"payments\"}'   ·   kubectl logs <pod>", "promql 'histogram_quantile(0.99, …)'   (or: promql p99 / rate / errors)", "tempo last   (the latest trace)   ·   amtool alert"],
  examples: ["kubectl get pods -o wide", "kubectl get pdb", "kubectl drain node-b --ignore-daemonsets", "promql p99", "tempo last", "logcli query '{app=\"payments\"}'", "amtool alert", "kubectl edit pdb checkout"],
  objects: () => pods.filter((p) => !p.gone).map((p) => ({ kind: "Pod", name: p.name, part: `slot-${p.node}-${p.slot}`, labels: { app: p.app }, row: { READY: p.state === "ready" ? "1/1" : "0/1", STATUS: { ready: "Running", starting: "ContainerCreating", terminating: "Terminating", crashed: "Error" }[p.state], RESTARTS: p.restarts }, wide: { IP: `10.0.${p.node + 1}.${20 + p.n}`, NODE: "node-" + "abc"[p.node] }, logs: () => [...logLines.filter((l) => l.pod === p.name).map((l) => l.line), LOG[p.app][0], LOG[p.app][1]] }))
    .concat(NODES.map((n, i) => ({ kind: "Node", name: "node-" + "abc"[i], part: "node-" + i, labels: { "topology.kubernetes.io/zone": n.zone }, row: { STATUS: nodes[i].state !== "ready" ? "NotReady" : nodes[i].cordoned ? "Ready,SchedulingDisabled" : "Ready", ROLES: "<none>", VERSION: nodes[i].version + ".2" } })))
    .concat(Object.keys(APPS).map((a) => ({ kind: "PodDisruptionBudget", name: a, part: "plate", manifest: () => pdbY(a), labels: {}, row: { "MIN AVAILABLE": M.minAvail[a], "MAX UNAVAILABLE": "N/A", "ALLOWED DISRUPTIONS": M.pdb ? Math.max(0, ready(a).length - M.minAvail[a]) : "(no PDB)" } }))),
  verbs: {
    drain({ pos }) { const i = ["node-a", "node-b", "node-c"].indexOf(pos[0]); if (i < 0) return { err: `Error from server (NotFound): nodes "${pos[0] || ""}" not found` }; if (M.upgrading >= 0 && M.upgrading !== i) return { err: `node-${"abc"[M.upgrading]} is still draining` }; S.stopTour(); M.rolling = false; drain(i); return [`node/${pos[0]} cordoned`, ...pods.filter((p) => p.node === i).map((p) => `evicting pod shop/${p.name}`), M.pdb ? "# evictions that would break a PodDisruptionBudget are retried every 5s (see kubectl get events)" : "# no PDBs: everything goes at once"]; },
    uncordon({ pos }) { const i = ["node-a", "node-b", "node-c"].indexOf(pos[0]); if (i < 0) return { err: `Error from server (NotFound): nodes "${pos[0] || ""}" not found` }; uncordon(i); return [`node/${pos[0]} uncordoned`]; },
    cordon({ pos }) { const i = ["node-a", "node-b", "node-c"].indexOf(pos[0]); if (i < 0) return { err: `Error from server (NotFound): nodes "${pos[0] || ""}" not found` }; nodes[i].cordoned = true; return [`node/${pos[0]} cordoned`]; },
    top({ pos }) { return /^(po|pods?)$/.test(pos[0] || "") ? ["NAME                     CPU(cores)   MEMORY(bytes)", ...pods.filter((p) => p.state === "ready").map((p) => `${p.name.padEnd(25)}${String(20 + ((p.n * 13) % 60)) + "m"}`.padEnd(38) + `${90 + ((p.n * 7) % 60)}Mi`)] : undefined; },
  },
  tools: {
    promql({ pos }) { const q = pos.join(" "); if (/p99|quantile/.test(q)) return [`{} ${(p99() / 1000).toFixed(3)}   # seconds: p99 latency over the last window`]; if (/err|5\.\./.test(q)) return [`{} ${(errPct() / 100).toFixed(3)}   # share of 5xx responses`]; if (/rate|requests/.test(q)) return [`{app="frontend"} ${rate().toFixed(2)}   # requests per second`]; if (/restart/.test(q)) return pods.map((p) => `kube_pod_container_status_restarts_total{pod="${p.name}"} ${p.restarts}`); return { err: "try: promql p99 · promql errors · promql rate · promql restarts" }; },
    logcli({ pos }) { const m = pos.join(" ").match(/app="?(\w+)/); const app = m && m[1]; const lines = [...logLines.filter((l) => !app || l.app === app).slice(-5).map((l) => `${l.pod}  ${l.line}`), ...pods.filter((p) => (!app || p.app === app) && p.state === "ready").slice(0, 3).map((p) => `${p.name}  ${LOG[p.app][p.n % 2]}`)]; return lines.length ? lines : ["# no lines"]; },
    tempo() { return traceText().split("\n"); },
    amtool({ pos }) { const f = alerts(); return f.length ? ["Alertname            Starts At   Summary", ...f.map((a) => `${a.padEnd(21)}just now    ${a === "CheckoutLatencyHigh" ? "p99 checkout latency above 400 ms" : "more than 5% of checkouts fail"}`)] : ["# no alerts firing"]; },
    eksctl() { S.stopTour(); upgradeAll(); return ["[ℹ]  upgrading nodegroup workers to 1.31: replacing nodes one at a time", "[ℹ]  each node is cordoned and drained (respecting PodDisruptionBudgets) before it is replaced"]; },
  },
});
// ---- end kubectl ----

S.setTour([
  { home: true, say: "frontend, checkout and payments run on three nodes in three zones. Prometheus, Loki and Tempo watch from the back.", hold: 6 },
  { focus: "prom", zoom: 2.2, say: "Prometheus scrapes every pod's /metrics. PromQL turns counters into request rate, error rate and p99 latency.", hold: 6 },
  { focus: "graf", zoom: 1.8, say: "Payments slows down. The p99 bar on the Grafana screen climbs...", run: () => setLatency(true), hold: 7 },
  { focus: "tempo", zoom: 2.2, say: "...and a trace shows where: the payments span takes 600 ms of the request.", hold: 6 },
  { focus: "am", zoom: 2.2, say: "p99 stays high, so the alert rule fires and Alertmanager pages someone.", hold: 5, until: () => alerts().length > 0 },
  { home: true, say: "Fixed. Now upgrade the nodes: each is cordoned, drained and replaced. PodDisruptionBudgets make drains wait for replacements.", run: () => { setLatency(false); upgradeAll(); }, hold: 14 },
  { home: true, say: "Without spread or PDBs, a drain can take every replica of a service at once. Watch the errors.", run: () => { M.upgrading = -1; M.rolling = false; nodes.forEach((n) => { n.version = "v1.30"; n.cordoned = false; n.state = "ready"; }); setPdb(false); setSpread(false); setTimeout(() => drain(0), 2500); }, hold: 10 },
  { home: true, say: "Metrics say something is wrong, traces say where, logs say why. Spread and PDBs keep maintenance from becoming an outage.", run: () => { setPdb(true); setSpread(true); uncordon(0); }, hold: 6 },
]);
S.start();
