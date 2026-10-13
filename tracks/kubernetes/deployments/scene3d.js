// Lesson 05 in 3D: a rolling update in the container yard.
const S = createStage({ home: { target: [0, 34, 12], dir: [1, 0.95, 1.05], zoom: 1 }, viewH: 330 });
const { box, cyl, lamp, crate, tray, housing, track, part, own, label } = S;

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
const GAUGE = { y0: DESK.h + 2, step: 5.2, posts: [{ x: 132, z: -10 }, { x: 146, z: -10 }] };
const gy = (n) => GAUGE.y0 + n * GAUGE.step;

part("cluster", { kind: "Cluster", title: "The yard", noFrame: true, zoom: 1, anchor: V(0, 40, 12), desc: "One cluster with three nodes. A Deployment named web runs 6 replicas; each pod's tag shows the image version it runs.", yaml: "kubectl rollout status deploy/web" });
own("cluster", S.plate({ x: 0, z: 14, w: 330, d: 190 }), ...RAIL_Z.map((z) => box(276, 3, 5, { x: -18, z })), ...RAIL_Z.flatMap((z) => [-158, 122].map((x) => box(5, 8, 10, { x, z, r: 0.8 }))));
part("registry", { kind: "Image registry", title: "Registry hopper", anchor: V(HOP.x, BOX_H + 18, HOP.z), desc: () => `New crates come out stamped with the current template's image: <b>web:v${state.tmpl}</b>.`, yaml: () => `image: ghcr.io/acme/web:v${state.tmpl}` });
own("registry", housing({ x: HOP.x, z: HOP.z, w: 30, d: 38, h: BOX_H, plinth: false }));
part("bin", { kind: "Old ReplicaSet's pods", title: "Reclaim bin", anchor: V(BIN.x, BOX_H + 8, BIN.z), desc: "Old-version pods end here as the old ReplicaSet scales down. The ReplicaSet itself stays (with 0 replicas), which is what makes rollback possible.", yaml: "kubectl get rs -l app=web" });
own("bin", housing({ x: BIN.x, z: BIN.z, w: 30, d: 38, h: BOX_H, plinth: false }));
label("registry", "registry"); label("bin", "old pods");

NODES.forEach((cx, n) => {
  const id = part("node-" + n, { kind: "Node", title: "node-" + (n + 1), zoom: 2.3, anchor: V(cx, TOP + 2, 46), desc: "A worker node with room for four pods. During a rollout old and new pods share the nodes.", yaml: `kubectl get pods -o wide --field-selector spec.nodeName=node-${n + 1}` });
  own(id, tray({ x: cx, z: 0, w: 60, d: 84, top: TOP, slots: SLOT_DX.flatMap((dx) => SLOT_DZ.map((dz) => [cx + dx, dz])) }), ...[-18, 0, 18].map((dx) => box(5.2, 4.2, 1.8, { x: cx + dx, y0: 5.2, z: 42.9, r: 0.3 })));
  label(id, "node-" + (n + 1));
});

// control plane with the rollout gauge: two posts, a ceiling stop and a floor stop
part("control", { kind: "Deployment controller", title: "Deployment web", zoom: 2.6, anchor: V(DESK.x, DESK.h + 22, DESK.z),
  desc: () => `Replicas <b>${state.R}</b>, template <b>v${state.tmpl}</b>. During a rollout the controller keeps total pods at most replicas + maxSurge (<b>${state.R + state.S}</b>) and ready pods at least replicas − maxUnavailable (<b>${state.R - state.U}</b>).`,
  yaml: () => `kind: Deployment\nspec:\n  replicas: ${state.R}\n  strategy:\n    rollingUpdate: { maxSurge: ${state.S}, maxUnavailable: ${state.U} }\n  template:\n    spec: { containers: [{ name: web, image: web:v${state.tmpl} }] }`,
  actions: () => [{ label: `Release v${state.nextVer}`, run: () => release(false) }, { label: `Release v${state.nextVer} (broken)`, danger: true, run: () => release(true) }, ...(state.history.length > 1 ? [{ label: `Roll back to v${state.history[state.history.length - 2]}`, run: undo }] : [])],
});
own("control", housing({ x: DESK.x, z: DESK.z, w: DESK.w, d: DESK.d, h: DESK.h }), ...[-20, 0, 20].map((dz) => box(1, 17, 17, { x: DESK.x + DESK.w / 2 + 0.5, y0: 7, z: dz, r: 0.3 })));
part("gauge", { kind: "Rollout gauge", title: "Rollout gauge", zoom: 3.2, anchor: V(139, gy(10) + 6, -10),
  desc: () => `Left post: <b>total pods</b> (${counts().total}); it cannot rise past the ceiling stop at replicas + maxSurge = ${state.R + state.S}. Right post: <b>ready pods</b> (${counts().ready}); it cannot fall below the floor stop at replicas − maxUnavailable = ${state.R - state.U}.`,
  actions: () => [{ label: "maxSurge −", run: () => setBounds(state.S - 1, state.U) }, { label: "maxSurge +", run: () => setBounds(state.S + 1, state.U) }, { label: "maxUnavailable −", run: () => setBounds(state.S, state.U - 1) }, { label: "maxUnavailable +", run: () => setBounds(state.S, state.U + 1) }] });
