import * as React from 'react';

import { cn } from '@/lib/utils';

export type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement>;

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <input
      type="checkbox"
      className={cn('size-4 rounded border border-input accent-primary cursor-pointer', className)}
      ref={ref}
      {...props}
    />
  ),
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
