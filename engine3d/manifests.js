// Kubernetes manifests for the inspector: what `kubectl get <kind> <name> -o yaml` would show,
// trimmed to the fields that matter and annotated with "# ←" notes. Every builder takes live values,
// so the status block follows the scene.
const yq = (v) => (v === undefined || v === null || v === "" ? '""' : /^[\w./:@-]+$/.test(String(v)) ? String(v) : JSON.stringify(String(v)));
const labelsY = (labels = {}, pad = "    ") => Object.entries(labels).map(([k, v]) => `${pad}${k}: ${yq(v)}`).join("\n");
const meta = ({ name, ns = "default", labels, uid = "3f9c1e2a", extra = "" }, cluster = false) =>
  `metadata:\n  name: ${name}\n${cluster ? "" : `  namespace: ${ns}\n`}` + (labels && Object.keys(labels).length ? `  labels:\n${labelsY(labels)}\n` : "") + `  uid: ${uid}-…\n` + extra;
const ago = (s) => `2026-10-13T16:${String(20 + (s % 39)).padStart(2, "0")}:0${s % 10}Z`;

const K = {
  pod({ name, ns = "default", labels = { app: "web" }, image = "web:1.4.2", node = "", phase = "Running", ip = "", ready = true, restarts = 0, owner, containers, probes = false, resources, env, volumes, state, reason, sa, qos }) {
    const ctrs = containers || [{ name: labels.app || "app", image }];
    const ownerY = owner ? `  ownerReferences:\n  - { apiVersion: apps/v1, kind: ${owner.kind}, name: ${owner.name}, controller: true }   # ← who made this pod, and replaces it\n` : "";
    const res = resources ? `    resources:\n      requests: { cpu: ${yq(resources.reqCpu ?? "")}, memory: ${yq(resources.reqMem ?? "")} }   # ← what the scheduler reserves\n      limits:   { cpu: ${yq(resources.limCpu ?? "")}, memory: ${yq(resources.limMem ?? "")} }   # ← CPU over: throttled · memory over: OOMKilled\n` : "";
    const pr = probes ? `    startupProbe:   { httpGet: { path: /healthz, port: 8080 }, periodSeconds: 10, failureThreshold: 10 }\n    livenessProbe:  { httpGet: { path: /healthz, port: 8080 }, periodSeconds: 10, failureThreshold: 3 }   # ← fail 3× → restart\n    readinessProbe: { httpGet: { path: /ready,   port: 8080 }, periodSeconds: 10, failureThreshold: 3 }   # ← fail → out of the Service\n` : "";
    const envY = env ? `    env:\n${env.map((e) => `    - ${e}`).join("\n")}\n` : "";
    const vol = volumes ? `    volumeMounts:\n${volumes.map((v) => `    - { name: ${v.name}, mountPath: ${v.path} }`).join("\n")}\n` : "";
    const volS = volumes ? `  volumes:\n${volumes.map((v) => `  - { name: ${v.name}, ${v.src} }`).join("\n")}\n` : "";
    const cState = state || (phase === "Running" ? `running: { startedAt: "${ago(restarts + 3)}" }` : phase === "Pending" ? `waiting: { reason: ${reason || "ContainerCreating"} }` : `terminated: { reason: ${reason || "Completed"}, exitCode: ${reason === "Error" ? 1 : 0} }`);
    return `apiVersion: v1
kind: Pod
${meta({ name, ns, labels, extra: ownerY })}spec:
${sa ? `  serviceAccountName: ${sa}   # ← its identity when it calls the API\n` : ""}  nodeName: ${node || '""'}   # ← set by the scheduler; empty until it is bound
  containers:
${ctrs.map((c, i) => `  - name: ${c.name}\n    image: ${c.image}\n    ports: [{ containerPort: ${c.port || 8080} }]\n${i === 0 ? res + pr + envY + vol : ""}`).join("")}${volS}  restartPolicy: ${owner && owner.kind === "Job" ? "OnFailure" : "Always"}
status:
  phase: ${phase}   # ← Pending → Running → Succeeded / Failed
  podIP: ${ip || '""'}   # ← every pod gets its own IP
${qos ? `  qosClass: ${qos}   # ← from requests and limits\n` : ""}  conditions:
  - { type: PodScheduled, status: "${node ? "True" : "False"}" }
  - { type: Ready, status: "${ready ? "True" : "False"}" }   # ← only Ready pods receive Service traffic
  containerStatuses:
${ctrs.map((c) => `  - name: ${c.name}\n    ready: ${ready}\n    restartCount: ${restarts}\n    state: { ${cState} }`).join("\n")}`;
  },
  deployment({ name = "web", ns = "default", replicas = 3, image = "web:1.4.2", ready = replicas, updated = replicas, available = ready, surge = "25%", unavailable = "25%", revision = 1, labels = { app: name }, extra = "" }) {
    return `apiVersion: apps/v1
kind: Deployment
${meta({ name, ns, labels, extra: `  annotations:\n    deployment.kubernetes.io/revision: "${revision}"   # ← bumps on every template change\n` })}spec:
  replicas: ${replicas}   # ← desired state: how many pods should run
  selector:
    matchLabels: { app: ${labels.app} }   # ← which pods belong to it
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: ${surge}        # ← how many extra pods during a rollout
      maxUnavailable: ${unavailable}  # ← how many may be missing during a rollout
  template:   # ← the pod it stamps out; changing it starts a rollout
    metadata:
      labels: { app: ${labels.app} }
    spec:
      containers:
      - name: ${labels.app}
        image: ${image}
        ports: [{ containerPort: 8080 }]
${extra}status:
  replicas: ${updated}
  updatedReplicas: ${updated}
  readyReplicas: ${ready}
  availableReplicas: ${available}
  conditions:
  - { type: Available, status: "${available >= replicas ? "True" : "False"}" }
  - { type: Progressing, status: "True", reason: ${available >= replicas ? "NewReplicaSetAvailable" : "ReplicaSetUpdated"} }`;
  },
  replicaset({ name, ns = "default", replicas, ready = replicas, owner = "web", image = "web:1.4.2", hash = "6b7f" }) {
    return `apiVersion: apps/v1
kind: ReplicaSet
${meta({ name, ns, labels: { app: owner, "pod-template-hash": hash }, extra: `  ownerReferences:\n  - { apiVersion: apps/v1, kind: Deployment, name: ${owner}, controller: true }   # ← managed by the Deployment\n` })}spec:
  replicas: ${replicas}   # ← set by the Deployment controller
  selector: { matchLabels: { app: ${owner}, pod-template-hash: "${hash}" } }
  template:
    spec: { containers: [{ name: ${owner}, image: ${image} }] }
status:
  replicas: ${replicas}
  readyReplicas: ${ready}`;
  },
  service({ name, ns = "default", type = "ClusterIP", clusterIP = "10.96.0.20", selector = { app: name }, port = 80, targetPort = 8080, nodePort, lbIP, endpoints = [] }) {
    return `apiVersion: v1
kind: Service
${meta({ name, ns })}spec:
  type: ${type}   # ← ClusterIP (inside only) · NodePort · LoadBalancer
  clusterIP: ${clusterIP}   # ← stable virtual IP; never changes while the Service exists
  selector:   # ← pods with these labels become its endpoints
${labelsY(selector)}
  ports:
  - port: ${port}            # ← what clients call
    targetPort: ${targetPort}    # ← the container port behind it${nodePort ? `\n    nodePort: ${nodePort}   # ← opened on every node` : ""}
status:
  loadBalancer: ${lbIP ? `{ ingress: [{ ip: ${lbIP} }] }   # ← the cloud load balancer's address` : "{}"}
# endpoints right now (kubectl get endpointslices -l kubernetes.io/service-name=${name}):
#   ${endpoints.length ? endpoints.join(", ") : "<none>"}`;
  },
  endpointslice({ service, endpoints = [], port = 8080 }) {
    return `apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
${meta({ name: service + "-x7k2p", labels: { "kubernetes.io/service-name": service } })}addressType: IPv4
ports: [{ port: ${port}, protocol: TCP }]
endpoints:   # ← maintained by the control plane: one entry per pod the Service selects
${endpoints.length ? endpoints.map((e) => `- addresses: [${e.ip}]\n  conditions: { ready: ${e.ready} }   # ← kube-proxy only sends traffic to ready ones\n  nodeName: ${e.node}\n  targetRef: { kind: Pod, name: ${e.pod} }`).join("\n") : "[]   # ← no ready pods: requests to the Service fail"}`;
  },
  ingress({ name = "shop", ns = "default", rules, tls }) {
    return `apiVersion: networking.k8s.io/v1
kind: Ingress
${meta({ name, ns })}spec:
  ingressClassName: nginx   # ← which Ingress controller implements it
${tls ? `  tls:\n  - hosts: [${tls.hosts.join(", ")}]\n    secretName: ${tls.secret}   # ← certificate used to end TLS\n` : ""}  rules:   # ← routing by host, then by path
${rules.map((r) => `  - host: ${r.host}\n    http:\n      paths:\n${r.paths.map((p) => `      - path: ${p.path}\n        pathType: Prefix\n        backend: { service: { name: ${p.svc}, port: { number: 80 } } }`).join("\n")}`).join("\n")}
status:
  loadBalancer: { ingress: [{ ip: 203.0.113.10 }] }`;
  },
  networkpolicy({ name, ns = "shop", podSelector = {}, from = null, comment = "" }) {
    return `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
${meta({ name, ns })}spec:
  podSelector: ${Object.keys(podSelector).length ? `{ matchLabels: { ${Object.entries(podSelector).map(([k, v]) => `${k}: ${v}`).join(", ")} } }` : "{}"}   # ← which pods this policy guards ({} = all)
  policyTypes: [Ingress]
${from === null ? "  # no ingress rules: everything into the selected pods is denied" : `  ingress:\n  - from:\n${from.map((f) => `    - ${f}`).join("\n")}`}${comment ? "\n" + comment : ""}`;
  },
  configmap({ name, ns = "default", data }) {
    return `apiVersion: v1
kind: ConfigMap
${meta({ name, ns })}data:   # ← plain key/value settings; pods read them as env vars or files
${Object.entries(data).map(([k, v]) => `  ${k}: ${yq(v)}`).join("\n")}`;
  },
  secret({ name, ns = "default", data, decoded = false }) {
    return `apiVersion: v1
kind: Secret
${meta({ name, ns })}type: Opaque
data:   # ← base64-encoded, NOT encrypted. Protect with RBAC and encryption at rest
${Object.entries(data).map(([k, v]) => `  ${k}: ${decoded ? v + "   # ← decoded: base64 -d gives this straight back" : btoa(v)}`).join("\n")}`;
  },
  node({ name, cidr, cpu = "4", mem = "8Gi", pods = 4, ready = true, labels = {}, taints = [], allocated }) {
    return `apiVersion: v1
kind: Node
${meta({ name, labels: { "kubernetes.io/hostname": name, ...labels } }, true)}spec:
  podCIDR: ${cidr || "10.244.1.0/24"}   # ← pod IPs on this node come from here
${taints.length ? `  taints:   # ← pods without a matching toleration are kept off\n${taints.map((t) => `  - { key: ${t.key}, value: "${t.value}", effect: ${t.effect} }`).join("\n")}\n` : ""}status:
  capacity:    { cpu: "${cpu}", memory: ${mem}, pods: "${pods}" }
  allocatable: { cpu: "${cpu}", memory: ${mem}, pods: "${pods}" }   # ← what the scheduler may hand out
  conditions:
  - { type: Ready, status: "${ready ? "True" : "Unknown"}", reason: ${ready ? "KubeletReady" : "NodeStatusUnknown"} }   # ← kubelet heartbeat
  - { type: MemoryPressure, status: "False" }
${allocated ? `# kubectl describe node ${name} → Allocated resources: ${allocated}` : ""}`;
  },
  pvc({ name = "data", ns = "default", size = "5Gi", sc = "standard", volume = "", phase = "Bound" }) {
    return `apiVersion: v1
kind: PersistentVolumeClaim
${meta({ name, ns })}spec:   # ← a request for storage, like a pod's request for CPU
  accessModes: [ReadWriteOnce]   # ← one node may mount it read-write
  storageClassName: ${sc}   # ← which StorageClass provisions the volume
  resources: { requests: { storage: ${size} } }
  volumeName: ${volume || '""'}   # ← the PersistentVolume it is bound to
status:
  phase: ${phase}`;
  },
  pv({ name, size = "5Gi", claim = "", reclaim = "Delete", phase = "Bound" }) {
    return `apiVersion: v1
kind: PersistentVolume
${meta({ name }, true)}spec:
  capacity: { storage: ${size} }
  accessModes: [ReadWriteOnce]
  persistentVolumeReclaimPolicy: ${reclaim}   # ← what happens when its claim is deleted
  storageClassName: standard
  claimRef: ${claim ? `{ namespace: default, name: ${claim} }   # ← the claim it belongs to` : "null"}
  csi: { driver: ebs.csi.aws.com, volumeHandle: vol-0a1b2c3d }   # ← the real disk behind it
status:
  phase: ${phase}   # ← Available · Bound · Released`;
  },
  storageclass({ reclaim = "Delete" }) {
    return `apiVersion: storage.k8s.io/v1
kind: StorageClass
${meta({ name: "standard" }, true)}provisioner: ebs.csi.aws.com   # ← the driver that creates real volumes
reclaimPolicy: ${reclaim}   # ← copied onto every volume it makes
volumeBindingMode: WaitForFirstConsumer   # ← create the disk where the pod lands
parameters: { type: gp3 }`;
  },
  statefulset({ name = "db", replicas = 3, ready = replicas }) {
    return `apiVersion: apps/v1
kind: StatefulSet
${meta({ name })}spec:
  serviceName: ${name}   # ← headless Service giving each pod a stable DNS name: ${name}-0.${name}
  replicas: ${replicas}
  podManagementPolicy: OrderedReady   # ← create ${name}-0, then ${name}-1, …; remove in reverse
  selector: { matchLabels: { app: ${name} } }
  template:
    metadata: { labels: { app: ${name} } }
    spec: { containers: [{ name: ${name}, image: postgres:16, volumeMounts: [{ name: data, mountPath: /var/lib/postgresql }] }] }
  volumeClaimTemplates:   # ← one PVC per pod: data-${name}-0, data-${name}-1, …
  - metadata: { name: data }
    spec: { accessModes: [ReadWriteOnce], resources: { requests: { storage: 1Gi } } }
status:
  replicas: ${replicas}
  readyReplicas: ${ready}`;
  },
  daemonset({ name = "log-agent", ns = "kube-system", desired, ready = desired }) {
    return `apiVersion: apps/v1
kind: DaemonSet
${meta({ name, ns })}spec:
  selector: { matchLabels: { app: ${name} } }
  template:   # ← one copy of this pod on every node
    metadata: { labels: { app: ${name} } }
    spec:
      tolerations: [{ operator: Exists }]   # ← run even on tainted nodes
      containers: [{ name: ${name}, image: fluent-bit:3 }]
status:
  desiredNumberScheduled: ${desired}   # ← = number of nodes
  numberReady: ${ready}`;
  },
  job({ name, completions = 4, parallelism = 2, succeeded = 0, active = 0, failed = 0 }) {
    return `apiVersion: batch/v1
kind: Job
${meta({ name })}spec:
  completions: ${completions}   # ← run until this many pods succeed
  parallelism: ${parallelism}   # ← at most this many at once
  backoffLimit: 6   # ← give up after this many failures
  template:
    spec:
      restartPolicy: OnFailure
      containers: [{ name: report, image: report:2.1, command: [./make-report] }]
status:
  active: ${active}
  succeeded: ${succeeded}
  failed: ${failed}`;
  },
  cronjob({ name = "report", on = true }) {
    return `apiVersion: batch/v1
kind: CronJob
${meta({ name })}spec:
  schedule: "0 * * * *"   # ← cron syntax: minute 0 of every hour
  suspend: ${!on}   # ← true pauses the schedule
  concurrencyPolicy: Forbid   # ← skip a run while the last Job is still going
  jobTemplate:
    spec: { completions: 4, parallelism: 2, backoffLimit: 6 }`;
  },
  hpa({ target = "web", min = 2, max = 10, cpu = 50, current, replicas, desired }) {
    return `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
${meta({ name: target })}spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: ${target} }
  minReplicas: ${min}
  maxReplicas: ${max}
  metrics:
  - type: Resource
    resource: { name: cpu, target: { type: Utilization, averageUtilization: ${cpu} } }   # ← keep average CPU near ${cpu}%
  behavior:
    scaleDown: { stabilizationWindowSeconds: 300 }   # ← wait before scaling down
status:
  currentReplicas: ${replicas}
  desiredReplicas: ${desired}   # ← ceil(current × actual ÷ target)
  currentMetrics: [{ type: Resource, resource: { name: cpu, current: { averageUtilization: ${current} } } }]`;
  },
  role({ name, ns = "dev", rules, cluster = false }) {
    return `apiVersion: rbac.authorization.k8s.io/v1
kind: ${cluster ? "ClusterRole" : "Role"}
${meta({ name, ns }, cluster)}rules:   # ← only allows; there are no deny rules
${rules.map((r) => `- apiGroups: [${r.groups.map((g) => yq(g)).join(", ")}]\n  resources: [${r.res.join(", ")}]\n  verbs: [${r.verbs.join(", ")}]`).join("\n")}`;
  },
  rolebinding({ name, ns = "dev", role, subjects, cluster = false }) {
    return `apiVersion: rbac.authorization.k8s.io/v1
kind: ${cluster ? "ClusterRoleBinding" : "RoleBinding"}
${meta({ name, ns }, cluster)}subjects:   # ← who gets the role
${subjects.length ? subjects.map((s) => `- { kind: ${s.kind}, name: ${s.name}${s.kind === "ServiceAccount" ? ", namespace: dev" : ""} }`).join("\n") : "[]"}
roleRef: { apiGroup: rbac.authorization.k8s.io, kind: ${cluster ? "ClusterRole" : "Role"}, name: ${role} }`;
  },
  serviceaccount({ name, ns = "dev" }) {
    return `apiVersion: v1
kind: ServiceAccount
${meta({ name, ns })}# Pods that set serviceAccountName: ${name} get a short-lived token mounted at
# /var/run/secrets/kubernetes.io/serviceaccount/token, and call the API as:
#   system:serviceaccount:${ns}:${name}`;
  },
  namespace({ name, podSecurity }) {
    return `apiVersion: v1
kind: Namespace
${meta({ name, labels: podSecurity ? { "pod-security.kubernetes.io/enforce": podSecurity } : {} }, true)}# a name scope for objects, RBAC and quotas; it spans every node${podSecurity ? `\n# ← the label above makes admission enforce Pod Security "${podSecurity}"` : ""}`;
  },
  gateway() {
    return `apiVersion: networking.istio.io/v1
kind: Gateway
${meta({ name: "bookinfo-gateway" })}spec:
  selector: { istio: ingressgateway }   # ← which Envoy proxies take this config
  servers:
  - port: { number: 443, name: https, protocol: HTTPS }
    hosts: [bookinfo.io]
    tls: { mode: SIMPLE, credentialName: bookinfo-cert }   # ← the Secret holding the certificate`;
  },
  virtualservice({ weight = 20 }) {
    return `apiVersion: networking.istio.io/v1
kind: VirtualService
${meta({ name: "reviews" })}spec:
  hosts: [bookinfo.io]
  gateways: [bookinfo-gateway]   # ← applies to traffic entering through this Gateway
  http:
  - match: [{ headers: { end-user: { exact: jason } } }]   # ← rules are tried in order
    route: [{ destination: { host: reviews, subset: v2 } }]
  - route:
    - { destination: { host: reviews, subset: v1 }, weight: ${100 - weight} }   # ← the split
    - { destination: { host: reviews, subset: v2 }, weight: ${weight} }`;
  },
  destinationrule() {
    return `apiVersion: networking.istio.io/v1
kind: DestinationRule
${meta({ name: "reviews" })}spec:
  host: reviews
  trafficPolicy:
    tls: { mode: ISTIO_MUTUAL }   # ← sidecar-to-sidecar mutual TLS
    outlierDetection:   # ← eject endpoints that keep failing
      consecutive5xxErrors: 2
      interval: 10s
      baseEjectionTime: 30s
  subsets:   # ← named groups of pods, by label
  - { name: v1, labels: { version: v1 } }
  - { name: v2, labels: { version: v2 } }`;
  },
  // configuration of components that are not API objects
  kubeletConfig() {
    return `# /var/lib/kubelet/config.yaml on every node (not an API object)
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
containerRuntimeEndpoint: unix:///run/containerd/containerd.sock   # ← how it talks to the runtime
syncFrequency: 1m   # ← how often it re-syncs mounted ConfigMaps and Secrets
evictionHard: { memory.available: "100Mi" }   # ← below this, it evicts pods
maxPods: 110`;
  },
  schedulerConfig() {
    return `# the scheduler's configuration file (not an API object)
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: default-scheduler
  plugins:
    score:
      enabled:
      - { name: NodeResourcesFit, weight: 1 }   # ← prefer nodes with room (by requests)
      - { name: PodTopologySpread, weight: 2 }   # ← spread pods out
# what it writes for each pod (a Binding):
# apiVersion: v1 · kind: Binding · target: { kind: Node, name: node-1 }`;
  },
  apiserver() {
    return `# /etc/kubernetes/manifests/kube-apiserver.yaml — a static pod on the control-plane node
apiVersion: v1
kind: Pod
metadata: { name: kube-apiserver, namespace: kube-system }
spec:
  containers:
  - name: kube-apiserver
    image: registry.k8s.io/kube-apiserver:v1.31.0
    command:
    - kube-apiserver
    - --etcd-servers=https://127.0.0.1:2379   # ← the only client of etcd
    - --authorization-mode=Node,RBAC          # ← authorization
    - --enable-admission-plugins=NodeRestriction,PodSecurity   # ← admission
    - --client-ca-file=/etc/kubernetes/pki/ca.crt   # ← authentication`;
  },
  etcd({ rev, keys = [] }) {
    return `# etcd is a key-value store, not an API object. What it holds:
$ etcdctl get /registry --prefix --keys-only
${keys.length ? keys.join("\n") : "/registry/namespaces/default\n/registry/services/specs/default/kubernetes"}
# current revision: ${rev}   ← every write bumps it`;
  },
  controllerManager() {
    return `# /etc/kubernetes/manifests/kube-controller-manager.yaml (static pod, excerpt)
spec:
  containers:
  - command:
    - kube-controller-manager
    - --controllers=*   # ← deployment, replicaset, job, node, endpointslice, … each a watch loop
    - --kubeconfig=/etc/kubernetes/controller-manager.conf   # ← it talks only to the API server`;
  },
};
