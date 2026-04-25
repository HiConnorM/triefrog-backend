'use client';
import { useState, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useMapData, useTrieData, useNode } from '@/hooks/use-project';
import { useAppStore } from '@/lib/store';
import { getProjectId } from '@/lib/api';
import { Icon } from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';
import { SkeletonCard } from '@/components/ui/skeleton';
import clsx from 'clsx';

const TYPE_COLORS: Record<string, { border: string; bg: string; label: string }> = {
  page:           { border: '#6366f1', bg: '#6366f120', label: 'Page' },
  'api-endpoint': { border: '#4edf96', bg: '#4edf9620', label: 'API' },
  'db-table':     { border: '#60a5fa', bg: '#60a5fa20', label: 'DB' },
  'env-var':      { border: '#facc15', bg: '#facc1520', label: 'Env' },
  integration:    { border: '#fb923c', bg: '#fb923c20', label: 'Integration' },
  'deploy-target':{ border: '#2dd4bf', bg: '#2dd4bf20', label: 'Deploy' },
  script:         { border: '#a78bfa', bg: '#a78bfa20', label: 'Script' },
  project:        { border: '#4edf96', bg: '#4edf9620', label: 'Project' },
};

const STATUS_BORDER: Record<string, string> = {
  verified: '#4edf96',
  suspect:  '#ffb3b2',
  missing:  '#ffb4ab',
  changed:  '#facc15',
};

function CustomNode({ data }: { data: any }) {
  const colors = TYPE_COLORS[data.type] || { border: '#869489', bg: '#86948920', label: data.type };
  const statusColor = STATUS_BORDER[data.status] || '#3d4a40';
  return (
    <div
      className="bg-surface border rounded text-on-surface min-w-[140px] max-w-[200px] cursor-pointer"
      style={{
        borderColor: colors.border,
        borderTopColor: statusColor,
        borderTopWidth: 3,
        backgroundColor: colors.bg,
      }}
      onClick={data.onClick}
    >
      <div className="px-3 py-2">
        <div className="font-mono text-[9px] text-on-surface-variant mb-1 uppercase tracking-widest">
          {colors.label}
        </div>
        <div className="text-[13px] font-medium text-on-surface truncate">{data.name}</div>
        {data.files?.[0] && (
          <div className="font-mono text-[9px] text-on-surface-variant mt-1 truncate opacity-60">
            {data.files[0]}
          </div>
        )}
      </div>
    </div>
  );
}

const nodeTypes = { custom: CustomNode };

