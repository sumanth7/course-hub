// Lesson 09 in 3D: a test bench where the kubelet's probes tap each pod.
const S = createStage({ home: { target: [-10, 26, 8], dir: [1, 0.9, 1.1], zoom: 1.05 }, viewH: 280 });
const { box, cyl, lamp, crate, housing, track, part, own, label } = S;

const STATIONS = [-80, -15, 50];
const NAMES = ["web-1", "web-2", "web-3"];
const TOP = 12, CR = { w: 26, h: 18, d: 30 };
const CRATE_Z = -10;
const ARM_Y = 56, TOWER = { dx: 22, z: -25 };
const PROBE_DX = [-7, 0, 7], PROBE_Z = -18, REST = 3;
const TRACK_Z = 44, PORT_Z = 23;
const GATE = { x: 110, z: 44, w: 24, d: 20, h: 16 };

part("bench", { kind: "Node", title: "node-1 and its kubelet", noFrame: true, zoom: 1, anchor: V(-15, 30, 0), desc: "One node. Its kubelet runs every probe on every container, once per period, and acts on the results: it restarts containers whose liveness fails and reports readiness to the control plane.", yaml: "kubectl describe pod web-1   # Liveness / Readiness / Startup lines and Events" });
own("bench", S.plate({ x: -5, z: 6, w: 300, d: 132 }), box(204, 8, 60, { x: -22, y0: 4, z: -10, r: 1.5 }), ...[[-118, -34], [74, -34], [-118, 14], [74, 14]].map(([x, z]) => cyl(3.2, 4, { x, z, tone: "lo" })));
own("bench", track([[[STATIONS[0] - 4, TRACK_Z], [GATE.x, TRACK_Z]], ...STATIONS.map((x) => [[x, PORT_Z], [x, TRACK_Z]])]));
label("bench", "node-1 · kubelet", { anchor: V(-110, 16, 26) });

const st = STATIONS.map((cx, i) => {
  const id = part("pod-" + i, { kind: "Pod", title: NAMES[i], zoom: 2.8, anchor: V(cx, TOP + CR.h + 10, CRATE_Z),
    desc: () => podDesc(i), yaml: `livenessProbe:  { httpGet: { path: /healthz, port: 8080 }, periodSeconds: 10, failureThreshold: 3 }\nreadinessProbe: { httpGet: { path: /ready,   port: 8080 }, periodSeconds: 10, failureThreshold: 3 }\nstartupProbe:   { httpGet: { path: /healthz, port: 8080 }, periodSeconds: 10, failureThreshold: 10 }`,
    actions: () => [
      { label: "Hang it (liveness fails)", danger: true, run: () => hang(i) },
      { label: "Overload it (readiness fails)", run: () => overload(i) },
      { label: "Restart with a 6 s start", run: () => slowRestart(i) },
    ] });
  const g = crate({ w: CR.w, h: CR.h, d: CR.d });
  g.position.set(cx, TOP, CRATE_Z);
  const ready = lamp(8, CR.h, -2, { r: 1.6 });
  g.add(ready.mesh);
  own(id, g, box(6, 4.2, 1.8, { x: cx, y0: 4.8, z: 20.9, r: 0.3 }));
  label(id, NAMES[i]);
  // the probe tower and arm, with three plungers
  const tid = part("probes-" + i, { kind: "Probes", title: "Probes for " + NAMES[i], zoom: 3.2, anchor: V(cx + 4, ARM_Y + 10, TOWER.z),
    desc: () => `Three plungers tap the pod once per period: <b>S</b>tartup, <b>L</b>iveness, <b>R</b>eadiness. A result lamp shows pass (light) or fail (red). The tower counts consecutive failures: liveness ${pods[i].fails.L}/3, readiness ${pods[i].fails.R}/3` + (spec.startup && !pods[i].started ? `, startup ${pods[i].fails.S}/10.` : "."),
    yaml: "" });
  own(tid, box(10, ARM_Y - TOP, 10, { x: cx + TOWER.dx, y0: TOP, z: TOWER.z, r: 1 }), box(38, 4, 7, { x: cx + 8, y0: ARM_Y, z: PROBE_Z, r: 0.8 }));
  const rods = PROBE_DX.map((dx) => { const r = new THREE.Group(); r.add(cyl(0.9, ARM_Y - (TOP + CR.h + REST) - 1, { x: 0, y0: 1, z: 0, tone: "mid", seg: 12 }), cyl(1.7, 1, { y0: 0, tone: "hi", seg: 16 })); r.position.set(cx + dx, TOP + CR.h + REST, PROBE_Z); own(tid, r); return r; });
  const res = PROBE_DX.map((dx) => { const l = lamp(cx + dx, ARM_Y + 4, PROBE_Z, { r: 1.2, state: "off" }); own(tid, l.mesh); return l; });
  const pips = { L: [0, 1, 2].map((n) => { const l = lamp(cx + TOWER.dx + 5.1, 0, TOWER.z - 3 + n * 3, { r: 0.9, state: "off" }); l.mesh.rotation.z = Math.PI / 2; l.mesh.position.y = ARM_Y - 12; own(tid, l.mesh); return l; }),
                 R: [0, 1, 2].map((n) => { const l = lamp(cx + TOWER.dx + 5.1, 0, TOWER.z - 3 + n * 3, { r: 0.9, state: "off" }); l.mesh.rotation.z = Math.PI / 2; l.mesh.position.y = ARM_Y - 18; own(tid, l.mesh); return l; }) };
  const sbarMat = new THREE.MeshBasicMaterial();
  S.onTheme((p) => sbarMat.color.set(p.bad));
  const sbar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2, 1), sbarMat);
  sbar.position.set(cx + TOWER.dx + 5.2, ARM_Y - 6, TOWER.z - 4);
  own(tid, sbar);
  S.label(tid, "S L R", { small: true, anchor: V(cx + 1, ARM_Y + 8, PROBE_Z), lod: 1.6 });
  return { g, ready, rods, res, pips, sbar };
});

