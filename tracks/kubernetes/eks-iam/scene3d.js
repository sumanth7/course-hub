// Lesson 24 in 3D: IAM on EKS, both directions. People and CI reach the API with an IAM identity (a signed
// STS token), which access entries map to Kubernetes permissions. Pods reach AWS with an IAM role: through
// the node's role (instance metadata), IRSA (OIDC web identity) or EKS Pod Identity.
const S = createStage({ home: { target: [0, 12, 0], dir: [0.9, 1.1, 1.15], zoom: 1 }, viewH: 300, minW: 560, phoneMinW: 440 });
const { box, cyl, lamp, crate, housing, track, part, own, label } = S;

const FY = 1.9, TOP = 11;
const WHO = { alice: { z: -50, arn: "arn:aws:iam::111122223333:role/Admin", what: "a platform engineer" }, ci: { z: 0, arn: "arn:aws:iam::111122223333:role/GitHubActionsDeploy", what: "the CI pipeline" }, bob: { z: 50, arn: "arn:aws:iam::111122223333:user/bob", what: "a new developer" } };
const USR_X = -205, API = { x: -95, z: 0 }, ENTRIES = { x: -95, z: 100 }, STS = { x: -5, z: -112 }, EKSAUTH = { x: 75, z: -112 }, OIDC = { x: 150, z: -112 }, S3B = { x: 215, z: -40 };
const NODE = { x: 120, z: 40 }, IMDS = { x: 205, z: 60 };
const POD = { x: NODE.x - 20, z: NODE.z }, AGENT = { x: NODE.x + 26, z: NODE.z };

part("plate", { kind: "IAM on EKS", title: "Identities in and out of the cluster", noFrame: true, zoom: 1, anchor: V(0, 30, 0),
  desc: "Left: people and CI calling the Kubernetes API with IAM identities. Right: a pod calling AWS (S3) with an IAM role. At the back, the AWS services that vouch for both: STS, the EKS Auth API, and the cluster's OIDC provider." });
own("plate", S.plate({ x: 4, z: -8, w: 480, d: 290 }));
own("plate", track([[[USR_X, -50], [USR_X, 50]], [[USR_X, 0], [API.x, 0]], [[API.x, -112], [OIDC.x, -112]], [[API.x, -112], [API.x, ENTRIES.z]], [[POD.x, NODE.z], [POD.x, -112]], [[POD.x, -40], [S3B.x, -40]], [[NODE.x + 40, IMDS.z], [IMDS.x, IMDS.z]]], { width: 4 }));

// ---- people ----
const whoLamps = {};
for (const [name, w] of Object.entries(WHO)) {
  part("who-" + name, { kind: "IAM principal", title: `${name} (${w.arn.split(":").pop()})`, zoom: 2.6, anchor: V(USR_X, 22, w.z), desc: () => `${w.what[0].toUpperCase() + w.what.slice(1)}. kubectl runs <b>aws eks get-token</b>, which signs an STS GetCallerIdentity request with ${name}'s AWS credentials and sends it as the bearer token. Access entry: <b>${st.entries[name] ? st.entries[name].policy + (st.entries[name].ns ? ` (namespace ${st.entries[name].ns})` : " (cluster)") : "none"}</b>.`,
    actions: () => [{ label: `kubectl as ${name}`, run: () => kube(name, "list", "pods", "shop") }, ...(name === "bob" ? [{ label: st.entries.bob ? "Remove bob's access entry" : "Give bob an access entry", run: () => toggleBob() }] : [])] });
  own("who-" + name, housing({ x: USR_X, z: w.z, w: 22, d: 16, h: 6 }), box(2, 11, 14, { x: USR_X - 9, y0: 6, z: w.z, tone: "hi", r: 0.4 }));
  whoLamps[name] = lamp(USR_X + 5, 6, w.z, { r: 1.4 });
  own("who-" + name, whoLamps[name].mesh);
  label("who-" + name, name);
}
part("api", { kind: "API server", title: "API server: authenticate, then authorize", zoom: 2.2, anchor: V(API.x, 28, API.z), desc: "Every request carries a token. The EKS authenticator checks it with STS (who signed this?), then looks the IAM ARN up in the cluster's access entries to get a Kubernetes username, groups and access policies. Then authorization (RBAC and access policies) decides." });
own("api", housing({ x: API.x, z: API.z, w: 44, d: 50, h: 16 }));
const authLamp = lamp(API.x + 12, 16, API.z - 12, { r: 1.3, state: "off" }), rbacLamp = lamp(API.x + 12, 16, API.z + 12, { r: 1.3, state: "off" });
own("api", authLamp.mesh, rbacLamp.mesh);
S.label("api", "API server", { anchor: V(API.x, 20, API.z) });
S.label("api", "authn", { small: true, anchor: V(API.x + 24, 17, API.z - 12), lod: 1.6 }); S.label("api", "authz", { small: true, anchor: V(API.x + 24, 17, API.z + 12), lod: 1.6 });
part("entries", { kind: "Access entries", title: "Cluster access entries", zoom: 2.2, anchor: V(ENTRIES.x, 18, ENTRIES.z), desc: () => "Stored by EKS (not in a ConfigMap): each maps an IAM principal to Kubernetes access, through an access policy (cluster admin, admin, edit, view) scoped to the cluster or to namespaces, and/or Kubernetes groups for your own RBAC. They replace the old aws-auth ConfigMap." });
own("entries", housing({ x: ENTRIES.x, z: ENTRIES.z, w: 60, d: 34, h: 6 }));
const entryCards = Object.keys(WHO).map((n, k) => { const z = ENTRIES.z - 10 + k * 10; const c = box(48, 1.4, 7, { x: ENTRIES.x - 2, y0: 6, z, tone: "hi", r: 0.3 }); const l = lamp(ENTRIES.x + 26, 6, z, { r: 1, state: "off" }); own("entries", c, l.mesh); return { n, c, l, z }; });
label("entries", "access entries");

