/*
 * Node-level drill-down. This is the core value of the plugin: when a user looks
 * at a Node's details page, this panel answers "why is this node not accepting
 * workloads?" by showing the NRC rules that apply, per-condition pass/fail, the
 * NRC-managed taints, and related Events.
 */
import { K8s } from '@kinvolk/headlamp-plugin/lib';
import {
  SectionBox,
  SimpleTable,
  StatusLabel,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  NodeReadinessRule,
  NRC_EVENT_REASONS,
  NRC_TAINT_PREFIX,
  ruleAppliesToNode,
} from './resources';

export default function NodeReadinessNodePanel(props: { node: any }) {
  const { node } = props;
  const [rules, rulesError] = NodeReadinessRule.useList();
  // Events: Headlamp's Event API varies across versions, so we make this optional.
  let events: any[] = [];
  try {
    const EventClass = (K8s as any).event?.default || (K8s as any).Event;
    if (EventClass?.useList) {
      const [evList] = EventClass.useList();
      events = evList ?? [];
    }
  } catch {
    // Event class not available or different structure — degrade gracefully.
  }

  const nodeName: string = node?.getName?.() ?? node?.jsonData?.metadata?.name;
  const nodeLabels: Record<string, string> = node?.jsonData?.metadata?.labels ?? {};

  // NRC-managed taints currently on the node (key starts with readiness.k8s.io/).
  const allTaints: any[] = node?.jsonData?.spec?.taints ?? [];
  const nrcTaints = allTaints.filter(t => (t.key ?? '').startsWith(NRC_TAINT_PREFIX));

  // If the CRD isn't installed, keep the panel quiet but still show any taints.
  if (rulesError) {
    if (nrcTaints.length === 0) return null;
  }

  const applicableRules = (rules ?? []).filter(rule => ruleAppliesToNode(rule, nodeLabels));

  // NRC events relevant to this node.
  const nodeEvents = (events ?? []).filter((ev: any) => {
    const obj = ev.jsonData?.involvedObject ?? {};
    return (
      obj.kind === 'Node' &&
      obj.name === nodeName &&
      NRC_EVENT_REASONS.includes(ev.jsonData?.reason)
    );
  });

  return (
    <SectionBox title="Node Readiness (NRC)" textAlign="left">
      {/* Managed taints */}
      <Box mb={2}>
        <Typography variant="subtitle1" gutterBottom>
          NRC-managed taints
        </Typography>
        {nrcTaints.length === 0 ? (
          <StatusLabel status="success">None — node is not gated by NRC</StatusLabel>
        ) : (
          <SimpleTable
            columns={[
              { label: 'Key', getter: (t: any) => t.key },
              { label: 'Value', getter: (t: any) => t.value ?? '—' },
              { label: 'Effect', getter: (t: any) => t.effect },
            ]}
            data={nrcTaints}
          />
        )}
      </Box>

      {/* Applicable rules and per-condition status */}
      <Box mb={2}>
        <Typography variant="subtitle1" gutterBottom>
          Applicable rules ({applicableRules.length})
        </Typography>
        {applicableRules.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No NodeReadinessRule selects this node.
          </Typography>
        ) : (
          applicableRules.map((rule: any) => {
            const evals: any[] = rule.jsonData?.status?.nodeEvaluations ?? [];
            const nodeEval = evals.find((e: any) => e.nodeName === nodeName);
            const conditionResults: any[] =
              nodeEval?.conditionResults ?? rule.jsonData?.spec?.conditions ?? [];
            return (
              <Box key={rule.getName()} mb={2}>
                <Typography variant="body1">
                  <strong>{rule.getName()}</strong>{' '}
                  {nodeEval ? (
                    <StatusLabel
                      status={nodeEval.taintStatus === 'Present' ? 'error' : 'success'}
                    >
                      taint {nodeEval.taintStatus}
                    </StatusLabel>
                  ) : (
                    <StatusLabel status="">not yet evaluated</StatusLabel>
                  )}
                </Typography>
                <SimpleTable
                  emptyMessage="No conditions."
                  columns={[
                    { label: 'Condition', getter: (c: any) => c.type },
                    {
                      label: 'Current',
                      getter: (c: any) => c.currentStatus ?? '—',
                    },
                    {
                      label: 'Required',
                      getter: (c: any) => c.requiredStatus ?? '—',
                    },
                    {
                      label: 'Satisfied',
                      getter: (c: any) => {
                        if (c.currentStatus === undefined) return '—';
                        const ok = c.currentStatus === c.requiredStatus;
                        return (
                          <StatusLabel status={ok ? 'success' : 'error'}>
                            {ok ? 'pass' : 'fail'}
                          </StatusLabel>
                        );
                      },
                    },
                  ]}
                  data={conditionResults}
                />
              </Box>
            );
          })
        )}
      </Box>

      {/* Related events */}
      <Box>
        <Typography variant="subtitle1" gutterBottom>
          Recent NRC events
        </Typography>
        {nodeEvents.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No recent NRC events for this node.
          </Typography>
        ) : (
          <SimpleTable
            columns={[
              { label: 'Reason', getter: (e: any) => e.jsonData?.reason },
              { label: 'Message', getter: (e: any) => e.jsonData?.message ?? '—' },
              { label: 'Count', getter: (e: any) => e.jsonData?.count ?? 1 },
            ]}
            data={nodeEvents}
          />
        )}
      </Box>
    </SectionBox>
  );
}