const posts = GAUGE.posts.map((p) => box(3, gy(10) - DESK.h + 2, 3, { x: p.x, y0: DESK.h, z: p.z, tone: "lo", r: 0.5 }));
const ticks = S.lines(GAUGE.posts.flatMap((p) => Array.from({ length: 11 }, (_, n) => [V(p.x + 1.5, gy(n), p.z - (n % 5 ? 1.5 : 3)), V(p.x + 1.5, gy(n), p.z + (n % 5 ? 1.5 : 3))])), "edgeMid");
const ceil = box(8, 1.6, 8, { x: GAUGE.posts[0].x, z: GAUGE.posts[0].z, tone: "mid", r: 0.4 });
const floor = box(8, 1.6, 8, { x: GAUGE.posts[1].x, z: GAUGE.posts[1].z, tone: "mid", r: 0.4 });
const litMat = new THREE.MeshBasicMaterial();
S.onTheme((p) => litMat.color.set(p.lit));
const sTotal = box(6, 2.4, 6, { x: GAUGE.posts[0].x, z: GAUGE.posts[0].z, tone: "hi", r: 0.6, mat: litMat });
const sReady = box(6, 2.4, 6, { x: GAUGE.posts[1].x, z: GAUGE.posts[1].z, tone: "hi", r: 0.6, mat: litMat });
const replicasBar = box(24, 0.5, 1, { x: 139, z: -10, tone: "hi", r: 0 });
own("gauge", ...posts, ceil, floor, sTotal, sReady, replicasBar);
S.world.add(ticks);
label("gauge", "rollout gauge");
label("control", "deployment/web", { anchor: V(DESK.x, DESK.h + 4, 24) });
S.label("gauge", "pods", { small: true, anchor: V(GAUGE.posts[0].x, gy(10) + 3, GAUGE.posts[0].z), lod: 1.8 });

part("service", { kind: "Service", title: "svc/web", zoom: 2.6, anchor: V(GATE.x - 8, GATE.h + 4, GATE.z + 4), desc: () => `Sends requests only to <b>ready</b> pods, old or new: ${counts().ready} now. That is why a rollout causes no downtime.`, yaml: "kubectl get endpoints web" });
own("service", housing({ x: GATE.x, z: GATE.z, w: GATE.w, d: GATE.d, h: GATE.h }));
const epLamps = Array.from({ length: 12 }, (_, i) => { const l = lamp(GATE.x - 8 + (i % 6) * 3.2, GATE.h, GATE.z - 6 + Math.floor(i / 6) * 3.4, { r: 1 }); own("service", l.mesh); return l; });
part("ingress", { kind: "Ingress", title: "Ingress", zoom: 2.6, anchor: V(ING.x + 6, ING.h + 20, ING.z - 6), desc: "Outside traffic keeps flowing all through the rollout.", yaml: "" });
own("ingress", housing({ x: ING.x, z: ING.z, w: ING.w, d: ING.d, h: ING.h }));
own("cluster", track([[[-62, TRACK_Z], [143, TRACK_Z]], ...NODES.map((cx) => [[cx, PORT_Z], [cx, TRACK_Z]])]));
label("service", "svc/web"); label("ingress", "ingress");

