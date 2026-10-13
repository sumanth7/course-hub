// Lesson 01 in 3D: VMs vs containers on the same hardware, and build → push → run on three hosts.
const S = createStage({ home: { target: [0, 18, -4], dir: [0.9, 1.05, 1.15], zoom: 1 }, viewH: 270 });
const { box, cyl, lamp, crate, housing, part, own, label } = S;

const VMH = { x: -143, z: -35, w: 74, d: 62 }, CTH = { x: -143, z: 37, w: 74, d: 62 };
const HW = 6, OS = 5;
const DOCKER = { x: -62, z: -38 };
const STACK = { x: -6, z: -42, w: 40, d: 32 };
const LAYERS = ["FROM node:20-slim", "RUN npm ci", "COPY . /app", "CMD node app.js"];
const LAYER_H = 4;
const REG = { x: 110, z: -54, w: 140, d: 32, h: 8 };
const HOSTS = [18, 80, 142].map((x) => ({ x, z: 28, w: 56, d: 48, h: 8 }));

part("plate", { kind: "Containers", title: "Containers and images", noFrame: true, zoom: 1, anchor: V(0, 26, -4), desc: "On the left, two machines on identical hardware. On the right, an image is built, pushed to a registry, and run on three hosts.", yaml: "docker build -t shop:v1 .\ndocker push ghcr.io/acme/shop:v1\ndocker run -d ghcr.io/acme/shop:v1" });
own("plate", S.plate({ x: 0, z: -4, w: 380, d: 160 }));

// VM host
part("vmhost", { kind: "Virtual machines", title: "VM host", zoom: 2, anchor: V(VMH.x, 40, VMH.z), desc: "A hypervisor runs three VMs, each with a whole guest operating system under its app. Heavy, and slow to boot: tens of seconds.", yaml: "", actions: () => [{ label: "Boot both machines", run: boot }] });
own("vmhost", housing({ x: VMH.x, z: VMH.z, w: VMH.w, d: VMH.d, h: HW }), box(VMH.w - 6, 3, VMH.d - 6, { x: VMH.x, y0: HW, z: VMH.z, tone: "lo", r: 0.6 }));
const vmLamps = [-23, 0, 23].map((dx, i) => { const os = box(19, 13, 50, { x: VMH.x + dx, y0: HW + 3, z: VMH.z, tone: "mid", r: 0.6 }); const app = box(13, 5, 20, { x: VMH.x + dx, y0: HW + 16, z: VMH.z + 8, tone: "hi", r: 0.4 }); const l = lamp(VMH.x + dx, HW + 16, VMH.z - 12, { r: 1.1 }); own("vmhost", os, app, l.mesh); return l; });
label("vmhost", "3 VMs: 3 guest OSes");
// container host
part("cthost", { kind: "Containers", title: "Container host", zoom: 2, anchor: V(CTH.x, 30, CTH.z), desc: "One host OS and a container runtime run six containers side by side. Each is an isolated process sharing the host's kernel: starts in well under a second, and many fit.", yaml: "", actions: () => [{ label: "Boot both machines", run: boot }] });
own("cthost", housing({ x: CTH.x, z: CTH.z, w: CTH.w, d: CTH.d, h: HW }), box(CTH.w - 6, OS, CTH.d - 6, { x: CTH.x, y0: HW, z: CTH.z, tone: "mid", r: 0.6 }));
const ctLamps = [0, 1, 2, 3, 4, 5].map((i) => { const x = CTH.x - 23 + (i % 3) * 23, z = CTH.z - 13 + Math.floor(i / 3) * 26; const g = crate({ w: 18, h: 6, d: 20, ribs: 2 }); g.position.set(x, HW + OS, z); const l = lamp(5, 6, -6, { r: 1 }); g.add(l.mesh); own("cthost", g); return l; });
label("cthost", "6 containers: 1 kernel");

