// Lesson 14 in 3D: a turnstile API gate, resources behind it, a permission board of Role cards with keycard badges.
const S = createStage({ home: { target: [0, 14, -8], dir: [0.9, 1.1, 1.15], zoom: 1 }, viewH: 260 });
const { box, cyl, lamp, crate, housing, track, part, own, label } = S;

const GATE = { x: 0, z: 7, w: 44, d: 26, h: 18 };
const RES = [{ id: "pods", x: -96 }, { id: "deployments", x: -40 }, { id: "secrets", x: 16 }, { id: "nodes", x: 72 }];
const RES_Z = -38;
const ROLES = [
  { id: "pod-reader", kind: "Role · dev", rules: "pods: get, list, watch", x: -98 },
  { id: "deployer", kind: "Role · dev", rules: "deployments: get, list, create, update, delete · pods: get, list", x: -2 },
  { id: "cluster-viewer", kind: "ClusterRole", rules: "nodes, pods: get, list (all namespaces)", x: 94 },
];
const BOARD_Z = -73;
const SUBJ = [{ id: "alice", what: "User", x: -112 }, { id: "ci-bot", what: "ServiceAccount", x: -16 }, { id: "monitor", what: "ServiceAccount", x: 84 }];
const SUBJ_Z = 53, LANE = 32, FY = 1.9;

part("plate", { kind: "Access control", title: "Who may do what", noFrame: true, zoom: 1, anchor: V(0, 26, -8), desc: "Every request names who is asking. The API server's gate checks RBAC against the permission board at the back, then admission, before anything reaches a resource.", yaml: "kubectl auth can-i --list --as=alice" });
own("plate", S.plate({ x: 0, z: -16, w: 340, d: 176 }), track([[[RES[0].x, -14], [RES[3].x, -14]], ...RES.map((r) => [[r.x, -28], [r.x, -14]]), [[SUBJ[0].x, LANE], [SUBJ[2].x, LANE]], ...SUBJ.map((s) => [[s.x, 22], [s.x, 40]]), [[0, -6], [0, LANE]]], { width: 4.8 }));

// the permission board with role cards and badges
part("board", { kind: "RBAC", title: "Permission board", zoom: 1.6, anchor: V(0, 22, BOARD_Z), desc: "Roles list what may be done (verbs on resources, in a namespace or cluster-wide). Bindings, drawn as keycard badges hung on a card, grant a role to a user or ServiceAccount. There are no deny rules: what is not granted is refused.", yaml: "kubectl get roles,rolebindings -n dev\nkubectl get clusterroles,clusterrolebindings" });
own("board", housing({ x: 0, z: BOARD_Z, w: 300, d: 38, h: 8 }));
label("board", "RBAC: Roles and bindings", { anchor: V(0, 14, BOARD_Z + 20) });
const badges = ROLES.map((r, i) => {
  const id = part("role-" + i, { kind: r.kind, title: r.id, zoom: 2.4, anchor: V(r.x, 22, BOARD_Z),
    desc: () => `Allows: <b>${r.rules}</b>. Bound to: <b>${SUBJ.filter((s) => bindings[s.id].has(r.id)).map((s) => s.id).join(", ") || "nobody"}</b>.`,
    yaml: r.id === "deployer" ? "kind: Role\nmetadata: { name: deployer, namespace: dev }\nrules:\n- { apiGroups: [apps], resources: [deployments], verbs: [get, list, create, update, delete] }\n- { apiGroups: [\"\"], resources: [pods], verbs: [get, list] }" : "" });
  own(id, box(88, 0.8, 30, { x: r.x, y0: 8, z: BOARD_Z, tone: "hi", r: 0.6 }));
  label(id, r.id);
  S.label(id, r.rules, { small: true, anchor: V(r.x, 10, BOARD_Z - 4), lod: 1.5 });
  return SUBJ.map((s, n) => { const b = box(18, 1.4, 9, { x: r.x - 26 + n * 26, y0: 8.8, z: BOARD_Z + 10, tone: "hi", r: 0.4 }); const m = new THREE.MeshBasicMaterial(); S.onTheme((p) => m.color.set(p.accent)); b.material = m; own(id, b); b.visible = false; const L = S.label(id, s.id, { small: true, anchor: V(r.x - 26 + n * 26, 12, BOARD_Z + 12) }); return { b, L }; });
});

