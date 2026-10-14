// Lesson 19 in 3D: delivery. A commit is built by CI, promoted through Git (Kustomize overlays), synced by
// Argo CD into staging and prod, and released in prod by Argo Rollouts: blue-green or canary, with analysis.
const S = createStage({ home: { target: [8, 10, 4], dir: [0.9, 1.1, 1.15], zoom: 1 }, viewH: 285 });
const { box, cyl, lamp, crate, housing, track, part, own, label } = S;

const FY = 1.9, TOP = 11;
const N = {
  dev: { x: -200, z: 92 }, ci: { x: -200, z: 30 }, registry: { x: -200, z: -40 }, git: { x: -110, z: -92 },
  argo: { x: -10, z: -92 }, staging: { x: 90, z: -88 }, prod: { x: 40, z: 40 }, svc: { x: 150, z: 40 }, users: { x: 220, z: 40 },
};
const SETS = { a: { x: 40, z: 12 }, b: { x: 40, z: 74 } };

part("plate", { kind: "Delivery", title: "From a commit to production", noFrame: true, zoom: 1, anchor: V(0, 30, 0),
  desc: "A developer's change is built into an image by CI, written into Git as a new image tag, and pulled into the cluster by Argo CD. Git is the source of truth: the cluster follows it. In prod, Argo Rollouts releases the new version gradually." });
own("plate", S.plate({ x: 6, z: 2, w: 470, d: 270 }));
own("plate", track([[[-200, 92], [-200, -40]], [[-200, -92], [N.git.x, -92]], [[-200, -92], [-200, -40]], [[N.git.x, -92], [N.staging.x, -92]], [[-40, -92], [-40, 40]], [[-40, 40], [N.prod.x - 34, 40]], [[N.prod.x + 34, 40], [N.users.x, 40]]], { width: 4.4 }));

// ---- developer, CI, registry, Git ----
part("dev", { kind: "Developer", title: "A developer", zoom: 2.6, anchor: V(N.dev.x, 22, N.dev.z), desc: "Merges a code change to the app repo. That's the only manual step: everything after it is automation and Git.", actions: () => [{ label: "Merge a change", run: () => commit(false) }, { label: "Merge a broken change", danger: true, run: () => commit(true) }] });
own("dev", housing({ x: N.dev.x, z: N.dev.z, w: 22, d: 16, h: 6 }), box(2, 11, 14, { x: N.dev.x - 9, y0: 6, z: N.dev.z, tone: "hi", r: 0.4 }));
label("dev", "developer");
part("ci", { kind: "CI pipeline", title: "CI: build, test, push", zoom: 2.4, anchor: V(N.ci.x, 22, N.ci.z), desc: "On every merge it builds an image, runs the tests, pushes the image tagged with the version, and opens a commit in the config repo that bumps the staging overlay's tag. It never talks to the cluster: that's Argo CD's job (pull, not push)." });
own("ci", housing({ x: N.ci.x, z: N.ci.z, w: 26, d: 44, h: 8 }));
const ciLamps = [-14, 0, 14].map((dz) => { const l = lamp(N.ci.x + 6, 8, N.ci.z + dz, { r: 1.2, state: "off" }); own("ci", l.mesh); return l; });
["build", "test", "push"].forEach((t, k) => S.label("ci", t, { small: true, anchor: V(N.ci.x - 4, 10, N.ci.z - 14 + k * 14), lod: 1.7 }));
label("ci", "CI");
part("registry", { kind: "Image registry", title: "ECR shop", zoom: 2.6, anchor: V(N.registry.x, 24, N.registry.z), desc: () => `Holds every built image, immutable by tag: ${st.images.map((v) => "shop:" + v).join(", ")}.` });
own("registry", housing({ x: N.registry.x, z: N.registry.z, w: 26, d: 26, h: 14 }));
label("registry", "registry");
part("git", { kind: "Git", title: "Config repo shop-deploy", zoom: 2.2, anchor: V(N.git.x, 26, N.git.z), desc: () => `The source of truth. Kustomize keeps one <b>base</b> and an <b>overlay</b> per environment that only changes what differs: staging runs <b>${st.git.staging}</b>, prod runs <b>${st.git.prod}</b>. Promoting is a commit that copies the tag from staging to prod.`,
  actions: () => [{ label: `Promote ${st.git.staging} to prod`, run: promote }] });
own("git", housing({ x: N.git.x, z: N.git.z, w: 44, d: 30, h: 10 }));
const folders = ["base", "overlays/staging", "overlays/prod"].map((f, k) => { const z = N.git.z - 10 + k * 10; own("git", box(30, 1.4, 7, { x: N.git.x - 2, y0: 10, z, tone: "hi", r: 0.3 })); S.label("git", f, { small: true, anchor: V(N.git.x - 2, 12, z), lod: 1.7 }); return z; });
const gitLamp = lamp(N.git.x + 18, 10, N.git.z + 10, { r: 1.2, state: "off" });
own("git", gitLamp.mesh);
label("git", "Git · shop-deploy");

