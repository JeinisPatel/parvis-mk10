import { nodeColor } from '@/lib/nodes';

interface Props {
  id:     string;
  small?: boolean;
}

/**
 * NodeTag — a chip displaying "N{id}" coloured by the node's family.
 * The basic building block for inline references to network nodes; used
 * in chat messages, driver lists, factor checklists, and citations.
 */
export function NodeTag({ id, small = false }: Props) {
  const color = nodeColor(id);
  return (
    <span
      className="inline-flex items-center font-mono font-bold text-white rounded"
      style={{
        background:  color,
        fontSize:    small ? 9.5 : 11,
        padding:     small ? '2px 5px' : '3px 7px',
        lineHeight:  1.2,
      }}
    >
      N{id}
    </span>
  );
}