// Dockerfile, image layers, registry
part("dockerfile", { kind: "Dockerfile", title: "Dockerfile", zoom: 2.8, anchor: V(DOCKER.x, 12, DOCKER.z), desc: "Instructions for building an image. Each instruction becomes a read-only layer. Things that change often (your code) go last, so the layers above them can be reused from cache.", yaml: "FROM node:20-slim\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nCMD [\"node\", \"app.js\"]", actions: () => [{ label: "docker build", run: build }] });
own("dockerfile", box(44, 1.2, 52, { x: DOCKER.x, z: DOCKER.z, tone: "lo", r: 0.8 }), box(40, 0.5, 48, { x: DOCKER.x, y0: 1.2, z: DOCKER.z, tone: "hi", r: 0.5 }));
label("dockerfile", "Dockerfile");
LAYERS.forEach((l, i) => S.label("dockerfile", l, { small: true, anchor: V(DOCKER.x, 3, DOCKER.z - 16 + i * 10), lod: 1.5 }));
part("image", { kind: "Image", title: () => (img.built ? "image shop:v" + img.built : "image (not built yet)"), zoom: 3, anchor: V(STACK.x, 26, STACK.z), desc: () => `A stack of read-only layers. ${img.cached && img.building ? "This rebuild reused the first two from cache; only COPY and what follows are rebuilt." : "Change only your code and a rebuild reuses every layer below COPY."}`, actions: () => [{ label: "docker build", run: build }, { label: "docker push", run: push }] });
own("image", box(STACK.w + 4, 2, STACK.d + 4, { x: STACK.x, z: STACK.z, tone: "lo", r: 0.6 }));
const layerMeshes = LAYERS.map((l, i) => { const m = box(STACK.w - i * 3, LAYER_H - 0.4, STACK.d - i * 3, { x: STACK.x, y0: 2 + i * LAYER_H, z: STACK.z, tone: i === 3 ? "hi" : "mid", r: 0.4 }); own("image", m); m.visible = false; return m; });
label("image", "image");
part("registry", { kind: "Registry", title: "registry ghcr.io/acme/shop", zoom: 2, anchor: V(REG.x, REG.h + 20, REG.z), desc: "Stores images by name and tag, so any machine can pull them.", yaml: "docker push ghcr.io/acme/shop:v1\ndocker pull ghcr.io/acme/shop:v1" });
own("registry", housing({ x: REG.x, z: REG.z, w: REG.w, d: REG.d, h: REG.h }));
const regImgs = [0, 1].map((i) => { const g = new THREE.Group(); for (let k = 0; k < 3; k++) g.add(box(28 - k * 2, 3, 18 - k * 2, { x: REG.x - 50 + i * 40, y0: REG.h + k * 3.2, z: REG.z, tone: k === 2 ? "hi" : "mid", r: 0.3 })); own("registry", g); g.visible = false; return g; });
label("registry", "registry");
const regTags = [0, 1].map((i) => S.label("registry", "shop:v" + (i + 1), { small: true, anchor: V(REG.x - 50 + i * 40, REG.h + 14, REG.z) }));

// hosts
const hosts = HOSTS.map((h, n) => {
  const id = part("host-" + n, { kind: "Host", title: "host-" + (n + 1), zoom: 2.4, anchor: V(h.x, 26, h.z), desc: () => (hostState[n].up ? (hostState[n].run ? `Running shop:v${hostState[n].run.tag}${hostState[n].extra ? " (two copies)" : ""}.` : "Up, nothing running.") : "Down."), actions: () => [{ label: "Kill this host", danger: true, run: () => kill(n) }] });
  own(id, housing({ x: h.x, z: h.z, w: h.w, d: h.d, h: h.h }));
  const g = crate({ w: 36, h: 12, d: 28, ribs: 4 });
  g.position.set(h.x, h.h, h.z);
  const l = lamp(14, 12, -10, { r: 1.2 });
  g.add(l.mesh);
  own(id, g);
  g.visible = false;
  const hl = lamp(h.x + 24, h.h, h.z - 20, { r: 1.1 });
  own(id, hl.mesh);
  label(id, "host-" + (n + 1));
  return { g, l, hl };
});

