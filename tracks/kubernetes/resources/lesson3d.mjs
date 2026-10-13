export default {
  pageTitle: "Requests, Limits & QoS (3D)",
  lede: "Every pod carries a CPU meter and a memory meter: a blue tick for its request, a bright cap for its limit, a fill for what it uses. Burst, spike, leak, or add a big pod, and watch the node respond. Or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="Resource controls">
    <button type="button" data-do="burst">CPU burst: web</button>
    <button type="button" data-do="spike" class="danger">Memory spike: api</button>
    <button type="button" data-do="leak" class="danger">Memory leak: batch</button>
    <button type="button" data-do="add">Add a pod: 2 CPU · 4 GiB</button>
    <button type="button" data-do="reset">Reset</button>
  </div>
  <p class="status" id="rs-status" aria-live="polite"></p>
  <div class="table-wrap"><table><thead><tr><th>Pod</th><th>QoS class</th><th>CPU req / lim / use</th><th>Mem GiB req / lim / use</th><th>Restarts</th><th>State</th></tr></thead><tbody id="rs-rows"></tbody></table></div>`,
  caption: "Requests are what the scheduler reserves on a node; it places a pod only where the sum of requests still fits, so a big pod can stay Pending on an idle node. Limits cap a running container: CPU above the limit is throttled, memory above the limit gets the container OOM-killed and restarted. Requests and limits set the QoS class (Guaranteed, Burstable, BestEffort), and under memory pressure the kubelet evicts BestEffort pods first.",
};
