import * as React from 'react';
import { Input as InputPrimitive } from '@base-ui/react/input';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        'h-10 w-full min-w-0 rounded-xl border border-[#dededb] bg-white px-3.5 py-2 text-xs font-medium text-[#20201d] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-150 outline-none',
        'hover:border-[#b5b5af] hover:bg-[#fafaf8]',
        'focus-visible:border-[var(--theme-strip,#114420)] focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-[var(--theme-strip-ring,rgba(17,68,32,0.18))]',
        'placeholder:text-[#9c9c96] placeholder:font-normal',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[#f5f5f3] disabled:text-[#92928c] disabled:opacity-75',
        'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
