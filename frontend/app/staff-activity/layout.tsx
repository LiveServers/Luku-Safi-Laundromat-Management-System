'use client';

import { StaffShell } from '@/components/staff/StaffShell';
import { Toaster } from '@/components/ui/toaster';

export default function StaffActivityLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffShell>
      {children}
      <Toaster />
    </StaffShell>
  );
}
