import * as React from 'react';

import { cn } from '@/lib/utils';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
}

const Progress = ({ value, max = 100, className, ...props }: ProgressProps) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      {...props}
    >
      <div className="h-full bg-primary transition-all" style={{ width: `${percentage}%` }} />
    </div>
  );
};
Progress.displayName = 'Progress';

export { Progress };