// resources behind the gate
const resLamps = {};
RES.forEach((r) => {
  const id = part("res-" + r.id, { kind: "Resource", title: r.id, zoom: 2.6, anchor: V(r.x, 22, RES_Z), desc: `The ${r.id} the API server serves. A request reaches it only if RBAC and admission both let it through.`, yaml: `kubectl get ${r.id} -n dev` });
  own(id, housing({ x: r.x, z: RES_Z, w: 48, d: 20, h: 10, plinth: false }));
  resLamps[r.id] = lamp(r.x + 20, 10, RES_Z - 5, { r: 1.1, state: "off" });
  own(id, resLamps[r.id].mesh);
  label(id, r.id);
});

// the API gate with a turnstile and verdict lamps
part("gate", { kind: "API server", title: "API server gate", zoom: 2.6, anchor: V(GATE.x, GATE.h + 14, GATE.z), desc: "Every request passes three checks in order: authentication (who are you?), authorization by RBAC (may you?), and admission (is this object acceptable?). The green lamp passes, the red one means 403 Forbidden.", yaml: "kubectl auth can-i create deployments -n dev --as=system:serviceaccount:dev:ci-bot" });
own("gate", housing({ x: GATE.x, z: GATE.z, w: GATE.w, d: GATE.d, h: GATE.h }), cyl(6, 2, { x: -8, y0: GATE.h, z: GATE.z, tone: "lo", seg: 32 }), cyl(2.2, 4, { x: -8, y0: GATE.h + 2, z: GATE.z }));
const arms = new THREE.Group();
for (let k = 0; k < 3; k++) { const a = box(9, 1.2, 1.2, { x: 4.5, y0: 0, z: 0, tone: "hi", r: 0 }); const holder = new THREE.Group(); holder.add(a); holder.rotation.y = (k * 2 * Math.PI) / 3; arms.add(holder); }
arms.position.set(-8, GATE.h + 4.5, GATE.z);
own("gate", arms);
const allowLamp = lamp(10, GATE.h, GATE.z - 5, { r: 1.5, state: "off" }), denyLamp = lamp(10, GATE.h, GATE.z + 5, { r: 1.5, state: "off" });
own("gate", allowLamp.mesh, denyLamp.mesh);
label("gate", "API server: authn → RBAC → admission");

// subjects
const subjLamps = SUBJ.map((s) => {
  const id = part("subj-" + s.id, { kind: s.what, title: s.id, zoom: 2.8, anchor: V(s.x, 24, SUBJ_Z),
    desc: () => (s.id === "alice" ? "A person, authenticated by a certificate or an identity provider." : `A pod running as ServiceAccount <b>${s.id}</b>; it authenticates with the token mounted into the pod.`) + ` Roles: <b>${[...bindings[s.id]].join(", ") || "none"}</b>.`,
    actions: () => [{ label: "Act as " + s.id, run: () => (who = s.id) }] });
  own(id, s.id === "alice" ? housing({ x: s.x, z: SUBJ_Z, w: 44, d: 26, h: 12 }) : (() => { const g = crate({ w: 44, h: 12, d: 26, ribs: 4 }); g.position.set(s.x, 0, SUBJ_Z); return g; })());
  const l = lamp(s.x + 17, 12, SUBJ_Z - 8, { r: 1.2, state: "off" });
  own(id, l.mesh);
  label(id, `${s.id} · ${s.what}`);
  return l;
});