// ---- AWS services ----
const svc = (id, at, title, kind, desc, h = 14) => { part(id, { kind, title, zoom: 2.4, anchor: V(at.x, h + 14, at.z), desc }); own(id, housing({ x: at.x, z: at.z, w: 40, d: 24, h })); const l = lamp(at.x + 14, h, at.z + 5, { r: 1.2, state: "off" }); own(id, l.mesh); label(id, title); return l; };
const stsLamp = svc("sts", STS, "AWS STS", "Security Token Service", "Answers 'who signed this?' for the authenticator, and hands out temporary credentials when a role is assumed (AssumeRoleWithWebIdentity for IRSA).");
const authApiLamp = svc("eksauth", EKSAUTH, "EKS Auth API", "EKS Pod Identity", "AssumeRoleForPodIdentity: given a pod's service account token, returns credentials for the role associated with that namespace and service account. No OIDC provider or per-cluster trust policy needed.");
const oidcLamp = svc("oidc", OIDC, "IAM OIDC provider", "IRSA", "Registers the cluster's OIDC issuer with IAM, so STS can verify service account tokens the cluster signs. Each role's trust policy names the exact service account allowed to assume it.");
part("s3", { kind: "AWS resource", title: "S3 bucket shop-reports", zoom: 2.6, anchor: V(S3B.x, 26, S3B.z), desc: "What the uploader pod wants to write to. The bucket policy and the role's permissions decide." });
own("s3", S.openBox({ x: S3B.x, z: S3B.z, w: 32, d: 26, h: 13 }));
const s3Lamp = lamp(S3B.x + 12, 13, S3B.z + 8, { r: 1.2, state: "off" });
own("s3", s3Lamp.mesh);
label("s3", "S3 shop-reports");

// ---- the node, its pods, instance metadata ----
part("node", { kind: "Node", title: "Worker node (role eks-node-role)", zoom: 2, anchor: V(NODE.x, TOP + 26, NODE.z), desc: () => `Its instance profile carries <b>eks-node-role</b>, which has what the kubelet and the VPC CNI need, not what your apps need. Instance metadata (IMDSv2) hop limit: <b>${st.hop}</b>${st.hop === 1 ? ", so containers can't reach it and can't borrow the node's role" : ": containers can reach it and borrow the node's role"}.`,
  actions: () => [{ label: `Set IMDS hop limit to ${st.hop === 1 ? 2 : 1}`, run: () => setHop(st.hop === 1 ? 2 : 1) }] });
own("node", S.tray({ x: NODE.x, z: NODE.z, w: 90, d: 50, top: TOP }));
label("node", "node (eks-node-role)", { anchor: V(NODE.x + 30, TOP + 4, NODE.z + 26) });
part("pod", { kind: "Pod", title: "uploader (ServiceAccount uploader)", zoom: 3, anchor: V(POD.x, TOP + 24, POD.z), desc: () => `Runs the AWS SDK and writes reports to S3. Its credentials come from: <b>${{ none: "nothing set up: the SDK falls back to instance metadata", irsa: "IRSA: a projected token + AWS_ROLE_ARN, exchanged with STS", podid: "Pod Identity: the agent on the node, backed by the EKS Auth API" }[st.mode]}</b>.`,
  actions: () => [{ label: "Upload a report", run: upload }] });
