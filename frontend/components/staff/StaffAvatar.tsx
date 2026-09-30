'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { initials } from '@/lib/staff';
import { cn } from '@/lib/utils';

export function StaffAvatar({
  name,
  src,
  className,
}: {
  name?: string;
  src?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn('h-10 w-10 border border-emerald-100', className)}>
      {src ? <AvatarImage src={src} alt={name || 'Staff'} /> : null}
      <AvatarFallback className="bg-emerald-700 text-white text-sm font-semibold">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
