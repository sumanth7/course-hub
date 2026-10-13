// Lesson 12 in 3D: three workload types on three nodes, each node with three bays.
const S = createStage({ home: { target: [10, 18, 0], dir: [0.9, 1.05, 1.1], zoom: 1 }, viewH: 280 });
const { box, cyl, lamp, crate, housing, part, own, label } = S;

const TOP = 12;
const NODE_X = [-100, -20, 60, 140];
const BAY = { sts: -42, ds: -2, job: 34 };
const CR = { w: 34, h: 13, d: 24 };
const LOCK = { dx: 20, w: 16, d: 20, h: 18 };
const CLOCK = { x: -170, z: 10, w: 34, d: 34, h: 12 };

part("plate", { kind: "Workloads", title: "Three workload types", noFrame: true, zoom: 1, anchor: V(10, 30, 0), desc: "Each node has three bays. Back: a StatefulSet's members. Middle: a DaemonSet's agent. Front: a Job's pods. A dashed outline shows where a fourth node can join.", yaml: "kubectl get statefulsets,daemonsets,jobs,cronjobs" });
own("plate", S.plate({ x: 0, z: -2, w: 380, d: 146 }));
const ghost = S.rect(NODE_X[3] - 34, -64, NODE_X[3] + 34, 60, 0.3, "edgeMid");
S.world.add(ghost);

const nodes = NODE_X.map((x, n) => {
  const id = part("node-" + n, { kind: "Node", title: "node-" + (n + 1), zoom: 1.6, anchor: V(x, TOP + 4, 62), desc: n === 3 ? "A node that can join and leave. When it joins, the DaemonSet puts a log-agent on it at once." : "A worker node with three bays.", yaml: "",
    actions: n === 3 ? () => [{ label: ds.nodes > 3 ? "Remove node-4" : "Add node-4", run: toggleNode4 }] : [] });
  const g = new THREE.Group();
  g.add(S.tray({ x, z: -2, w: 68, d: 124, top: TOP, slots: [[x - 8, BAY.sts], [x, BAY.ds], [x, BAY.job]], slotSize: [CR.w + 2, CR.d + 2] }));
  own(id, g);
  label(id, "node-" + (n + 1));
  if (n === 3) g.visible = false;
  return g;
});

// StatefulSet members with their own volume lockers (nodes 0..2)
const sts = [0, 1, 2].map((n) => {
  const x = NODE_X[n];
  const id = part("db-" + n, { kind: "StatefulSet member", title: "db-" + n, zoom: 2.8, anchor: V(x - 8, TOP + CR.h + 12, BAY.sts),
    desc: () => { const m = stsState.members[n]; return `Always named <b>db-${n}</b>, with its own claim <b>data-db-${n}</b> (${stsState.pvc[n] ? stsState.pvc[n].data + " rows" : "not created yet"}). ` + (!m ? "Not running." : m.state === "creating" ? "Being created; db-" + (n + 1) + " waits for it to be Ready." : m.state === "terminating" ? "Terminating." : "Ready."); },
    yaml: "kind: StatefulSet\nspec:\n  serviceName: db\n  replicas: 3\n  volumeClaimTemplates:\n  - metadata: { name: data }\n    spec: { resources: { requests: { storage: 1Gi } } }",
    actions: () => (n === 1 ? [{ label: "Delete db-1", danger: true, run: delDb }] : []) });
  const g = crate({ w: CR.w, h: CR.h, d: CR.d, ribs: 4 });
  g.position.set(x - 8, TOP, BAY.sts);
  const l = lamp(12, CR.h, -8, { r: 1.3 });
  g.add(l.mesh);
  own(id, g);
  label(id, "db-" + n, { small: true });
  const lid = part("lock-" + n, { kind: "PersistentVolumeClaim", title: "data-db-" + n, zoom: 3, anchor: V(x + LOCK.dx, TOP + LOCK.h + 8, BAY.sts), desc: () => `db-${n}'s own volume claim, made from the template. It stays when db-${n} is deleted or scaled away, so its data is waiting when db-${n} comes back.` });
  const locker = housing({ x: x + LOCK.dx, z: BAY.sts, w: LOCK.w, d: LOCK.d, h: LOCK.h, y0: TOP, plinth: false });
  own(lid, locker);
  S.label(lid, "", { small: true, lod: 1.6 });
  return { g, l, locker, lid };
});
// DaemonSet pods and Job pods
const dsPods = NODE_X.map((x, n) => { const id = part("ds-" + n, { kind: "DaemonSet pod", title: "log-agent on node-" + (n + 1), zoom: 3, anchor: V(x, TOP + CR.h + 10, BAY.ds), desc: "One per node, exactly: the DaemonSet controller adds one on every node that joins and removes it when the node leaves.", yaml: "kind: DaemonSet\nspec:\n  template:\n    spec: { containers: [{ name: log-agent, image: fluent-bit:3 }] }" }); const g = crate({ w: CR.w, h: CR.h, d: CR.d, ribs: 4 }); g.position.set(x, TOP, BAY.ds); const l = lamp(12, CR.h, -8, { r: 1.3 }); g.add(l.mesh); own(id, g); g.visible = false; label(id, "log-agent", { small: true, lod: 1.4 }); return { g, l, id }; });
const jobPods = [0, 1, 2].map((n) => { const x = NODE_X[n]; const id = part("job-" + n, { kind: "Job pod", dynamic: true, zoom: 3, anchor: V(x, TOP + CR.h + 10, BAY.job), title: "Job pod on node-" + (n + 1), desc: "Runs a task to completion and stops. The Job counts successes until it reaches 4, at most 2 at a time, retrying failures." }); const g = crate({ w: CR.w, h: CR.h, d: CR.d, ribs: 4 }); g.position.set(x, TOP, BAY.job); const l = lamp(12, CR.h, -8, { r: 1.3 }); g.add(l.mesh); own(id, g); g.visible = false; label(id, "", { small: true }); return { g, l, id }; });

