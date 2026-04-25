'use client';
import { useState } from 'react';
import { useFindings, useProjectOverview } from '@/hooks/use-project';
import { useAppStore } from '@/lib/store';
import { getProjectId, api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { SkeletonCard } from '@/components/ui/skeleton';
import clsx from 'clsx';

const CATEGORIES = ['setup', 'docs', 'deploy', 'api', 'data', 'security', 'hygiene'] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_ICONS: Record<Category, string> = {
  setup: 'settings',
  docs: 'menu_book',
  deploy: 'rocket_launch',
  api: 'api',
  data: 'database',
  security: 'security',
  hygiene: 'auto_fix_high',
};

export default function HealthPage() {
  const projectId = useAppStore((s) => s.projectId) || getProjectId();
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const { data: overview } = useProjectOverview(projectId);
  const { data: findingsData, isLoading, mutate } = useFindings(projectId, {
    ...(activeCategory ? { category: activeCategory } : {}),
    resolved: 'false',
  });

  const findings = Array.isArray(findingsData?.findings) ? findingsData.findings : Array.isArray(findingsData) ? findingsData : [];
  const allFindings = findings;
  const score = overview?.shippabilityScore ?? 84;

  const countByCategory = CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = allFindings.filter((f: any) => f.category === cat).length;
    return acc;
  }, {});

  const resolve = async (id: string) => {
    await api.findings.resolve(id);
    mutate();
  };

  return (
    <div className="flex flex-col h-full">
      <header className="h-16 shrink-0 border-b border-surface-variant flex items-center justify-between px-6">
        <h1 className="text-h2 font-semibold text-on-surface">Shippability Report</h1>
        <div className="flex items-center gap-2">
          <div className="font-mono text-[12px] text-on-surface-variant">Score:</div>
          <div className="font-mono text-[20px] font-bold text-primary">{score}</div>
          <div className="font-mono text-[12px] text-on-surface-variant">/100</div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Category sidebar */}
        <div className="w-56 shrink-0 border-r border-surface-variant bg-surface-container-low overflow-y-auto py-4">
          <button
            onClick={() => setActiveCategory(null)}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left',
              !activeCategory ? 'text-primary bg-primary/5 border-r-2 border-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container',
            )}
          >
            <Icon name="dashboard" size={16} />
            <span className="text-body-sm">All Categories</span>
            <span className="ml-auto font-mono text-[10px] bg-surface-variant px-1.5 py-0.5 rounded">
              {allFindings.length}
            </span>
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left',
                activeCategory === cat
                  ? 'text-primary bg-primary/5 border-r-2 border-primary'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container',
              )}
            >
              <Icon name={CATEGORY_ICONS[cat]} size={16} />
              <span className="text-body-sm capitalize">{cat}</span>
              {countByCategory[cat] > 0 && (
                <span className="ml-auto font-mono text-[10px] bg-error/20 text-error px-1.5 py-0.5 rounded">
                  {countByCategory[cat]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Findings list */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : findings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Icon name="check_circle" size={48} fill className="text-primary mb-4" />
              <h3 className="text-h2 font-semibold text-on-surface">All clear!</h3>
              <p className="text-body-sm text-on-surface-variant mt-2">No findings in this category.</p>
            </div>
          ) : (
            findings.map((finding: any) => (
              <div key={finding.id} className="bg-surface border border-surface-variant rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon
                      name={finding.severity === 'critical' ? 'error' : finding.severity === 'warn' ? 'warning' : 'info'}
                      size={18}
                      fill
                      className={
                        finding.severity === 'critical'
                          ? 'text-error shrink-0'
                          : finding.severity === 'warn'
                          ? 'text-tertiary shrink-0'
                          : 'text-blue-400 shrink-0'
                      }
                    />
                    <h3 className="text-body-md font-medium text-on-surface">{finding.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={finding.severity as any}>{finding.severity}</Badge>
                    <Badge variant="info">{finding.category}</Badge>
                  </div>
                </div>
                <p className="text-body-sm text-on-surface-variant pl-6">{finding.description}</p>
                {finding.suggestedActions?.length > 0 && (
                  <ul className="pl-6 flex flex-col gap-1">
                    {finding.suggestedActions.map((action: string, i: number) => (
                      <li key={i} className="text-body-sm text-on-surface-variant flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-outline shrink-0" />
                        {action}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => resolve(finding.id)}>
                    <Icon name="check" size={14} />
                    Mark Resolved
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