// ---- RBAC ----
const RULES = { "pod-reader": [{ res: "pods", verbs: ["get", "list", "watch"], ns: "dev" }], deployer: [{ res: "deployments", verbs: ["get", "list", "create", "update", "delete"], ns: "dev" }, { res: "pods", verbs: ["get", "list"], ns: "dev" }], "cluster-viewer": [{ res: "nodes", verbs: ["get", "list"], ns: "*" }, { res: "pods", verbs: ["get", "list"], ns: "*" }] };
const bindings = { alice: new Set(["deployer"]), "ci-bot": new Set(), monitor: new Set(["cluster-viewer"]) };
let pss = false, who = "alice", spin = 0, verdict = null, verdictT = 0, msg = "";
const log = [];
const can = (subject, verb, res, ns) => { for (const role of bindings[subject]) for (const r of RULES[role]) if (r.res === res && r.verbs.includes(verb) && (r.ns === "*" || r.ns === ns)) return role; return null; };
const inGate = (q) => Math.abs(q.x - GATE.x) < GATE.w / 2 && Math.abs(q.z - GATE.z) < GATE.d / 2;
const net = S.packets({ speed: 120, onArrive: arrive });
const flashS = [0, 0, 0], flashR = {};
function request(subject, verb, res, ns = "dev", extra = null) {
  const s = SUBJ.find((q) => q.id === subject);
  net.add([V(s.x, FY, SUBJ_Z - 13 - 1.8), V(s.x, FY, LANE), V(0, FY, LANE), V(0, FY, GATE.z)], { step: "gate", subject, verb, res, ns, extra, hide: inGate });
  flashS[SUBJ.indexOf(s)] = 1;
}
function arrive(d) {
  if (d.step !== "gate") { flashR[d.res] = 1; return; }
  const role = can(d.subject, d.verb, d.res, d.ns), sa = d.subject === "alice" ? "" : "system:serviceaccount:dev:";
  let line;
  if (!role) { verdict = "deny"; line = `403 Forbidden  ${sa}${d.subject} cannot ${d.verb} ${d.res}${d.ns === "*" ? " at the cluster scope" : " in namespace " + d.ns}`; msg = `RBAC denied it: no role bound to ${d.subject} allows ${d.verb} on ${d.res}. Anything not granted is refused.`; }
  else if (d.extra === "privileged" && pss) { verdict = "deny"; line = `Warning: would violate PodSecurity "restricted"\ndeployment.apps/debug created\n  replicaset: Error creating: pods "debug-6f9c" is forbidden: violates PodSecurity "restricted": privileged`; msg = `RBAC allowed the Deployment (via ${role}), but its pods are rejected at admission: namespace dev enforces Pod Security 'restricted'.`; }
  else { verdict = "allow"; spin = 1; line = `200 OK  ${d.subject} ${d.verb} ${d.res}  (granted by ${role})`; msg = `${d.subject} is allowed to ${d.verb} ${d.res} through the ${role} role.`; const r = RES.find((q) => q.id === d.res); net.add([V(0, FY, GATE.z - GATE.d / 2), V(0, FY, -14), V(r.x, FY, -14), V(r.x, FY, RES_Z + 10.5)], { step: "res", res: d.res }); }
  verdictT = 1.2;
  log.unshift(`$ kubectl ${d.subject === "alice" ? "" : "--as=" + sa + d.subject + " "}${d.verb} ${d.res}${d.ns === "*" ? " -A" : " -n " + d.ns}${d.extra ? "  # privileged pod" : ""}\n${line}`);
  log.length = Math.min(log.length, 4);
}
const ACTIONS = { "get-pods": ["get", "pods", "dev"], "delete-pods": ["delete", "pods", "dev"], "create-deploy": ["create", "deployments", "dev"], "get-secrets": ["get", "secrets", "dev"], "list-nodes": ["list", "nodes", "*"] };
const tryAction = (a) => { const [v, r, ns] = ACTIONS[a]; request(who, v, r, ns); };
const privileged = () => request(who, "create", "deployments", "dev", "privileged");
function toggleBind() { if (bindings["ci-bot"].has("deployer")) bindings["ci-bot"].delete("deployer"); else bindings["ci-bot"].add("deployer"); msg = bindings["ci-bot"].has("deployer") ? "RoleBinding ci-bot-deployer: ci-bot's ServiceAccount now holds the deployer role in dev." : "Binding removed: ci-bot is back to no permissions."; }
function togglePss() { pss = !pss; msg = pss ? "Namespace dev now enforces Pod Security 'restricted'." : "Pod Security enforcement off for dev."; }