// CronJob clock
part("cron", { kind: "CronJob", title: "CronJob report", zoom: 2.6, anchor: V(CLOCK.x, CLOCK.h + 14, CLOCK.z),
  desc: () => `Creates a Job on a schedule (every 12 seconds here; a cron line like "0 * * * *" in real life). concurrencyPolicy Forbid skips a run while the last Job is still going. Schedule: <b>${cron.on ? "on" : "off"}</b>.`,
  yaml: 'kind: CronJob\nspec:\n  schedule: "0 * * * *"\n  concurrencyPolicy: Forbid\n  jobTemplate: { spec: { completions: 4, parallelism: 2, backoffLimit: 6 } }',
  actions: () => [{ label: "Run the Job now", run: () => startJob("manual") }, { label: cron.on ? "Pause the schedule" : "Resume the schedule", run: () => { cron.on = !cron.on; } }] });
own("cron", housing({ x: CLOCK.x, z: CLOCK.z, w: CLOCK.w, d: CLOCK.d, h: CLOCK.h }), cyl(14, 0.6, { x: CLOCK.x, y0: CLOCK.h, z: CLOCK.z, tone: "hi", seg: 48 }));
const ticks = S.lines(Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return [V(CLOCK.x + Math.sin(a) * 11, CLOCK.h + 0.7, CLOCK.z - Math.cos(a) * 11), V(CLOCK.x + Math.sin(a) * 13, CLOCK.h + 0.7, CLOCK.z - Math.cos(a) * 13)]; }), "edgeHi");
S.world.add(ticks);
const handMat = new THREE.MeshBasicMaterial();
S.onTheme((p) => handMat.color.set(p.accent));
const hand = new THREE.Group();
const handBar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 11), handMat);
handBar.position.z = -5.5;
hand.add(handBar);
hand.position.set(CLOCK.x, CLOCK.h + 1.2, CLOCK.z);
own("cron", hand);
label("cron", "CronJob");

