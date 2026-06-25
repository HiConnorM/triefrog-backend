'use client';
import { useProjectOverview, useFindings } from '@/hooks/use-project';
import { useAppStore } from '@/lib/store';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { api, getProjectId } from '@/lib/api';
import { useState } from 'react';

const STATUS_ICONS: Record<string, string> = {
  verified: 'check_circle',
  suspect: 'warning',
  critical: 'error',
  info: 'info',
};

export default function OverviewPage() {
  const projectId = useAppStore((s) => s.projectId) || getProjectId();
  const { data: overview, isLoading: overviewLoading } = useProjectOverview(projectId);
  const { data: findingsData, isLoading: findingsLoading, mutate } = useFindings(projectId, { resolved: 'false' });
  const [scanning, setScanning] = useState(false);

  const findings = Array.isArray(findingsData?.findings) ? findingsData.findings : Array.isArray(findingsData) ? findingsData : [];
  const score = overview?.shippabilityScore ?? 84;
  const healthCards = overview?.healthCards ?? [];
  const project = overview?.project;

  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const triggerScan = async () => {
    setScanning(true);
    try {
      await api.projects.scan(projectId);
      setTimeout(() => { setScanning(false); mutate(); }, 5000);
    } catch { setScanning(false); }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="h-16 shrink-0 border-b border-surface-variant flex items-center justify-between px-6 bg-surface-container-lowest/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 font-mono text-[12px] text-on-surface-variant">
          <Icon name="folder_open" size={16} className="text-outline" />
          <span>Project</span>
          <span className="text-outline-variant">/</span>
          <span className="text-primary">{project?.name || 'triefrog-web-app'}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-[12px] text-on-surface-variant bg-surface px-3 py-1.5 rounded border border-surface-variant">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Last Scan: {project?.lastScanAt ? new Date(project.lastScanAt).toLocaleString() : 'never'}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={triggerScan} loading={scanning}>
            <Icon name="refresh" size={14} />
            Re-scan
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 w-full flex flex-col gap-6">
          {/* Score + Health Cards */}
          <section className="flex flex-col xl:flex-row gap-6">
            {/* Score ring */}
            <div className="xl:w-72 bg-surface border border-surface-variant rounded-lg flex flex-col items-center justify-center p-10 relative overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 absolute inset-0">
                  <circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="6" className="text-surface-variant" />
                  <circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
                    className="text-primary transition-all duration-1000" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
                </svg>
                <div className="flex flex-col items-center text-center z-10">
                  <span className="text-[40px] font-bold text-on-surface leading-none">{score}</span>
                  <span className="font-mono text-[10px] text-primary mt-1">SCORE</span>
                </div>
              </div>
              <h2 className="font-mono text-[11px] text-on-surface-variant uppercase tracking-widest mt-6 z-10">
                Shippability
              </h2>
            </div>

            {/* Health cards */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              {overviewLoading
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                : healthCards.length > 0
                ? healthCards.map((card: any, i: number) => (
                    <div
                      key={i}
                      className={`bg-surface border border-surface-variant border-t-2 rounded-lg p-4 flex flex-col justify-between ${
                        card.status === 'verified'
                          ? 'border-t-primary'
                          : card.status === 'critical'
                          ? 'border-t-error'
                          : 'border-t-tertiary'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <Icon
                          name={STATUS_ICONS[card.status] || 'info'}
                          size={24}
                          fill
                          className={
                            card.status === 'verified'
                              ? 'text-primary'
                              : card.status === 'critical'
                              ? 'text-error'
                              : 'text-tertiary'
                          }
                        />
                        <Badge variant={(card.status as any) || 'info'}>{card.status}</Badge>
                      </div>
                      <div className="mt-8 flex flex-col">
                        <span className="font-mono text-[11px] text-on-surface uppercase tracking-widest">{card.category}</span>
                        <span className="font-mono text-[10px] text-on-surface-variant mt-1">{card.description || card.title}</span>
                      </div>
                    </div>
                  ))
                : DEFAULT_CARDS.map((card, i) => (
                    <div key={i} className={`bg-surface border border-surface-variant border-t-2 ${card.borderColor} rounded-lg p-4 flex flex-col justify-between`}>
                      <div className="flex justify-between items-start">
                        <Icon name={card.icon} size={24} fill className={card.iconColor} />
                        <Badge variant={card.badge as any}>{card.badge}</Badge>
                      </div>
                      <div className="mt-8 flex flex-col">
                        <span className="font-mono text-[11px] text-on-surface uppercase tracking-widest">{card.title}</span>
                        <span className="font-mono text-[10px] text-on-surface-variant mt-1">{card.desc}</span>
                      </div>
                    </div>
                  ))}
            </div>
          </section>

          {/* Next Best Actions */}
          <section className="bg-surface border border-surface-variant rounded-lg flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-variant flex justify-between items-center bg-surface-container-low">
              <h2 className="font-mono text-[11px] text-on-surface uppercase tracking-widest flex items-center gap-2">
                <Icon name="task_alt" size={16} className="text-outline" />
                Next Best Actions
              </h2>
              <div className="font-mono text-[10px] text-outline bg-surface-variant px-2 py-0.5 rounded">
                {findings.length} PENDING
              </div>
            </div>
            {findingsLoading ? (
              <div className="p-4 flex flex-col gap-3">
                {[1, 2, 3].map((i) => <div key={i} className="skeleton h-10 rounded" />)}
              </div>
            ) : findings.length === 0 ? (
              <div className="p-6 text-center text-on-surface-variant text-body-sm">
                No pending actions — project looks healthy!
              </div>
            ) : (
              findings.slice(0, 5).map((f: any) => (
                <div key={f.id} className="px-4 py-3 border-b border-surface-variant flex items-center gap-4 hover:bg-surface-container-highest transition-colors cursor-pointer group last:border-0">
                  <div className="w-4 h-4 rounded border border-outline-variant shrink-0" />
                  <div className="flex-1 flex flex-col">
                    <div className="text-body-sm text-on-surface">{f.title}</div>
                    <div className="font-mono text-[10px] text-on-surface-variant mt-1 flex gap-2">
                      <span className={f.severity === 'critical' ? 'text-error' : f.severity === 'warn' ? 'text-tertiary' : 'text-outline'}>
                        {f.severity}
                      </span>
                      <span className="text-outline-variant">•</span>
                      <span>{f.category}</span>
                    </div>
                  </div>
                  <Icon name="arrow_forward" size={16} className="text-outline group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_CARDS = [
  { title: 'Setup Health', desc: 'All pre-flight checks passed', icon: 'check_circle', iconColor: 'text-primary', borderColor: 'border-t-primary', badge: 'verified' },
  { title: 'Deploy Readiness', desc: '2 non-blocking warnings', icon: 'warning', iconColor: 'text-tertiary', borderColor: 'border-t-tertiary', badge: 'suspect' },
  { title: 'API Coverage', desc: 'Below 75% threshold (62%)', icon: 'error', iconColor: 'text-error', borderColor: 'border-t-error', badge: 'critical' },
  { title: 'Security', desc: '0 known vulnerabilities', icon: 'security', iconColor: 'text-primary', borderColor: 'border-t-primary', badge: 'verified' },
];
