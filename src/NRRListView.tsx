/*
 * Cluster-level view: a table of all NodeReadinessRule objects with live status.
 * Answers: "what readiness rules exist and how are they doing?"
 */
import { SectionBox, SimpleTable, StatusLabel } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { NodeReadinessRule, summarizeRule } from './resources';

/** A single summary tile shown above the rules table. */
function StatTile(props: { label: string; value: number | string; color?: string }) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, minWidth: 120, textAlign: 'center', flex: '1 1 120px' }}
    >
      <Typography variant="h4" component="div" sx={{ color: props.color }}>
        {props.value}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        {props.label}
      </Typography>
    </Paper>
  );
}

export default function NRRListView() {
  // useList() fetches all rules live and re-renders when they change.
  const [rules, error] = NodeReadinessRule.useList();

  // The CRD may not be installed (e.g. NRC isn't deployed). Show a friendly note
  // instead of crashing, so the demo always renders something meaningful.
  if (error) {
    return (
      <SectionBox title="Node Readiness Rules">
        <Box p={2}>
          <Typography variant="body1" gutterBottom>
            Could not load <code>NodeReadinessRule</code> resources.
          </Typography>
          <Typography variant="body2" color="textSecondary">
            This usually means the node-readiness-controller (and its CRD) is not
            installed on the selected cluster. Once NRC is deployed, its rules will
            appear here automatically.
          </Typography>
        </Box>
      </SectionBox>
    );
  }

  if (rules === null) {
    return <SectionBox title="Node Readiness Rules">Loading…</SectionBox>;
  }

  // Roll up cluster-wide totals for the stat tiles.
  const totals = rules.reduce(
    (acc, rule) => {
      const s = summarizeRule(rule);
      acc.matched += s.matched;
      acc.held += s.held;
      acc.released += s.released;
      acc.failed += s.failed;
      return acc;
    },
    { matched: 0, held: 0, released: 0, failed: 0 }
  );

  return (
    <SectionBox title="Node Readiness Rules" textAlign="left">
      {/* Cluster-wide summary tiles */}
      <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
        <StatTile label="Rules" value={rules.length} />
        <StatTile label="Nodes matched" value={totals.matched} />
        <StatTile label="Held (gated)" value={totals.held} color="#c62828" />
        <StatTile label="Released (ready)" value={totals.released} color="#2e7d32" />
        <StatTile label="Failed" value={totals.failed} color="#e65100" />
      </Box>

      <SimpleTable
        emptyMessage="No NodeReadinessRule objects found in this cluster."
        columns={[
          {
            label: 'Name',
            getter: (rule: any) => rule.getName(),
          },
          {
            label: 'Mode',
            getter: (rule: any) => rule.jsonData?.spec?.enforcementMode ?? '—',
          },
          {
            label: 'Taint',
            getter: (rule: any) => {
              const taint = rule.jsonData?.spec?.taint;
              return taint ? `${taint.key} (${taint.effect})` : '—';
            },
          },
          {
            label: 'Conditions',
            getter: (rule: any) => summarizeRule(rule).conditionTypes.join(', ') || '—',
          },
          {
            label: 'Matched',
            getter: (rule: any) => summarizeRule(rule).matched,
          },
          {
            label: 'Held',
            getter: (rule: any) => {
              const { held } = summarizeRule(rule);
              return held > 0 ? <StatusLabel status="error">{held}</StatusLabel> : held;
            },
          },
          {
            label: 'Released',
            getter: (rule: any) => {
              const { released } = summarizeRule(rule);
              return released > 0 ? (
                <StatusLabel status="success">{released}</StatusLabel>
              ) : (
                released
              );
            },
          },
          {
            label: 'Failed',
            getter: (rule: any) => {
              const { failed } = summarizeRule(rule);
              return failed > 0 ? <StatusLabel status="warning">{failed}</StatusLabel> : failed;
            },
          },
        ]}
        data={rules}
      />
    </SectionBox>
  );
}
