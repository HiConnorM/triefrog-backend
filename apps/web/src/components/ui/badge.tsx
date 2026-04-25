import clsx from 'clsx';

type BadgeVariant =
  | 'verified'
  | 'suspect'
  | 'missing'
  | 'changed'
  | 'critical'
  | 'warn'
  | 'info'
  | 'draft'
  | 'stale'
  | 'done'
  | 'running'
  | 'queued'
  | 'failed';

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  verified: 'bg-primary/10 text-primary border-primary/20',
  suspect: 'bg-tertiary/10 text-tertiary border-tertiary/20',
  missing: 'bg-error/10 text-error border-error/20',
  changed: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  critical: 'bg-error/10 text-error border-error/20',
  warn: 'bg-tertiary/10 text-tertiary border-tertiary/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  draft: 'bg-outline/10 text-on-surface-variant border-outline/20',
  stale: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  done: 'bg-primary/10 text-primary border-primary/20',
  running: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  queued: 'bg-outline/10 text-on-surface-variant border-outline/20',
  failed: 'bg-error/10 text-error border-error/20',
};

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border uppercase tracking-widest',
        VARIANT_STYLES[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