const podCrate = crate({ w: 24, h: 13, d: 20, ribs: 4 }); podCrate.position.set(POD.x, TOP, POD.z);
const podLamp = lamp(POD.x + 8, TOP + 13, POD.z - 5, { r: 1.3 });
own("pod", podCrate, podLamp.mesh);
label("pod", "uploader");
part("agent", { kind: "DaemonSet", title: "eks-pod-identity-agent", zoom: 3, anchor: V(AGENT.x, TOP + 20, AGENT.z), desc: "One per node, listening on 169.254.170.23. The SDK in a pod with a Pod Identity association asks it for credentials; it calls the EKS Auth API with the pod's token." });
const agentCrate = crate({ w: 16, h: 9, d: 16, ribs: 3 }); agentCrate.position.set(AGENT.x, TOP, AGENT.z);
own("agent", agentCrate);
label("agent", "pod-identity-agent", { small: true });
part("imds", { kind: "Instance metadata", title: "IMDS 169.254.169.254", zoom: 2.8, anchor: V(IMDS.x, 20, IMDS.z), desc: "Where the node itself gets its role credentials. A pod reaching it borrows the node's role: every pod on the node gets the same, often too broad, permissions. Hop limit 1 keeps containers out." });
own("imds", housing({ x: IMDS.x, z: IMDS.z, w: 24, d: 18, h: 8 }));
const imdsLamp = lamp(IMDS.x + 8, 8, IMDS.z, { r: 1.2, state: "off" });
own("imds", imdsLamp.mesh);
label("imds", "IMDS");