part("crane", { kind: "Controller at work", title: "Crane (scheduler)", zoom: 1.5, anchor: () => V(crane.gx, GIRDER_Y + 16, 0), desc: "Carries out the Deployment controller's decisions one at a time: a new-version pod from the hopper, or an old pod to the bin.", yaml: "" });
const gantry = new THREE.Group();
for (const z of RAIL_Z) { gantry.add(box(34, 7, 9, { y0: 4, z, r: 1.2 })); for (const x of [-11, 11]) gantry.add(box(4.4, LEG_TOP - 11, 4.4, { x, y0: 11, z })); gantry.add(box(32, 7, 8, { y0: LEG_TOP, z, r: 0.8 })); }
for (const x of [-6.5, 6.5]) gantry.add(box(5, 8, 128, { x, y0: GIRDER_Y }));
const trolley = new THREE.Group();
trolley.add(box(20, 7, 18, { y0: GIRDER_Y + 8, r: 1.2 }));
const hook = new THREE.Group();
hook.add(box(24, 3, 34), box(8, 5, 10, { y0: 3, r: 0.8 }));
const cargo = crate({ lit: true });
cargo.position.y = -POD.h;
hook.add(cargo);
own("crane", gantry, trolley, hook);
const cableGeo = new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(0, 0, 0), V(0, 0, 0), V(0, 0, 0)]);
S.world.add(new THREE.LineSegments(cableGeo, S.M.edgeMid));
const cargoTag = S.label("crane", "", { small: true, anchor: V(0, 0, 0) });

const pods = SLOTS.map((s, i) => {
  const id = part("pod-" + i, { kind: "Pod", dynamic: true, zoom: 3.4, anchor: V(s.x, TOP + POD.h + 8, s.z),
    title: () => { const v = state.slot[i]; return v && !v.res ? `pod (v${v.ver})` : "empty slot"; },
    desc: () => { const v = state.slot[i]; if (!v || v.res) return "No pod here right now."; return { ready: "Running and Ready: its readiness probe passes, so it is in the Service's endpoints.", starting: "Starting: it counts toward total pods but not toward ready ones until its readiness probe passes.", crash: `Crash-looping: image v${v.ver} is broken, so this pod never becomes Ready (restarts: ${v.restarts}).`, terminating: "Terminating: removed from the Service's endpoints at once, then deleted." }[v.phase]; } });
  const g = crate();
  g.position.set(s.x, TOP, s.z);
  const l = lamp(6, POD.h, -11, { r: 1.5 });
  g.add(l.mesh);
  own(id, g);
  g.visible = false;
  label(id, "", { small: true });
  return { g, l, id };
});
const fresh = crate();
fresh.position.set(HOP.x, BOX_H, HOP.z);
own("registry", fresh);

