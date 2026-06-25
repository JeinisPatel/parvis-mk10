import { NODES } from '@/lib/nodes';
import { PV, COLOR_FOR_TYPE, type NodeType } from '@/lib/tokens';

interface Props {
  id:     string;
  small?: boolean;
}

/** Family → soft tint, matching NodeCard's quiet chip. */
const SOFT: Record<NodeType, string> = {
  risk:        PV.riskSoft,
  distortion:  PV.distortionSoft,
  mitigation:  PV.mitigationSoft,
  dual:        PV.dualSoft,
  special:     PV.specialSoft,
  constraint:  PV.constraintSoft,
  output:      PV.outputSoft,
};

/**
 * NodeTag — a chip displaying "N{id}" coloured by the node's family.
 * The basic building block for inline references to network nodes; used in
 * chat messages, driver lists, factor checklists, and citations.
 *
 * Mk 10: the loud white-on-saturated chip becomes the quiet RATIO treatment —
 * the muted family hue set on its own soft tint.
 */
export function NodeTag({ id, small = false }: Props) {
  const type  = NODES[id]?.type as NodeType | undefined;
  const color = type ? COLOR_FOR_TYPE[type] : PV.ink3;
  const soft  = type ? SOFT[type] : PV.paper3;
  return (
    <span
      className="inline-flex items-center font-mono rounded"
      style={{
        background:    soft,
        color,
        fontWeight:    500,
        fontSize:      small ? 9.5 : 11,
        letterSpacing: '0.03em',
        padding:       small ? '2px 5px' : '3px 7px',
        lineHeight:    1.2,
      }}
    >
      N{id}
    </span>
  );
}