// ---- models (same rules as the 2D lesson) ----
const stsState = { replicas: 3, members: [null, null, null], pvc: [null, null, null], msg: "" };
function stepSts(dt) {
  stsState.members.forEach((m, i) => { if (m) { m.t += dt; if (m.state === "creating" && m.t > 1.4) { m.state = "ready"; m.t = 0; } if (m.state === "terminating" && m.t > 1) stsState.members[i] = null; } });
  for (let i = 0; i < stsState.replicas; i++) {
    const m = stsState.members[i];
    if (m && m.state === "ready") continue;
    if (!m && stsState.members.slice(0, i).every((x) => x && x.state === "ready")) {
      stsState.members[i] = { state: "creating", t: 0 };
      if (!stsState.pvc[i]) { stsState.pvc[i] = { data: 0 }; stsState.msg = `Creating db-${i} with a new claim data-db-${i}, only after db-${i - 1} is Ready.`; }
      else stsState.msg = `db-${i} comes back with the same name and re-attaches data-db-${i}: its data is still there.`;
    }
    break;
  }
  for (let i = 2; i >= stsState.replicas; i--) { const m = stsState.members[i]; if (m && m.state !== "terminating") { m.state = "terminating"; m.t = 0; stsState.msg = `Scaling down removes db-${i} first (highest ordinal). Its claim data-db-${i} is kept.`; break; } }
  stsState.members.forEach((m, i) => { if (m && m.state === "ready" && Math.random() < dt * 0.6) stsState.pvc[i].data++; });
}
function delDb() { const m = stsState.members[1]; if (m && m.state === "ready") { m.state = "terminating"; m.t = 0; stsState.msg = "Deleted db-1. It comes back as db-1, not a random name, and picks up data-db-1 again."; } }
const ds = { nodes: 3, pods: [null, null, null, null], msg: "" };
function toggleNode4() { ds.nodes = ds.nodes > 3 ? 3 : 4; ds.msg = ds.nodes > 3 ? "node-4 joined: the DaemonSet controller put a log-agent on it right away." : "node-4 left the cluster, and its log-agent went with it."; }
function stepDs(dt) { for (let n = 0; n < 4; n++) { if (n < ds.nodes) { if (!ds.pods[n]) ds.pods[n] = { t: 0 }; else ds.pods[n].t += dt; } else ds.pods[n] = null; } }
const job = { active: false, done: 0, running: [], failedOnce: false, finished: [], msg: "" };
let jobSeq = 0, jobName = "";
function startJob(by) {
  if (job.active) { job.msg = "A Job is still running; with concurrencyPolicy Forbid this run is skipped."; return; }
  Object.assign(job, { active: true, done: 0, running: [], failedOnce: false, finished: [] });
  jobName = "report-" + ++jobSeq;
  job.msg = (by === "cron" ? "The CronJob's schedule fired and created Job " : "Created Job ") + jobName + ": 4 completions, at most 2 pods at a time.";
}
function stepJob(dt) {
  if (!job.active) return;
  job.running.forEach((r) => (r.t += dt)); job.finished.forEach((f) => (f.t += dt));
  for (let i = job.running.length - 1; i >= 0; i--) {
    const r = job.running[i];
    if (r.t > 2.6) {
      if (!job.failedOnce && job.done === 1) { job.failedOnce = true; job.msg = "A pod exited with an error. The Job counts the failure (backoffLimit 6) and starts another."; job.finished.push({ node: r.node, ok: false, t: 0 }); }
      else { job.done++; job.finished.push({ node: r.node, ok: true, t: 0 }); }
      job.running.splice(i, 1);
    }
  }
  while (job.running.length < 2 && job.done + job.running.length < 4) { const busy = new Set(job.running.map((r) => r.node)); const node = [0, 1, 2].find((n) => !busy.has(n)); if (node === undefined) break; job.running.push({ node, t: 0 }); }
  if (job.done >= 4) { job.active = false; job.msg = `Job ${jobName} complete: 4 of 4 succeeded. Its pods are kept as Completed so you can read their logs.`; }
}
const cron = { on: true, every: 12, t: 6 };