// ---- the rollout model (same rules as the 2D lesson) ----
const READY_AFTER = 1.4, CRASH_AFTER = 1.1, BACKOFF = 2.4, DEADLINE = 10;
const state = { R: 6, S: 2, U: 1, tmpl: 1, history: [1], nextVer: 2, broken: new Set(), slot: SLOTS.map(() => null), seq: 0, since: 0 };
const isPod = (v) => v && !v.res;
const live = () => state.slot.map((v, i) => (isPod(v) && v.phase !== "terminating" ? { ...v, i } : null)).filter(Boolean);
function counts() {
  const l = live(), res = state.slot.filter((v) => v && v.res), cur = state.tmpl;
  return { total: l.length + res.length, ready: l.filter((p) => p.phase === "ready").length, fresh: l.filter((p) => p.ver === cur).length + res.filter((r) => r.ver === cur).length, freshReady: l.filter((p) => p.ver === cur && p.phase === "ready").length, old: l.filter((p) => p.ver !== cur) };
}
const done = () => { const c = counts(); return !c.old.length && c.freshReady === state.R && c.total === state.R; };
[0, 4, 8, 1, 5, 9].forEach((i) => { state.slot[i] = { id: ++state.seq, ver: 1, phase: "ready", t: 9, restarts: 0 }; });
function freeSlot() {
  let best = -1, load = 99;
  NODES.forEach((_, n) => { const mine = SLOTS.map((s, i) => i).filter((i) => SLOTS[i].node === n); const used = mine.filter((i) => state.slot[i]).length; const open = mine.find((i) => !state.slot[i]); if (open !== undefined && used < load) { load = used; best = open; } });
  return best;
}
function decide() {
  const c = counts(), R = state.R, cur = state.tmpl;
  if (c.fresh < R && c.total < R + state.S) { const s = freeSlot(); if (s >= 0) return { kind: "create", slot: s, ver: cur }; }
  if (c.old.length) {
    const unready = c.old.filter((p) => p.phase !== "ready").sort((a, b) => b.id - a.id)[0];
    if (unready) return { kind: "delete", slot: unready.i };
    if (c.ready - 1 >= R - state.U) return { kind: "delete", slot: c.old.sort((a, b) => a.id - b.id)[0].i };
  }
  if (c.fresh > R) { const extra = live().filter((p) => p.ver === cur).sort((a, b) => (a.phase === "ready") - (b.phase === "ready") || b.id - a.id)[0]; if (extra) return { kind: "delete", slot: extra.i }; }
  return null;
}
const crane = { gx: 14, tz: 0, hy: TRAVEL, vx: 0, vz: 0, vy: 0, holding: false, ver: 1 };
const want = { gx: 14, tz: 0, hy: TRAVEL };
let plan = [], job = null, wait = 0, freshY = 0;
function schedule() {
  if (job) return;
  const d = decide();
  if (!d) return;
  job = d;
  if (d.kind === "create") { state.slot[d.slot] = { res: true, ver: d.ver }; crane.ver = d.ver; plan = [{ go: [HOP.x, HOP.z] }, { y: BOX_H }, { act: "grab" }, { y: TRAVEL }, { go: "slot" }, { y: TOP }, { act: "place" }, { y: TRAVEL }]; }
  else { const p = state.slot[d.slot]; p.phase = "terminating"; crane.ver = p.ver; plan = [{ go: "slot" }, { y: TOP }, { act: "lift" }, { y: TRAVEL }, { go: [BIN.x, BIN.z] }, { y: BOX_H }, { act: "drop" }, { y: TRAVEL }]; }
}
function act(name) {
  const s = job.slot;
  if (name === "grab") { crane.holding = true; freshY = -POD.h; }
  if (name === "place") { crane.holding = false; state.slot[s] = { id: ++state.seq, ver: job.ver, phase: "starting", t: 0, restarts: 0 }; job = null; }
  if (name === "lift") { state.slot[s] = null; crane.holding = true; state.since = 0; }
  if (name === "drop") { crane.holding = false; job = null; }
}
function stepPlan(dt) {
  if (wait > 0) { wait -= dt; return; }
  if (!plan.length) { schedule(); return; }
  const st = plan[0];
  if (st.go) { const t = st.go === "slot" ? [SLOTS[job.slot].x, SLOTS[job.slot].z] : st.go; want.gx = t[0]; want.tz = t[1]; if (Math.abs(crane.gx - want.gx) < 0.5 && Math.abs(crane.tz - want.tz) < 0.5 && Math.abs(crane.vx) < 3 && Math.abs(crane.vz) < 3) plan.shift(); }
  else if (st.y !== undefined) { want.hy = st.y; if (Math.abs(crane.hy - want.hy) < 0.15 && Math.abs(crane.vy) < 1.5) { plan.shift(); wait = 0.04; } }
  else if (st.act) { plan.shift(); act(st.act); wait = 0.08; }
}
function stepPods(dt) {
  state.slot.forEach((v) => {
    if (!isPod(v) || v.phase === "terminating") return;
    v.t += dt;
    const bad = state.broken.has(v.ver);
    if (v.phase === "starting" && !bad && v.t >= READY_AFTER) { v.phase = "ready"; state.since = 0; }
    else if (v.phase === "starting" && bad && v.t >= CRASH_AFTER) { v.phase = "crash"; v.t = 0; v.restarts++; }
    else if (v.phase === "crash" && v.t >= BACKOFF * Math.min(3, v.restarts)) { v.phase = "starting"; v.t = 0; }
  });
  if (done()) state.since = 0; else state.since += dt;
}
function release(broken) { const ver = state.nextVer++; if (broken) state.broken.add(ver); state.tmpl = ver; state.history.push(ver); state.since = 0; }
function undo() { if (state.history.length < 2) return; state.history.pop(); state.tmpl = state.history[state.history.length - 1]; state.since = 0; }
function setBounds(Sv, Uv) { Sv = Math.max(0, Math.min(3, Sv)); Uv = Math.max(0, Math.min(3, Uv)); if (Sv === 0 && Uv === 0) return; state.S = Sv; state.U = Uv; }

