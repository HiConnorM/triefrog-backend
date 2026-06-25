'use client';
import { useState } from 'react';
import { useFindings } from '@/hooks/use-project';
import { useAppStore } from '@/lib/store';
import { getProjectId, api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { SkeletonCard } from '@/components/ui/skeleton';
import clsx from 'clsx';

type Filter = 'all' | 'pending' | 'resolved';

export default function FixesPage() {
  const projectId = useAppStore((s) => s.projectId) || getProjectId();
  const [filter, setFilter] = useState<Filter>('pending');
  const [resolving, setResolving] = useState<string | null>(null);

  const params: Record<string, string> =
    filter === 'all' ? {} : filter === 'resolved' ? { resolved: 'true' } : { resolved: 'false' };
  const { data: findingsData, isLoading, mutate } = useFindings(projectId, params);
  const findings = Array.isArray(findingsData?.findings) ? findingsData.findings : Array.isArray(findingsData) ? findingsData : [];

  const critical = findings.filter((f: any) => f.severity === 'critical' && !f.resolved).length;
  const warn = findings.filter((f: any) => f.severity === 'warn' && !f.resolved).length;
  const resolved = findings.filter((f: any) => f.resolved).length;

  const resolve = async (id: string) => {
    setResolving(id);
    await api.findings.resolve(id).catch(() => {});
    await mutate();
    setResolving(null);
  };

  return (
    <div className="flex flex-col h-full">
      <header className="h-16 shrink-0 border-b border-surface-variant flex items-center justify-between px-6">
        <h1 className="text-h2 font-semibold text-on-surface">Fix Center</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-error">{critical} critical</span>
            <span className="text-outline-variant">·</span>
            <span className="text-tertiary">{warn} warn</span>
            <span className="text-outline-variant">·</span>
            <span className="text-primary">{resolved} resolved</span>
          </div>
        </div>
      </header>

      {/* Filter tabs */}
      <div className="border-b border-surface-variant flex items-center gap-0 px-6">
        {(['all', 'pending', 'resolved'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest border-b-2 -mb-px transition-colors capitalize',
              filter === f ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface',
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          : findings.length === 0
          ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Icon name="check_circle" size={48} fill className="text-primary mb-4" />
              <h3 className="text-h2 font-semibold text-on-surface">Nothing here</h3>
              <p className="text-body-sm text-on-surface-variant mt-2">
                {filter === 'resolved' ? 'No resolved findings yet.' : 'No pending fixes — project is clean!'}
              </p>
            </div>
          )
          : findings.map((finding: any) => (
            <div
              key={finding.id}
              className={clsx(
                'bg-surface border border-surface-variant rounded-lg p-4 flex flex-col gap-3',
                finding.resolved && 'opacity-60',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Icon
                    name={finding.severity === 'critical' ? 'error' : finding.severity === 'warn' ? 'warning' : 'info'}
                    size={20}
                    fill
                    className={clsx(
                      'shrink-0 mt-0.5',
                      finding.severity === 'critical' ? 'text-error' : finding.severity === 'warn' ? 'text-tertiary' : 'text-blue-400',
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body-md font-medium text-on-surface">{finding.title}</h3>
                    <p className="text-body-sm text-on-surface-variant mt-1">{finding.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={finding.severity}>{finding.severity}</Badge>
                  <Badge variant="info">{finding.category}</Badge>
                </div>
              </div>

              {finding.suggestedActions?.length > 0 && (
                <div className="pl-8 flex flex-col gap-1">
                  {finding.suggestedActions.slice(0, 3).map((a: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                      <Icon name="arrow_right" size={14} className="text-outline shrink-0" />
                      {a}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                {finding.resolved ? (
                  <span className="font-mono text-[10px] text-primary flex items-center gap-1">
                    <Icon name="check_circle" size={12} fill /> Resolved
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={resolving === finding.id}
                    onClick={() => resolve(finding.id)}
                  >
                    <Icon name="check" size={14} />
                    Mark Resolved
                  </Button>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