S.onTick((dt) => {
  stepSts(dt); stepDs(dt); stepJob(dt);
  if (cron.on) { cron.t += dt; if (cron.t >= cron.every) { cron.t = 0; startJob("cron"); } }
  hand.rotation.y = -(cron.t / cron.every) * Math.PI * 2;
  nodes[3].visible = ds.nodes > 3; ghost.visible = ds.nodes <= 3;
  S.setLabel("node-3", "node-4", { show: ds.nodes > 3 });
  sts.forEach((s, n) => {
    const m = stsState.members[n], pvc = stsState.pvc[n];
    s.g.visible = !!m;
    if (m) s.g.scale.y = m.state === "creating" ? 0.3 + 0.7 * Math.min(1, m.t / 1.4) : m.state === "terminating" ? Math.max(0.01, 1 - m.t) : 1;
    s.l.set(m && m.state === "ready" ? "on" : "off");
    s.locker.visible = !!pvc;
    S.setLabel("db-" + n, "db-" + n + (m && m.state === "creating" ? " · creating" : ""), { show: !!m });
    S.labels[s.lid].el.textContent = pvc ? `data-db-${n} · ${pvc.data} rows` : "";
    S.setLabel(s.lid, pvc ? `data-db-${n} · ${pvc.data} rows` : "", { show: !!pvc });
  });
  dsPods.forEach((p, n) => { const d = ds.pods[n]; p.g.visible = !!d; if (d) p.g.scale.y = Math.min(1, d.t / 0.6 + 0.01); p.l.set(d && d.t > 0.6 ? "on" : "off"); S.setLabel(p.id, "log-agent", { show: !!d }); });
  jobPods.forEach((p, n) => {
    const r = job.running.find((x) => x.node === n), f = job.finished.filter((x) => x.node === n).slice(-1)[0];
    p.g.visible = !!r || !!(f && (f.ok || f.t < 0.8));
    p.l.set(r ? (Math.sin(r.t * 10) > 0 ? "accent" : "off") : f && !f.ok ? "bad" : f ? "on" : "off");
    p.g.scale.y = r ? 1 : f && f.ok ? 0.7 : 1;
    S.setLabel(p.id, r ? "running" : f ? (f.ok ? "✓ Completed" : "Error") : "", { show: p.g.visible, bad: !!(f && !f.ok && !r) });
  });
  const ready = stsState.members.filter((m) => m && m.state === "ready").length;
  S.say(`db ${ready}/${stsState.replicas} · log-agent ${ds.pods.filter(Boolean).length}/${ds.nodes} · job ${job.done}/4${job.active ? " running" : ""}`);
  syncUi();
});

S.overview = () => `<h2>StatefulSets, DaemonSets and Jobs</h2><p class="muted">Three bays on every node, one per workload type. Pick a part:</p>`;
const ui = { sts: document.getElementById("wl-sts"), ds: document.getElementById("wl-ds"), job: document.getElementById("wl-job"), cron: document.getElementById("wl-cron"), node4: document.getElementById("wl-node4"), scale: document.getElementById("wl-sts-scale") };
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => {
  S.stopTour();
  const a = b.dataset.do;
  if (a === "stsUp") stsState.replicas = Math.min(3, stsState.replicas + 1); if (a === "stsDown") stsState.replicas = Math.max(1, stsState.replicas - 1);
  if (a === "delDb") delDb(); if (a === "node4") toggleNode4(); if (a === "job") startJob("manual"); if (a === "cron") cron.on = !cron.on;
  S.renderPanel();
}));
function syncUi() {
  const set = (el, t) => { if (el.textContent !== t) el.textContent = t; };
  set(ui.sts, stsState.msg || "StatefulSet db: members get stable names (db-0, db-1, db-2) and each keeps its own volume claim.");
  set(ui.ds, ds.msg || "DaemonSet log-agent: exactly one pod on every node, including nodes added later.");
  set(ui.job, job.msg || "Job report: runs pods until 4 have succeeded, 2 at a time. The CronJob starts it every 12 seconds here.");
  set(ui.cron, "CronJob schedule: " + (cron.on ? "on" : "off")); ui.cron.setAttribute("aria-pressed", String(cron.on));
  set(ui.node4, ds.nodes > 3 ? "Remove node-4" : "Add node-4");
  set(ui.scale, "db replicas " + stsState.replicas);
}