S.onTick((dt) => {
  net.step(dt);
  spin = Math.max(0, spin - dt * 1.2);
  arms.rotation.y += spin * dt * 8;
  verdictT = Math.max(0, verdictT - dt);
  allowLamp.set(verdict === "allow" && verdictT > 0 ? "good" : "off");
  denyLamp.set(verdict === "deny" && verdictT > 0 ? "bad" : "off");
  badges.forEach((row, i) => row.forEach((bd, n) => { const on = bindings[SUBJ[n].id].has(ROLES[i].id); bd.b.visible = on; bd.L.show = on; }));
  SUBJ.forEach((s, n) => { flashS[n] = Math.max(0, flashS[n] - dt); subjLamps[n].set(s.id === who ? "accent" : flashS[n] > 0 ? "on" : "off"); });
  RES.forEach((r) => { flashR[r.id] = Math.max(0, (flashR[r.id] || 0) - dt); resLamps[r.id].set(flashR[r.id] > 0 ? "on" : "off"); });
  S.say(`acting as ${who} · ${[...bindings[who]].join(", ") || "no roles"}`);
  syncUi();
});

S.overview = () => `<h2>ServiceAccounts and RBAC</h2><p class="muted">Pick who is asking and try an action below. Badges on the role cards show who holds which role. Pick a part:</p>`;
const ui = { status: document.getElementById("rb-status"), log: document.getElementById("rb-log"), bind: document.getElementById("rb-bind"), pss: document.getElementById("rb-pss"), who: [...document.querySelectorAll("[data-who]")] };
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => {
  S.stopTour();
  const a = b.dataset.do;
  if (a === "who") who = b.dataset.who; if (a === "act") tryAction(b.dataset.a); if (a === "bind") toggleBind(); if (a === "pss") togglePss(); if (a === "priv") privileged();
  S.renderPanel();
}));
function syncUi() {
  const set = (el, t) => { if (el.textContent !== t) el.textContent = t; };
  ui.who.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.who === who)));
  set(ui.bind, bindings["ci-bot"].has("deployer") ? "Unbind ci-bot from deployer" : "Bind ci-bot to deployer");
  set(ui.pss, "Pod Security restricted: " + (pss ? "on" : "off")); ui.pss.setAttribute("aria-pressed", String(pss));
  set(ui.status, msg || "Pick who is asking, then try an action. Each request passes authentication, then RBAC, then admission.");
  ui.status.dataset.tone = /denied|rejected/.test(msg) ? "bad" : /allowed|now holds/.test(msg) ? "good" : "";
  set(ui.log, log.join("\n\n"));
}

