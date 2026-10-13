export default {
  pageTitle: "Istio Ingress (3D)",
  lede: "Follow requests through an Istio mesh: TLS ends at the Gateway, the VirtualService routes by header and weight, the DestinationRule sets mTLS and ejects failing pods. Change the weight on istiod, break a pod, or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="Istio controls">
    <span class="pair"><span id="is-weight">v2 weight 20%</span><button type="button" data-do="w-" aria-label="Less v2">−</button><button type="button" data-do="w+" aria-label="More v2">+</button></span>
    <button type="button" data-do="break" data-pod="2" class="danger">Break reviews-v2 (a)</button>
    <button type="button" data-do="break" data-pod="3" class="danger">Break reviews-v2 (b)</button>
    <button type="button" data-do="break" data-pod="0" class="danger">Break reviews-v1 (a)</button>
  </div>
  <p class="status" id="is-status" aria-live="polite"></p>`,
  caption: "The istio-ingressgateway is an Envoy proxy at the edge; the Gateway resource opens its ports and names the TLS certificate. The VirtualService bound to it routes requests, here by header and by weight between subsets. The DestinationRule defines those subsets by pod label, sets mutual TLS for the hop to each pod's Envoy sidecar, and turns on outlier detection, which ejects pods that keep failing. istiod turns all of this into Envoy configuration and pushes it over xDS, so a change takes effect only once it has been pushed.",
};