function NodeInspector({ nodeId }: { nodeId: string }) {
  const { data: node, isLoading } = useNode(nodeId);
  if (isLoading) return <SkeletonCard lines={5} />;
  if (!node) return null;
  const colors = TYPE_COLORS[node.type] || { border: '#869489', bg: '#86948920', label: node.type };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-[10px] text-on-surface-variant">{colors.label}</div>
          <h3 className="text-h2 font-semibold text-on-surface mt-0.5">{node.name}</h3>
        </div>
        <Badge variant={(node.status as any) || 'suspect'}>{node.status}</Badge>
      </div>

      {node.files?.length > 0 && (
        <div>
          <p className="font-mono text-[10px] text-on-surface-variant uppercase mb-2">Files</p>
          {node.files.map((f: string, i: number) => (
            <div key={i} className="font-mono text-[11px] text-primary truncate">{f}</div>
          ))}
        </div>
      )}

      {node.findings?.length > 0 && (
        <div>
          <p className="font-mono text-[10px] text-on-surface-variant uppercase mb-2">Findings</p>
          {node.findings.map((f: any) => (
            <div key={f.id} className="flex items-center gap-2 text-body-sm">
              <span className={f.severity === 'critical' ? 'text-error' : 'text-tertiary'}>⚠</span>
              <span className="text-on-surface-variant">{f.title}</span>
            </div>
          ))}
        </div>
      )}

      {node.edges?.from?.length > 0 && (
        <div>
          <p className="font-mono text-[10px] text-on-surface-variant uppercase mb-2">Outgoing</p>
          {node.edges.from.map((e: any) => (
            <div key={e.id} className="font-mono text-[11px] text-on-surface-variant">
              → {e.to?.name} <span className="text-outline">({e.type})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrieTree({ node, depth = 0 }: { node: any; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const { setSelectedNodeId } = useAppStore();
  const colors = TYPE_COLORS[node.type] || { border: '#869489', bg: '#86948920', label: node.type };

  return (
    <div className={clsx('flex flex-col', depth > 0 && 'ml-4 border-l border-outline-variant pl-3')}>
      <div
        className="flex items-center gap-2 py-1 px-2 rounded hover:bg-surface-container-high cursor-pointer group"
        onClick={() => { setOpen(!open); setSelectedNodeId(node.id); }}
      >
        {node.children?.length > 0 ? (
          <Icon name={open ? 'expand_more' : 'chevron_right'} size={14} className="text-outline shrink-0" />
        ) : (
          <span className="w-3.5 h-3.5 shrink-0" />
        )}
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors.border }} />
        <span className="text-body-sm text-on-surface group-hover:text-primary transition-colors">{node.name}</span>
        <span className="font-mono text-[9px] text-on-surface-variant ml-auto">{colors.label}</span>
      </div>
      {open && node.children?.map((child: any) => (
        <TrieTree key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function MapPage() {
  const projectId = useAppStore((s) => s.projectId) || getProjectId();
  const { selectedNodeId, setSelectedNodeId } = useAppStore();
  const [view, setView] = useState<'graph' | 'trie'>('graph');
  const { data: mapData, isLoading: mapLoading } = useMapData(projectId);
  const { data: trieData, isLoading: trieLoading } = useTrieData(projectId);

  const rfNodes: Node[] = (mapData?.nodes || []).map((n: any) => ({
    id: n.id,
    type: 'custom',
    position: { x: n.x || 0, y: n.y || 0 },
    data: { ...n, onClick: () => setSelectedNodeId(n.id) },
  }));

  const rfEdges: Edge[] = (mapData?.edges || []).map((e: any) => ({
    id: e.id,
    source: e.from,
    target: e.to,
    label: e.type,
    style: { stroke: '#3d4a40', strokeWidth: 1 },
    labelStyle: { fontSize: 9, fill: '#869489' },
    labelBgStyle: { fill: '#09100b', fillOpacity: 0.8 },
  }));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="h-16 shrink-0 border-b border-surface-variant flex items-center justify-between px-6">
        <h1 className="text-h2 font-semibold text-on-surface">Project Map</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('graph')}
            className={clsx('px-3 py-1.5 font-mono text-[11px] rounded border transition-colors', view === 'graph' ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant text-on-surface-variant')}
          >
            <Icon name="hub" size={14} /> Graph
          </button>
          <button
            onClick={() => setView('trie')}
            className={clsx('px-3 py-1.5 font-mono text-[11px] rounded border transition-colors', view === 'trie' ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant text-on-surface-variant')}
          >
            <Icon name="account_tree" size={14} /> Trie
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main canvas */}
        <div className="flex-1 relative">
          {mapLoading && view === 'graph' ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : view === 'graph' ? (
            <ReactFlow
              nodes={rfNodes}
              edges={rfEdges}
              nodeTypes={nodeTypes}
              fitView
              style={{ background: '#09100b' }}
            >
              <Background color="#1a211c" gap={20} />
              <Controls style={{ background: '#1a211c', borderColor: '#3d4a40', color: '#dde5dc' }} />
              <MiniMap style={{ background: '#161d18', borderColor: '#3d4a40' }} nodeColor="#3d4a40" />
            </ReactFlow>
          ) : (
            <div className="h-full overflow-y-auto p-6">
              {trieLoading ? <SkeletonCard lines={6} /> : trieData ? <TrieTree node={trieData} /> : <p className="text-on-surface-variant">No trie data</p>}
            </div>
          )}
        </div>

        {/* Inspector panel */}
        {selectedNodeId && (
          <div className="w-80 shrink-0 border-l border-surface-variant bg-surface overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-[11px] text-on-surface-variant uppercase tracking-widest">Inspector</h3>
              <button onClick={() => setSelectedNodeId(null)}>
                <Icon name="close" size={16} className="text-outline hover:text-on-surface" />
              </button>
            </div>
            <NodeInspector nodeId={selectedNodeId} />
          </div>
        )}
      </div>
    </div>
  );
}
