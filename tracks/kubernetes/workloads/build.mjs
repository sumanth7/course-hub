import { k, scene, RUNTIME, writeLesson } from "../shared.mjs";

const PLATE = { x: -186, y: -74, w: 380, d: 146, r: 9 };
const NODE_X = [-100, -20, 60, 140];
const TRAY = (n) => ({ x: NODE_X[n] - 34, y: -64, w: 68, d: 124, r: 3 });
const TRAY_Z = 4, TOP = 12;
const BAY = { sts: -42, ds: -2, job: 34 }; // y centres of the three bays
const CR = { w: 34, d: 24 };
const CRATE = (n, bay, dx = 0) => ({ x: NODE_X[n] - CR.w / 2 + dx - (bay === "sts" ? 8 : 0), y: BAY[bay] - CR.d / 2, w: CR.w, d: CR.d, r: 0.8 });
const CRATE_H = 13;
const LOCK = (n) => ({ x: NODE_X[n] + 12, y: BAY.sts - 10, w: 16, d: 20, r: 1 });
const LOCK_H = 18;
const CLOCK = { x: -178, y: -20, w: 34, d: 34, r: 3 };
const CLOCK_H = 12;
const CLK_C = [CLOCK.x + 17, CLOCK.y + 17];

const C = scene({ width: 660, height: 380, elevation: 36, pad: 12, fit: [...k.boxCorners(PLATE, -17, 0)] });
const { P, at, S, L, D, byDepth, plate, housing, crate, lampSvg, topText, frontText, faceRect } = C;