// ---- what the inspector shows ----
const RULESY = { "pod-reader": [{ groups: [""], res: ["pods"], verbs: ["get", "list", "watch"] }], deployer: [{ groups: ["apps"], res: ["deployments"], verbs: ["get", "list", "create", "update", "delete"] }, { groups: [""], res: ["pods"], verbs: ["get", "list"] }], "cluster-viewer": [{ groups: [""], res: ["nodes", "pods"], verbs: ["get", "list"] }] };
const subjOf = (id) => ({ kind: id === "alice" ? "User" : "ServiceAccount", name: id });
ROLES.forEach((r, i) => Object.assign(S.PARTS["role-" + i], { manifest: () => { const cl = r.kind === "ClusterRole"; const subs = SUBJ.filter((s) => bindings[s.id].has(r.id)).map((s) => subjOf(s.id)); return K.role({ name: r.id, rules: RULESY[r.id], cluster: cl }) + "\n---\n" + K.rolebinding({ name: r.id + "-binding", role: r.id, subjects: subs, cluster: cl }); }, facts: () => [["Bound to", SUBJ.filter((s) => bindings[s.id].has(r.id)).map((s) => s.id).join(", ") || "nobody"]], kubectl: `kubectl describe ${r.kind === "ClusterRole" ? "clusterrole" : "role -n dev"} ${r.id}\nkubectl create ${r.kind === "ClusterRole" ? "clusterrolebinding" : "rolebinding -n dev"} x --${r.kind === "ClusterRole" ? "clusterrole" : "role"}=${r.id} --serviceaccount=dev:ci-bot` }));
SUBJ.forEach((s) => Object.assign(S.PARTS["subj-" + s.id], { manifest: () => (s.id === "alice" ? `# users are not API objects: they come from certificates or an identity provider\n# alice's kubeconfig, excerpt:\nusers:\n- name: alice\n  user: { client-certificate: alice.crt, client-key: alice.key }   # ← CN=alice` : K.serviceaccount({ name: s.id }) + "\n---\n" + K.pod({ name: s.id + "-6d9f", ns: "dev", labels: { app: s.id }, node: "node-1", ip: "10.244.1.8" + (s.id === "monitor" ? 1 : 0), sa: s.id })), facts: () => [["Kind", s.what], ["Roles", [...bindings[s.id]].join(", ") || "none"]], kubectl: `kubectl auth can-i --list -n dev --as=${s.id === "alice" ? "alice" : "system:serviceaccount:dev:" + s.id}` }));
Object.assign(S.PARTS.gate, { manifest: () => K.apiserver() + "\n---\n" + K.namespace({ name: "dev", podSecurity: pss ? "restricted" : undefined }), facts: () => [["Pod Security on dev", pss ? "restricted (enforced)" : "not enforced"]] });
RES.forEach((r) => Object.assign(S.PARTS["res-" + r.id], { kubectl: `kubectl get ${r.id} -n dev\nkubectl auth can-i get ${r.id} -n dev --as=alice` }));

S.setTour([
  { home: true, say: "Three subjects send requests to the API server's gate. Behind it: the resources. At the back: who may do what.", hold: 6 },
  { focus: "role-1", zoom: 2.4, say: "alice's badge hangs on the deployer role: she may manage Deployments in dev, and read pods.", run: () => (who = "alice"), hold: 6 },
  { focus: "gate", zoom: 2.4, say: "alice creates a Deployment: allowed. She reads Secrets: 403, nothing grants that.", run: () => { tryAction("create-deploy"); setTimeout(() => tryAction("get-secrets"), 1500); }, hold: 7 },
  { focus: "subj-ci-bot", zoom: 2.6, say: "ci-bot is a pod with its own ServiceAccount, and no roles. Its deploy is refused.", run: () => { who = "ci-bot"; tryAction("create-deploy"); }, hold: 6 },
  { focus: "role-1", zoom: 2.4, say: "Bind ci-bot to deployer: a badge appears. Now its deploy goes through.", run: () => { toggleBind(); setTimeout(() => tryAction("create-deploy"), 900); }, hold: 7 },
  { focus: "gate", zoom: 2.4, say: "Even with RBAC allowing it, admission can refuse: with Pod Security 'restricted' on, a privileged pod is rejected.", run: () => { who = "alice"; pss = true; privileged(); }, hold: 8 },
  { home: true, say: "Identity, then RBAC, then admission. Grant the least you can; there are no deny rules to fall back on.", run: () => { pss = false; toggleBind(); }, hold: 6 },
]);
S.start();