// ---- model ----
let bootT = -1, msg = "", t = 0, declarative = true, want = 0;
const img = { built: 0, shown: 0, building: false, queue: [], tag: 0, pushed: [false, false], cached: 0 };
const hostState = [{ up: true, run: null }, { up: true, run: null }, { up: true, run: null }];
const log = [];
const logIt = (s) => { log.unshift(s); log.length = Math.min(log.length, 5); };
const net = S.packets({ speed: 110, onArrive: (d) => d.done && d.done() });
function boot() { bootT = 0; msg = "Booting both: each VM starts a whole guest OS (tens of seconds); a container is just a process on the host's kernel (well under a second)."; }
function build() {
  if (img.building) return;
  const rebuild = img.built > 0;
  Object.assign(img, { building: true, queue: rebuild ? [2, 3] : [0, 1, 2, 3], shown: rebuild ? 2 : 0, cached: rebuild ? 2 : 0, tag: rebuild ? 2 : 1 });
  t = 0;
  logIt(`$ docker build -t shop:v${img.tag} .${rebuild ? "   # CACHED: FROM, RUN npm ci" : ""}`);
  msg = rebuild ? "Rebuilding after a code change: the first two layers come from cache; only COPY and what follows are rebuilt." : "Building: each Dockerfile instruction becomes a read-only layer stacked on the one before.";
}
function push() {
  if (!img.built || img.building) return;
  const i = img.tag - 1;
  net.add([V(STACK.x, 22, STACK.z), V(STACK.x, 30, STACK.z), V(REG.x - 50 + i * 40, 30, REG.z), V(REG.x - 50 + i * 40, REG.h + 10, REG.z)], { done: () => (img.pushed[i] = true) });
  logIt(`$ docker push ghcr.io/acme/shop:v${img.tag}`);
  msg = "Pushed to a registry: any machine can now pull it by name and tag.";
}
function pull(n, tag) { const h = HOSTS[n]; net.add([V(REG.x - 50 + (tag - 1) * 40, REG.h + 10, REG.z), V(REG.x - 50 + (tag - 1) * 40, 30, REG.z), V(h.x, 30, h.z), V(h.x, h.h + 14, h.z)], { done: () => { if (hostState[n].up) hostState[n].run = { tag, t: 0 }; } }); }
function runAll() {
  const i = [1, 0].find((n) => img.pushed[n]);
  if (i === undefined) { msg = "Push an image first."; return; }
  want = 3;
  hostState.forEach((h, n) => { if (h.up && (!h.run || h.run.tag !== i + 1)) pull(n, i + 1); });
  logIt("$ " + (declarative ? `kubectl apply -f shop.yaml   # replicas: 3, image shop:v${i + 1}` : `for h in host-1 host-2 host-3; do ssh $h docker run -d shop:v${i + 1}; done`));
}
function kill(n) {
  if (n === undefined) n = hostState.findIndex((h) => h.up && h.run);
  if (n < 0) return;
  hostState[n].up = false; hostState[n].run = null; hostState[n].extra = false;
  msg = declarative ? `host-${n + 1} died. The orchestrator sees 2 running where 3 are wanted, and starts a replacement on a healthy host.` : `host-${n + 1} died, and its container with it. Your script ran once and has finished: nothing notices, nothing restarts it.`;
  logIt(`# host-${n + 1} is down`);
  setTimeout(() => { hostState[n].up = true; logIt(`# host-${n + 1} is back (empty)`); }, 9000);
}
function toggleMode() { declarative = !declarative; hostState.forEach((h) => (h.extra = false)); msg = declarative ? "Declarative: you state what should run (3 copies of shop), and a controller keeps making it true." : "Imperative: you run commands that do things once. Whatever happens afterwards is your problem."; }