// ---- the model ----
const st = { entries: { alice: { policy: "AmazonEKSClusterAdminPolicy", ns: null }, ci: { policy: "AmazonEKSEditPolicy", ns: "shop" }, bob: null }, mode: "none", hop: 1, nodeRoleHasS3: false, profile: "alice", clock: 0 };
let msg = "";
const P = (x, z) => V(x, FY, z);
const net = S.packets({ speed: 220, onArrive: (d) => d.next && d.next() });
const blink = {};
const go = (pts, data, next) => net.add(pts.map(([x, z]) => P(x, z)), { ...data, next });
const POLICY = { AmazonEKSClusterAdminPolicy: () => true, AmazonEKSAdminPolicy: () => true, AmazonEKSEditPolicy: (v) => v !== "escalate", AmazonEKSViewPolicy: (v) => ["get", "list", "watch"].includes(v) };
// who may do what: authn (STS + access entry), then authz (access policy and scope)
function decide(who, verb, res, ns) {
  const e = st.entries[who];
  if (!e) return { code: 401, text: "error: You must be logged in to the server (Unauthorized)   # the token is valid, but no access entry maps this IAM identity" };
  if (e.ns && ns !== e.ns) return { code: 403, text: `Error from server (Forbidden): ${res} is forbidden: User "${WHO[who].arn}" cannot ${verb} resource "${res}" in API group "" in the namespace "${ns}"   # the access policy is scoped to namespace ${e.ns}` };
  if (e.policy === "none") return { code: 403, text: `Error from server (Forbidden): ${res} is forbidden: User "${WHO[who].arn}" cannot ${verb} resource "${res}" in API group "" in the namespace "${ns}"   # the access entry has no access policy or Kubernetes groups yet` };
  if (!POLICY[e.policy](verb)) return { code: 403, text: `Error from server (Forbidden): ${res} is forbidden: User "${WHO[who].arn}" cannot ${verb} resource "${res}" in API group "" in the namespace "${ns}"   # ${e.policy} is read-only` };
  return { code: 200 };
}
function kube(who, verb, res, ns, done) {
  const w = WHO[who], r = decide(who, verb, res, ns);
  blink["who-" + who] = 0.4;
  go([[USR_X + 11, w.z], [USR_X + 30, w.z], [USR_X + 30, 0], [API.x - 22, 0]], { ring: true }, () => {
    authLamp.set("accent");
    go([[API.x, -25], [API.x, STS.z], [STS.x - 20, STS.z]], { alt: true }, () => { stsBlink = 0.5;
      go([[STS.x - 20, STS.z], [API.x, STS.z], [API.x, -25]], { alt: true }, () => {
        go([[API.x, 25], [API.x, ENTRIES.z - 17]], { alt: true }, () => { entryFlash = who; entryT = 0.6;
          go([[API.x, ENTRIES.z - 17], [API.x, 25]], { alt: true, bad: r.code === 401 }, () => {
            authLamp.set(r.code === 401 ? "bad" : "good"); rbacLamp.set(r.code === 401 ? "off" : r.code === 403 ? "bad" : "good");
            go([[API.x - 22, 0], [USR_X + 30, 0], [USR_X + 30, w.z], [USR_X + 11, w.z]], { bad: r.code !== 200 }, () => { userFlash[who] = { t: 0.5, ok: r.code === 200 }; setTimeout(() => { authLamp.set("off"); rbacLamp.set("off"); }, 600); done?.(r); });
          });
        });
      });
    });
  });
  return r;
}
// a pod asking for AWS credentials, then calling S3
function credentials() {
  if (st.mode === "irsa") return { ok: true, role: "arn:aws:sts::111122223333:assumed-role/shop-uploader/botocore-session-1739", via: "AssumeRoleWithWebIdentity" };
  if (st.mode === "podid") return { ok: true, role: "arn:aws:sts::111122223333:assumed-role/shop-uploader/eks-shop-uploader-9f2c", via: "AssumeRoleForPodIdentity" };
  if (st.hop === 1) return { ok: false, err: "Unable to locate credentials. You can configure credentials by running \"aws configure\".   # IMDS hop limit 1: the pod can't reach instance metadata" };
  return { ok: true, role: "arn:aws:sts::111122223333:assumed-role/eks-node-role/i-0f9c1e2a7b4d", via: "IMDS (the node's role)", node: true };
}
function upload(done) {
  const c = credentials();
  const toS3 = () => go([[POD.x, -40], [S3B.x - 16, -40]], { ring: true, bad: !c.ok || c.node }, () => { s3Blink = 0.5; const ok = c.ok && !c.node; podResult = { t: 0.8, ok }; s3Lamp.set(ok ? "good" : "bad"); setTimeout(() => s3Lamp.set("off"), 700); msg = ok ? `Uploaded with ${c.role.split("/")[1]} via ${c.via}: credentials for exactly this service account, short-lived and rotated automatically.` : `AccessDenied: ${c.role.split("/")[1]} (the node's role) is not allowed s3:PutObject. Granting it there would give every pod on every node S3 access: use IRSA or Pod Identity instead.`; done?.(ok, c); });
  if (st.mode === "none") {
    if (st.hop === 1) { go([[POD.x + 12, POD.z], [NODE.x + 40, IMDS.z], [NODE.x + 44, IMDS.z]], { bad: true, fade: 8 }, () => { podResult = { t: 0.8, ok: false }; msg = "No credentials: nothing is set up for this pod, and IMDS hop limit 1 stops it from borrowing the node's role. The SDK gives up: Unable to locate credentials."; done?.(false, c); }); return; }
    go([[POD.x + 12, POD.z + 20], [POD.x + 12, IMDS.z], [IMDS.x - 12, IMDS.z]], {}, () => { imdsBlink = 0.5; go([[IMDS.x - 12, IMDS.z], [POD.x + 12, IMDS.z], [POD.x, POD.z + 10]], { alt: true }, toS3); });
  } else if (st.mode === "irsa") {
    go([[POD.x, POD.z - 10], [POD.x, -112], [STS.x + 20, STS.z]], { ring: true }, () => { stsBlink = 0.5; go([[STS.x + 20, STS.z], [OIDC.x - 20, OIDC.z]], { alt: true }, () => { oidcBlink = 0.5; go([[OIDC.x - 20, OIDC.z], [POD.x, -112], [POD.x, -40]], { alt: true }, toS3); }); });
  } else {
    go([[POD.x + 12, POD.z], [AGENT.x - 8, AGENT.z]], {}, () => go([[AGENT.x, AGENT.z - 8], [AGENT.x, -112], [EKSAUTH.x + 20, EKSAUTH.z]], { ring: true }, () => { authBlink = 0.5; go([[EKSAUTH.x + 20, EKSAUTH.z], [AGENT.x, -112], [AGENT.x, AGENT.z - 8]], { alt: true }, () => go([[AGENT.x - 8, AGENT.z], [POD.x, POD.z - 10], [POD.x, -40]], { alt: true }, toS3)); }));
  }
}
let stsBlink = 0, authBlink = 0, oidcBlink = 0, s3Blink = 0, imdsBlink = 0, entryFlash = "", entryT = 0, podResult = { t: 0, ok: true };
const userFlash = {};
function setMode(m) { st.mode = m; msg = { none: "No pod identity set up: the SDK falls back to the node's instance metadata.", irsa: "IRSA: ServiceAccount uploader is annotated with a role ARN. EKS mounts a signed token in the pod; the SDK trades it with STS (AssumeRoleWithWebIdentity), which checks it against the cluster's OIDC provider and the role's trust policy.", podid: "EKS Pod Identity: an association (cluster, namespace shop, service account uploader → role). The SDK asks the node's pod identity agent, which calls the EKS Auth API. The role trusts pods.eks.amazonaws.com, so it can be reused across clusters." }[m]; }
function setHop(h) { st.hop = h; msg = h === 1 ? "IMDS hop limit 1: a packet from a container needs one more hop, so it never reaches instance metadata. Pods can't borrow the node's role." : "IMDS hop limit 2: containers can now reach instance metadata and use the node's role, an easy way to over-grant permissions."; }
function toggleBob() { st.entries.bob = st.entries.bob ? null : { policy: "AmazonEKSViewPolicy", ns: "shop" }; msg = st.entries.bob ? "Access entry for bob with AmazonEKSViewPolicy, scoped to namespace shop: he can read there, nowhere else, and change nothing." : "bob's access entry is gone: his token still proves who he is, but the cluster no longer knows him."; }