part("service", { kind: "Service", title: "svc/web", zoom: 2.6, anchor: V(GATE.x - 6, GATE.h + 6, GATE.z), desc: () => `Sends requests only to Ready pods: <b>${pods.filter((p) => p.ready).length} of 3</b> now. A pod whose readiness probe fails drops out of this list but is not restarted.`, yaml: "kubectl get endpoints web" });
own("service", housing({ x: GATE.x, z: GATE.z, w: GATE.w, d: GATE.d, h: GATE.h }));
const eps = [0, 1, 2].map((n) => { const l = lamp(GATE.x - 6 + n * 4, GATE.h, GATE.z - 5, { r: 1.2 }); own("service", l.mesh); return l; });
label("service", "svc/web");

// ---- model: what the kubelet does, one probe per period ----
const PERIOD = 1, LIVE_FAIL = 3, READY_FAIL = 3, STARTUP_FAIL = 10, LIVE_DELAY = 1;
const NORMAL_START = 1.5, SLOW_START = 6, OVERLOAD_FOR = 7, KILL_FOR = 0.8;
const spec = { startup: true };
const pods = STATIONS.map((_, i) => ({ i, appUp: true, startIn: 0, slow: false, hung: false, busyUntil: 0, phase: "running", phaseT: 0, restarts: 0, lastRestart: -99, backoff: 0, started: true, ready: true, fails: { S: 0, L: 0, R: 0 }, clock: i / 3, since: 9, tap: [0, 0, 0], flash: [null, null, null] }));
let now = 0;
function startContainer(p) { Object.assign(p, { phase: "running", phaseT: 0, since: 0, appUp: false, startIn: p.slow ? SLOW_START : NORMAL_START, hung: false, busyUntil: 0, started: !spec.startup, ready: false, fails: { S: 0, L: 0, R: 0 } }); }
function kill(p) { p.restarts++; p.backoff = now - p.lastRestart < 12 ? Math.min(8, Math.max(2, p.backoff * 2 || 2)) : 0; p.lastRestart = now; Object.assign(p, { phase: "killed", phaseT: 0, appUp: false, ready: false, started: false }); }
function probe(p, n, pass) { const name = ["S", "L", "R"][n]; p.tap[n] = 1; p.flash[n] = { pass, t: 0 }; if (pass) p.fails[name] = 0; else p.fails[name]++; }
function runProbes(p) {
  const healthy = p.appUp && !p.hung;
  if (spec.startup && !p.started) { probe(p, 0, p.appUp); if (p.appUp) p.started = true; else if (p.fails.S >= STARTUP_FAIL) kill(p); return; }
  if (p.since >= LIVE_DELAY) { probe(p, 1, healthy); if (p.fails.L >= LIVE_FAIL) { kill(p); return; } }
  const ok = healthy && now >= p.busyUntil;
  probe(p, 2, ok);
  if (ok) p.ready = true; else if (p.fails.R >= READY_FAIL) p.ready = false;
}
function stepModel(dt) {
  now += dt;
  for (const p of pods) {
    p.tap = p.tap.map((t) => Math.max(0, t - dt * 5));
    p.flash.forEach((f) => { if (f) f.t += dt; });
    p.phaseT += dt;
    if (p.phase === "killed") { if (p.phaseT >= KILL_FOR) { p.phase = "backoff"; p.phaseT = 0; } continue; }
    if (p.phase === "backoff") { if (p.phaseT >= p.backoff) startContainer(p); continue; }
    p.since += dt;
    if (!p.appUp) { p.startIn -= dt; if (p.startIn <= 0) p.appUp = true; }
    p.clock += dt;
    if (p.clock >= PERIOD) { p.clock -= PERIOD; runProbes(p); }
  }
}
function hang(i) { const p = pods[i]; if (p.phase === "running" && p.appUp) p.hung = true; }
function overload(i) { const p = pods[i]; if (p.phase === "running" && p.appUp) p.busyUntil = now + OVERLOAD_FOR; }
function slowRestart(i) { const p = pods[i]; p.slow = true; kill(p); p.restarts = 0; p.lastRestart = -99; p.backoff = 0; }
const stateLabel = (p) => p.phase === "killed" ? "killed by kubelet" : p.phase === "backoff" ? (p.backoff ? `CrashLoopBackOff (${Math.ceil(p.backoff - p.phaseT)}s)` : "restarting") : !p.appUp ? (spec.startup && !p.started ? "starting · startup probe waiting" : "starting") : p.hung ? "hung · liveness failing" : now < p.busyUntil ? (p.ready ? "overloaded · readiness failing" : "overloaded · out of Service") : p.ready ? "Ready" : "running · not ready yet";
function podDesc(i) { const p = pods[i]; return `<b>${stateLabel(p)}</b>. Restarts: ${p.restarts}. ` + (p.slow ? "This app takes 6 seconds to start. " : "") + "Use the buttons to break it in different ways."; }

