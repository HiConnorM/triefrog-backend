'use client';
import { useState } from 'react';
import { useDocs, useDoc } from '@/hooks/use-project';
import { useAppStore } from '@/lib/store';
import { getProjectId, api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import clsx from 'clsx';

const DOC_ICONS: Record<string, string> = {
  readme: 'description',
  setup: 'settings',
  architecture: 'architecture',
  deploy: 'rocket_launch',
  api: 'api',
  'data-model': 'database',
  runbook: 'menu_book',
  adr: 'history',
};

// Simple markdown renderer
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="flex flex-col gap-2 text-body-md text-on-surface leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('# '))
          return <h1 key={i} className="text-h1 font-bold text-on-surface mt-4 mb-2 first:mt-0">{line.slice(2)}</h1>;
        if (line.startsWith('## '))
          return <h2 key={i} className="text-h2 font-semibold text-on-surface mt-3 mb-1.5">{line.slice(3)}</h2>;
        if (line.startsWith('### '))
          return <h3 key={i} className="text-body-md font-semibold text-on-surface mt-2">{line.slice(4)}</h3>;
        if (line.startsWith('```'))
          return null;
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 text-on-surface-variant list-disc">{line.slice(2)}</li>;
        if (line.startsWith('> '))
          return <blockquote key={i} className="border-l-2 border-primary pl-3 text-on-surface-variant italic">{line.slice(2)}</blockquote>;
        if (line === '')
          return <span key={i} className="block h-2" />;
        // Inline code
        const parts = line.split(/(`[^`]+`)/g);
        return (
          <p key={i} className="text-on-surface-variant">
            {parts.map((part, j) =>
              part.startsWith('`') && part.endsWith('`') ? (
                <code key={j} className="font-mono text-[11px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  {part.slice(1, -1)}
                </code>
              ) : part,
            )}
          </p>
        );
      })}
    </div>
  );
}

function DocContent({ docId }: { docId: string }) {
  const { data: doc, isLoading, mutate } = useDoc(docId);
  const [verifying, setVerifying] = useState(false);

  if (isLoading) return (
    <div className="flex flex-col gap-3 p-6">
      {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className={`h-4 ${i % 3 === 0 ? 'w-1/2' : 'w-full'}`} />)}
    </div>
  );
  if (!doc) return <div className="p-6 text-on-surface-variant">Select a doc to view</div>;

  const verify = async () => {
    setVerifying(true);
    await api.docs.verify(docId).catch(() => {});
    mutate();
    setVerifying(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-surface-variant flex items-center justify-between shrink-0">
        <div className="flex flex-col">
          <h2 className="text-h2 font-semibold text-on-surface">{doc.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={(doc.status as any) || 'draft'}>{doc.status}</Badge>
            {doc.lastVerifiedAt && (
              <span className="font-mono text-[10px] text-on-surface-variant">
                Verified {new Date(doc.lastVerifiedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={verify} loading={verifying}>
            <Icon name="verified" size={14} />
            Verify
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {doc.content ? <MarkdownRenderer content={doc.content} /> : (
          <p className="text-on-surface-variant text-body-sm">No content yet. Generate docs to fill this in.</p>
        )}
      </div>
    </div>
  );
}

export default function DocsPage() {
  const projectId = useAppStore((s) => s.projectId) || getProjectId();
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [exportMsg, setExportMsg] = useState('');
  const { data: docs, isLoading, mutate } = useDocs(projectId);

  const docsList = Array.isArray(docs?.docs) ? docs.docs : Array.isArray(docs) ? docs : [];

  const generateAll = async () => {
    setGenerating(true);
    await api.docs.generate(projectId).catch(() => {});
    await mutate();
    setGenerating(false);
  };

  const exportPr = async () => {
    const r = await api.docs.exportPr(projectId).catch(() => ({ data: { prUrl: '#', message: 'Mocked PR created' } }));
    setExportMsg(r.data?.prUrl || r.data?.data?.prUrl || 'PR created!');
  };

  return (
    <div className="flex flex-col h-full">
      <header className="h-16 shrink-0 border-b border-surface-variant flex items-center justify-between px-6">
        <h1 className="text-h2 font-semibold text-on-surface">Docs Workspace</h1>
        <div className="flex items-center gap-2">
          {exportMsg && <span className="font-mono text-[11px] text-primary">{exportMsg}</span>}
          <Button variant="ghost" size="sm" onClick={exportPr}>
            <Icon name="call_merge" size={14} />
            Export PR
          </Button>
          <Button variant="secondary" size="sm" onClick={generateAll} loading={generating}>
            <Icon name="auto_awesome" size={14} />
            Generate All
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Doc list sidebar */}
        <div className="w-56 shrink-0 border-r border-surface-variant bg-surface-container-low overflow-y-auto py-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="mx-3 mb-2 skeleton h-10 rounded" />)
            : docsList.map((doc: any) => (
              <button
                key={doc.id}
                onClick={() => setActiveDocId(doc.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  activeDocId === doc.id
                    ? 'text-primary bg-primary/5 border-r-2 border-primary'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container',
                )}
              >
                <Icon name={DOC_ICONS[doc.type] || 'article'} size={16} />
                <span className="text-body-sm capitalize truncate">{doc.title || doc.type}</span>
                <span className={clsx('ml-auto w-2 h-2 rounded-full shrink-0', doc.status === 'verified' ? 'bg-primary' : doc.status === 'stale' ? 'bg-tertiary' : 'bg-outline')} />
              </button>
            ))}
        </div>

        {/* Doc content */}
        <div className="flex-1 overflow-hidden bg-surface">
          {activeDocId ? (
            <DocContent docId={activeDocId} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <Icon name="menu_book" size={48} className="text-outline mb-4" />
              <h3 className="text-h2 font-semibold text-on-surface">Select a document</h3>
              <p className="text-body-sm text-on-surface-variant mt-2">
                Choose a doc from the sidebar, or generate all docs.
              </p>
              <Button className="mt-4" onClick={generateAll} loading={generating}>
                <Icon name="auto_awesome" size={14} />
                Generate All Docs
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
