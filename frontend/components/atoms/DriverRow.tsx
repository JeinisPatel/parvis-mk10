import { NodeTag } from '../NodeTag';
import { NODES } from '@/lib/nodes';
import { PV } from '@/lib/tokens';

interface Props {
  id:        string;
  /** 0–1 probability. */
  value:     number;
  direction: 'up' | 'down';
  /** Override the short label from NODES — useful in scenario diffs. */
  label?:    string;
}

/**
 * DriverRow — a single line in the "Driving designation up/down" lists on
 * the Overview screen. Three-column grid: tag, label, signed percent.
 *
 *   [N3]  Sexual offence profile               +51%
 */
export function DriverRow({ id, value, direction, label }: Props) {
  const tone = direction === 'up' ? PV.risk : PV.mitigation;
  const display = label ?? NODES[id]?.short ?? `Node ${id}`;

  return (
    <div
      className="grid items-center py-2.5"
      style={{
        gridTemplateColumns: '44px 1fr 60px',
        gap: 12,
        borderBottom: '1px solid rgba(0,0,0,0.04)',
      }}
    >
      <NodeTag id={id} />
      <div className="text-ink" style={{ fontSize: 13 }}>
        {display}
      </div>
      <div
        className="font-mono font-semibold text-right tabular-nums"
        style={{ fontSize: 12, color: tone }}
      >
        {(value * 100).toFixed(0)}%
      </div>
    </div>
  );
}
