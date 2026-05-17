'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE } from '../../lib/api';
import { TopBar } from '@/components/TopBar';
import { useProfile } from '@/lib/hooks/useProfile';

/**
 * Network architecture — reference visualisation of the Tetrad Bayesian
 * network.
 *
 * Reads /api/v1/architecture on mount. Renders the 36 nodes in typed
 * horizontal rows (constraint → risk → dual → special → distortion →
 * mitigation → output) with edges drawn as bezier curves between rows.
 *
 * Click any node to open an inspector showing its name, type,
 * evidence-bearing status, and computed parents/children. Toggle types
 * in the legend to filter the visible subgraph. Hovering a node dims
 * unrelated edges to highlight its local neighbourhood.
 *
 * Read-only; no LLM involvement.
 */


// ── Types ───────────────────────────────────────────────────────────────────

interface ArchNode {
  id:               string;
  name:             string;
  short:            string;
  type:             string;
  evidence_bearing: boolean;
}

interface ArchEdge {
  from: string;
  to:   string;
}

interface ArchData {
  nodes: ArchNode[];
  edges: ArchEdge[];
}


// ── Type configuration (static Tailwind classes; JIT-safe) ──────────────────

interface TypeStyle {
  order:        number;
  label:        string;
  nodeBg:       string;   // SVG fill
  nodeStroke:   string;   // SVG stroke
  textColor:    string;   // SVG text fill
  legendActive: string;   // legend button when active
  legendDot:    string;   // legend dot
  chipClass:    string;   // inspector chip combined class
}

const TYPE_CONFIG: Record<string, TypeStyle> = {
  constraint: { order: 0, label: 'Constraint',
    nodeBg: 'fill-slate-100',   nodeStroke: 'stroke-slate-400',   textColor: 'fill-slate-800',
    legendActive: 'bg-slate-100 text-slate-800 border-slate-300',
    legendDot:    'bg-slate-500',
    chipClass:    'bg-slate-50 text-slate-700 border-slate-200' },
  risk: { order: 1, label: 'Risk',
    nodeBg: 'fill-indigo-50',   nodeStroke: 'stroke-indigo-400',  textColor: 'fill-indigo-900',
    legendActive: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    legendDot:    'bg-indigo-500',
    chipClass:    'bg-indigo-50 text-indigo-700 border-indigo-200' },
  dual: { order: 2, label: 'Dual',
    nodeBg: 'fill-amber-50',    nodeStroke: 'stroke-amber-400',   textColor: 'fill-amber-900',
    legendActive: 'bg-amber-100 text-amber-800 border-amber-300',
    legendDot:    'bg-amber-500',
    chipClass:    'bg-amber-50 text-amber-700 border-amber-200' },
  special: { order: 3, label: 'Special',
    nodeBg: 'fill-purple-50',   nodeStroke: 'stroke-purple-400',  textColor: 'fill-purple-900',
    legendActive: 'bg-purple-100 text-purple-800 border-purple-300',
    legendDot:    'bg-purple-500',
    chipClass:    'bg-purple-50 text-purple-700 border-purple-200' },
  distortion: { order: 4, label: 'Distortion',
    nodeBg: 'fill-rose-50',     nodeStroke: 'stroke-rose-400',    textColor: 'fill-rose-900',
    legendActive: 'bg-rose-100 text-rose-800 border-rose-300',
    legendDot:    'bg-rose-500',
    chipClass:    'bg-rose-50 text-rose-700 border-rose-200' },
  mitigation: { order: 5, label: 'Mitigation',
    nodeBg: 'fill-emerald-50',  nodeStroke: 'stroke-emerald-400', textColor: 'fill-emerald-900',
    legendActive: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    legendDot:    'bg-emerald-500',
    chipClass:    'bg-emerald-50 text-emerald-700 border-emerald-200' },
  output: { order: 6, label: 'Output',
    nodeBg: 'fill-blue-100',    nodeStroke: 'stroke-blue-600',    textColor: 'fill-blue-900',
    legendActive: 'bg-blue-100 text-blue-800 border-blue-300',
    legendDot:    'bg-blue-600',
    chipClass:    'bg-blue-50 text-blue-700 border-blue-200' },
};


// ── Layout constants ────────────────────────────────────────────────────────

const CANVAS_WIDTH = 1400;
const ROW_HEIGHT   = 130;
const NODE_RADIUS  = 34;
const MAX_NODES_PER_ROW = 12;
const TOP_PADDING  = 60;


// ── Layout computation: typed horizontal rows ───────────────────────────────