// ---- Argo CD and the environments ----
part("argo", { kind: "GitOps controller", title: "Argo CD", zoom: 2.4, anchor: V(N.argo.x, 30, N.argo.z), desc: () => `Polls the config repo, renders each overlay with Kustomize, and compares it with the cluster. Different means <b>OutOfSync</b>; with automated sync and selfHeal it applies Git's version, including undoing changes made by hand. shop-staging: <b>${st.argo.staging}</b> · shop-prod: <b>${st.argo.prod}</b>.` });
own("argo", housing({ x: N.argo.x, z: N.argo.z, w: 36, d: 28, h: 18 }));
const argoLamps = { staging: lamp(N.argo.x + 8, 18, N.argo.z - 6, { r: 1.3 }), prod: lamp(N.argo.x + 8, 18, N.argo.z + 6, { r: 1.3 }) };
own("argo", argoLamps.staging.mesh, argoLamps.prod.mesh);
S.label("argo", "Argo CD", { anchor: V(N.argo.x, 22, N.argo.z) });
S.label("argo", "shop-staging", { small: true, anchor: V(N.argo.x + 26, 18, N.argo.z - 6), lod: 1.7 });
S.label("argo", "shop-prod", { small: true, anchor: V(N.argo.x + 26, 18, N.argo.z + 6), lod: 1.7 });
part("staging", { kind: "Namespace", title: "staging", zoom: 2.4, anchor: V(N.staging.x, 26, N.staging.z), desc: () => `A smaller copy of prod for checking a release first. Running <b>${st.live.staging}</b>.` });
own("staging", S.tray({ x: N.staging.x, z: N.staging.z, w: 64, d: 34, top: TOP }));
const stgPods = [-14, 14].map((dx) => { const c = crate({ w: 20, h: 12, d: 18, ribs: 3 }); c.position.set(N.staging.x + dx, TOP, N.staging.z); const l = lamp(N.staging.x + dx + 6, TOP + 12, N.staging.z - 4, { r: 1.2 }); own("staging", c, l.mesh); return l; });
label("staging", "staging");
const setPart = (key) => {
  const at = SETS[key];
  part("set-" + key, { kind: "ReplicaSet", title: () => `ReplicaSet ${key === "a" ? "A" : "B"} · ${R.sets[key].ver || "empty"}`, zoom: 2.4, anchor: V(at.x, 26, at.z),
    desc: () => { const s = R.sets[key]; return s.ver ? `Runs <b>${s.ver}</b> (${s.n} pods). It is the <b>${R.active === key ? (R.strategy === "bluegreen" ? "active (blue)" : "stable") : R.strategy === "bluegreen" ? "preview (green)" : "canary"}</b> side.` : "Empty: the next version will start here."; } });
  own("set-" + key, S.tray({ x: at.x, z: at.z, w: 100, d: 40, top: TOP }));
  const pods = [-32, 0, 32].map((dx) => { const c = crate({ w: 22, h: 12, d: 20, ribs: 3 }); c.position.set(at.x + dx, TOP, at.z); c.visible = false; const l = lamp(at.x + dx + 7, TOP + 12, at.z - 5, { r: 1.2 }); c.add(l.mesh); l.mesh.position.set(7, 12.7, -5); own("set-" + key, c); return { c, l }; });
  label("set-" + key, "");
  return pods;
};
const setPods = { a: setPart("a"), b: setPart("b") };
part("svc", { kind: "Services", title: () => (R.strategy === "bluegreen" ? "Services shop-active / shop-preview" : "Service shop + traffic split"), zoom: 2.4, anchor: V(N.svc.x, 26, N.svc.z),
  desc: () => (R.strategy === "bluegreen" ? `Blue-green: <b>shop-active</b> sends all users to one ReplicaSet; <b>shop-preview</b> points at the new one so it can be tested with no users on it. Promotion flips the active selector in one step; rollback flips it back.` : `Canary: the new version gets a growing share of real traffic, <b>${R.weight}%</b> now, with an analysis of its error rate at each step.`) });