S.onTick((dt) => {
  st.clock += dt; net.step(dt);
  stsBlink = Math.max(0, stsBlink - dt); authBlink = Math.max(0, authBlink - dt); oidcBlink = Math.max(0, oidcBlink - dt); s3Blink = Math.max(0, s3Blink - dt); imdsBlink = Math.max(0, imdsBlink - dt); entryT = Math.max(0, entryT - dt); podResult.t = Math.max(0, podResult.t - dt);
  stsLamp.set(stsBlink > 0 ? "accent" : "off"); authApiLamp.set(authBlink > 0 ? "accent" : "off"); oidcLamp.set(oidcBlink > 0 ? "accent" : st.mode === "irsa" ? "on" : "off"); imdsLamp.set(imdsBlink > 0 ? "accent" : st.hop === 2 ? "on" : "off");
  entryCards.forEach((c) => { c.c.visible = !!st.entries[c.n]; c.l.mesh.visible = !!st.entries[c.n]; c.l.set(entryT > 0 && entryFlash === c.n ? "accent" : "on"); });
  for (const n in whoLamps) { const f = userFlash[n]; if (f) f.t = Math.max(0, f.t - dt); whoLamps[n].set(f && f.t > 0 ? (f.ok ? "good" : "bad") : "on"); }
  podLamp.set(podResult.t > 0 ? (podResult.ok ? "good" : "bad") : "on");
  agentCrate.visible = st.mode === "podid"; S.setLabel("agent", "pod-identity-agent", { show: st.mode === "podid" });
  S.setLabel("entries", `access entries · ${Object.values(st.entries).filter(Boolean).length}`);
  S.say(`kubectl profile: ${st.profile} · pod credentials: ${{ none: "none (IMDS fallback)", irsa: "IRSA", podid: "Pod Identity" }[st.mode]} · IMDS hop limit ${st.hop}`);
  syncUi();
});

// ---- controls ----
S.overview = () => `<h2>Identities in and out</h2><p class="muted">Left: kubectl calls checked by STS and the access entries. Right: a pod getting AWS credentials. Ringed dots carry tokens. Pick a part:</p>`;
const ui = { status: document.getElementById("ia-status"), mode: [...document.querySelectorAll("[data-mode]")], bob: document.getElementById("ia-bob"), hop: document.getElementById("ia-hop") };
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => {
  S.stopTour();
  const a = b.dataset.do;
  if (a === "as") { const who = b.dataset.who; S.shellEcho?.(`AWS_PROFILE=${who} kubectl ${who === "ci" ? "delete pod web-1 -n shop" : "get pods -n shop"}`, "button"); const r = kube(who, who === "ci" ? "delete" : "list", "pods", "shop"); msg = r.code === 200 ? `${who}: allowed (${st.entries[who].policy}).` : r.text; }
  if (a === "bob") toggleBob();
  if (a === "mode") setMode(b.dataset.mode);
  if (a === "hop") setHop(st.hop === 1 ? 2 : 1);
  if (a === "upload") { S.shellEcho?.("kubectl exec uploader -n shop -- aws s3 cp report.csv s3://shop-reports/", "button"); upload(); }
  S.renderPanel();
}));
function syncUi() {
  const set = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
  ui.mode.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === st.mode)));
  set(ui.bob, st.entries.bob ? "Remove bob's access entry" : "Give bob an access entry");
  set(ui.hop, `IMDS hop limit: ${st.hop}`);
  set(ui.status, msg || "alice is a cluster admin, CI may edit namespace shop, bob has no access entry. The uploader pod has no AWS identity yet.");
  ui.status.dataset.tone = /Unauthorized|Forbidden|AccessDenied|Unable to locate/.test(msg) ? "bad" : /Uploaded|allowed/.test(msg) ? "good" : "";
}

// ---- what the inspector shows ----
const entryY = (n) => { const e = st.entries[n]; return e ? `# aws eks describe-access-entry --cluster-name shop --principal-arn ${WHO[n].arn}
accessEntry:
  principalArn: ${WHO[n].arn}
  username: ${WHO[n].arn.replace("arn:aws:iam::", "arn:aws:sts::").replace(":role/", ":assumed-role/")}{{SessionName}}
  type: STANDARD
associatedAccessPolicies:
- policyArn: arn:aws:eks::aws:cluster-access-policy/${e.policy}
  accessScope: { type: ${e.ns ? "namespace" : "cluster"}${e.ns ? `, namespaces: [${e.ns}]` : ""} }   # ← where the policy applies` : `# no access entry for ${WHO[n].arn}`; };