const net = S.packets({ speed: 120, onArrive: (d) => { flash[d.i] = 0.2; } });
const flash = [0, 0, 0];
let spawnIn = 0, rr = 0;
S.onTick((dt) => {
  stepModel(dt);
  spawnIn -= dt;
  const ready = pods.filter((p) => p.ready).map((p) => p.i);
  if (!reduced() && ready.length && spawnIn <= 0) { spawnIn = 0.4; const i = ready[rr++ % ready.length]; net.add([V(GATE.x, 1.9, TRACK_Z), V(STATIONS[i], 1.9, TRACK_Z), V(STATIONS[i], 1.9, PORT_Z)], { i, hide: (q) => q.x > GATE.x - GATE.w / 2 }); }
  net.step(dt);
  pods.forEach((p, i) => {
    const s = st[i];
    s.rods.forEach((r, n) => { r.position.y = TOP + CR.h + REST * (1 - p.tap[n]) + 0.05; const f = p.flash[n]; s.res[n].set(f && f.t < 0.45 ? (f.pass ? "on" : "bad") : "off"); });
    s.pips.L.forEach((l, n) => l.set(p.fails.L > n ? "bad" : "off"));
    s.pips.R.forEach((l, n) => l.set(p.fails.R > n ? "bad" : "off"));
    const sf = spec.startup && !p.started && p.phase === "running" ? p.fails.S / STARTUP_FAIL : 0;
    s.sbar.visible = sf > 0; s.sbar.scale.z = Math.max(0.01, sf * 8); s.sbar.position.z = TOWER.z - 4 + sf * 4;
    flash[i] = Math.max(0, flash[i] - dt);
    s.ready.set(p.ready ? (flash[i] > 0 ? "accent" : "on") : "off");
    const gone = p.phase !== "running";
    s.g.visible = !(p.phase === "killed" && p.phaseT > 0.4) && p.phase !== "backoff";
    s.g.scale.y = !p.appUp && !gone ? 0.6 + 0.4 * Math.min(1, p.since / 0.5) : 1;
    s.g.position.x = STATIONS[i] + (p.hung ? Math.sin(now * 30) * 0.3 : 0);
    S.setLabel("pod-" + i, NAMES[i] + " · " + (p.ready ? "Ready" : gone ? "restarting" : "not ready") + (p.restarts ? " · ↻" + p.restarts : ""), { bad: !p.ready });
    eps[i].set(p.ready ? "on" : "off");
  });
  const r = pods.filter((p) => p.ready).length, rs = pods.reduce((s, p) => s + p.restarts, 0);
  S.say(`${r}/3 ready · ${rs} restart${rs === 1 ? "" : "s"}`);
  syncTable();
});