// ---- what the inspector shows ----
[0, 1, 2].forEach((n) => {
  Object.assign(S.PARTS["db-" + n], { manifest: () => { const m = stsState.members[n]; return m ? K.pod({ name: "db-" + n, labels: { app: "db", "statefulset.kubernetes.io/pod-name": "db-" + n }, image: "postgres:16", node: "node-" + (n + 1), ip: `10.244.${n + 1}.30`, ready: m.state === "ready", owner: { kind: "StatefulSet", name: "db" }, volumes: [{ name: "data", path: "/var/lib/postgresql", src: `persistentVolumeClaim: { claimName: data-db-${n} }   # ← its own claim, always this one` }] }) : K.statefulset({ replicas: stsState.replicas, ready: stsState.members.filter((x) => x && x.state === "ready").length }); }, facts: () => { const m = stsState.members[n]; return [["Name", "db-" + n + " (stable)"], ["State", m ? m.state : "not running"], ["Claim", `data-db-${n}`], ["DNS", `db-${n}.db.default.svc.cluster.local`]]; } });
  Object.assign(S.PARTS["lock-" + n], { manifest: () => K.pvc({ name: "data-db-" + n, size: "1Gi", volume: `pvc-${["3a1f", "9c2e", "7b4d"][n]}` }) + `\n# made from the StatefulSet's volumeClaimTemplates; kept when db-${n} goes away` });
});
NODE_X.forEach((_, n) => {
  Object.assign(S.PARTS["ds-" + n], { manifest: () => (ds.pods[n] ? K.pod({ name: "log-agent-" + ["x2kd", "p9fw", "m4tq", "r7cv"][n], ns: "kube-system", labels: { app: "log-agent" }, image: "fluent-bit:3", node: "node-" + (n + 1), ip: `10.244.${n + 1}.40`, owner: { kind: "DaemonSet", name: "log-agent" } }) : K.daemonset({ desired: ds.nodes })) });
  Object.assign(S.PARTS["node-" + n], { manifest: () => K.node({ name: "node-" + (n + 1), cidr: `10.244.${n + 1}.0/24`, ready: n < ds.nodes }) });
});
[0, 1, 2].forEach((n) => Object.assign(S.PARTS["job-" + n], { manifest: () => { const r = job.running.find((x) => x.node === n), f = job.finished.filter((x) => x.node === n).slice(-1)[0]; if (!r && !f) return ""; return K.pod({ name: `${jobName || "report-1"}-${["k7x2p", "m3q9z", "t8w4c"][n]}`, labels: { "job-name": jobName || "report-1" }, image: "report:2.1", node: "node-" + (n + 1), ip: `10.244.${n + 1}.50`, owner: { kind: "Job", name: jobName || "report-1" }, ready: !!r, phase: r ? "Running" : f ? (f.ok ? "Succeeded" : "Failed") : "Pending", reason: f && !r ? (f.ok ? "Completed" : "Error") : undefined }); } }));
Object.assign(S.PARTS.cron, { manifest: () => K.cronjob({ on: cron.on }) + (jobName ? "\n---\n" + K.job({ name: jobName, succeeded: job.done, active: job.running.length, failed: job.failedOnce ? 1 : 0 }) : ""), facts: () => [["Schedule", cron.on ? "on" : "suspended"], ["Last Job", jobName || "none yet"], ["Progress", `${job.done}/4 succeeded`]] });
Object.assign(S.PARTS.plate, { manifest: () => K.statefulset({ replicas: stsState.replicas, ready: stsState.members.filter((x) => x && x.state === "ready").length }) + "\n---\n" + K.daemonset({ desired: ds.nodes, ready: ds.pods.filter(Boolean).length }) });