own("svc", housing({ x: N.svc.x, z: N.svc.z, w: 22, d: 74, h: 12 }));
const lever = box(4, 2, 16, { x: N.svc.x, y0: 12, z: N.svc.z, tone: "hi", r: 0.4 });
own("svc", lever);
label("svc", "Service");
part("users", { kind: "Clients", title: "Users", zoom: 2.6, anchor: V(N.users.x, 24, N.users.z), desc: "Real traffic in prod." });
own("users", housing({ x: N.users.x, z: N.users.z, w: 22, d: 26, h: 6 }), box(2, 11, 22, { x: N.users.x - 10, y0: 6, z: N.users.z, tone: "hi", r: 0.4 }));
const userLamp = lamp(N.users.x + 5, 6, N.users.z, { r: 1.5 });
own("users", userLamp.mesh);
label("users", "users");

// ---- the model ----
const st = { ver: 1, broken: new Set(), images: ["v1"], git: { staging: "v1", prod: "v1" }, live: { staging: "v1" }, argo: { staging: "Synced", prod: "Synced" }, drift: 0, clock: 0 };
const R = { strategy: "bluegreen", active: "a", sets: { a: { ver: "v1", n: 3, t: 9 }, b: { ver: null, n: 0, t: 0 } }, phase: "Healthy", weight: 0, step: 0, analysis: null, analysisT: 0, scaleDownIn: 0, message: "" };
const other = (k) => (k === "a" ? "b" : "a");
const newSide = () => other(R.active);
let queue = [], current = null, wait = 0, pending = 0, msg = "";
const P = (x, z) => V(x, FY, z);
function path(a, b) { const A = N[a], B = N[b]; return A.x === B.x || A.z === B.z ? [P(A.x, A.z), P(B.x, B.z)] : [P(A.x, A.z), P(A.x, B.z), P(B.x, B.z)]; }
const net = S.packets({ speed: 240, onArrive: (d) => { if (d.flow) pending--; else trafficArrive(d); } });
const blink = {};
const hop = (a, b, o = {}) => { blink[a] = blink[b] = 0.5; pending++; net.add(path(a, b), { flow: true, ...o }); };
const St = (say, hops, effect, until) => ({ say, hops, effect, until });
const run = (steps) => { queue.push(...steps); };
function stepFlow(dt) {
  if (wait > 0) { wait -= dt; return; }
  if (current && pending <= 0) { if (current.until && !current.until()) return; current.effect?.(); current = null; wait = 0.25; return; }
  if (!current && queue.length) { current = queue.shift(); if (current.say) msg = current.say; for (const [a, b, o] of current.hops) hop(a, b, o); }
}
const busy = () => queue.length > 0 || !!current || R.phase === "Progressing" || R.phase === "Paused";
// Argo CD: notice a Git change (polling), then sync
const argoSync = (env) => [
  St(`Argo CD polls the repo: shop-${env} is OutOfSync (Git says ${st.git[env]}, the cluster runs ${env === "prod" ? R.sets[R.active].ver : st.live.staging}).`, [["git", "argo"]], () => { st.argo[env] = "OutOfSync"; }),
  St(`Argo CD renders overlays/${env} with Kustomize and applies it.`, [["argo", env === "staging" ? "staging" : "prod"]], () => { st.argo[env] = env === "prod" ? "Synced" : "Synced"; if (env === "staging") { st.live.staging = st.git.staging; S.event("Normal", "OperationCompleted", "application/shop-staging", `Sync operation to ${st.git.staging} succeeded`, "argocd-application-controller"); } else startRollout(st.git.prod); }),
];
function commit(broken) {
  if (queue.length || current) { msg = "Wait for the current change to finish."; return; }
  const v = "v" + ++st.ver;
  if (broken) st.broken.add(v);
  run([
    St(`A developer merges ${broken ? "a change with a bug the tests don't catch" : "a change"}. CI starts: build, test, push.`, [["dev", "ci"]], () => { ciT = 1.5; }),
    St(`CI pushes the image shop:${v} to the registry.`, [["ci", "registry"]], () => { st.images.push(v); }),
    St(`CI commits to the config repo: overlays/staging gets newTag: ${v}. Nothing touches the cluster directly.`, [["registry", "git", { alt: true }]], () => { st.git.staging = v; gitT = 0.6; }),
    ...argoSync("staging"),
    St(`Staging runs ${v}. ${broken ? "It starts fine, so the bug slips through to the promotion step." : "Checks pass. Promote it to prod when you're ready."}`, []),
  ]);
}
function promote() {
  if (busy()) { msg = "Wait for the current release to finish."; return; }
  if (st.git.prod === st.git.staging) { msg = `Prod already runs ${st.git.prod}. Merge a change first.`; return; }
  run([St(`A promotion commit copies ${st.git.staging} into overlays/prod (a reviewed pull request in real life).`, [["dev", "git", { alt: true }]], () => { st.git.prod = st.git.staging; gitT = 0.6; }), ...argoSync("prod")]);
}
// ---- Argo Rollouts ----
const STEPS = [20, 50, 100];
function startRollout(v) {
  if (R.sets[R.active].ver === v) return;
  const k = newSide();
  R.sets[k] = { ver: v, n: 0, t: 0 }; R.phase = "Progressing"; R.step = 0; R.analysis = null; R.weight = 0;
  S.event("Normal", "RolloutUpdated", "rollout/shop", `Rollout updated to revision with image shop:${v}`, "rollouts-controller");
  msg = R.strategy === "bluegreen" ? `Blue-green: ${v} starts in the preview ReplicaSet, at full size, with no users on it.` : `Canary: ${v} starts small and gets ${STEPS[0]}% of the traffic.`;
}
function startAnalysis() { R.analysis = "running"; R.analysisT = 0; S.event("Normal", "AnalysisRunRunning", "rollout/shop", "Analysis run shop-success-rate started", "rollouts-controller"); }
function rolloutStep(dt) {
  const k = newSide(), s = R.sets[k];
  for (const key of ["a", "b"]) { const x = R.sets[key]; x.t += dt; }
  if (R.scaleDownIn > 0) { R.scaleDownIn -= dt; if (R.scaleDownIn <= 0) { R.sets[other(R.active)] = { ver: null, n: 0, t: 0 }; } }
  if (R.phase !== "Progressing" || !s.ver) return;
  const want = R.strategy === "bluegreen" ? 3 : Math.max(1, Math.ceil((STEPS[R.step] / 100) * 3));
  if (s.n < want && s.t > 0.7) { s.n++; s.t = 0; }
  if (s.n < want) return;
  if (R.strategy === "canary") R.weight = STEPS[R.step];
  if (!R.analysis) { startAnalysis(); return; }
  if (R.analysis === "running") {
    R.analysisT += dt;
    if (R.analysisT > 3) {
      if (st.broken.has(s.ver)) { R.analysis = "failed"; abort(`Analysis failed: ${s.ver}'s error rate is 14% (limit 5%). Argo Rollouts aborts on its own: ${R.strategy === "bluegreen" ? "the active Service never moved" : "traffic goes back to the stable version"}, and the new pods are scaled away.`); return; }
      R.analysis = "passed";
      if (R.strategy === "bluegreen") { R.phase = "Paused"; msg = `Analysis passed on the preview. The rollout pauses for a human: promote ${s.ver} to flip the active Service.`; }
      else if (R.step < STEPS.length - 1) { R.step++; R.analysis = null; msg = `Analysis passed at ${STEPS[R.step - 1]}%. Next step: ${STEPS[R.step]}%.`; }
      else finish();
    }
  }
}
function finish() {
  const k = newSide();
  R.active = k; R.phase = "Healthy"; R.weight = 0; R.analysis = null; R.scaleDownIn = 3;
  S.event("Normal", "RolloutCompleted", "rollout/shop", `Rollout completed: shop:${R.sets[k].ver} is stable`, "rollouts-controller");
  msg = `${R.sets[k].ver} is live for everyone. The old ReplicaSet is kept briefly (scaleDownDelaySeconds) for an instant rollback, then scaled down.`;
}
function promoteRollout() { if (R.phase !== "Paused") return false; finish(); return true; }
function abort(why) { const k = newSide(); R.phase = "Degraded"; R.weight = 0; R.sets[k] = { ver: null, n: 0, t: 0 }; st.argo.prod = "Synced"; msg = why; S.event("Warning", "RolloutAborted", "rollout/shop", why.split(":")[0], "rollouts-controller"); }
function setStrategy(sx) { if (busy()) { msg = "Change the strategy between releases."; return; } R.strategy = sx; msg = sx === "bluegreen" ? "Blue-green: run the new version at full size beside the old, test it, then switch all traffic at once." : "Canary: shift real traffic step by step (20%, 50%, 100%), checking the error rate at each step."; }
function drift() { if (busy()) return; st.drift = 1; st.argo.prod = "OutOfSync"; msg = "Someone ran kubectl scale rollout shop --replicas=1 in prod. Argo CD sees the cluster differs from Git..."; run([St("", [["argo", "prod"]], () => { st.drift = 0; st.argo.prod = "Synced"; msg = "...and selfHeal puts it back to Git's 3 replicas. To change prod, change Git."; S.event("Normal", "OperationCompleted", "application/shop-prod", "Sync operation to HEAD (self-heal) succeeded", "argocd-application-controller"); })]); }