function computeLayout(nodes: ArchNode[]): Record<string, { x: number; y: number }> {
  const byType: Record<string, ArchNode[]> = {};
  for (const n of nodes) {
    if (!byType[n.type]) byType[n.type] = [];
    byType[n.type].push(n);
  }
  // Sort within each row by id (natural sort: "2" < "10" < "18c")
  for (const t in byType) {
    byType[t].sort((a, b) =>
      a.id.localeCompare(b.id, undefined, { numeric: true }),
    );
  }

  const orderedTypes = Object.keys(TYPE_CONFIG).sort(
    (a, b) => TYPE_CONFIG[a].order - TYPE_CONFIG[b].order,
  );

  const positions: Record<string, { x: number; y: number }> = {};
  let y = TOP_PADDING;
  for (const t of orderedTypes) {
    const row = byType[t];
    if (!row || row.length === 0) continue;
    // Wrap into balanced sub-rows when a type has too many nodes for one
    // horizontal line to be legible.
    const subRowCount = Math.ceil(row.length / MAX_NODES_PER_ROW);
    const perRow = Math.ceil(row.length / subRowCount);
    for (let r = 0; r < subRowCount; r++) {
      const subRow = row.slice(r * perRow, (r + 1) * perRow);
      const spacing = CANVAS_WIDTH / (subRow.length + 1);
      subRow.forEach((node, i) => {
        positions[node.id] = { x: spacing * (i + 1), y };
      });
      y += ROW_HEIGHT;
    }
  }
  return positions;
}


// ── Page ────────────────────────────────────────────────────────────────────

