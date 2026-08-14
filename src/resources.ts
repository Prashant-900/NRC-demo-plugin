/*
 * Shared resource definitions and helpers for the NRC demo plugin.
 *
 * The node-readiness-controller (NRC) ships a cluster-scoped Custom Resource
 * called NodeReadinessRule. Headlamp doesn't know about custom resources by
 * default, so we teach it the API details here. Both NRC and this plugin talk
 * to the same Kubernetes API: NRC *writes* the .status, this plugin *reads* it.
 */
import { K8s } from '@kinvolk/headlamp-plugin/lib';

// API details confirmed from the NRC codebase:
//   group:   readiness.node.x-k8s.io
//   version: v1alpha1
//   scope:   Cluster (not namespaced)
export const NodeReadinessRule = K8s.crd.makeCustomResourceClass({
  apiInfo: [{ group: 'readiness.node.x-k8s.io', version: 'v1alpha1' }],
  kind: 'NodeReadinessRule',
  pluralName: 'nodereadinessrules',
  singularName: 'nodereadinessrule',
  isNamespaced: false,
});

// NRC only manages taints whose key starts with this prefix. We use it to tell
// NRC's taints apart from any other taints on a node.
export const NRC_TAINT_PREFIX = 'readiness.k8s.io/';

// Kubernetes Event reasons that NRC emits on nodes.
export const NRC_EVENT_REASONS = [
  'TaintAdded',
  'TaintRemoved',
  'TaintAdopted',
  'BootstrapCompleted',
];

/**
 * Decide whether a NodeReadinessRule's spec.nodeSelector matches a node's
 * labels. Supports matchLabels and the common matchExpressions operators.
 */
export function ruleAppliesToNode(rule: any, nodeLabels: Record<string, string>): boolean {
  const selector = rule?.jsonData?.spec?.nodeSelector;
  // An empty selector matches every node.
  if (!selector) return true;

  const matchLabels: Record<string, string> = selector.matchLabels ?? {};
  for (const [key, value] of Object.entries(matchLabels)) {
    if (nodeLabels[key] !== value) return false;
  }

  const expressions: any[] = selector.matchExpressions ?? [];
  for (const expr of expressions) {
    const present = expr.key in nodeLabels;
    const value = nodeLabels[expr.key];
    const values: string[] = expr.values ?? [];
    switch (expr.operator) {
      case 'In':
        if (!present || !values.includes(value)) return false;
        break;
      case 'NotIn':
        if (present && values.includes(value)) return false;
        break;
      case 'Exists':
        if (!present) return false;
        break;
      case 'DoesNotExist':
        if (present) return false;
        break;
      default:
        break;
    }
  }
  return true;
}

/** Count how many nodes a rule currently holds (taint present) vs released. */
export function summarizeRule(rule: any) {
  const status = rule?.jsonData?.status ?? {};
  const evaluations: any[] = status.nodeEvaluations ?? [];
  const held = evaluations.filter(e => e.taintStatus === 'Present').length;
  const released = evaluations.filter(e => e.taintStatus === 'Absent').length;
  const failed = (status.failedNodes ?? []).length;
  const conditions: any[] = rule?.jsonData?.spec?.conditions ?? [];
  return {
    matched: evaluations.length,
    held,
    released,
    failed,
    conditionTypes: conditions.map(c => c.type),
    evaluations,
  };
}
// blah blah