// ---- traffic in prod ----
let spawnIn = 0, uf = { t: 0, ok: true }, acc = 0, ciT = 0, gitT = 0;
function trafficArrive(d) { if (d.stage === "pod") { const p = setPods[d.key][d.i]; p.f = 0.3; const bad = st.broken.has(R.sets[d.key].ver); uf = { t: 0.35, ok: !bad }; } }
function spawn(dt) {
  if (reduced()) return;
  spawnIn -= dt; if (spawnIn > 0) return; spawnIn = 0.45;
  let key = R.active;
  if (R.strategy === "canary" && R.weight > 0 && R.sets[newSide()].n) { acc += R.weight / 100; if (acc >= 1) { acc -= 1; key = newSide(); } }
  const s = R.sets[key]; if (!s.n) return;
  const i = Math.floor(Math.random() * Math.min(3, s.n)), at = SETS[key];
  net.add([P(N.users.x - 11, N.users.z), P(N.svc.x, N.svc.z), P(N.svc.x - 14, at.z), P(at.x + [-32, 0, 32][i], at.z), P(at.x + [-32, 0, 32][i], at.z + 10)], { stage: "pod", key, i, ring: false });
}
S.onTick((dt) => {
  st.clock += dt;
  stepFlow(dt); rolloutStep(dt); spawn(dt); net.step(dt);
  for (const k in blink) blink[k] = Math.max(0, blink[k] - dt);
  ciT = Math.max(0, ciT - dt); gitT = Math.max(0, gitT - dt);
  ciLamps.forEach((l, k) => l.set(ciT > 0 && ciT < 1.5 - k * 0.4 ? "accent" : blink.ci > 0 ? "on" : "off"));
  gitLamp.set(gitT > 0 ? "accent" : "on");
  for (const env of ["staging", "prod"]) argoLamps[env].set(st.argo[env] === "Synced" ? "good" : (Math.sin(st.clock * 10) > 0 ? "accent" : "off"));
  stgPods.forEach((l) => l.set(st.broken.has(st.live.staging) ? "on" : "on"));
  S.setLabel("staging", `staging · ${st.live.staging}`);
  for (const key of ["a", "b"]) {
    const s = R.sets[key], pods = setPods[key];
    pods.forEach((p, i) => { p.f = Math.max(0, (p.f || 0) - dt); const on = i < (st.drift && key === R.active ? 1 : s.n); p.c.visible = on; if (on) { const bad = st.broken.has(s.ver) && p.f > 0; p.l.set(bad ? "bad" : p.f > 0 ? "accent" : key === R.active ? "on" : "off"); } });
    const role = !s.ver ? "" : key === R.active ? (R.strategy === "bluegreen" ? "active" : "stable") : R.strategy === "bluegreen" ? "preview" : `canary ${R.weight}%`;
    S.setLabel("set-" + key, s.ver ? `${s.ver} · ${role}` : "", { show: !!s.ver, bad: R.phase === "Degraded" && key !== R.active });
  }
  const base = R.active === "a" ? -18 : 18; lever.position.z = N.svc.z + base - 2 * base * (R.strategy === "canary" ? R.weight / 100 : 0); // the lever points at who gets traffic
  uf.t = Math.max(0, uf.t - dt); userLamp.set(uf.t > 0 ? (uf.ok ? "good" : "bad") : "on");
  S.say(`git: staging ${st.git.staging} · prod ${st.git.prod} · rollout ${R.phase}${R.analysis ? " · analysis " + R.analysis : ""}`);
  syncUi();
});