const net = S.packets({ speed: 140, onArrive: (d) => { flash[d.slot] = 0.25; } });
const flash = SLOTS.map(() => 0);
let spawnIn = 0, rr = 0, clock = 0;
const gauge = { total: 6, ready: 6, ceil: 8, floor: 5 };
const inIngress = (p) => Math.abs(p.x - ING.x) < ING.w / 2 && Math.abs(p.z - ING.z) < ING.d / 2;

S.onTick((dt) => {
  clock += dt;
  stepPods(dt);
  stepPlan(dt);
  springTo(crane, "gx", "vx", want.gx, dt, 110); springTo(crane, "tz", "vz", want.tz, dt, 150); springTo(crane, "hy", "vy", want.hy, dt, 260);
  gantry.position.x = crane.gx; trolley.position.set(crane.gx, 0, crane.tz); hook.position.set(crane.gx, crane.hy, crane.tz);
  cargo.visible = crane.holding;
  cargoTag.obj.position.set(crane.gx, crane.hy - POD.h / 2, crane.tz + 18);
  S.setLabel("crane", crane.holding ? "v" + crane.ver : "", { show: crane.holding });
  const top = crane.hy + 8, pos = cableGeo.attributes.position;
  pos.setXYZ(0, crane.gx - 1, top, crane.tz + 3); pos.setXYZ(1, crane.gx - 1, GIRDER_Y, crane.tz + 3); pos.setXYZ(2, crane.gx + 1, top, crane.tz - 3); pos.setXYZ(3, crane.gx + 1, GIRDER_Y, crane.tz - 3);
  pos.needsUpdate = true;
  freshY = Math.min(0, freshY + dt * 22);
  fresh.position.y = BOX_H + freshY;
  fresh.visible = !(crane.holding && job && job.kind === "create" && freshY < -POD.h + 0.5);
  const c = counts();
  spawnIn -= dt;
  const eps = live().filter((p) => p.phase === "ready").map((p) => p.i);
  if (!reduced() && eps.length && spawnIn <= 0) { spawnIn = 0.45; const i = eps[rr++ % eps.length], cx = NODES[SLOTS[i].node]; net.add([V(185, 9, TRACK_Z), V(ING.x, 9, TRACK_Z), V(ING.x, 1.9, TRACK_Z), V(cx, 1.9, TRACK_Z), V(cx, 1.9, PORT_Z)], { slot: i, hide: inIngress }); }
  net.step(dt);
  pods.forEach((p, i) => {
    const v = state.slot[i], on = isPod(v);
    if (on && !p.g.visible) { p.g.visible = true; p.g.scale.set(1, 0.01, 1); }
    if (!on) p.g.visible = false;
    if (p.g.visible) p.g.scale.y = Math.min(1, p.g.scale.y + dt * 4);
    flash[i] = Math.max(0, flash[i] - dt);
    if (on) {
      const ph = v.phase;
      p.l.set(ph === "ready" ? (flash[i] > 0 ? "accent" : "on") : ph === "crash" ? "bad" : ph === "starting" ? (Math.sin(clock * 12) > 0 ? "on" : "off") : "off");
      p.g.position.x = SLOTS[i].x + (ph === "crash" && v.t < 0.35 ? Math.sin(v.t * 60) * 0.8 : 0);
      S.setLabel(p.id, "v" + v.ver + (ph === "crash" ? " ✗" : ph === "terminating" ? " …" : ""), { bad: ph === "crash", show: true });
    } else S.setLabel(p.id, "", { show: false });
  });
  epLamps.forEach((l, i) => l.set(i < c.ready ? "on" : "off"));
  gauge.total = easeTo(gauge.total, c.total, dt, 0.18); gauge.ready = easeTo(gauge.ready, c.ready, dt, 0.18);
  gauge.ceil = easeTo(gauge.ceil, state.R + state.S, dt, 0.2); gauge.floor = easeTo(gauge.floor, state.R - state.U, dt, 0.2);
  sTotal.position.y = gy(gauge.total) + 1.2; sReady.position.y = gy(gauge.ready) + 1.2;
  ceil.position.y = gy(gauge.ceil) + 0.8 + 1.2; floor.position.y = gy(gauge.floor) - 0.8;
  replicasBar.position.y = gy(state.R) + 0.25;
  const stalled = !done() && state.since > DEADLINE;
  S.say(`v${state.tmpl} ${done() ? "rolled out" : stalled ? "stalled" : "rolling out"} · ${c.ready} ready · ${c.total} pods`);
  syncControls(c, stalled);
});

