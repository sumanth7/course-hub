export default {
  pageTitle: "Observability & Reliability (3D)",
  lede: "A three-service app on three nodes in three zones, watched by Prometheus, Loki and Tempo, shown in Grafana, with Alertmanager on call. Slow a service down and find it in the metrics and the trace, crash a pod and find it in the logs, then upgrade the nodes and watch PodDisruptionBudgets and topology spread keep the app up. Or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="Observability controls">
    <button type="button" data-do="lat" id="ob-lat" class="danger">Slow down payments</button>
    <button type="button" data-do="crash" class="danger">Crash a pod</button>
    <button type="button" data-do="up" id="ob-up">Upgrade nodes to 1.31</button>
    <button type="button" data-do="spread" id="ob-spread" aria-pressed="true">Topology spread: on</button>
    <button type="button" data-do="pdb" id="ob-pdb" aria-pressed="true">PodDisruptionBudgets: on</button>
  </div>
  <p class="status" id="ob-status" aria-live="polite"></p>`,
  caption: "Metrics tell you something is wrong (Prometheus scrapes counters and histograms; PromQL turns them into rates and percentiles), traces tell you where (each service reports a span of the same request), and logs tell you why (Fluent Bit ships every container's output to Loki). Alert rules fire only when a condition holds for a while, so a blip doesn't page anyone. Reliability during maintenance comes from spreading replicas across zones and from PodDisruptionBudgets: a drain evicts pods through the API, which refuses any eviction that would leave fewer ready replicas than the budget allows, so node upgrades proceed one pod at a time.",
};
