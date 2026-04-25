import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton rounded', className)} />;
}

export function SkeletonCard({ lines = 3 }: SkeletonProps) {
  return (
    <div className="bg-surface border border-surface-variant rounded-lg p-4 flex flex-col gap-3">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}
