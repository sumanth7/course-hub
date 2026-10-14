// A simulated kubectl for the 3D lessons. Nothing talks to a real cluster: every command reads or
// changes the lesson's own model, which is what the scene draws. A lesson describes its cluster with
//   S.kube({ objects, verbs, examples, ns, welcome })
// objects() → [{ kind, name, ns, part, row: { COL: value }, wide: { COL: value }, labels, manifest, describe, logs }]
// verbs: { scale, set, rollout, delete, helm, istioctl, … } → handler(args, ctx) returning lines, or a stream
// A part becomes editable with fields: { "spec.replicas": { check(v) → error | "", set(v) } } and optional immutable: [paths].
const KUBE = (() => {
  const KINDS = {
    Pod: ["pods", "pod", "po"], Deployment: ["deployments", "deployment", "deploy"], ReplicaSet: ["replicasets", "replicaset", "rs"],
    Service: ["services", "service", "svc"], Endpoints: ["endpoints", "endpoints", "ep"], EndpointSlice: ["endpointslices", "endpointslice"], Node: ["nodes", "node", "no"],
    Ingress: ["ingresses", "ingress", "ing"], NetworkPolicy: ["networkpolicies", "networkpolicy", "netpol"], ConfigMap: ["configmaps", "configmap", "cm"],
    Secret: ["secrets", "secret"], PersistentVolumeClaim: ["persistentvolumeclaims", "persistentvolumeclaim", "pvc"], PersistentVolume: ["persistentvolumes", "persistentvolume", "pv"],
    StorageClass: ["storageclasses", "storageclass", "sc"], StatefulSet: ["statefulsets", "statefulset", "sts"], DaemonSet: ["daemonsets", "daemonset", "ds"],
    Job: ["jobs", "job"], CronJob: ["cronjobs", "cronjob", "cj"], HorizontalPodAutoscaler: ["horizontalpodautoscalers", "horizontalpodautoscaler", "hpa"],
    Role: ["roles", "role"], RoleBinding: ["rolebindings", "rolebinding"], ClusterRole: ["clusterroles", "clusterrole"], ClusterRoleBinding: ["clusterrolebindings", "clusterrolebinding"],
    ServiceAccount: ["serviceaccounts", "serviceaccount", "sa"], Namespace: ["namespaces", "namespace", "ns"], Event: ["events", "event", "ev"],
    TargetGroupBinding: ["targetgroupbindings", "targetgroupbinding", "tgb"], IngressClass: ["ingressclasses", "ingressclass"], PodDisruptionBudget: ["poddisruptionbudgets", "poddisruptionbudget", "pdb"],
    ResourceQuota: ["resourcequotas", "resourcequota", "quota"], LimitRange: ["limitranges", "limitrange", "limits"], CustomResourceDefinition: ["customresourcedefinitions", "customresourcedefinition", "crd"],
    Certificate: ["certificates", "certificate", "cert"], ClusterIssuer: ["clusterissuers", "clusterissuer"], HTTPRoute: ["httproutes", "httproute"], GatewayClass: ["gatewayclasses", "gatewayclass", "gc"],
    Application: ["applications", "application", "app"], Rollout: ["rollouts", "rollout", "ro"], ServiceMonitor: ["servicemonitors", "servicemonitor", "smon"], NodePool: ["nodepools", "nodepool"],
    Gateway: ["gateways", "gateway", "gw"], VirtualService: ["virtualservices", "virtualservice", "vs"], DestinationRule: ["destinationrules", "destinationrule", "dr"],
  };
  const GROUP = { Deployment: "apps", ReplicaSet: "apps", StatefulSet: "apps", DaemonSet: "apps", Job: "batch", CronJob: "batch", Ingress: "networking.k8s.io", NetworkPolicy: "networking.k8s.io", HorizontalPodAutoscaler: "autoscaling", Role: "rbac.authorization.k8s.io", RoleBinding: "rbac.authorization.k8s.io", ClusterRole: "rbac.authorization.k8s.io", ClusterRoleBinding: "rbac.authorization.k8s.io", StorageClass: "storage.k8s.io", EndpointSlice: "discovery.k8s.io", Gateway: "networking.istio.io", VirtualService: "networking.istio.io", DestinationRule: "networking.istio.io", TargetGroupBinding: "elbv2.k8s.aws", IngressClass: "networking.k8s.io", PodDisruptionBudget: "policy", CustomResourceDefinition: "apiextensions.k8s.io", Certificate: "cert-manager.io", ClusterIssuer: "cert-manager.io", HTTPRoute: "gateway.networking.k8s.io", GatewayClass: "gateway.networking.k8s.io", Application: "argoproj.io", Rollout: "argoproj.io", ServiceMonitor: "monitoring.coreos.com", NodePool: "karpenter.sh" };
  const ALIAS = {};
  for (const [k, names] of Object.entries(KINDS)) for (const n of names) ALIAS[n] = k;
  const kindOf = (s) => ALIAS[String(s).toLowerCase().split(".")[0]];
  const plural = (k) => (KINDS[k] ? KINDS[k][0] : String(k).toLowerCase());
  const ref = (k) => (KINDS[k] ? KINDS[k][1] : String(k).toLowerCase()) + (GROUP[k] ? "." + GROUP[k] : "");
  const lc = (k) => (KINDS[k] ? KINDS[k][1] : String(k).toLowerCase());
  const pad = (rows) => { const w = []; rows.forEach((r) => r.forEach((c, i) => (w[i] = Math.max(w[i] || 0, String(c).length)))); return rows.map((r) => r.map((c, i) => (i === r.length - 1 ? String(c) : String(c).padEnd(w[i] + 3))).join("")); };
  const age = (s) => (s < 120 ? Math.max(1, Math.floor(s)) + "s" : s < 7200 ? Math.floor(s / 60) + "m" : Math.floor(s / 3600) + "h");
  // "a b='c d'" → ["a", "b=c d"]
  function words(line) {
    const out = []; let cur = "", q = null, any = false;
    for (const c of line) {
      if (q) { if (c === q) q = null; else cur += c; continue; }
      if (c === '"' || c === "'") { q = c; any = true; continue; }
      if (/\s/.test(c)) { if (cur || any) out.push(cur); cur = ""; any = false; continue; }
      cur += c;
    }
    if (q) throw new Error("unexpected EOF while looking for matching `" + q + "'");
    if (cur || any) out.push(cur);
    return out;
  }
  const TAKES = new Set(["--target-group-arn", "--paths", "--distribution-id", "--id", "--experiment-template-id", "--raw", "--role", "--clusterrole", "--user", "--serviceaccount", "-H", "-p", "--patch", "--from", "-o", "--output", "-n", "--namespace", "-l", "--selector", "-f", "--filename", "--replicas", "--to-revision", "-c", "--container", "--tail", "--field-selector", "--as", "--sort-by", "--image", "--revision", "--set"]);
  function parseArgs(ws) {
    const pos = [], f = {};
    for (let i = 0; i < ws.length; i++) {
      const w = ws[i];
      if (w.startsWith("--")) { const [k, v] = w.split(/=(.*)/s); if (v !== undefined) f[k] = v; else if (TAKES.has(k) && i + 1 < ws.length) f[k] = ws[++i]; else f[k] = true; }
      else if (/^-[a-zA-Z]/.test(w)) { const k = w.slice(0, 2), rest = w.slice(2); if (rest) f[k] = rest.replace(/^=/, ""); else if (TAKES.has(k) && i + 1 < ws.length) f[k] = ws[++i]; else f[k] = true; }
      else pos.push(w);
    }
    const alias = { "--patch": "-p", "--output": "-o", "--namespace": "-n", "--selector": "-l", "--filename": "-f", "--watch": "-w", "--all-namespaces": "-A", "--container": "-c" };
    for (const [a, b] of Object.entries(alias)) if (a in f) f[b] = f[a];
    return { pos, f };
  }
  const CLUSTER = new Set(["Node", "PersistentVolume", "StorageClass", "Namespace", "ClusterRole", "ClusterRoleBinding", "IngressClass", "CustomResourceDefinition", "ClusterIssuer", "GatewayClass", "NodePool"]);
  const g = (o, path, d) => { const v = YAML.get(o, path); return v === undefined || v === null || v === "" ? d : v; };
  // the columns kubectl prints for each kind, read from the object's YAML
  const ROWS = {
    Pod: (d) => { const cs = g(d, "status.containerStatuses", []), st = (cs[0] || {}).state || {}; const why = (st.waiting && st.waiting.reason) || (st.terminated && st.terminated.reason); return { row: { READY: `${d.status ? cs.filter((c) => c.ready === true).length : 1}/${cs.length || 1}`, STATUS: why || g(d, "status.phase", d.status ? "Pending" : "Running"), RESTARTS: cs.reduce((a, c) => a + (+c.restartCount || 0), 0) }, wide: { IP: g(d, "status.podIP", "<none>"), NODE: g(d, "spec.nodeName", "<none>") } }; },
    Deployment: (d) => ({ row: { READY: `${g(d, "status.readyReplicas", 0)}/${g(d, "spec.replicas", 1)}`, "UP-TO-DATE": g(d, "status.updatedReplicas", 0), AVAILABLE: g(d, "status.availableReplicas", 0) }, wide: { CONTAINERS: g(d, "spec.template.spec.containers", []).map((c) => c.name).join(","), IMAGES: g(d, "spec.template.spec.containers", []).map((c) => c.image).join(",") } }),
    ReplicaSet: (d) => ({ row: { DESIRED: g(d, "spec.replicas", 0), CURRENT: g(d, "status.replicas", 0), READY: g(d, "status.readyReplicas", 0) } }),
    StatefulSet: (d) => ({ row: { READY: `${g(d, "status.readyReplicas", 0)}/${g(d, "spec.replicas", 1)}` } }),
    DaemonSet: (d) => ({ row: { DESIRED: g(d, "status.desiredNumberScheduled", 0), CURRENT: g(d, "status.desiredNumberScheduled", 0), READY: g(d, "status.numberReady", 0), "NODE SELECTOR": "<none>" } }),
    Job: (d) => { const done = g(d, "status.succeeded", 0), want = g(d, "spec.completions", 1); return { row: { STATUS: done >= want ? "Complete" : g(d, "status.failed", 0) > 6 ? "Failed" : "Running", COMPLETIONS: `${done}/${want}` } }; },
    CronJob: (d) => ({ row: { SCHEDULE: g(d, "spec.schedule", ""), SUSPEND: String(g(d, "spec.suspend", false)), ACTIVE: 0 } }),
    Service: (d) => { const p = g(d, "spec.ports", [{}])[0] || {}; return { row: { TYPE: g(d, "spec.type", "ClusterIP"), "CLUSTER-IP": g(d, "spec.clusterIP", "<none>"), "EXTERNAL-IP": g(d, "status.loadBalancer.ingress[0].ip", g(d, "spec.type") === "LoadBalancer" ? "<pending>" : "<none>"), "PORT(S)": `${p.port || 80}${p.nodePort ? ":" + p.nodePort : ""}/TCP` }, wide: { SELECTOR: Object.entries(g(d, "spec.selector", {})).map(([a, b]) => `${a}=${b}`).join(",") } }; },
    Ingress: (d) => ({ row: { CLASS: g(d, "spec.ingressClassName", "<none>"), HOSTS: g(d, "spec.rules", []).map((r) => r.host).join(","), ADDRESS: g(d, "status.loadBalancer.ingress[0].ip", g(d, "status.loadBalancer.ingress[0].hostname", "")), PORTS: g(d, "spec.tls") ? "80, 443" : "80" } }),
    NetworkPolicy: (d) => ({ row: { "POD-SELECTOR": Object.entries(g(d, "spec.podSelector.matchLabels", {})).map(([a, b]) => `${a}=${b}`).join(",") || "<none>" } }),
    ConfigMap: (d) => ({ row: { DATA: Object.keys(g(d, "data", {})).length } }),
    Secret: (d) => ({ row: { TYPE: g(d, "type", "Opaque"), DATA: Object.keys(g(d, "data", {})).length } }),
    Node: (d) => ({ row: { STATUS: (g(d, "status.conditions", []).find((c) => c.type === "Ready") || {}).status === "True" ? "Ready" : "NotReady", ROLES: "<none>", VERSION: "v1.31.2" } }),
    PersistentVolumeClaim: (d) => ({ row: { STATUS: g(d, "status.phase", "Pending"), VOLUME: g(d, "spec.volumeName", ""), CAPACITY: g(d, "status.phase") === "Bound" ? g(d, "spec.resources.requests.storage", "") : "", "ACCESS MODES": "RWO", STORAGECLASS: g(d, "spec.storageClassName", "") } }),
    PersistentVolume: (d) => ({ row: { CAPACITY: g(d, "spec.capacity.storage", ""), "ACCESS MODES": "RWO", "RECLAIM POLICY": g(d, "spec.persistentVolumeReclaimPolicy", "Delete"), STATUS: g(d, "status.phase", "Available"), CLAIM: g(d, "spec.claimRef.name") ? `${g(d, "spec.claimRef.namespace", "default")}/${g(d, "spec.claimRef.name")}` : "", STORAGECLASS: g(d, "spec.storageClassName", "") } }),
    StorageClass: (d) => ({ row: { PROVISIONER: g(d, "provisioner", ""), RECLAIMPOLICY: g(d, "reclaimPolicy", "Delete"), VOLUMEBINDINGMODE: g(d, "volumeBindingMode", "Immediate") } }),
    HorizontalPodAutoscaler: (d) => ({ row: { REFERENCE: `${g(d, "spec.scaleTargetRef.kind", "Deployment")}/${g(d, "spec.scaleTargetRef.name", "")}`, TARGETS: `cpu: ${g(d, "status.currentMetrics[0].resource.current.averageUtilization", "<unknown>")}%/${g(d, "spec.metrics[0].resource.target.averageUtilization", 50)}%`, MINPODS: g(d, "spec.minReplicas", 1), MAXPODS: g(d, "spec.maxReplicas", 1), REPLICAS: g(d, "status.currentReplicas", 0) } }),
    RoleBinding: (d) => ({ row: { ROLE: `${g(d, "roleRef.kind", "Role")}/${g(d, "roleRef.name", "")}` } }),
    ClusterRoleBinding: (d) => ({ row: { ROLE: `ClusterRole/${g(d, "roleRef.name", "")}` } }),
    ServiceAccount: () => ({ row: { SECRETS: 0 } }),
    Namespace: () => ({ row: { STATUS: "Active" } }),
    EndpointSlice: (d) => ({ row: { ADDRESSTYPE: g(d, "addressType", "IPv4"), PORTS: g(d, "ports", []).map((p) => p.port).join(","), ENDPOINTS: g(d, "endpoints", []).flatMap((e) => e.addresses || []).join(",") || "<unset>" } }),
    VirtualService: (d) => ({ row: { GATEWAYS: JSON.stringify(g(d, "spec.gateways", [])).replace(/"/g, '"'), HOSTS: JSON.stringify(g(d, "spec.hosts", [])) } }),
    DestinationRule: (d) => ({ row: { HOST: g(d, "spec.host", "") } }),
    TargetGroupBinding: (d) => ({ row: { "SERVICE-NAME": g(d, "spec.serviceRef.name", ""), "SERVICE-PORT": g(d, "spec.serviceRef.port", ""), "TARGET-TYPE": g(d, "spec.targetType", "") } }),
    IngressClass: (d) => ({ row: { CONTROLLER: g(d, "spec.controller", ""), PARAMETERS: "<none>" } }),
    PodDisruptionBudget: (d) => ({ row: { "MIN AVAILABLE": g(d, "spec.minAvailable", "N/A"), "MAX UNAVAILABLE": g(d, "spec.maxUnavailable", "N/A"), "ALLOWED DISRUPTIONS": g(d, "status.disruptionsAllowed", 0) } }),
    Certificate: (d) => ({ row: { READY: (g(d, "status.conditions", []).find((c) => c.type === "Ready") || {}).status || "False", SECRET: g(d, "spec.secretName", "") } }),
    HTTPRoute: (d) => ({ row: { HOSTNAMES: JSON.stringify(g(d, "spec.hostnames", [])) } }),
    Application: (d) => ({ row: { "SYNC STATUS": g(d, "status.sync.status", "Unknown"), HEALTH: g(d, "status.health.status", "Unknown") } }),
    Rollout: (d) => ({ row: { DESIRED: g(d, "spec.replicas", 1), CURRENT: g(d, "status.replicas", 0), "UP-TO-DATE": g(d, "status.updatedReplicas", 0), AVAILABLE: g(d, "status.availableReplicas", 0) } }),
  };
  const SKIP = /^(status\b|metadata\.(uid|annotations|resourceVersion|creationTimestamp|generation|managedFields|ownerReferences)\b)/;

  function install(S) {
    let cfg = null;
    const born = {}, events = [], clock = () => performance.now() / 1000;
    const t0 = clock() - 300; // the cluster has been up a while when the page opens
    S.event = (type, reason, obj, msg, from) => { events.push({ t: clock(), type, reason, obj, msg, from }); if (events.length > 300) events.shift(); };
    S.kube = (c = {}) => {
      cfg = { examples: [], verbs: {}, tools: {}, ...c };
      if (!cfg.ns) { const count = {}; for (const o of autoObjects()) if (o.ns) count[o.ns] = (count[o.ns] || 0) + 1; cfg.ns = Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] || "default"; }
      if (!c.examples) { const kinds = [...new Set(objs().map((o) => o.kind))]; const first = objs().find((o) => o.part && S.PARTS[o.part] && fieldsOf(S.PARTS[o.part], o.kind, o.name)); cfg.examples = ["kubectl get all", ...kinds.slice(0, 5).map((k) => `kubectl get ${plural(k)}${k === "Pod" ? " -o wide" : ""}`), ...(objs()[0] ? [`kubectl describe ${lc(objs()[0].kind)} ${objs()[0].name}`] : []), ...(first ? [`kubectl edit ${lc(first.kind)}/${first.name}`] : []), "kubectl get events"]; }
      if (!cfg.editable) { const ed = objs().filter((o) => o.part && S.PARTS[o.part] && fieldsOf(S.PARTS[o.part], o.kind, o.name)).map((o) => `${lc(o.kind)}/${o.name}`); if (ed.length) cfg.editable = ed.join(", "); }
      mountShell();
      setTimeout(() => { try { objs().forEach((o) => { born[keyOf(o)] ??= t0; }); } catch (e) {} }); // what exists at load has been up a while
    };
    S.kubeReady = () => !!cfg;
    // objects come from the lesson, plus every API object found in a part's YAML
    function autoObjects() {
      const out = [];
      for (const p of Object.values(S.PARTS)) {
        let text; try { text = val(p.manifest); } catch (e) { continue; }
        if (!text || typeof text !== "string") continue;
        const segs = text.split(/^---\s*$/m);
        for (const seg of segs) {
          let d; try { d = YAML.parse(seg); } catch (e) { continue; }
          if (!d || typeof d !== "object" || !d.apiVersion || !KINDS[d.kind] || !d.metadata || !d.metadata.name) continue;
          const r = (ROWS[d.kind] || (() => ({})))(d);
          out.push({ kind: d.kind, name: String(d.metadata.name), ns: CLUSTER.has(d.kind) ? "" : d.metadata.namespace || "default", part: p.id, labels: d.metadata.labels || {}, manifest: segs.length > 1 ? seg.replace(/^\n+/, "") : undefined, row: r.row, wide: r.wide, old: true, auto: true });
        }
      }
      return out;
    }
    const objs = () => {
      const mine = (cfg && cfg.objects ? cfg.objects() : []).map((o) => ({ ns: CLUSTER.has(o.kind) ? "" : cfg.ns, ...o }));
      const seen = new Set(mine.map((o) => o.kind + "/" + o.ns + "/" + o.name));
      const auto = new Map();
      // the same object can show in several parts' YAML: keep the one you can edit
      const editable = (o) => !!(S.PARTS[o.part] && fieldsOf(S.PARTS[o.part], o.kind, o.name));
      for (const o of cfg.auto === false ? [] : autoObjects()) { const k = o.kind + "/" + o.ns + "/" + o.name; if (seen.has(k)) continue; if (!auto.has(k) || (!editable(auto.get(k)) && editable(o))) auto.set(k, o); }
      mine.push(...auto.values());
      return mine;
    };
    const val = (v) => (typeof v === "function" ? v() : v);
    const manifestOf = (o) => val(o.manifest) || (o.part && val(S.PARTS[o.part]?.manifest)) || "";
    const keyOf = (o) => o.kind + "/" + o.ns + "/" + o.name;
    const ageOf = (o) => { const key = keyOf(o); if (!(key in born)) born[key] = clock(); return age(clock() - born[key]); };
    const matchLabels = (o, sel) => !sel || String(sel).split(",").every((p) => { const [k, v] = p.split(/!?=/); const want = (o.labels || {})[k]; return p.includes("!=") ? want !== v : v === undefined ? want !== undefined : want === v; });
    const find = (kind, name, ns) => objs().find((o) => o.kind === kind && o.name === name && (CLUSTER.has(kind) || !ns || o.ns === ns));
    const notFound = (kind, name) => `Error from server (NotFound): ${ref(kind).replace(/^(\w+)/, (m) => plural(kind))} "${name}" not found`;

    // ---------- apply: YAML → the lesson's model ----------
    const fieldsOf = (p, kind, name) => (typeof p.fields === "function" ? p.fields(kind, name) : p.fields);
    function applyDoc(doc, partId, beforeText) {
      if (!doc || typeof doc !== "object" || Array.isArray(doc)) return { err: "error: error validating data: the document is not an object" };
      const kind = doc.kind, name = doc.metadata && doc.metadata.name;
      let o = null, p = null;
      if (partId) { p = S.PARTS[partId]; o = { kind: kind || p.kind, name: name || p.id }; }
      else {
        if (!kind || !doc.apiVersion) return { err: `error: error validating data: [${[!doc.apiVersion && "apiVersion not set", !kind && "kind not set"].filter(Boolean).join(", ")}]` };
        const k = kindOf(kind);
        o = k && objs().find((x) => x.kind === k && x.name === name);
        if (!o) return { err: `Error from server (Forbidden): this lesson only models the objects in the scene, so it can't create ${k ? lc(k) : kind} "${name}". Try kubectl get all.` };
        p = o.part && S.PARTS[o.part];
      }
      const fields = p && fieldsOf(p, kindOf(o.kind) || o.kind, o.name);
      if (!fields) return { err: `error: ${o.kind ? lc(kindOf(o.kind) || "Pod") : "object"} "${o.name}" can't be changed in this lesson${cfg && cfg.editable ? `; you can edit ${cfg.editable}` : ""}` };
      const before = YAML.flatten(YAML.parse(beforeText ?? (partId ? val(p.manifest) : manifestOf(o))) || {}), after = YAML.flatten(doc);
      const k = kindOf(o.kind) || o.kind, label = `${ref(k) || o.kind}/${o.name}`;
      if (name && before["metadata.name"] && name !== before["metadata.name"]) return { err: `Error from server (Forbidden): this lesson can't create ${lc(k)} "${name}"; to change ${lc(k)}/${before["metadata.name"]} keep metadata.name: ${before["metadata.name"]}` };
      const fieldFor = (path) => fields[path] || Object.entries(fields).find(([k]) => k.endsWith("*") && path.startsWith(k.slice(0, -1)))?.[1];
      const paths = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((x) => (!SKIP.test(x) || fieldFor(x)) && String(before[x]) !== String(after[x]));
      const errs = [], sets = [], ignored = [];
      for (const path of paths) {
        if ((p.immutable || []).some((im) => path === im || path.startsWith(im + ".") || path.startsWith(im + "["))) { errs.push(`${path}: Invalid value: ${JSON.stringify(after[path] ?? null)}: field is immutable`); continue; }
        // a field is matched exactly, or by a "prefix.*" pattern (e.g. "metadata.labels.*")
        const fd = fieldFor(path);
        if (!fd) { ignored.push(path); continue; }
        const v = after[path];
        if (v === undefined && !fd.optional) { errs.push(`${path}: Required value`); continue; }
        const e = fd.check ? fd.check(v, after, path) : "";
        if (e) errs.push(`${path}: Invalid value: ${JSON.stringify(v)}: ${e}`); else sets.push([fd, v, path]);
      }
      if (errs.length) return { err: `The ${o.kind} "${o.name}" is invalid: ${errs.length === 1 ? errs[0] : "\n" + errs.map((e) => "* " + e).join("\n")}` };
      sets.forEach(([fd, v, path]) => fd.set(v, after, path));
      if (sets.length) p.applied?.(after);
      if (sets.length) S.stopTour?.();
      const lines = [p.appliedMsg ? p.appliedMsg(sets.length > 0) : `${label} ${sets.length ? "configured" : "unchanged"}`];
      if (ignored.length) lines.push(`# accepted, but this lesson's model doesn't use: ${ignored.slice(0, 4).join(", ")}${ignored.length > 4 ? ", …" : ""}`);
      return { ok: lines.join("\n"), changed: sets.length > 0 };
    }
    S.applyYaml = (text, partId) => {
      let docs;
      try { docs = YAML.parseAll(text); } catch (e) { return { err: e.message }; }
      if (!docs.length) return { err: "error: no objects passed to apply" };
      const out = [], bad = [];
      for (const d of docs) { const r = applyDoc(d, partId && docs.length === 1 ? partId : null); if (r.err) bad.push(r.err); else out.push(r.ok); }
      S.renderPanel?.();
      return bad.length ? { err: [...out, ...bad].join("\n") } : { ok: out.join("\n") };
    };

    // ---------- get / describe / logs ----------
    function table(list, f, kind) {
      if (!list.length) return [kind && CLUSTER.has(kind) ? "No resources found" : `No resources found in ${f["-A"] ? "any" : f["-n"] || cfg.ns} namespace.`];
      const wide = f["-o"] === "wide", showNs = f["-A"] && !list.every((o) => CLUSTER.has(o.kind)), showLabels = f["--show-labels"];
      const cols = ["NAME", ...Object.keys(list[0].row || {}), ...(list[0].row && "AGE" in list[0].row ? [] : ["AGE"]), ...(wide ? Object.keys(list[0].wide || {}) : []), ...(showLabels ? ["LABELS"] : [])].filter((c, i, a) => a.indexOf(c) === i);
      const rows = list.map((o) => { const r = { NAME: (kind === "all" ? lc(o.kind) + "/" : "") + o.name, AGE: ageOf(o), ...(o.row || {}), ...(wide ? o.wide || {} : {}), LABELS: Object.entries(o.labels || {}).map(([k, v]) => `${k}=${v}`).join(",") || "<none>" }; return [...(showNs ? [o.ns] : []), ...cols.map((c) => (r[c] === undefined || r[c] === "" ? "<none>" : r[c]))]; });
      return pad([[...(showNs ? ["NAMESPACE"] : []), ...cols], ...rows]);
    }
    function getList(kinds, names, f) {
      const ns = f["-n"] || cfg.ns, all = f["-A"];
      return objs().sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)).filter((o) => kinds.includes(o.kind) && (all || CLUSTER.has(o.kind) || o.ns === ns) && (!names.length || names.includes(o.name)) && matchLabels(o, f["-l"]));
    }
    function eventsTable(filter) {
      const list = events.filter(filter || (() => true)).slice(-20);
      if (!list.length) return ["No events yet. Change something and look again."];
      return pad([["LAST SEEN", "TYPE", "REASON", "OBJECT", "MESSAGE"], ...list.map((e) => [age(clock() - e.t), e.type, e.reason, e.obj, e.msg])]);
    }
    function get(pos, f) {
      if (!pos.length) return { err: 'You must specify the type of resource to get. Use "kubectl api-resources" for a complete list of supported resources.' };
      let [what, ...names] = pos;
      if (what.includes("/")) { names = pos.map((x) => x.split("/")[1]); what = pos[0].split("/")[0]; }
      if (what === "all") return { lines: table(getList(["Pod", "Service", "Deployment", "ReplicaSet", "StatefulSet", "DaemonSet", "Job", "CronJob", "HorizontalPodAutoscaler"], [], f), f, "all") };
      const kinds = what.split(",").map(kindOf);
      const badKind = what.split(",").find((w) => !kindOf(w));
      if (badKind) return { err: `error: the server doesn't have a resource type "${badKind}"` };
      if (kinds[0] === "Event") return { lines: eventsTable() };
      const list = getList(kinds, names, f);
      const missing = names.filter((n) => !list.some((o) => o.name === n));
      if (missing.length) return { err: missing.map((n) => notFound(kinds[0], n)).join("\n") };
      if (f["-o"] === "yaml" || f["-o"] === "json") {
        const ys = list.map(manifestOf).filter(Boolean);
        if (!ys.length) return { lines: [`# no YAML for this object in the lesson`] };
        if (f["-o"] === "json") { try { return { lines: ys.map((y) => JSON.stringify(YAML.parse(y), null, 2)).join("\n").split("\n") }; } catch (e) { return { err: e.message }; } }
        return { yaml: ys.join("\n---\n") };
      }
      if (f["-o"] === "name") return { lines: list.map((o) => `${ref(o.kind)}/${o.name}`) };
      if (String(f["-o"] || "").startsWith("jsonpath")) return { err: "error: jsonpath output isn't simulated here; try -o yaml or -o wide" };
      const multi = kinds.length > 1;
      return { lines: multi ? kinds.flatMap((k, i) => [...(i ? [""] : []), ...table(list.filter((o) => o.kind === k).map((o) => ({ ...o, name: lc(k) + "/" + o.name })), f)]) : table(list, f, kinds[0]), watch: f["-w"] ? () => table(getList(kinds, names, f), f, kinds[0]) : null };
    }
    function describe(pos, f) {
      if (!pos.length) return { err: 'You must specify the type of resource to describe. Use "kubectl api-resources" for a complete list of supported resources.' };
      let [what, ...names] = pos;
      if (what.includes("/")) { names = [what.split("/")[1]]; what = what.split("/")[0]; }
      const k = kindOf(what);
      if (!k) return { err: `error: the server doesn't have a resource type "${what}"` };
      const list = getList([k], names, f);
      if (!list.length) return { err: names.length ? notFound(k, names[0]) : `No resources found in ${cfg.ns} namespace.` };
      return { lines: list.flatMap((o, n) => {
        const p = o.part && S.PARTS[o.part], facts = (p && val(p.facts)) || [];
        const head = [["Name:", o.name], ...(CLUSTER.has(k) ? [] : [["Namespace:", o.ns]]), ["Labels:", Object.entries(o.labels || {}).map(([a, b]) => `${a}=${b}`).join("\n" + " ".repeat(16)) || "<none>"]];
        const own = val(o.describe) || facts.map(([a, b]) => [a + ":", String(b).replace(/<[^>]+>/g, "")]);
        const evs = events.filter((e) => e.obj === `${lc(k)}/${o.name}`).slice(-8);
        return [...(n ? [""] : []), ...head.concat(own).map(([a, b]) => (b === undefined ? a : a.padEnd(Math.max(16, a.length + 1)) + b)), "Events:", ...(evs.length ? pad([["  Type", "Reason", "Age", "From", "Message"], ...evs.map((e) => ["  " + e.type, e.reason, age(clock() - e.t), e.from || (k === "Pod" ? "kubelet" : lc(k) + "-controller"), e.msg])]) : ["  <none>"])];
      }) };
    }
    function logs(pos, f) {
      let name = pos[0] || (typeof f["-p"] === "string" ? f["-p"] : undefined); // -p is --previous here
      if (!name) return { err: "error: expected 'logs POD_NAME'" };
      let k = "Pod";
      if (name.includes("/")) { k = kindOf(name.split("/")[0]); name = name.split("/")[1]; }
      let o = find(k, name, f["-n"] || cfg.ns);
      if (o && k !== "Pod") o = objs().find((x) => x.kind === "Pod" && x.logs && Object.entries(o.labels || {}).every(([a, b]) => (x.labels || {})[a] === b));
      if (!o) return { err: notFound(k, name) };
      if (!o.logs) { const st = (o.row || {}).STATUS; return st && st !== "Running" && st !== "Completed" ? { err: `Error from server (BadRequest): container in pod "${o.name}" is waiting to start: ${st}` } : { lines: [`# this lesson doesn't simulate log lines for ${o.name}; describe it or read its YAML instead`] }; }
      const ls = val(o.logs) || [];
      return { lines: ls.slice(f["--tail"] ? -+f["--tail"] : 0), watch: f["-f"] ? () => val(o.logs) || [] : null, follow: !!f["-f"] };
    }
    function help() {
      return [
        "This is a simulated kubectl: it reads and changes this lesson's model, which the 3D scene draws.",
        "",
        "  kubectl get <type> [name] [-o wide|yaml|json|name] [-l key=value] [-w] [-A] [--show-labels]",
        "  kubectl describe <type> <name>        kubectl logs <pod> [-f]",
        "  kubectl edit <type>/<name>            kubectl apply -f -   (opens the editor)",
        "  kubectl get events                     kubectl api-resources",
        ...(cfg.help || Object.keys(cfg.verbs).map((v) => `kubectl ${v} …`)).map((l) => "  " + l),
        ...Object.keys(cfg.tools).filter(() => !cfg.help).map((t) => `  ${t} …`),
        "",
        "Keys: ↑ ↓ history · Tab completes · Ctrl+C stops a watch · Ctrl+L clears",
      ];
    }
    function editCmd(pos, f) {
      let [what, name] = pos;
      if (!what) { const first = objs().find((o) => o.part && S.PARTS[o.part] && fieldsOf(S.PARTS[o.part], o.kind, o.name)); if (!first) return { err: "error: nothing in this lesson can be edited" }; what = first.kind; name = first.name; }
      if (what.includes("/")) [what, name] = what.split("/");
      const k = kindOf(what);
      if (!k) return { err: `error: the server doesn't have a resource type "${what}"` };
      const o = name ? find(k, name, f["-n"] || cfg.ns) : getList([k], [], f)[0];
      if (!o) return { err: notFound(k, name || "") };
      if (!o.part || !S.PARTS[o.part] || !fieldsOf(S.PARTS[o.part], k, o.name)) return { err: `error: ${lc(k)}/${o.name} can't be edited in this lesson${cfg.editable ? `. Try: kubectl edit ${cfg.editable}` : ""}` };
      S.editPart(o.part);
      return { lines: [`Editing ${lc(k)}/${o.name} in the panel → change a field, then press Apply (⌘/Ctrl+Enter).`] };
    }
    function run(line) {
      const ws = words(line);
      if (!ws.length) return {};
      const [cmd, ...rest] = ws;
      if (cmd === "clear") return { clear: true };
      if (cmd === "help" || cmd === "?") return { lines: help() };
      if (cmd === "k") return run("kubectl " + line.trim().slice(1));
      if (cfg.tools[cmd]) return out(cfg.tools[cmd](parseArgs(rest), ctx));
      if (cmd !== "kubectl") return { err: `${cmd}: command not found. This terminal runs ${["kubectl", ...Object.keys(cfg.tools)].join(", ")}. Type help.` };
      const { pos, f } = parseArgs(rest);
      const verb = pos.shift();
      if (!verb || f["-h"] || f["--help"]) return { lines: help() };
      if (cfg.verbs[verb]) { const r = cfg.verbs[verb]({ pos, f }, ctx); if (r !== undefined) return out(r); }
      if (verb === "get") { const r = get(pos, f); if (!r.err) cfg.onGet?.(pos, f); return r; }
      if (verb === "describe") return describe(pos, f);
      if (verb === "logs") return logs(pos, f);
      if (verb === "edit") return editCmd(pos, f);
      if (verb === "apply" || verb === "create" && f["-f"]) {
        if (!f["-f"]) return { err: "error: must specify one of -f and -k" };
        if (f["-f"] !== "-") return { err: `error: the path "${f["-f"]}" does not exist. Files aren't simulated; use kubectl apply -f - and paste YAML in the editor.` };
        return editCmd([], f);
      }
      if (verb === "api-resources") return { lines: pad([["NAME", "SHORTNAMES", "KIND"], ...Object.entries(KINDS).map(([k, n]) => [n[0], n.slice(2).join(","), k])]) };
      if (verb === "version") return { lines: ["Client Version: v1.31.2", "Server Version: v1.31.2 (simulated)"] };
      if (verb === "cluster-info") return { lines: ["Kubernetes control plane is running at https://10.0.0.1:6443 (simulated)"] };
      if (verb === "explain") return { lines: [`For field docs see https://kubernetes.io/docs/reference/kubernetes-api/ (explain isn't simulated).`] };
      if (GENERIC[verb]) return out(GENERIC[verb]({ pos, f }, ctx));
      if (["create", "run", "expose", "patch", "replace", "label", "annotate", "cordon", "drain", "taint", "exec", "port-forward", "cp", "top", "auth", "autoscale", "set", "scale", "rollout", "delete"].includes(verb)) return { err: `kubectl ${verb} isn't part of this lesson. Type help for what works here.` };
      return { err: `error: unknown command "${verb}" for "kubectl"\nRun 'kubectl --help' for usage.` };
    }
    // label, scale and set image work on any object whose part makes those fields editable
    function target(pos, f) {
      let [what, name] = pos;
      if (what && what.includes("/")) [what, name] = what.split("/");
      const k = kindOf(what || "");
      if (!k) return { err: what ? `error: the server doesn't have a resource type "${what}"` : "error: resource(s) were provided, but no name was specified" };
      const o = name && find(k, name, f["-n"] || cfg.ns);
      if (!o) return { err: name ? notFound(k, name) : "error: resource(s) were provided, but no name was specified" };
      return { o, k, rest: pos.slice(pos[0].includes("/") ? 1 : 2) };
    }
    function editVia(o, mutate) {
      const text = manifestOf(o);
      let d; try { d = YAML.parse(text); } catch (e) { return { err: e.message }; }
      const msg = mutate(d);
      if (msg && msg.err) return msg;
      const r = applyDoc(d, null, text);
      if (r.err) return r;
      S.renderPanel?.();
      return { lines: [msg || r.ok] };
    }
    const merge = (a, b) => { for (const [k, v] of Object.entries(b)) { if (v === null) delete a[k]; else if (v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object") merge(a[k], v); else a[k] = v; } return a; };
    const GENERIC = {
      patch({ pos, f }) {
        const t = target(pos, f); if (t.err) return t;
        if (!f["-p"] || f["-p"] === true) return { err: "error: must specify --patch or --patch-file containing the contents of the patch" };
        let pt; try { pt = JSON.parse(f["-p"]); } catch (e) { try { pt = YAML.parse(f["-p"]); } catch (e2) { return { err: `error: unable to parse "${f["-p"]}": ${e.message}` }; } }
        return editVia(t.o, (d) => { merge(d, pt); return `${ref(t.k)}/${t.o.name} patched`; });
      },
      label({ pos, f }) {
        const t = target(pos, f); if (t.err) return t;
        const changes = t.rest; if (!changes.length) return { err: "error: at least one label update is required" };
        let applied = [];
        return editVia(t.o, (d) => {
          d.metadata.labels = d.metadata.labels || {};
          for (const c of changes) {
            if (c.endsWith("-")) { delete d.metadata.labels[c.slice(0, -1)]; applied.push(c); continue; }
            const [k, v] = c.split("=");
            if (v === undefined) return { err: `error: invalid label spec: ${c}` };
            if (k in d.metadata.labels && String(d.metadata.labels[k]) !== v && !f["--overwrite"]) return { err: `error: '${k}' already has a value (${d.metadata.labels[k]}), and --overwrite is false` };
            d.metadata.labels[k] = v; applied.push(c);
          }
          return `${ref(t.k)}/${t.o.name} ${changes.some((c) => c.endsWith("-")) && changes.length === 1 ? "unlabeled" : "labeled"}`;
        });
      },
      scale({ pos, f }) {
        const t = target(pos, f); if (t.err) return t;
        if (f["--replicas"] === undefined) return { err: 'error: required flag(s) "replicas" not set' };
        const n = Number(f["--replicas"]);
        return editVia(t.o, (d) => { if (!d.spec || !("replicas" in d.spec)) return { err: `error: ${lc(t.k)}/${t.o.name} can't be scaled` }; d.spec.replicas = Number.isInteger(n) ? n : f["--replicas"]; return `${ref(t.k)}/${t.o.name} scaled`; });
      },
      set({ pos, f }) {
        if (pos[0] !== "image") return { err: `kubectl set ${pos[0] || ""} isn't part of this lesson` };
        const t = target(pos.slice(1), f); if (t.err) return t;
        const pair = t.rest.find((x) => x.includes("="));
        if (!pair) return { err: "error: at least one image update is required" };
        const [ctr, image] = pair.split("=");
        return editVia(t.o, (d) => { const cs = YAML.get(d, "spec.template.spec.containers") || YAML.get(d, "spec.containers") || []; const c = cs.find((x) => x.name === ctr || ctr === "*"); if (!c) return { err: `error: unable to find container named "${ctr}"` }; c.image = image; return `${ref(t.k)}/${t.o.name} image updated`; });
      },
    };
    const out = (r) => (r == null ? {} : typeof r === "string" ? { lines: r.split("\n") } : Array.isArray(r) ? { lines: r } : r);
    const ctx = { editVia, target, GENERIC, find, objs, notFound, kindOf, lc, ref, pad, age, events: () => events, eventsTable, getList };
    S.kubectl = (line) => run(line);

    // ---------- the terminal ----------
    let term = null;
    function mountShell() {
      if (term) return;
      const host = document.querySelector(".below");
      if (!host) return;
      const sec = document.createElement("section");
      sec.className = "term";
      sec.setAttribute("aria-label", "Simulated terminal");
      sec.innerHTML = `<header><span>Terminal · simulated kubectl</span><span class="term-note">changes here move the scene</span></header><div class="term-out" role="log" aria-live="polite"></div><form class="term-in"><label><span class="term-ps">$</span><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Command" placeholder="kubectl get pods"></label></form><div class="term-ex">${cfg.examples.map((e) => `<button type="button" data-ex="${e.replace(/"/g, "&quot;")}">${e.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</button>`).join("")}</div>`;
      // the terminal sits under the 3D view, beside the inspector; on narrow screens it follows the panel
      const viewer = document.getElementById("viewer");
      if (viewer) { const col = document.createElement("div"); col.className = "leftcol"; viewer.before(col); col.append(viewer, sec); } else host.prepend(sec);
      const outEl = sec.querySelector(".term-out"), input = sec.querySelector("input");
      const hist = []; let hi = 0, watch = null;
      const esc = (x) => String(x).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
      const print = (text, cls = "") => { const d = document.createElement("div"); d.className = "tl " + cls; d.innerHTML = cls === "yaml" ? S.highlight(text) : esc(text); outEl.append(d); while (outEl.childNodes.length > 400) outEl.firstChild.remove(); outEl.scrollTop = outEl.scrollHeight; };
      const stopWatch = (quiet) => { if (watch) { clearInterval(watch.id); watch = null; if (!quiet) print("^C", "dim"); } };
      term = { print, stopWatch };
      S.printTerm = (text, cls) => String(text).split("\n").forEach((l) => print(l, cls || ""));
      S.shellEcho = (cmd, note) => { print(`$ ${cmd}${note ? "   # " + note : ""}`, "cmd echo"); };
      if (cfg.welcome) cfg.welcome.split("\n").forEach((l) => print(l, "dim"));
      function exec(line) {
        stopWatch(true);
        print("$ " + line, "cmd");
        if (line.trim()) { hist.push(line); hi = hist.length; }
        let r;
        try { r = run(line.trim()); } catch (e) { r = { err: e.message || String(e) }; }
        if (r.clear) { outEl.innerHTML = ""; return; }
        if (r.err) r.err.split("\n").forEach((l) => print(l, "err"));
        if (r.yaml) print(r.yaml, "yaml");
        (r.lines || []).forEach((l) => print(l, r.tone || ""));
        if (r.watch || r.stream) {
          let last = (r.lines || []).join("\n"), n = 0;
          const id = setInterval(() => {
            n++;
            if (r.stream) { const s = r.stream(); (s.lines || []).forEach((l) => print(l, s.tone || "")); if (s.done || n > 600) stopWatch(true); return; }
            const now = r.watch();
            if (r.follow) { const prev = last.split("\n"); now.slice(prev.length).forEach((l) => print(l)); last = now.join("\n"); }
            else { const key = (l) => l.replace(/\s\d+[smh](?=\s|$)/g, " "); const prev = new Set(last.split("\n").map(key)); now.slice(1).filter((l) => !prev.has(key(l))).forEach((l) => print(l)); last = now.join("\n"); } // AGE ticking alone is not a change
            if (n > 400) { stopWatch(true); print("# watch stopped after a while; run it again to keep watching", "dim"); }
          }, r.stream ? (r.every || 0.5) * 1000 : 500);
          watch = { id };
          if (!r.stream) print("# watching… Ctrl+C or Esc to stop", "dim");
        }
        S.renderPanel?.();
      }
      S.runCommand = (line) => exec(line);
      sec.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); const v = input.value; input.value = ""; exec(v); });
      sec.querySelectorAll("[data-ex]").forEach((b) => b.addEventListener("click", () => { input.value = b.dataset.ex; input.focus(); }));
      input.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp") { e.preventDefault(); if (hi > 0) input.value = hist[--hi]; }
        else if (e.key === "ArrowDown") { e.preventDefault(); hi = Math.min(hist.length, hi + 1); input.value = hist[hi] || ""; }
        else if ((e.key === "c" && e.ctrlKey) || e.key === "Escape") { if (watch) { e.preventDefault(); stopWatch(); } else if (e.ctrlKey) { print("$ " + input.value + "^C", "cmd"); input.value = ""; } }
        else if (e.key === "l" && e.ctrlKey) { e.preventDefault(); outEl.innerHTML = ""; }
        else if (e.key === "Tab") { e.preventDefault(); complete(); }
      });
      function complete() {
        const v = input.value, ws = v.split(" "), last = ws[ws.length - 1];
        let pool;
        if (ws.length === 1) pool = ["kubectl", ...Object.keys(cfg.tools), "help", "clear"];
        else if (ws.length === 2 && ws[0] === "kubectl") pool = ["get", "describe", "logs", "edit", "apply", ...Object.keys(cfg.verbs)];
        else if (ws.length === 3 && ws[0] === "kubectl") pool = [...new Set(objs().map((o) => plural(o.kind))), "all", "events"];
        else { const k = kindOf(ws[2] || ""); pool = objs().filter((o) => !k || o.kind === k).map((o) => o.name); }
        const hits = pool.filter((p) => p.startsWith(last));
        if (hits.length === 1) { ws[ws.length - 1] = hits[0]; input.value = ws.join(" ") + " "; }
        else if (hits.length > 1) { let c = hits[0]; for (const h of hits) while (!h.startsWith(c)) c = c.slice(0, -1); if (c.length > last.length) { ws[ws.length - 1] = c; input.value = ws.join(" "); } else print(hits.join("   "), "dim"); }
      }
    }
  }
  return { install, words, parseArgs, kindOf };
})();