S.onTick((dt) => {
  t += dt;
  if (bootT >= 0) bootT += dt;
  if (img.building && t > 0.9) { t = 0; if (img.queue.length) { img.queue.shift(); img.shown++; } else { img.building = false; img.built = img.tag; logIt(`Successfully tagged shop:v${img.tag}`); } }
  if (declarative && want && !net.list.length) {
    const running = hostState.filter((h) => h.up && h.run).length + hostState.filter((h) => h.up && h.extra).length;
    if (running < want) {
      const tag = Math.max(1, ...hostState.map((h) => (h.run ? h.run.tag : 0)));
      const free = hostState.findIndex((h) => h.up && !h.run);
      if (free >= 0) { pull(free, tag); logIt(`# controller: ${running}/3 running, starting one on host-${free + 1}`); }
      else { const tgt = hostState.findIndex((h) => h.up && h.run && !h.extra); if (tgt >= 0) { hostState[tgt].extra = true; logIt(`# controller: ${running}/3 running, starting a second copy on host-${tgt + 1}`); } }
    }
  }
  net.step(dt);
  hostState.forEach((h) => { if (h.run) h.run.t += dt; });
  vmLamps.forEach((l, i) => l.set(bootT < 0 || bootT > 5 + i * 0.8 ? "on" : Math.sin(bootT * 6 + i) > 0 ? "accent" : "off"));
  ctLamps.forEach((l, i) => l.set(bootT < 0 || bootT > 0.3 + i * 0.05 ? "on" : "off"));
  layerMeshes.forEach((m, i) => { m.visible = i < img.shown || (img.building && i === img.shown && Math.sin(t * 10) > 0); });
  regImgs.forEach((g, i) => { g.visible = img.pushed[i]; regTags[i].show = img.pushed[i]; });
  hosts.forEach((o, n) => {
    const h = hostState[n];
    o.hl.set(h.up ? "on" : "bad");
    o.g.visible = !!h.run;
    if (h.run) o.g.scale.y = Math.min(1, h.run.t / 0.4 + 0.02);
    o.l.set(h.run && h.run.t > 0.4 ? "on" : "off");
    S.setLabel("host-" + n, `host-${n + 1}` + (h.up ? (h.run ? ` · shop:v${h.run.tag}${h.extra ? " ×2" : ""}` : "") : " · down"), { bad: !h.up });
  });
  const running = hostState.filter((h) => h.up && h.run).length + hostState.filter((h) => h.up && h.extra && h.run).length;
  S.say(`${img.built ? "image shop:v" + img.built : "no image yet"} · ${running} running${want ? " of " + want : ""}`);
  syncUi();
});

S.overview = () => `<h2>Containers and images</h2><p class="muted">Boot the two machines, then build, push and run an image, and kill a host in each mode. Pick a part:</p>`;
const ui = { status: document.getElementById("ct-status"), mode: document.getElementById("ct-mode"), log: document.getElementById("ct-log") };
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => { S.stopTour(); ({ boot, build, push, run: runAll, kill: () => kill(), mode: toggleMode })[b.dataset.do](); S.renderPanel(); }));
function syncUi() {
  const set = (el, v) => { if (el.textContent !== v) el.textContent = v; };
  set(ui.mode, declarative ? "Mode: declarative (orchestrator)" : "Mode: imperative (a script)");
  ui.mode.setAttribute("aria-pressed", String(declarative));
  set(ui.status, msg || "Build an image, push it, run it on three hosts, then kill a host in each mode.");
  ui.status.dataset.tone = /nothing restarts/.test(msg) ? "bad" : /replacement/.test(msg) ? "good" : "";
  set(ui.log, log.join("\n"));
}

// ---- what the inspector shows ----
Object.assign(S.PARTS.image, { manifest: () => `# docker image history shop:v${img.built || 1}\nIMAGE         CREATED BY                       SIZE\n${LAYERS.slice().reverse().map((l, k) => `${["a1f3", "9c2e", "4b7d", "e05c"][k]}…        ${l.padEnd(32)} ${["0B", "1.2MB", "48MB", "74MB"][k]}${img.cached && 3 - k < img.cached ? "   # ← from cache" : ""}`).join("\n")}`, kubectl: "docker image history shop:v1\ndocker image inspect shop:v1" });
Object.assign(S.PARTS.registry, { manifest: () => `# the image a pod runs is named in its spec:\ncontainers:\n- name: shop\n  image: ghcr.io/acme/shop:v${img.pushed[1] ? 2 : 1}   # ← registry / repository : tag\n  imagePullPolicy: IfNotPresent\n# tags in the registry: ${img.pushed.map((p, k) => (p ? "v" + (k + 1) : "")).filter(Boolean).join(", ") || "none yet"}` });
HOSTS.forEach((_, n) => Object.assign(S.PARTS["host-" + n], { manifest: () => (declarative ? K.deployment({ name: "shop", replicas: 3, image: "ghcr.io/acme/shop:v1", ready: hostState.filter((h) => h.up && h.run).length, updated: 3, available: hostState.filter((h) => h.up && h.run).length }) + "\n# ← declarative: you state 3; the controller keeps it at 3" : `# imperative: what your script ran on host-${n + 1}, once\n$ docker run -d --name shop ghcr.io/acme/shop:v1\n# if this host dies, nothing runs this again`), facts: () => [["State", hostState[n].up ? "up" : "down"], ["Running", hostState[n].run ? "shop:v" + hostState[n].run.tag : "nothing"]] }));
Object.assign(S.PARTS.cthost, { manifest: () => K.pod({ name: "shop-7d4f", labels: { app: "shop" }, image: "ghcr.io/acme/shop:v1", node: "host-1", ip: "10.244.1.5" }) + "\n# ← in Kubernetes, containers always run inside pods" });

