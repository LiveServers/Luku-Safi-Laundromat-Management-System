'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  StickyNote,
  Users,
  Waves,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getStoredUser, isManagerRole } from '@/lib/staff';
import { cn } from '@/lib/utils';

const employeeNav = [
  { href: '/staff-activity', label: 'My Activity', icon: ClipboardList },
  { href: '/staff-activity/profile', label: 'My Profile', icon: Users },
];

const managerNav = [
  { href: '/staff-activity/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/staff-activity', label: 'My Activity', icon: ClipboardList },
  { href: '/staff-activity/feed', label: 'Activity', icon: Activity },
  { href: '/staff-activity/employees', label: 'Employees', icon: Users },
  { href: '/staff-activity/daily', label: 'Daily Overview', icon: CalendarDays },
  { href: '/staff-activity/notes', label: 'Management Notes', icon: StickyNote },
  { href: '/staff-activity/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/staff-activity/reports', label: 'Reports', icon: FileText },
  { href: '/staff-activity/settings', label: 'Settings', icon: Settings },
];

export function StaffShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const stored = getStoredUser();
    if (!token || !stored) {
      router.push('/auth/login');
      return;
    }
    setUser(stored);
  }, [router]);

  const manager = isManagerRole(user?.role);
  const items = useMemo(() => (manager ? managerNav : employeeNav), [manager]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
      </div>
    );
  }

  const nav = (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              active ? 'bg-emerald-700 text-white shadow-sm' : 'text-emerald-950 hover:bg-emerald-50'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
      <Link
        href="/"
        onClick={() => setOpen(false)}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-emerald-50"
      >
        <LayoutDashboard className="h-4 w-4" />
        Business dashboard
      </Link>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f4faf6] text-slate-900">
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-white">
            <Waves className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Luku Safi</p>
            <p className="text-xs text-slate-500">Staff activity</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setOpen((value) => !value)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      {open ? <div className="lg:hidden border-b bg-white px-4 py-4">{nav}</div> : null}

      <div className="lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:flex min-h-screen flex-col border-r bg-white px-4 py-6">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-700 text-white">
              <Waves className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Luku Safi</p>
              <p className="text-xs text-slate-500">Staff accountability</p>
            </div>
          </div>
          <div className="flex-1">{nav}</div>
          <div className="rounded-2xl bg-emerald-50 p-3">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-slate-500 capitalize">{user.job_title || user.role}</p>
            <Button variant="ghost" size="sm" className="mt-2 w-full justify-start px-0 text-slate-600" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </div>
        </aside>
        <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