export default function NetworkPage() {
  const { profile, hydrated } = useProfile();

  const [data,      setData]      = useState<ArchData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [selected,  setSelected]  = useState<ArchNode | null>(null);
  const [hovered,   setHovered]   = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(
    new Set(Object.keys(TYPE_CONFIG)),
  );

  // Zoom & pan state
  const [zoom, setZoom] = useState(1);
  const [pan,  setPan]  = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const zoomIn   = () => setZoom((z) => Math.min(z * 1.25, 4));
  const zoomOut  = () => setZoom((z) => Math.max(z / 1.25, 0.4));
  const zoomReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 / 1.1 : 1.1;
    setZoom((z) => Math.max(0.4, Math.min(4, z * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).tagName === 'circle' || (e.target as SVGElement).tagName === 'text') return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx / zoom,
      y: dragStartRef.current.panY + dy / zoom,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/architecture`)
      .then((r) => {
        if (!r.ok) throw new Error(`Backend ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((err) => setError(err.message || String(err)))
      .finally(() => setLoading(false));
  }, []);

  const positions = useMemo(
    () => (data ? computeLayout(data.nodes) : {}),
    [data],
  );

  const usedTypes = useMemo(() => {
    if (!data) return new Set<string>();
    return new Set(data.nodes.map((n) => n.type));
  }, [data]);

  const canvasHeight = useMemo(() => {
    if (!data || Object.keys(positions).length === 0) return 200;
    const maxY = Math.max(...Object.values(positions).map((p) => p.y));
    return maxY + ROW_HEIGHT;
  }, [data, positions]);

  // Edges filtered by active types
  const visibleEdges = useMemo(() => {
    if (!data) return [] as ArchEdge[];
    const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));
    return data.edges.filter((e) => {
      const a = nodeMap.get(e.from);
      const b = nodeMap.get(e.to);
      return a && b && activeTypes.has(a.type) && activeTypes.has(b.type);
    });
  }, [data, activeTypes]);

  // Highlighted edges (those touching the selected or hovered node)
  const highlightedEdgeKeys = useMemo(() => {
    const target = selected?.id || hovered;
    if (!target || !data) return new Set<string>();
    const keys = new Set<string>();
    for (const e of data.edges) {
      if (e.from === target || e.to === target) {
        keys.add(`${e.from}->${e.to}`);
      }
    }
    return keys;
  }, [data, selected, hovered]);

  // Inspector: parents/children of selected
  const parentsAndChildren = useMemo(() => {
    if (!selected || !data) return { parents: [] as ArchNode[], children: [] as ArchNode[] };
    const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));
    const parents:  ArchNode[] = [];
    const children: ArchNode[] = [];
    for (const e of data.edges) {
      if (e.to   === selected.id) { const p = nodeMap.get(e.from); if (p) parents.push(p); }
      if (e.from === selected.id) { const c = nodeMap.get(e.to);   if (c) children.push(c); }
    }
    return { parents, children };
  }, [selected, data]);

  const toggleType = (t: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-baseline gap-4 flex-wrap">
            <h1 className="text-xs font-mono uppercase tracking-widest text-slate-500">
              Network architecture
            </h1>
            <span className="font-serif text-2xl text-slate-900">
              {profile.caseReference || 'Tetrad'}
            </span>
          </div>
          <p className="font-serif italic text-slate-600 mt-3 max-w-3xl leading-relaxed">
            The PARVIS Bayesian network — {data?.nodes.length ?? '…'} nodes
            organised by type, with {data?.edges.length ?? '…'} directed
            edges encoding causal and influence relationships. Click any
            node to inspect its parents, children, and role in the
            doctrinal frame. Toggle types in the legend to filter the
            visible subgraph.
          </p>
        </div>

        {/* Legend / filter */}
        <div className="mb-4 flex flex-wrap gap-2">
          {Object.entries(TYPE_CONFIG)
            .sort(([, a], [, b]) => a.order - b.order)
            .map(([type, cfg]) => {
              if (!usedTypes.has(type)) return null;
              const count = data?.nodes.filter((n) => n.type === type).length ?? 0;
              const active = activeTypes.has(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className={`px-3 py-1.5 rounded-full text-xs font-mono border transition-all ${
                    active
                      ? cfg.legendActive
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                      active ? cfg.legendDot : 'bg-slate-300'
                    }`}
                  />
                  {cfg.label} · {count}
                </button>
              );
            })}
        </div>

        {/* Two-column body: SVG canvas + inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* SVG canvas */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            {loading && (
              <div className="p-8 text-center text-slate-400 text-sm">
                Loading architecture…
              </div>
            )}
            {error && !loading && (
              <div className="p-4 bg-red-50 border-b border-red-200 text-red-700 text-sm">
                Couldn&apos;t reach backend: {error}
              </div>
            )}
            {data && (
              <div className="relative">
                {/* Zoom controls overlay */}
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white border border-slate-200 rounded-md shadow-sm px-1 py-1">
                  <button type="button" onClick={zoomOut} className="w-7 h-7 rounded text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center" title="Zoom out (or scroll wheel)">−</button>
                  <button type="button" onClick={zoomReset} className="px-2 h-7 rounded text-xs font-mono text-slate-600 hover:bg-slate-100 transition-colors min-w-[3.5rem]" title="Reset zoom">
                    {Math.round(zoom * 100)}%
                  </button>
                  <button type="button" onClick={zoomIn} className="w-7 h-7 rounded text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center" title="Zoom in (or scroll wheel)">+</button>
                </div>
                <svg
                  viewBox={`0 0 ${CANVAS_WIDTH} ${canvasHeight}`}
                  className="w-full block"
                  style={{ maxHeight: '70vh', cursor: isDragging ? 'grabbing' : (zoom > 1 ? 'grab' : 'default') }}
                  preserveAspectRatio="xMidYMid meet"
                  onWheel={handleWheel}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                <defs>
                  <marker
                    id="arrow"
                    viewBox="0 0 10 10"
                    refX="10"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                  </marker>
                  <marker
                    id="arrow-highlight"
                    viewBox="0 0 10 10"
                    refX="10"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#4338ca" />
                  </marker>
                </defs>
                <g transform={`translate(${CANVAS_WIDTH / 2}, ${canvasHeight / 2}) scale(${zoom}) translate(${-CANVAS_WIDTH / 2 + pan.x}, ${-canvasHeight / 2 + pan.y})`}>

                {/* Edges */}
                <g>
                  {visibleEdges.map((e, i) => {
                    const a = positions[e.from];
                    const b = positions[e.to];
                    if (!a || !b) return null;
                    const key = `${e.from}->${e.to}`;
                    const hi  = highlightedEdgeKeys.has(key);
                    const dim = (selected || hovered) && !hi;
                    const midX = (a.x + b.x) / 2;
                    const midY = (a.y + b.y) / 2 + Math.abs(b.x - a.x) / 10;
                    return (
                      <path
                        key={`${key}-${i}`}
                        d={`M ${a.x},${a.y + NODE_RADIUS} Q ${midX},${midY} ${b.x},${b.y - NODE_RADIUS}`}
                        fill="none"
                        stroke={hi ? '#4338ca' : '#cbd5e1'}
                        strokeWidth={hi ? 2 : 1}
                        markerEnd={hi ? 'url(#arrow-highlight)' : 'url(#arrow)'}
                        opacity={dim ? 0.18 : (hi ? 1 : 0.65)}
                      />
                    );
                  })}
                </g>

                {/* Nodes */}
                <g>
                  {data.nodes.map((node) => {
                    if (!activeTypes.has(node.type)) return null;
                    const pos = positions[node.id];
                    if (!pos) return null;
                    const cfg = TYPE_CONFIG[node.type];
                    if (!cfg) return null;
                    const isSelected = selected?.id === node.id;
                    const isHovered  = hovered === node.id;
                    const isDimmed   = (selected || hovered)
                      && !isSelected
                      && !isHovered
                      && !highlightedEdgeKeys.has(`${node.id}->${selected?.id || hovered}`)
                      && !highlightedEdgeKeys.has(`${selected?.id || hovered}->${node.id}`);
                    return (
                      <g
                        key={node.id}
                        transform={`translate(${pos.x},${pos.y})`}
                        className="cursor-pointer"
                        opacity={isDimmed ? 0.4 : 1}
                        onClick={() => setSelected(isSelected ? null : node)}
                        onMouseEnter={() => setHovered(node.id)}
                        onMouseLeave={() => setHovered(null)}
                      >
                        <circle
                          r={NODE_RADIUS}
                          className={`${cfg.nodeBg} ${cfg.nodeStroke}`}
                          strokeWidth={isSelected ? 3 : isHovered ? 2 : 1.5}
                        />
                        <text
                          y={-3}
                          textAnchor="middle"
                          className="text-[9px] font-mono fill-slate-500 select-none pointer-events-none"
                        >
                          {node.id}
                        </text>
                        <text
                          y={9}
                          textAnchor="middle"
                          className={`text-[9px] font-semibold ${cfg.textColor} select-none pointer-events-none`}
                        >
                          {node.short.length > 13 ? node.short.slice(0, 12) + '…' : node.short}
                        </text>
                      </g>
                    );
                  })}
                </g>
                </g>
                </svg>
              </div>
            )}
          </div>

          {/* Inspector */}
          <aside className="lg:sticky lg:top-6 lg:self-start space-y-5">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              {selected ? (
                <>
                  <div className="flex items-baseline justify-between mb-2">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-slate-500">
                      Node {selected.id}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                      aria-label="Close inspector"
                    >
                      ✕
                    </button>
                  </div>
                  <h2 className="font-serif text-lg text-slate-900 leading-snug">
                    {selected.name}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className={`text-xs font-mono px-2 py-0.5 rounded border ${TYPE_CONFIG[selected.type]?.chipClass || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                      {TYPE_CONFIG[selected.type]?.label || selected.type}
                    </span>
                    {selected.evidence_bearing && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        evidence-bearing
                      </span>
                    )}
                  </div>

                  {parentsAndChildren.parents.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-1.5">
                        Parents ({parentsAndChildren.parents.length})
                      </h4>
                      <ul className="space-y-1">
                        {parentsAndChildren.parents.map((p) => (
                          <li
                            key={p.id}
                            className="text-sm text-slate-700 hover:text-indigo-600 cursor-pointer"
                            onClick={() => setSelected(p)}
                          >
                            <span className="font-mono text-xs text-slate-400 mr-1.5">{p.id}</span>
                            {p.short}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {parentsAndChildren.children.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-1.5">
                        Children ({parentsAndChildren.children.length})
                      </h4>
                      <ul className="space-y-1">
                        {parentsAndChildren.children.map((c) => (
                          <li
                            key={c.id}
                            className="text-sm text-slate-700 hover:text-indigo-600 cursor-pointer"
                            onClick={() => setSelected(c)}
                          >
                            <span className="font-mono text-xs text-slate-400 mr-1.5">{c.id}</span>
                            {c.short}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {parentsAndChildren.parents.length === 0
                   && parentsAndChildren.children.length === 0 && (
                    <p className="mt-4 text-xs italic text-slate-400">
                      No edges in the network for this node.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-2">
                    Inspector
                  </h3>
                  <p className="text-xs italic text-slate-400 leading-relaxed">
                    Click any node to see its name, type, evidence-bearing
                    status, and connected parents/children. Hover any node
                    to highlight its immediate neighbourhood.
                  </p>
                </>
              )}
            </div>

            {/* Network summary stats */}
            {data && (
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h3 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-3">
                  Network summary
                </h3>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Nodes</dt>
                    <dd className="font-mono text-slate-900">{data.nodes.length}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Edges</dt>
                    <dd className="font-mono text-slate-900">{data.edges.length}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Evidence-bearing</dt>
                    <dd className="font-mono text-slate-900">
                      {data.nodes.filter((n) => n.evidence_bearing).length}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Distinct types</dt>
                    <dd className="font-mono text-slate-900">{usedTypes.size}</dd>
                  </div>
                </dl>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