Object.assign(S.PARTS.entries, { manifest: () => Object.keys(WHO).map(entryY).join("\n---\n") + `\n---\n# the old way, still supported (authenticationMode API_AND_CONFIG_MAP):\napiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: aws-auth\n  namespace: kube-system\ndata:\n  mapRoles: |\n    - rolearn: arn:aws:iam::111122223333:role/Admin\n      username: admin\n      groups: [system:masters]   # ← a typo here once locked people out; access entries are API objects instead` });
Object.keys(WHO).forEach((n) => Object.assign(S.PARTS["who-" + n], { manifest: () => entryY(n) }));
const saY = () => `apiVersion: v1
kind: ServiceAccount
metadata:
  name: uploader
  namespace: shop
${st.mode === "irsa" ? "  annotations:\n    eks.amazonaws.com/role-arn: arn:aws:iam::111122223333:role/shop-uploader   # ← IRSA: the role this service account may assume\n" : ""}---
# the role's trust policy (aws iam get-role --role-name shop-uploader)
${st.mode === "podid" ? `Statement:
- Effect: Allow
  Principal: { Service: pods.eks.amazonaws.com }   # ← Pod Identity: trust the service, not one cluster
  Action: [sts:AssumeRole, sts:TagSession]` : `Statement:
- Effect: Allow
  Principal: { Federated: arn:aws:iam::111122223333:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/9F2C1E }
  Action: sts:AssumeRoleWithWebIdentity
  Condition:
    StringEquals:
      "oidc.eks.us-east-1.amazonaws.com/id/9F2C1E:sub": system:serviceaccount:shop:uploader   # ← only this service account`}`;
Object.assign(S.PARTS.pod, { manifest: () => K.pod({ name: "uploader", ns: "shop", labels: { app: "uploader" }, image: "shop/uploader:1.2", node: "ip-10-0-1-17.ec2.internal", ip: "10.0.1.44", sa: "uploader", env: st.mode === "irsa" ? ["{ name: AWS_ROLE_ARN, value: arn:aws:iam::111122223333:role/shop-uploader }   # ← injected by the EKS webhook", "{ name: AWS_WEB_IDENTITY_TOKEN_FILE, value: /var/run/secrets/eks.amazonaws.com/serviceaccount/token }"] : st.mode === "podid" ? ['{ name: AWS_CONTAINER_CREDENTIALS_FULL_URI, value: "http://169.254.170.23/v1/credentials" }   # ← the pod identity agent', "{ name: AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE, value: /var/run/secrets/pods.eks.amazonaws.com/serviceaccount/eks-pod-identity-token }"] : ["# no AWS_* variables: the SDK will try instance metadata last"] }) + "\n---\n" + saY() });
Object.assign(S.PARTS.eksauth, { manifest: () => `# aws eks list-pod-identity-associations --cluster-name shop\nassociations:\n${st.mode === "podid" ? "- { namespace: shop, serviceAccount: uploader, associationArn: arn:aws:eks:us-east-1:111122223333:podidentityassociation/shop/a-9f2c1e, roleArn: arn:aws:iam::111122223333:role/shop-uploader }" : "[]"}` });
Object.assign(S.PARTS.oidc, { manifest: `# aws eks describe-cluster --name shop --query cluster.identity.oidc.issuer\nhttps://oidc.eks.us-east-1.amazonaws.com/id/9F2C1E   # ← the cluster signs service account tokens with this issuer\n# aws iam list-open-id-connect-providers\n- Arn: arn:aws:iam::111122223333:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/9F2C1E` });