// ---- kubectl and the YAML editor ----
// docker for the image, kubectl (or a script) to run it; ssh to pull the plug on a host
const tagOk = (ref, want) => new RegExp(`^(ghcr\\.io/acme/)?shop:v${want}$`).test(ref || "");
const podsNow = () => hostState.map((h, n) => (h.up && h.run ? { kind: "Pod", name: `shop-7d4f-${["k2m4p", "x8qpz", "t3vnc"][n]}`, part: "host-" + n, labels: { app: "shop" }, row: { READY: h.run.t > 0.8 ? "1/1" : "0/1", STATUS: h.run.t > 0.8 ? "Running" : "ContainerCreating", RESTARTS: 0 }, wide: { IP: `10.244.${n + 1}.5`, NODE: "host-" + (n + 1) }, logs: () => [`shop v${h.run.tag} listening on :8080`] } : null)).filter(Boolean)
  // a replacement the controller started on a healthy host
  .concat(hostState.map((h, n) => (h.up && h.run && h.extra ? { kind: "Pod", name: `shop-7d4f-r${n}w9q`, part: "host-" + n, labels: { app: "shop" }, row: { READY: "1/1", STATUS: "Running", RESTARTS: 0 }, wide: { IP: `10.244.${n + 1}.6`, NODE: "host-" + (n + 1) } } : null)).filter(Boolean));
