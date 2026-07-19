import * as React from 'react';
import { cn } from '@/lib/utils';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn('input-field min-h-[120px] resize-y', className)}
      ref={ref}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