S.overview = () => `<h2>The kubelet's probes</h2><p class="muted">Each pod is tapped by three probes. Break one with the buttons below, or click a pod or its probe arm.</p>`;
const rows = [0, 1, 2].map((i) => document.getElementById("pb-row-" + i));
const startupBtn = document.getElementById("pb-startup");
function syncTable() {
  pods.forEach((p, i) => {
    const cells = [stateLabel(p), spec.startup ? (p.started ? "passed" : p.fails.S + "/10") : "off", p.fails.L + "/3", p.fails.R + "/3", String(p.restarts)];
    cells.forEach((v, c) => { const td = rows[i].children[c + 1]; if (td.textContent !== v) td.textContent = v; });
    rows[i].children[1].dataset.tone = p.ready && !p.hung && now >= p.busyUntil ? "good" : "bad";
  });
  const t = "startupProbe: " + (spec.startup ? "on" : "off");
  if (startupBtn.textContent !== t) { startupBtn.textContent = t; startupBtn.setAttribute("aria-pressed", String(spec.startup)); }
}
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => {
  S.stopTour();
  const a = b.dataset.do;
  if (a === "busy") overload(1); if (a === "hang") hang(0); if (a === "slow") slowRestart(2); if (a === "startup") spec.startup = !spec.startup;
  S.renderPanel();
}));