// ---- kubectl and the YAML editor ----
const VERB = { get: (pos) => (pos[1] ? "get" : "list"), describe: () => "get", logs: () => "get", delete: () => "delete", apply: () => "create", create: () => "create", edit: () => "update", scale: () => "update", exec: () => "create" };
S.kube({
  ns: "shop",
  welcome: "# The AWS profile decides who you are. Switch with: export AWS_PROFILE=bob (or alice, ci).",
  help: ["export AWS_PROFILE=alice | ci | bob   ·   aws sts get-caller-identity   ·   aws eks get-token --cluster-name shop", "kubectl get pods -n shop   ·   kubectl delete pod web-1 -n shop   ·   kubectl get pods -n kube-system", "aws eks create-access-entry --cluster-name shop --principal-arn arn:aws:iam::111122223333:user/bob", "aws eks associate-access-policy --cluster-name shop --principal-arn …bob --policy-arn …AmazonEKSViewPolicy --access-scope type=namespace,namespaces=shop", "kubectl annotate sa uploader -n shop eks.amazonaws.com/role-arn=arn:aws:iam::111122223333:role/shop-uploader   (IRSA)", "aws eks create-pod-identity-association --cluster-name shop --namespace shop --service-account uploader --role-arn …shop-uploader", "kubectl exec uploader -n shop -- aws sts get-caller-identity   ·   … -- aws s3 cp report.csv s3://shop-reports/"],
  examples: ["aws sts get-caller-identity", "export AWS_PROFILE=bob", "kubectl get pods -n shop", "export AWS_PROFILE=ci", "kubectl get pods -n kube-system", "kubectl exec uploader -n shop -- aws s3 cp report.csv s3://shop-reports/", "aws eks create-pod-identity-association --cluster-name shop --namespace shop --service-account uploader --role-arn arn:aws:iam::111122223333:role/shop-uploader", "kubectl exec uploader -n shop -- aws sts get-caller-identity"],
  objects: () => [{ kind: "Pod", name: "uploader", part: "pod", labels: { app: "uploader" }, row: { READY: "1/1", STATUS: "Running", RESTARTS: 0 } }, { kind: "Pod", name: "web-1", labels: { app: "web" }, row: { READY: "1/1", STATUS: "Running", RESTARTS: 0 } }, { kind: "ServiceAccount", name: "uploader", part: "pod", manifest: () => saY().split("\n---\n")[0], labels: {}, row: { SECRETS: 0 } }, { kind: "Pod", name: "eks-pod-identity-agent-x2k9p", ns: "kube-system", labels: {}, row: { READY: "1/1", STATUS: "Running", RESTARTS: 0 } }],
  // every kubectl call goes through authentication and authorization as the current profile
  before(verb, { pos, f }) {
    if (!VERB[verb]) return null;
    const ns = f["-n"] || "shop", res = (pos[0] || "pods").split("/")[0].replace(/^po$|^pod$/, "pods");
    const r = decide(st.profile, VERB[verb](pos), res, ns);
    kube(st.profile, VERB[verb](pos), res, ns);
    return r.code === 200 ? null : { err: r.text };
  },
  verbs: {
    exec({ pos }) {
      if (pos[0] !== "uploader") return { err: "this lesson's pod is uploader: kubectl exec uploader -n shop -- aws …" };
      const line = pos.slice(1).join(" "), c = credentials();
      if (/sts get-caller-identity/.test(line)) return c.ok ? ["{", `  "Arn": "${c.role}"   # ← via ${c.via}`, "}"] : { err: c.err };
      if (/s3 cp/.test(line)) { S.stopTour(); upload(); return c.ok && !c.node ? ["upload: ./report.csv to s3://shop-reports/report.csv"] : { err: c.ok ? `upload failed: An error occurred (AccessDenied) when calling the PutObject operation: User: ${c.role} is not authorized to perform: s3:PutObject on resource: arn:aws:s3:::shop-reports/report.csv` : c.err }; }
      return { err: "this container runs: aws sts get-caller-identity, aws s3 cp report.csv s3://shop-reports/" };
    },
    annotate({ pos }) { if (!/sa|serviceaccount/.test(pos[0] || "") || pos[1] !== "uploader") return { err: "this lesson annotates sa uploader" }; const a = pos.find((x) => x.startsWith("eks.amazonaws.com/role-arn")); if (!a) return { err: "error: expected eks.amazonaws.com/role-arn=<role arn>" }; S.stopTour(); if (a.endsWith("-")) setMode("none"); else setMode("irsa"); return ["serviceaccount/uploader annotated   # new pods get the token and AWS_ROLE_ARN (the pod is restarted here)"]; },
  },
  tools: {
    export({ pos }) { const m = pos.join(" ").match(/AWS_PROFILE=(\w+)/); if (!m || !WHO[m[1]]) return { err: "profiles here: alice, ci, bob" }; st.profile = m[1]; return [`# now acting as ${m[1]} (${WHO[m[1]].arn})`]; },
    aws({ pos, f }) {
      const [s1, op] = pos;
      if (s1 === "sts" && op === "get-caller-identity") return ["{", `  "Arn": "${WHO[st.profile].arn}"`, "}"];
      if (s1 !== "eks") return { err: "this lesson simulates aws sts get-caller-identity and aws eks …" };
      if (op === "get-token") return ['{ "kind": "ExecCredential", "status": { "token": "k8s-aws-v1.aHR0cHM6Ly9zdHMuYW1hem9uYXdzLmNvbS8_QWN0aW9uPUdldENhbGxlcklkZW50aXR5…" } }', "# a presigned STS GetCallerIdentity URL, base64: the API server calls it to learn who you are"];
      const admin = st.entries[st.profile]?.policy === "AmazonEKSClusterAdminPolicy";
      if (/access-entr|access-polic|pod-identity/.test(op) && /create|associate|delete/.test(op) && st.profile === "bob") return { err: `An error occurred (AccessDeniedException): User: ${WHO.bob.arn} is not authorized to perform: eks:${op.replace(/-(\w)/g, (_, c) => c.toUpperCase()).replace(/^\w/, (c) => c.toUpperCase())}` };
      if (op === "list-access-entries") return ['{ "accessEntries": [', ...Object.keys(WHO).filter((n) => st.entries[n]).map((n) => `  "${WHO[n].arn}",`), "] }"];
      if (op === "create-access-entry") { if (!/bob/.test(String(f["--principal-arn"] || ""))) return { err: "this lesson adds bob: --principal-arn arn:aws:iam::111122223333:user/bob" }; if (st.entries.bob) return { err: "An error occurred (ResourceInUseException): The specified access entry resource is already in use on this cluster." }; st.entries.bob = { policy: "none", ns: "shop", pending: true }; return ['{ "accessEntry": { "principalArn": "arn:aws:iam::111122223333:user/bob", "kubernetesGroups": [], "type": "STANDARD" } }', "# bob can authenticate now, but has no permissions until a policy (or RBAC group) is attached"]; }
      if (op === "associate-access-policy") { if (!st.entries.bob) return { err: "An error occurred (ResourceNotFoundException): The specified principalArn could not be found. Create an access entry first." }; const pol = String(f["--policy-arn"] || "").split("/").pop() || "AmazonEKSViewPolicy"; if (!POLICY[pol]) return { err: `policies here: ${Object.keys(POLICY).join(", ")}` }; const nsm = String(f["--access-scope"] || "").match(/namespaces=([\w-]+)/); S.stopTour(); st.entries.bob = { policy: pol, ns: nsm ? nsm[1] : null }; msg = `bob: ${pol}${nsm ? " in namespace " + nsm[1] : " cluster-wide"}.`; return [`{ "associatedAccessPolicy": { "policyArn": "arn:aws:eks::aws:cluster-access-policy/${pol}", "accessScope": { "type": "${nsm ? "namespace" : "cluster"}" } } }`]; }
      if (op === "create-pod-identity-association") { if (f["--service-account"] !== "uploader") return { err: "this lesson associates --namespace shop --service-account uploader" }; S.stopTour(); setMode("podid"); return ['{ "association": { "clusterName": "shop", "namespace": "shop", "serviceAccount": "uploader", "roleArn": "arn:aws:iam::111122223333:role/shop-uploader" } }', "# the pod is restarted so the webhook injects the credential variables"]; }
      return { err: "this lesson simulates aws eks get-token | list-access-entries | create-access-entry | associate-access-policy | create-pod-identity-association" };
    },
  },
});
// a policy-less entry authenticates but authorizes nothing
POLICY.none = () => false;
// ---- end kubectl ----