// ---- controls ----
S.overview = () => `<h2>From a commit to production</h2><p class="muted">Merge a change, watch it reach staging through Git and Argo CD, then promote it and release it to prod with blue-green or canary. Pick a part:</p>`;
const ui = { status: document.getElementById("dl-status"), strat: [...document.querySelectorAll("[data-strat]")], prom: document.getElementById("dl-promote") };
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => {
  S.stopTour();
  const a = b.dataset.do;
  if (a === "commit") commit(false); if (a === "bad") commit(true);
  if (a === "promote") { S.shellEcho?.(`git commit -am "promote ${st.git.staging} to prod" && git push`, "button"); promote(); }
  if (a === "rpromote") { S.shellEcho?.("kubectl argo rollouts promote shop -n prod", "button"); promoteRollout(); }
  if (a === "strat") setStrategy(b.dataset.strat);
  if (a === "drift") { S.shellEcho?.("kubectl scale rollout shop --replicas=1 -n prod", "someone, by hand"); drift(); }
  S.renderPanel();
}));
function syncUi() {
  const set = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
  ui.strat.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.strat === R.strategy)));
  ui.prom.disabled = R.phase !== "Paused";
  set(ui.status, msg || "staging and prod both run v1. Merge a change to start.");
  ui.status.dataset.tone = R.phase === "Degraded" || /failed/.test(msg) ? "bad" : R.phase === "Healthy" && /live for everyone/.test(msg) ? "good" : "";
}

