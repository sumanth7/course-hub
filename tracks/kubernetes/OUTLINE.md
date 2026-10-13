# Course outline

Every lesson is one interactive figure plus guided tasks, the real YAML, a short quiz and "try it for real" commands.
All lessons share one visual language, listed after the lesson table.

The lesson list, goals and concepts live in `catalog.mjs` (the hub is generated from it). Metaphors:

| Lesson | Physical metaphor | Status |
|---|---|---|
| Containers & images | Shipping crates stamped from a die (the image), stacked in a registry rack | Built |
| The cluster at a glance | Container yard: cabinet, trays, crane, Service gate, ingress router | Built (`cluster-yard`) |
| Inside the control plane | A mailroom: front desk (API server), ledger vault (etcd), clerks (controllers) | Built |
| Pods, labels & namespaces | Crates with tags and lamps for each phase; fenced yard sections | Built |
| Deployments & rollouts | Crates stencilled v1/v2, the crane swaps them one at a time while traffic flows | Built |
| Pod networking & Services | Pneumatic tubes between crates; the gate with endpoint lamps; a directory board (DNS) | Built |
| Ingress & NetworkPolicy | Edge router with a route table; gates between yard sections | Built |
| ConfigMaps & Secrets | A crate opened up: an env plugboard and mounted file drawers, a locked drawer | Built |
| Health probes | A test bench that taps each crate: a lamp gates traffic, a reset arm restarts it | Built |
| Requests, limits & QoS | Trays with weight scales; an overload trapdoor evicts the lowest class first | Built |
| Volumes, PVs & PVCs | Lockers (PVs), claim tickets (PVCs), a locker factory (StorageClass) | Built |
| StatefulSets, DaemonSets & Jobs | Numbered berths, one crate bolted to every tray, a timed conveyor | Built |
| Autoscaling & placement | Load gauge turns the replica knob; keyed slots and "keep off" plates on trays | Built |
| ServiceAccounts & RBAC | Badges for crates, keycards and a permission board | Built |
| Debugging & Helm | Inspection hatch and event tape; a flat-pack kit (chart) with a parts list (values) | Built |
| Beyond: Istio ingress | Sorting station: TLS port, turntable, subset tracks, istiod | Built (`istio-ingress`) |

## Shared visual language
- Crate = pod. Tray = node. Crane = scheduler. Cabinet = control plane / etcd.
- Bright dot = a request. Solid ring = TLS from a client. Dashed ring = mTLS inside the mesh.
- Lamp lit = healthy / in the pool. The one lit (white) part in each figure is what to watch.

## Lesson page template
1. Goal (one sentence)
2. Figure
3. Guided tasks (2–3 "do this, notice that")
4. The YAML and kubectl commands behind it
5. Quiz (3 questions answered by using the figure)
6. Try it for real (kind / minikube)