function tray(n) {
  const T = TRAY(n);
  const out = [`<path class="iso-halo" d="${k.haloOf(T, 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  for (const [x, y] of byDepth(k.corners(T, 6))) out.push(S(k.cylinder(x, y, 3, 0, TRAY_Z, P, 18), { tone: "lo" }));
  out.push(S(k.slabOf(T, TRAY_Z, TOP - TRAY_Z, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(T, TRAY_Z + 2.4, P, 4), { tone: "faint" }) }));
  for (const bay of ["ds", "job"]) out.push(L(k.planOutline(k.insetPlan(CRATE(n, bay), -1.4), TOP, P, 2), { tone: "faint" }));
  out.push(L(k.planOutline(k.insetPlan(CRATE(n, "sts"), -1.4), TOP, P, 2), { tone: "faint" }));
  out.push(frontText(T.x + 4, T.y + T.d, TRAY_Z + 2.2, `node-${n + 1}`, { size: 3, tone: "mid" }));
  return out.join("");
}
const podCrate = (n, bay, key) => {
  const plan = CRATE(n, bay);
  return `<g data-${key}="${n}" style="opacity:0">${crate(plan, TOP, CRATE_H, { ribs: 4, doors: false, lamp: [plan.x + plan.w - 4.5, plan.y + 4.5], lampAttr: `data-${key}-lamp="${n}"` })}${topText(plan.x + 2, plan.y + plan.d - 4, TOP + CRATE_H, "", { size: 3.4, tone: "hi", attrs: `data-${key}-name="${n}"` })}</g>`;
};
function locker(n) {
  const pl = LOCK(n);
  const out = [housing(pl, TOP, LOCK_H, { seam: 0.5, plinth: false })];
  out.push(L(faceRect("y", pl.y + pl.d, pl.x + 2, pl.x + pl.w - 2, TOP + 2, TOP + LOCK_H - 2), { tone: "lo" }));
  out.push(frontText(pl.x + 2.5, pl.y + pl.d, TOP + LOCK_H - 7, "", { size: 2.4, tone: "hi", attrs: `data-lockname="${n}"` }));
  out.push(frontText(pl.x + 2.5, pl.y + pl.d, TOP + LOCK_H - 11, "", { size: 2.2, tone: "mid", attrs: `data-lockdata="${n}"` }));
  return `<g data-lock="${n}" style="opacity:0">${out.join("")}</g>`;
}
function clock() {
  const out = [housing(CLOCK, 0, CLOCK_H, { seam: 0.5 })];
  out.push(L(k.ring(CLK_C[0], CLK_C[1], 13, CLOCK_H, P, 48), { tone: "lo" }));
  const t = k.radialTicks(CLK_C[0], CLK_C[1], 12.4, 12, 3, CLOCK_H, [1.2, 2.4], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(S(k.cylinder(CLK_C[0], CLK_C[1], 1.4, CLOCK_H, 0.8, P, 14), { tone: "mid" }));
  out.push(frontText(CLOCK.x + 3, CLOCK.y + CLOCK.d, 4, "CronJob", { size: 3, tone: "hi" }));
  out.push(lampSvg(CLOCK.x + CLOCK.w - 4, CLOCK.y + 4, CLOCK_H, { r: 1, attr: "data-cronlamp" }));
  return out.join("");
}
const hand = (a) => k.lineOnTop([CLK_C[0], CLK_C[1]], [CLK_C[0] + Math.sin(a) * 11, CLK_C[1] - Math.cos(a) * 11], CLOCK_H + 0.85, P);

const nodeGroup = (n) =>
  `<g data-node="${n}"${n === 3 ? ' style="opacity:0"' : ""}>${tray(n)}${podCrate(n, "sts", "sts")}${locker(n)}${podCrate(n, "ds", "ds")}${podCrate(n, "job", "job")}</g>`;
const body = [
  plate(PLATE, { ruler: false }),
  clock(),
  `<path data-hand class="iso-line" data-tone="lit" data-free="end" d="${hand(0)}" style="stroke-width:1.1"/>`,
  S(k.cylinder(CLK_C[0], CLK_C[1], 1.1, CLOCK_H + 0.8, 0.6, P, 12), { tone: "hi" }),
  [0, 1, 2, 3].map(nodeGroup).join(""),
  `<g data-node4-ghost>${L(k.planOutline(TRAY(3), TRAY_Z, P, 4), { tone: "lo", dashed: true })}</g>`,
].join("");

const live = `
const P = ${JSON.stringify(P)};
${RUNTIME}
const CLK_C = ${JSON.stringify(CLK_C)}, CLOCK_H = ${CLOCK_H};
const hand = ${hand.toString().replace(/k\./g, "")};
const ui = { sts: document.getElementById("wl-sts"), ds: document.getElementById("wl-ds"), job: document.getElementById("wl-job"), cron: document.getElementById("wl-cron"), node4: document.getElementById("wl-node4"), stsScale: document.getElementById("wl-sts-scale") };

// ---- StatefulSet: ordered, stable names, one volume claim per member ----
const sts = { replicas: 3, members: [null, null, null], pvc: [null, null, null], msg: "" };
// member: { state: creating|ready|terminating, t }
function stepSts(dt) {
  sts.members.forEach((m, i) => { if (m) { m.t += dt; if (m.state === "creating" && m.t > 1.4) { m.state = "ready"; m.t = 0; } if (m.state === "terminating" && m.t > 1) sts.members[i] = null; } });
  // scale up in order: db-i is created only when every lower ordinal is Ready
  for (let i = 0; i < sts.replicas; i++) {
    const m = sts.members[i];
    if (m && m.state === "ready") continue;
    if (!m && sts.members.slice(0, i).every((x) => x && x.state === "ready")) {
      sts.members[i] = { state: "creating", t: 0 };
      if (!sts.pvc[i]) { sts.pvc[i] = { data: 0 }; sts.msg = "Creating db-" + i + " with a new claim data-db-" + i + ", only after db-" + (i - 1) + " is Ready."; }
      else sts.msg = "db-" + i + " comes back with the same name and re-attaches its own claim data-db-" + i + ": its data is still there.";
    }
    break;
  }
  // scale down in reverse: the highest ordinal goes first
  for (let i = 2; i >= sts.replicas; i--) { const m = sts.members[i]; if (m && m.state !== "terminating") { m.state = "terminating"; m.t = 0; sts.msg = "Scaling down removes db-" + i + " first (highest ordinal). Its claim data-db-" + i + " is kept for when it comes back."; break; } }
  sts.members.forEach((m, i) => { if (m && m.state === "ready" && Math.random() < dt * 0.6) sts.pvc[i].data++; });
}

// ---- DaemonSet: one pod on every node ----
const ds = { nodes: 3, pods: [null, null, null, null], msg: "" };
function stepDs(dt) {
  for (let n = 0; n < 4; n++) {
    const p = ds.pods[n];
    if (n < ds.nodes) { if (!p) { ds.pods[n] = { t: 0 }; if (n === 3) ds.msg = "node-4 joined: the DaemonSet controller put a log-agent on it right away. Nobody scaled anything."; } else p.t += dt; }
    else if (p) ds.pods[n] = null;
  }
}

// ---- Job: run to completion, retry failures; CronJob: start a Job on a schedule ----
const job = { active: false, completions: 4, parallelism: 2, done: 0, running: [], failedOnce: false, msg: "", finished: [] };
let jobName = "", jobSeq = 0;
function startJob(by) {
  if (job.active) { job.msg = "A Job is still running; this CronJob uses concurrencyPolicy: Forbid, so the run is skipped."; return; }
  Object.assign(job, { active: true, done: 0, running: [], failedOnce: false, finished: [] });
  jobName = (by === "cron" ? "report-2870" : "report") + "-" + (++jobSeq);
  job.msg = (by === "cron" ? "The CronJob's schedule fired and created Job " : "Created Job ") + jobName + ": 4 completions, at most 2 pods at a time.";
}
function stepJob(dt) {
  if (!job.active) return;
  for (const r of job.running) r.t += dt;
  for (let i = job.running.length - 1; i >= 0; i--) {
    const r = job.running[i];
    if (r.t > 2.6) {
      if (!job.failedOnce && job.done === 1) { job.failedOnce = true; job.msg = "A pod exited with an error. The Job counts the failure (backoffLimit 6) and starts another pod."; job.finished.push({ node: r.node, ok: false, t: 0 }); }
      else { job.done++; job.finished.push({ node: r.node, ok: true, t: 0 }); }
      job.running.splice(i, 1);
    }
  }
  while (job.running.length < job.parallelism && job.done + job.running.length < job.completions) {
    const busy = new Set(job.running.map((r) => r.node));
    const node = [0, 1, 2].find((n) => !busy.has(n));
    if (node === undefined) break;
    job.running.push({ node, t: 0 });
  }
  if (job.done >= job.completions) { job.active = false; job.msg = "Job " + jobName + " complete: 4 of 4 succeeded. Its pods stop; they are kept as Completed so you can read their logs."; }
  job.finished.forEach((f) => (f.t += dt));
}
const cron = { on: true, every: 12, t: 6 };
function stepCron(dt) { if (!cron.on) return; cron.t += dt; if (cron.t >= cron.every) { cron.t = 0; startJob("cron"); } }

function draw() {
  for (let n = 0; n < 4; n++) {
    const node = $('[data-node="' + n + '"]');
    if (n === 3) { node.style.opacity = ds.nodes > 3 ? 1 : 0; $("[data-node4-ghost]").style.opacity = ds.nodes > 3 ? 0 : 0.6; }
    // StatefulSet member on node n (nodes 0..2)
    const m = n < 3 ? sts.members[n] : null;
    const sg = $('[data-sts="' + n + '"]');
    sg.style.opacity = m ? (m.state === "creating" ? 0.35 + 0.65 * Math.min(1, m.t / 1.4) : m.state === "terminating" ? Math.max(0, 1 - m.t) : 1) : 0;
    const nm = $('[data-sts-name="' + n + '"]');
    const lamp = $('[data-sts-lamp="' + n + '"]');
    if (nm) setText(nm, "db-" + n);
    if (lamp) lamp.style.opacity = m && m.state === "ready" ? 1 : 0.12;
    const lk = $('[data-lock="' + n + '"]');
    const pvc = n < 3 ? sts.pvc[n] : null;
    lk.style.opacity = pvc ? (m ? 1 : 0.55) : 0;
    setText($('[data-lockname="' + n + '"]'), "data-db-" + n);
    setText($('[data-lockdata="' + n + '"]'), pvc ? pvc.data + " rows" : "");
    // DaemonSet pod
    const dp = ds.pods[n];
    const dg = $('[data-ds="' + n + '"]');
    dg.style.opacity = dp ? Math.min(1, dp.t / 0.6) : 0;
    const dn = $('[data-ds-name="' + n + '"]'); if (dn) setText(dn, "log-agent");
    const dl = $('[data-ds-lamp="' + n + '"]'); if (dl) dl.style.opacity = dp && dp.t > 0.6 ? 1 : 0.12;
    // Job pod
    const jr = job.running.find((r) => r.node === n);
    const jf = job.finished.filter((f) => f.node === n).slice(-1)[0];
    const jg = $('[data-job="' + n + '"]');
    jg.style.opacity = jr ? 1 : jf && !job.running.some((r) => r.node === n) ? (jf.ok ? 0.45 : Math.max(0, 0.8 - jf.t)) : 0;
    const jn = $('[data-job-name="' + n + '"]'); if (jn) setText(jn, jr ? "running" : jf ? (jf.ok ? "✓ done" : "error") : "");
    const jl = $('[data-job-lamp="' + n + '"]'); if (jl) jl.style.opacity = jr ? 0.4 + 0.6 * Math.abs(Math.sin(jr.t * 5)) : 0.1;
  }
  $("[data-hand]").setAttribute("d", hand((cron.t / cron.every) * Math.PI * 2));
  $("[data-cronlamp]").style.opacity = cron.on ? 1 : 0.15;
  setText(ui.sts, sts.msg || "StatefulSet db: members get stable names (db-0, db-1, db-2) and each keeps its own volume claim.");
  setText(ui.ds, ds.msg || "DaemonSet log-agent: exactly one pod on every node, including nodes added later.");
  setText(ui.job, job.msg || "Job report: runs pods until 4 have succeeded, 2 at a time. CronJob: starts that Job every 12 seconds here (a cron schedule in real life).");
  setText(ui.cron, cron.on ? "CronJob schedule: on" : "CronJob schedule: off");
  ui.cron.setAttribute("aria-pressed", String(cron.on));
  setText(ui.node4, ds.nodes > 3 ? "Remove node-4" : "Add node-4");
  setText(ui.stsScale, "db replicas " + sts.replicas);
  const ready = sts.members.filter((m) => m && m.state === "ready").length;
  say("db " + ready + "/" + sts.replicas + " · log-agent " + ds.pods.filter(Boolean).length + "/" + ds.nodes + " · job " + job.done + "/4" + (job.active ? " running" : ""));
}

const A = animate({
  tick(dt) { stepSts(dt); stepDs(dt); stepJob(dt); stepCron(dt); draw(); },
  tour: [{ hold: 6 }, { node4: 1 }, { hold: 5 }, { stsDown: 1 }, { hold: 5 }, { stsUp: 1 }, { hold: 6 }, { delDb: 1 }, { hold: 7 }, { node4: 1 }, { hold: 6 }],
  act(s) { if (s.node4) ds.nodes = ds.nodes > 3 ? 3 : 4; if (s.stsDown) sts.replicas = 2; if (s.stsUp) sts.replicas = 3; if (s.delDb) delDb(); },
});
function delDb() { const m = sts.members[1]; if (m && m.state === "ready") { m.state = "terminating"; m.t = 0; sts.msg = "Deleted db-1. Watch it come back as db-1, not a random name, and pick up data-db-1 again."; } }
controls({
  stsUp: () => { sts.replicas = Math.min(3, sts.replicas + 1); },
  stsDown: () => { sts.replicas = Math.max(1, sts.replicas - 1); },
  delDb,
  node4: () => { ds.nodes = ds.nodes > 3 ? 3 : 4; if (ds.nodes === 3) ds.msg = "node-4 left the cluster, and its log-agent pod went with it."; },
  job: () => startJob("manual"),
  cron: () => { cron.on = !cron.on; },
}, A.takeOver);
draw();
`;

const controls = `<div class="lx-controls" role="group" aria-label="StatefulSet">
  <span class="lx-pair"><span id="wl-sts-scale">db replicas 3</span><button type="button" data-do="stsDown" aria-label="Scale db down">−</button><button type="button" data-do="stsUp" aria-label="Scale db up">+</button></span>
  <button type="button" data-do="delDb" class="is-danger">Delete db-1</button>
  <p class="lx-status" id="wl-sts" aria-live="polite"></p>
</div>
<div class="lx-controls" role="group" aria-label="DaemonSet">
  <button type="button" data-do="node4" id="wl-node4">Add node-4</button>
  <p class="lx-status" id="wl-ds" aria-live="polite"></p>
</div>
<div class="lx-controls" role="group" aria-label="Job and CronJob">
  <button type="button" data-do="job">Run the Job now</button>
  <button type="button" data-do="cron" id="wl-cron" aria-pressed="true">CronJob schedule: on</button>
  <p class="lx-status" id="wl-job" aria-live="polite"></p>
</div>
<pre class="lx-yaml"><b>kind:</b> StatefulSet   # db-0, db-1, db-2 in order; one claim each
<b>spec:</b> { serviceName: db, replicas: 3, <b>volumeClaimTemplates:</b> [{ metadata: { name: data }, spec: { resources: { requests: { storage: 1Gi } } } }] }
---
<b>kind:</b> DaemonSet     # one pod per node
<b>spec:</b> { template: { spec: { containers: [{ name: log-agent, image: fluent-bit:3 }] } } }
---
<b>kind:</b> CronJob
<b>spec:</b> { <b>schedule:</b> "0 * * * *", concurrencyPolicy: Forbid,
        jobTemplate: { spec: { <b>completions:</b> 4, <b>parallelism:</b> 2, backoffLimit: 6 } } }</pre>`;

writeLesson({
  slug: "workloads",
  pageTitle: "StatefulSets, DaemonSets & Jobs",
  fig: "Fig 12",
  title: "StatefulSets, DaemonSets & Jobs",
  hint: "Scale, delete, add a node or run a Job below",
  readout: "db 0/3 · log-agent 0/3 · job 0/4",
  width: 660,
  height: 380,
  label:
    "Three workload types on three node trays, each tray with three bays. In the back bay, a StatefulSet's pods db-0 to db-2, each beside its own volume locker. In the middle bay, a DaemonSet's log-agent, one per node; a dashed outline marks where a fourth node can join. In the front bay, the pods of a Job that runs to completion. A CronJob clock on the left starts that Job on a schedule.",
  keys: [
    { mark: "raised", label: "Back bay: StatefulSet members with a stable name and their own volume claim" },
    { mark: "lit", label: "Middle bay: DaemonSet, one log-agent per node, including new nodes" },
    { mark: "dashed", label: "Dashed outline: where node-4 joins when you add it" },
  ],
  caption:
    "A Deployment's pods are interchangeable. A StatefulSet's are not: they get stable names with an ordinal, are created and removed in order, and each gets its own PersistentVolumeClaim from a template, so a replaced db-1 comes back as db-1 with its data, which databases need. A DaemonSet runs exactly one pod on every node, and adds one automatically when a node joins; log collectors and node agents use it. A Job runs pods until a number of them succeed, retrying failures up to a limit, and a CronJob creates Jobs on a cron schedule.",
  body,
  controls,
  live,
});