// ---- kubectl and the YAML editor ----
// StatefulSet replicas and the CronJob's suspend flag are editable
Object.assign(S.PARTS.plate, { fields: (kind) => (kind === "StatefulSet" ? { "spec.replicas": { check: (v) => (!Number.isInteger(v) ? "must be a whole number" : v < 1 || v > 3 ? "this lesson has room for 1–3 db pods" : ""), set: (v) => { stsState.replicas = v; } } } : kind === "DaemonSet" ? {} : null) });
Object.assign(S.PARTS.cron, { fields: (kind) => (kind === "CronJob" ? { "spec.suspend": { check: (v) => (typeof v !== "boolean" ? "must be true or false" : ""), set: (v) => { cron.on = !v; } } } : null) });
const stsRow = () => `${stsState.members.filter((m) => m && m.state === "ready").length}/${stsState.replicas}`;
S.kube({
  ns: "default",
  help: ["kubectl get sts,ds,jobs,cronjobs", "kubectl scale sts db --replicas=1..3", "kubectl delete pod db-1   (it comes back as db-1)", "kubectl get pvc", "kubectl create job report-now --from=cronjob/report", "kubectl patch cronjob report -p '{\"spec\":{\"suspend\":true}}'", "kubeadm join …   ·   kubectl delete node node-4   (node-4 joins / leaves)"],
  examples: ["kubectl get sts,ds,cronjobs,jobs", "kubectl get pods -o wide -A", "kubectl delete pod db-1", "kubectl scale sts db --replicas=1", "kubectl get pvc", "kubeadm join 10.0.0.1:6443 --token abc.123", "kubectl get ds -n kube-system", "kubectl create job report-now --from=cronjob/report", "kubectl get jobs -w"],
  verbs: {
    delete({ pos }) {
      let [what, ...names] = pos; if (what && what.includes("/")) { names = pos.map((x) => x.split("/")[1]); what = pos[0].split("/")[0]; }
      const k = KUBE.kindOf(what || "");
      if (k === "Node") { if (names[0] !== "node-4" || ds.nodes < 4) return { err: names[0] === "node-4" ? 'Error from server (NotFound): nodes "node-4" not found' : `This lesson keeps ${names[0]}; node-4 is the one that can leave.` }; S.stopTour(); toggleNode4(); return 'node "node-4" deleted'; }
      if (k !== "Pod") return { err: `kubectl delete ${what || ""} isn't part of this lesson; try kubectl delete pod db-1` };
      S.stopTour();
      return { lines: names.map((n) => { const m = n.match(/^db-(\d)$/); const mem = m && stsState.members[+m[1]]; if (!mem) return `Error from server (NotFound): pods "${n}" not found`; mem.state = "terminating"; mem.t = 0; stsState.msg = `Deleted ${n}. It comes back as ${n}, not a random name, and picks up data-${n} again.`; return `pod "${n}" deleted`; }) };
    },
    create({ pos, f }) {
      if (pos[0] !== "job" || !f["--from"]) return undefined;
      if (f["--from"] !== "cronjob/report") return { err: `Error from server (NotFound): cronjobs.batch "${String(f["--from"]).split("/").pop()}" not found` };
      S.stopTour(); const was = job.active; startJob("manual"); if (!was && pos[1]) jobName = pos[1];
      return was ? { err: "# a Job from this CronJob is still running; this demo runs one at a time" } : `job.batch/${jobName} created`;
    },
  },
  tools: {
    kubeadm({ pos }) { if (pos[0] !== "join") return { err: "this lesson simulates kubeadm join only" }; if (ds.nodes > 3) return { err: "node-4 has already joined" }; S.stopTour(); toggleNode4(); return ["[preflight] Running pre-flight checks", "[kubelet-start] Starting the kubelet", "This node has joined the cluster: node-4", "# watch: the DaemonSet puts a log-agent on it at once"]; },
  },
});
// ---- end kubectl ----
S.setTour([
  { home: true, say: "Three nodes, three bays each, three kinds of workload. Watch the StatefulSet start up first.", hold: 5 },
  { focus: "db-0", zoom: 2.4, say: "A StatefulSet creates db-0, then db-1, then db-2, each only after the one before is Ready. Each gets its own volume claim.", hold: 6 },
  { focus: "db-1", zoom: 2.6, say: "Delete db-1. It comes back with the same name and re-attaches its own claim, data-db-1. Databases need exactly this.", run: delDb, hold: 7 },
  { focus: "ds-1", zoom: 2.6, say: "The DaemonSet runs exactly one log-agent on every node.", hold: 5 },
  { focus: "node-3", zoom: 1.6, say: "Add node-4: a log-agent appears on it at once. Nobody scaled anything.", run: () => { if (ds.nodes === 3) toggleNode4(); }, hold: 6 },
  { focus: "cron", zoom: 2.4, say: "The CronJob's clock starts a Job on schedule...", run: () => { cron.t = cron.every - 2; }, hold: 4 },
  { home: true, say: "...and the Job runs pods to completion, two at a time, until four succeed. One fails and is retried.", hold: 12 },
  { home: true, say: "Deployments for stateless apps, StatefulSets for stable identity and storage, DaemonSets for per-node agents, Jobs for tasks that finish.", run: () => { if (ds.nodes > 3) toggleNode4(); }, hold: 6 },
]);
S.start();