S.overview = () => `<h2>A rolling update</h2><p class="muted">Release a new version and watch the crane swap pods while the gauge keeps the rollout inside its limits. Pick a part to learn more:</p>`;
const ui = { good: document.getElementById("dp-good"), bad: document.getElementById("dp-bad"), undo: document.getElementById("dp-undo"), surge: document.getElementById("dp-surge"), unavail: document.getElementById("dp-unavail"), status: document.getElementById("dp-status") };
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => {
  S.stopTour();
  const a = b.dataset.do;
  if (a === "good") release(false); if (a === "bad") release(true); if (a === "undo") undo();
  if (a === "s-") setBounds(state.S - 1, state.U); if (a === "s+") setBounds(state.S + 1, state.U);
  if (a === "u-") setBounds(state.S, state.U - 1); if (a === "u+") setBounds(state.S, state.U + 1);
  S.renderPanel();
}));
function syncControls(c, stalled) {
  const set = (el, t) => { if (el.textContent !== t) el.textContent = t; };
  set(ui.good, "Release v" + state.nextVer); set(ui.bad, "Release v" + state.nextVer + " (broken)");
  set(ui.undo, state.history.length < 2 ? "Roll back" : "Roll back to v" + state.history[state.history.length - 2]);
  ui.undo.disabled = state.history.length < 2;
  set(ui.surge, "maxSurge " + state.S); set(ui.unavail, "maxUnavailable " + state.U);
  const msg = stalled ? `Progressing=False: ProgressDeadlineExceeded. v${state.tmpl} pods never become Ready, so no more old pods can be removed. The old version keeps serving. Roll back.`
    : done() ? `Rollout complete: ${state.R} of ${state.R} pods run v${state.tmpl}.`
    : `Rolling out v${state.tmpl}: at most ${state.R + state.S} pods, at least ${state.R - state.U} ready.`;
  if (ui.status.textContent !== msg) { ui.status.textContent = msg; ui.status.dataset.tone = stalled ? "bad" : done() ? "good" : ""; }
}

