'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, staffFetch } from '@/lib/staff';

export default function MyProfilePage() {
  const router = useRouter();
  useEffect(() => {
    const user = getStoredUser();
    if (user?.id) {
      router.replace(`/staff-activity/employees/${user.id}`);
    }
  }, [router]);
  return <div className="text-slate-500">Opening your profile...</div>;
}