// ---- what the inspector shows ----
const kust = (env) => `# overlays/${env}/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: ${env}
resources: [../../base]   # ← everything shared lives in base
images:
- name: shop
  newName: 111122223333.dkr.ecr.us-east-1.amazonaws.com/shop
  newTag: ${st.git[env]}   # ← the only line a promotion changes
${env === "staging" ? "patches:\n- target: { kind: Rollout, name: shop }\n  patch: '[{\"op\": \"replace\", \"path\": \"/spec/replicas\", \"value\": 2}]'   # ← staging is smaller" : ""}`;
Object.assign(S.PARTS.git, { manifest: () => `# git log --oneline -3
${[...Array(Math.min(3, st.ver + 1)).keys()].map((k) => `#   ${["a3f9c1e", "7b2d4e8", "c81f0a2"][k]} ${k === 0 && st.git.prod === st.git.staging && st.ver > 1 ? `promote ${st.git.prod} to prod` : `ci: bump staging to v${Math.max(1, st.ver - k)}`}`).join("\n")}
---
${kust("staging")}
---
${kust("prod")}`,
  fields: (kind) => (kind === "Kustomization" ? { "images[0].newTag": { check: (v) => (!st.images.includes(String(v)) ? `no image shop:${v} in the registry (have ${st.images.join(", ")})` : ""), set: () => {} } } : null),
  applied: (all) => { const v = String(all["images[0].newTag"]), env = all.namespace; if (env === "prod" && v !== st.git.prod) { if (busy()) { msg = "Wait for the current release to finish."; return; } st.git.prod = v; gitT = 0.6; run(argoSync("prod")); } else if (env === "staging" && v !== st.git.staging) { st.git.staging = v; gitT = 0.6; run(argoSync("staging")); } },
  appliedMsg: (c) => (c ? "[main 4e1d2a9] edit kustomization.yaml\n 1 file changed, 1 insertion(+), 1 deletion(-)   # Argo CD will notice on its next poll" : "nothing to commit, working tree clean") });
const appY = (env) => `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: shop-${env}
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/acme/shop-deploy.git
    path: overlays/${env}   # ← Argo CD runs kustomize build on this folder
    targetRevision: main
  destination: { server: https://kubernetes.default.svc, namespace: ${env} }
  syncPolicy:
    automated: { prune: true, selfHeal: true }   # ← apply Git's changes, and undo hand edits
status:
  sync: { status: ${st.argo[env]}, revision: a3f9c1e }
  health: { status: ${env === "prod" ? (R.phase === "Degraded" ? "Degraded" : R.phase === "Healthy" ? "Healthy" : R.phase === "Paused" ? "Suspended" : "Progressing") : "Healthy"} }`;
Object.assign(S.PARTS.argo, { manifest: () => appY("staging") + "\n---\n" + appY("prod") });
const rolloutY = () => `apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: shop
  namespace: prod
spec:
  replicas: 3
  selector: { matchLabels: { app: shop } }
  template:
    metadata: { labels: { app: shop } }
    spec: { containers: [{ name: shop, image: 111122223333.dkr.ecr.us-east-1.amazonaws.com/shop:${st.git.prod} }] }
  strategy:
${R.strategy === "bluegreen" ? `    blueGreen:
      activeService: shop-active   # ← users
      previewService: shop-preview   # ← testers and the analysis
      autoPromotionEnabled: false   # ← a human promotes
      prePromotionAnalysis: { templates: [{ templateName: success-rate }] }
      scaleDownDelaySeconds: 30   # ← keep the old side for an instant rollback` : `    canary:
      steps:
      - setWeight: 20
      - analysis: { templates: [{ templateName: success-rate }] }
      - setWeight: 50
      - analysis: { templates: [{ templateName: success-rate }] }
      - setWeight: 100`}
status:
  phase: ${R.phase}   # ← Healthy · Progressing · Paused · Degraded
  stableRS: ${R.sets[R.active].ver ? "shop-" + R.sets[R.active].ver : '""'}
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
  namespace: prod
spec:
  metrics:
  - name: success-rate
    interval: 30s
    successCondition: result[0] >= 0.95   # ← at least 95% of requests succeed
    failureLimit: 1
    provider:
      prometheus:
        address: http://prometheus.monitoring:9090
        query: sum(rate(http_requests_total{app="shop",code!~"5.."}[1m])) / sum(rate(http_requests_total{app="shop"}[1m]))`;
Object.assign(S.PARTS.svc, { manifest: rolloutY });
Object.assign(S.PARTS["set-a"], { manifest: rolloutY }); Object.assign(S.PARTS["set-b"], { manifest: rolloutY });
Object.assign(S.PARTS.ci, { manifest: `# .github/workflows/release.yaml (excerpt)
on: { push: { branches: [main] } }
jobs:
  release:
    steps:
    - run: docker build -t $ECR/shop:$VERSION .
    - run: make test
    - run: docker push $ECR/shop:$VERSION   # ← immutable tag per version
    - run: |   # ← write the new tag to Git; never kubectl apply from CI
        cd shop-deploy/overlays/staging && kustomize edit set image shop=$ECR/shop:$VERSION
        git commit -am "ci: bump staging to $VERSION" && git push` });

// ---- kubectl and the YAML editor ----
const rolloutsCli = ({ pos }) => {
  const [sub] = pos;
  if (sub === "get") return [`Name:            shop`, `Namespace:       prod`, `Status:          ${R.phase === "Healthy" ? "✔ Healthy" : R.phase === "Paused" ? "॥ Paused" : R.phase === "Degraded" ? "✖ Degraded" : "◌ Progressing"}`, `Strategy:        ${R.strategy === "bluegreen" ? "BlueGreen" : `Canary\n  Step:          ${R.step + 1}/${STEPS.length}\n  SetWeight:     ${R.weight}`}`, `Images:          shop:${R.sets[R.active].ver} (stable${R.strategy === "bluegreen" ? ", active" : ""})${R.sets[newSide()].ver ? `\n                 shop:${R.sets[newSide()].ver} (${R.phase === "Healthy" ? "old, scaling down" : R.strategy === "bluegreen" ? "preview" : "canary"})` : ""}`, `Replicas:        Desired: 3  Current: ${R.sets.a.n + R.sets.b.n}`, ...(R.analysis ? [`AnalysisRun:     shop-success-rate  ${R.analysis === "running" ? "◌ Running" : R.analysis === "passed" ? "✔ Successful" : "✖ Failed"}`] : [])];
  if (sub === "promote") return promoteRollout() ? ['rollout \'shop\' promoted'] : { err: R.phase === "Progressing" ? "error: rollout is still progressing; promote when it pauses" : "error: rollout 'shop' is not paused" };
  if (sub === "abort") { if (R.phase !== "Progressing" && R.phase !== "Paused") return { err: "error: nothing to abort" }; abort("Aborted by hand: traffic stays on the stable version."); return ["rollout 'shop' aborted"]; }
  if (sub === "undo") return { err: "With GitOps, roll back in Git: revert the promotion commit (or edit overlays/prod newTag), and Argo CD rolls the cluster back." };
  return { err: "this lesson simulates: kubectl argo rollouts get|promote|abort rollout shop -n prod" };
};
S.kube({
  ns: "prod",
  help: ["git log --oneline   ·   kubectl edit … is not how prod changes here: edit overlays/prod in the Git panel (Edit)", "argocd app list   ·   argocd app get shop-prod   ·   argocd app diff shop-prod", "kustomize build overlays/prod", "kubectl argo rollouts get rollout shop   ·   … promote shop   ·   … abort shop", "kubectl scale rollout shop --replicas=1   (drift: watch selfHeal undo it)"],
  examples: ["argocd app list", "kustomize build overlays/prod", "kubectl argo rollouts get rollout shop", "kubectl argo rollouts promote shop", "git log --oneline", "kubectl scale rollout shop --replicas=1", "argocd app get shop-prod"],
  objects: () => [{ kind: "Application", name: "shop-staging", ns: "argocd", part: "argo", labels: {}, row: { "SYNC STATUS": st.argo.staging, HEALTH: "Healthy" } }, { kind: "Application", name: "shop-prod", ns: "argocd", part: "argo", labels: {}, row: { "SYNC STATUS": st.argo.prod, HEALTH: R.phase === "Paused" ? "Suspended" : R.phase } }, { kind: "Rollout", name: "shop", part: "svc", labels: { app: "shop" }, row: { DESIRED: 3, CURRENT: R.sets.a.n + R.sets.b.n, "UP-TO-DATE": R.sets[newSide()].ver ? R.sets[newSide()].n : 3, AVAILABLE: R.sets[R.active].n } }, ...(R.analysis ? [{ kind: "AnalysisRun", name: "shop-success-rate", part: "svc", labels: {}, row: { STATUS: R.analysis === "running" ? "Running" : R.analysis === "passed" ? "Successful" : "Failed" } }] : [])],
  verbs: {
    argo({ pos }) { if (pos[0] !== "rollouts") return { err: 'error: unknown command "argo"; did you mean kubectl argo rollouts?' }; return rolloutsCli({ pos: pos.slice(1).filter((x) => x !== "rollout") }); },
    scale({ pos }) { if (!/rollout/.test(pos.join(" "))) return undefined; if (busy()) return { err: "wait for the release to finish" }; drift(); return ["rollout.argoproj.io/shop scaled   # by hand, not through Git"]; },
  },
  tools: {
    argocd({ pos }) {
      const [a, b, name] = pos;
      if (a !== "app") return { err: "this lesson simulates argocd app list|get|diff|sync" };
      if (b === "list") return ["NAME                 CLUSTER                         NAMESPACE  STATUS     HEALTH", `argocd/shop-staging  https://kubernetes.default.svc  staging    ${st.argo.staging.padEnd(11)}Healthy`, `argocd/shop-prod     https://kubernetes.default.svc  prod       ${st.argo.prod.padEnd(11)}${R.phase === "Paused" ? "Suspended" : R.phase}`];
      const env = /prod/.test(name || "") ? "prod" : /staging/.test(name || "") ? "staging" : null;
      if (!env) return { err: `rpc error: code = NotFound desc = applications.argoproj.io "${name || ""}" not found` };
      if (b === "get") return [`Name:               argocd/shop-${env}`, `Source:             overlays/${env} @ main`, `Sync Policy:        Automated (Prune, SelfHeal)`, `Sync Status:        ${st.argo[env]}`, `Health Status:      ${env === "prod" ? (R.phase === "Paused" ? "Suspended" : R.phase) : "Healthy"}`, `Image (in Git):     shop:${st.git[env]}`];
      if (b === "diff") return st.argo[env] === "Synced" ? ["# no differences: the cluster matches Git"] : [`===== argoproj.io/Rollout ${env}/shop ======`, `<   image: …/shop:${env === "prod" ? R.sets[R.active].ver : st.live.staging}`, `>   image: …/shop:${st.git[env]}`];
      if (b === "sync") return ["# automated sync is on: Argo CD syncs by itself within a poll interval"];
      return { err: "this lesson simulates argocd app list|get|diff|sync" };
    },
    kustomize({ pos }) { const env = /prod/.test(pos[1] || "") ? "prod" : /staging/.test(pos[1] || "") ? "staging" : null; if (pos[0] !== "build" || !env) return { err: "usage: kustomize build overlays/prod (or overlays/staging)" }; return { yaml: rolloutY().split("\n---\n")[0].replace(/namespace: prod/, `namespace: ${env}`).replace(/shop:v\d+/, "shop:" + st.git[env]).replace("replicas: 3", env === "staging" ? "replicas: 2   # ← from the staging patch" : "replicas: 3") }; },
    git({ pos }) { if (pos[0] === "log") return S.PARTS.git.manifest().split("\n---\n")[0].split("\n").slice(1).map((l) => l.replace(/^#\s+/, "")); return { err: "this lesson simulates git log; commits come from CI, the Promote button, or Edit in the Git panel" }; },
  },
});
// ---- end kubectl ----

S.setTour([
  { home: true, say: "staging and prod both run v1. Git holds what each should run; Argo CD keeps the cluster matching it.", hold: 6 },
  { focus: "ci", zoom: 2, say: "A developer merges a change. CI builds shop:v2, tests it and pushes it to the registry...", run: () => commit(false), hold: 4 },
  { focus: "git", zoom: 2, say: "...then commits the new tag to overlays/staging. CI never touches the cluster.", hold: 3, until: () => st.git.staging === "v2" },
  { focus: "argo", zoom: 2, say: "Argo CD notices Git changed, renders the overlay with Kustomize, and syncs staging.", hold: 3, until: () => st.live.staging === "v2" },
  { focus: "svc", zoom: 1.6, say: "Promote v2: a commit copies the tag to overlays/prod. Blue-green: v2 starts beside v1 behind the preview Service, at full size.", run: promote, hold: 4, until: () => R.phase === "Paused" },
  { focus: "svc", zoom: 1.6, say: "Analysis passed on the preview. Promote: the active Service flips to v2 in one step.", run: promoteRollout, hold: 6 },
  { home: true, say: "Now canary. A broken v3 goes to staging and is promoted. It gets 20% of real traffic...", run: () => { setStrategy("canary"); commit(true); }, hold: 3, until: () => st.live.staging === "v3" },
  { home: true, say: "v3 gets 20% of real traffic while the analysis watches its error rate...", run: promote, hold: 2, until: () => R.phase === "Degraded" || R.phase === "Healthy" },
  { focus: "svc", zoom: 1.6, say: "The analysis sees v3's error rate and aborts by itself: traffic goes back to v2. Fix it in Git and release again.", hold: 7 },
  { home: true, say: "Git is the truth, Argo CD makes the cluster match it, and Argo Rollouts decides how fast users see the change.", hold: 6 },
]);
S.start();