// ---- what the inspector shows ----
const ipOf = (i) => `10.244.${SLOTS[i].node + 1}.${10 + i}`;
const rsName = (v) => "web-" + ["6b7f", "8c2d", "4a9e", "1f7b", "9d3c"][(v - 1) % 5];
Object.assign(S.PARTS.control, { manifest: () => { const c = counts(); return K.deployment({ name: "web", replicas: state.R, image: "web:v" + state.tmpl, ready: c.ready, updated: c.fresh, available: c.ready, surge: state.S, unavailable: state.U, revision: state.history.length }); }, facts: () => { const c = counts(); return [["Template", "web:v" + state.tmpl], ["Pods", `${c.total} (max ${state.R + state.S})`], ["Ready", `${c.ready} (min ${state.R - state.U})`], ["Old pods left", c.old.length]]; }, kubectl: "kubectl rollout status deploy/web\nkubectl rollout history deploy/web\nkubectl rollout undo deploy/web\nkubectl get rs -l app=web" });
Object.assign(S.PARTS.gauge, { manifest: () => `# the two numbers the gauge shows come from the Deployment's strategy:\nspec:\n  replicas: ${state.R}\n  strategy:\n    rollingUpdate:\n      maxSurge: ${state.S}         # ← ceiling: ${state.R} + ${state.S} = ${state.R + state.S} pods at most\n      maxUnavailable: ${state.U}   # ← floor: ${state.R} − ${state.U} = ${state.R - state.U} ready pods at least`, facts: () => { const c = counts(); return [["Total pods", `${c.total} / ceiling ${state.R + state.S}`], ["Ready pods", `${c.ready} / floor ${state.R - state.U}`]]; } });
Object.assign(S.PARTS.registry, { manifest: () => K.replicaset({ name: rsName(state.tmpl), replicas: counts().fresh, ready: counts().freshReady, image: "web:v" + state.tmpl, hash: rsName(state.tmpl).slice(4) }), facts: () => [["New ReplicaSet", rsName(state.tmpl)], ["Image", "web:v" + state.tmpl]] });
Object.assign(S.PARTS.bin, { manifest: () => { const old = [...new Set(counts().old.map((p) => p.ver))][0]; return old ? K.replicaset({ name: rsName(old), replicas: counts().old.length, ready: counts().old.filter((p) => p.phase === "ready").length, image: "web:v" + old, hash: rsName(old).slice(4) }) : `# old ReplicaSets are kept with replicas: 0, which is what makes rollback possible\n$ kubectl get rs -l app=web\n${state.history.map((v, k) => `${rsName(v)}   ${v === state.tmpl ? state.R : 0}   # v${v}`).join("\n")}`; } });
Object.assign(S.PARTS.service, { manifest: () => K.service({ name: "web", endpoints: live().filter((p) => p.phase === "ready").map((p) => ipOf(p.i) + ":8080") }), facts: () => [["Endpoints", counts().ready], ["Versions serving", [...new Set(live().filter((p) => p.phase === "ready").map((p) => "v" + p.ver))].join(", ") || "none"]] });
NODES.forEach((_, n) => Object.assign(S.PARTS["node-" + n], { manifest: () => K.node({ name: `node-${n + 1}`, cidr: `10.244.${n + 1}.0/24` }) }));
pods.forEach((p, i) => Object.assign(S.PARTS[p.id], {
  manifest: () => { const v = state.slot[i]; if (!isPod(v)) return ""; const ph = v.phase; return K.pod({ name: `web-${rsName(v.ver).slice(4)}-${"abcdefghjkmn"[i]}${v.id}`, labels: { app: "web", "pod-template-hash": rsName(v.ver).slice(4) }, image: "web:v" + v.ver, node: `node-${SLOTS[i].node + 1}`, ip: ipOf(i), ready: ph === "ready", restarts: v.restarts, owner: { kind: "ReplicaSet", name: rsName(v.ver) }, probes: true, phase: "Running", state: ph === "crash" ? `waiting: { reason: CrashLoopBackOff }` : ph === "starting" ? `running: {}   # ← started, readiness probe not passed yet` : ph === "terminating" ? `running: {}   # ← deletionTimestamp set: terminating` : undefined }); },
  facts: () => { const v = state.slot[i]; return isPod(v) ? [["Version", "v" + v.ver], ["Phase", { ready: "Ready", starting: "Starting (not ready)", crash: "CrashLoopBackOff", terminating: "Terminating" }[v.phase]], ["Node", `node-${SLOTS[i].node + 1}`], ["Restarts", v.restarts]] : []; },
}));

S.setTour([
  { home: true, say: "Six pods run version 1 of the web app. A Deployment is about to replace them with version 2, without downtime.", hold: 5 },
  { focus: "gauge", zoom: 3, say: "The rollout gauge: total pods may rise to replicas + maxSurge (8, the top stop); ready pods may fall to replicas − maxUnavailable (5, the bottom stop).", hold: 7 },
  { home: true, say: "Release v2. The crane brings new v2 pods first, up to the ceiling, then removes old v1 pods only while enough are ready.", run: () => { if (state.tmpl === 1) release(false); }, hold: 6 },
  { focus: "service", zoom: 2.4, say: "Traffic never stops: the Service sends requests to whichever pods are ready, v1 or v2.", hold: 6 },
  { home: true, say: "Let the rollout finish.", hold: 3, until: () => done() && !job },
  { focus: "gauge", zoom: 3, say: "Now release v3, which is broken. Its pods crash and never become Ready...", run: () => release(true), hold: 10 },
  { home: true, say: "...so the rollout stalls at the floor: old v2 pods keep serving, and the Deployment reports ProgressDeadlineExceeded.", hold: 6, until: () => state.since > DEADLINE },
  { focus: "control", zoom: 2.4, say: "Roll back. The same rules carry the Deployment back to v2.", run: undo, hold: 4, until: () => done() && !job },
  { home: true, say: "kubectl rollout undo did the same thing you just watched.", hold: 6 },
]);
S.start();