// ---- what the inspector shows ----
const ipOf = (i) => `10.244.1.${20 + i}`;
const phaseOf = (p) => (p.phase === "running" ? "Running" : "Running");
const stateOf = (p) => p.phase === "killed" ? `terminated: { reason: Error, exitCode: 137 }   # ← killed by the kubelet after liveness failed` : p.phase === "backoff" ? `waiting: { reason: CrashLoopBackOff }   # ← back-off ${Math.ceil(p.backoff)}s before the next start` : !p.appUp ? `running: {}   # ← started, app not answering yet` : `running: { startedAt: "2026-10-13T16:2${p.i}:00Z" }`;
pods.forEach((p, i) => {
  Object.assign(S.PARTS["pod-" + i], {
    manifest: () => K.pod({ name: NAMES[i], labels: { app: "web" }, node: "node-1", ip: ipOf(i), ready: p.ready, restarts: p.restarts, probes: true, owner: { kind: "ReplicaSet", name: "web-5d8c" }, state: stateOf(p) }) + (spec.startup ? "" : "\n# (startupProbe removed from this pod's spec right now)"),
    facts: () => [["State", stateLabel(p)], ["Ready", p.ready ? "yes · in Service" : "no · out of Service"], ["Restarts", p.restarts], ["Liveness fails", `${p.fails.L} / 3`], ["Readiness fails", `${p.fails.R} / 3`]],
  });
  Object.assign(S.PARTS["probes-" + i], {
    manifest: () => `# the probe section of ${NAMES[i]}'s container spec\n` + (spec.startup ? `startupProbe:     # ← runs first; the others wait until it passes\n  httpGet: { path: /healthz, port: 8080 }\n  periodSeconds: 10\n  failureThreshold: 10   # ← up to 100 s to start\n` : "# startupProbe: (none)   ← so liveness starts right after initialDelaySeconds\n") + `livenessProbe:    # ← "is it stuck?" — failing restarts the container\n  httpGet: { path: /healthz, port: 8080 }\n  initialDelaySeconds: 10\n  periodSeconds: 10\n  failureThreshold: 3    # ← now ${p.fails.L}/3\nreadinessProbe:   # ← "can it take traffic?" — failing removes it from the Service\n  httpGet: { path: /ready, port: 8080 }\n  periodSeconds: 10\n  failureThreshold: 3    # ← now ${p.fails.R}/3`,
    kubectl: `kubectl describe pod ${NAMES[i]}   # Liveness:/Readiness: lines, and probe failures under Events\nkubectl get pod ${NAMES[i]} -w`,
    facts: () => [["Startup", spec.startup ? (p.started ? "passed" : `${p.fails.S}/10 failures`) : "not configured"], ["Liveness", `${p.fails.L}/3 failures`], ["Readiness", `${p.fails.R}/3 failures`]],
  });
});
Object.assign(S.PARTS.service, { manifest: () => K.service({ name: "web", endpoints: pods.filter((p) => p.ready).map((p) => ipOf(p.i) + ":8080") }), facts: () => [["Endpoints", pods.filter((p) => p.ready).map((p) => NAMES[p.i]).join(", ") || "none"]] });
Object.assign(S.PARTS.bench, { manifest: K.kubeletConfig(), facts: () => [["Pods", 3], ["Restarts so far", pods.reduce((a, p) => a + p.restarts, 0)]] });

S.setTour([
  { home: true, say: "Three pods on one node. Above each, the kubelet's probes tap it once per period: Startup, Liveness, Readiness.", hold: 6 },
  { focus: "probes-1", zoom: 3, say: "Each tap lights a result lamp. Failures are counted on the tower; three in a row is the default threshold.", hold: 6 },
  { focus: "pod-1", zoom: 2.4, say: "web-2 is overloaded: its readiness probe fails. After three failures it leaves the Service, but nothing restarts it.", run: () => overload(1), hold: 8 },
  { focus: "service", zoom: 2.4, say: "The Service now sends traffic only to the other two. When web-2 recovers, it rejoins.", hold: 5 },
  { focus: "pod-0", zoom: 2.4, say: "web-1 hangs: liveness fails three times, so the kubelet kills the container and restarts it.", run: () => hang(0), hold: 7 },
  { focus: "pod-2", zoom: 2.4, say: "Now the trap. web-3 needs 6 seconds to start, and the startup probe is turned off...", run: () => { spec.startup = false; slowRestart(2); }, hold: 6 },
  { focus: "pod-2", zoom: 2.4, say: "...so liveness kills it before it can finish starting, again and again, waiting longer each time: CrashLoopBackOff.", hold: 9 },
  { focus: "probes-2", zoom: 3, say: "Turn the startup probe on: liveness and readiness now wait until the app answers.", run: () => { spec.startup = true; }, hold: 11 },
  { home: true, say: "Readiness controls traffic, liveness controls restarts, and a startup probe protects slow starters.", run: () => { pods[2].slow = false; }, hold: 6 },
]);
S.start();