S.kube({
  ns: "default", auto: false,
  welcome: "# Build and push with docker, then run it: kubectl apply -f shop.yaml (declarative) or docker run on each host (a script).",
  help: ["docker build -t shop:v1 .   (again after a code change: shop:v2)", "docker push ghcr.io/acme/shop:v1   ·   docker images   ·   docker history shop:v1", "kubectl apply -f shop.yaml   (3 replicas, kept running)", "ssh host-N docker run -d ghcr.io/acme/shop:v1   (one host, once)", "ssh host-2 sudo poweroff   (kill a host)", "kubectl get pods -o wide"],
  examples: ["docker build -t shop:v1 .", "docker push ghcr.io/acme/shop:v1", "kubectl apply -f shop.yaml", "kubectl get pods -o wide", "ssh host-2 sudo poweroff", "kubectl get pods -w", "docker history shop:v1"],
  objects: () => (declarative ? [{ kind: "Deployment", name: "shop", part: "host-0", labels: { app: "shop" }, row: { READY: `${podsNow().length}/${want || 3}`, "UP-TO-DATE": podsNow().length, AVAILABLE: podsNow().length } }, ...podsNow()] : []),
  verbs: {
    apply({ f }) {
      if (f["-f"] !== "shop.yaml") return f["-f"] === "-" ? undefined : { err: `error: the path "${f["-f"]}" does not exist. This lesson has shop.yaml` };
      if (!img.pushed.some(Boolean)) return { err: 'Warning: the image isn\'t in the registry yet: push it first (docker push ghcr.io/acme/shop:v1)\n# pods would sit in ImagePullBackOff' };
      S.stopTour(); if (!declarative) toggleMode(); runAll(); return ["deployment.apps/shop created   # replicas: 3: the controller will keep 3 running"];
    },
    get({ pos }) { if (!declarative && /^(po|pods?|deploy|deployments?)$/.test(pos[0] || "")) return ["No resources found in default namespace.   # in script mode nothing runs under Kubernetes: ssh host-N docker ps"]; return undefined; },
  },
  tools: {
    docker({ pos, f }) {
      const [cmd, a] = pos;
      if (cmd === "build") { if (!f["-t"] && !pos.includes(".")) return { err: '"docker build" requires exactly 1 argument: docker build -t shop:v1 .' }; if (img.building) return { err: "a build is already running" }; S.stopTour(); const n = img.built ? 2 : 1; build(); return [`[+] Building shop:v${n}`, ...LAYERS.map((l, k) => ` => ${n === 2 && k < 2 ? "CACHED " : ""}[${k + 1}/4] ${l}`), ` => naming to docker.io/library/shop:v${n}`]; }
      if (cmd === "push") { if (!img.built) return { err: "An image does not exist locally with the tag: shop. Build it first." }; if (!tagOk(a, img.tag)) return { err: `An image does not exist locally with the tag: ${a || ""}   # push ghcr.io/acme/shop:v${img.tag}` }; S.stopTour(); push(); return [`The push refers to repository [ghcr.io/acme/shop]`, `v${img.tag}: digest: sha256:9c2e4b7d… size: 1789`]; }
      if (cmd === "images") return ["REPOSITORY   TAG   IMAGE ID       SIZE", ...(img.built ? Array.from({ length: img.tag }, (_, k) => `shop         v${k + 1}    ${["a1f34b7d9c2e", "e05c9c2ea1f3"][k]}   ${k ? "201MB" : "198MB"}`) : [])];
      if (cmd === "history") return ["IMAGE          CREATED BY                    SIZE", ...LAYERS.slice().reverse().map((l, k) => `${["a1f3", "9c2e", "4b7d", "e05c"][k]}…        ${l.padEnd(30)}${["0B", "1.2MB", "48MB", "74MB"][k]}`)];
      if (cmd === "run") return { err: "docker run starts a container on this machine; to run on a host: ssh host-1 docker run -d ghcr.io/acme/shop:v1" };
      return { err: `docker: '${cmd || ""}' is not simulated here (build, push, images, history)` };
    },
    ssh({ pos }) {
      const [host, ...rest] = pos, n = ["host-1", "host-2", "host-3"].indexOf(host), line = rest.join(" ");
      if (n < 0) return { err: `ssh: Could not resolve hostname ${host || ""}: host-1, host-2 or host-3` };
      if (!hostState[n].up) return { err: `ssh: connect to host ${host} port 22: No route to host` };
      if (/poweroff|shutdown|halt/.test(line)) { S.stopTour(); kill(n); return [`Connection to ${host} closed by remote host.`]; }
      if (/^docker ps/.test(line)) return ["CONTAINER ID   IMAGE                      STATUS", ...(hostState[n].run ? [`3f9c1e2a7b4d   ghcr.io/acme/shop:v${hostState[n].run.tag}   Up ${Math.round(hostState[n].run.t)} seconds`] : [])];
      const m = line.match(/^docker run -d (\S+)$/);
      if (m) { const tag = [1, 2].find((v) => tagOk(m[1], v) && img.pushed[v - 1]); if (!tag) return { err: `Unable to find image '${m[1]}' locally\ndocker: Error response from daemon: manifest unknown` }; S.stopTour(); if (declarative) toggleMode(); want = 3; pull(n, tag); logIt(`$ ssh ${host} docker run -d shop:v${tag}`); return ["3f9c1e2a7b4d5e6f…   # started once; nothing will restart it"]; }
      return { err: "this lesson's hosts run: docker ps, docker run -d <image>, sudo poweroff" };
    },
  },
});
// ---- end kubectl ----
S.setTour([
  { home: true, say: "Two machines on identical hardware. One runs virtual machines, the other containers.", hold: 5 },
  { focus: "vmhost", zoom: 2, say: "Boot them. Each VM starts a whole operating system, so its lamp takes seconds...", run: boot, hold: 4 },
  { focus: "cthost", zoom: 2, say: "...while containers are just processes on one shared kernel: all six are up almost at once.", hold: 4 },
  { focus: "image", zoom: 2.6, say: "Build an image: each Dockerfile instruction becomes a read-only layer.", run: build, hold: 3, until: () => !img.building },
  { focus: "registry", zoom: 2, say: "Push it to a registry, where any machine can pull it by name and tag.", run: push, hold: 4 },
  { home: true, say: "Run it on three hosts with a declarative orchestrator: 'three copies of shop:v1, please'.", run: runAll, hold: 5 },
  { focus: "host-1", zoom: 2.2, say: "Kill a host. The orchestrator sees 2 where 3 are wanted, and starts another copy.", run: () => kill(1), hold: 6 },
  { home: true, say: "With a one-off script, nobody would have noticed. That gap is why Kubernetes exists.", hold: 6 },
]);
S.start();