S.setTour([
  { home: true, say: "Two directions of identity. Left: people and CI into the cluster. Right: a pod out to AWS.", hold: 5 },
  { focus: "api", zoom: 1.8, say: "alice runs kubectl. Her token is a signed STS request; the API server asks STS who signed it, then finds her access entry: cluster admin.", run: () => kube("alice", "list", "pods", "shop"), hold: 8 },
  { focus: "entries", zoom: 2, say: "bob is a valid AWS user, but has no access entry: Unauthorized. Authentication proves who you are; the entry is what makes you known to the cluster.", run: () => kube("bob", "list", "pods", "shop"), hold: 8 },
  { focus: "entries", zoom: 2, say: "CI can edit namespace shop only. Outside it: Forbidden.", run: () => kube("ci", "list", "pods", "kube-system"), hold: 7 },
  { focus: "pod", zoom: 2.4, say: "Now the pod. With no identity set up, the SDK tries instance metadata, and hop limit 1 blocks it: no credentials.", run: () => { setMode("none"); setHop(1); upload(); }, hold: 6 },
  { focus: "imds", zoom: 2.2, say: "Raise the hop limit and the pod borrows the node's role. That works only if the node role can write to S3, and then every pod can. Here it can't: AccessDenied.", run: () => { setHop(2); upload(); }, hold: 8 },
  { focus: "oidc", zoom: 1.8, say: "IRSA: the pod trades its signed service-account token with STS, which checks it against the cluster's OIDC provider and the role's trust policy.", run: () => { setHop(1); setMode("irsa"); upload(); }, hold: 8 },
  { focus: "eksauth", zoom: 1.8, say: "EKS Pod Identity does the same through a node agent and the EKS Auth API, with a simpler trust policy you can reuse across clusters.", run: () => { setMode("podid"); upload(); }, hold: 8 },
  { home: true, say: "IAM identities get into the cluster through access entries; pods get IAM roles through IRSA or Pod Identity, never the node's role.", hold: 6 },
]);
S.start();
