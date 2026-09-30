'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityCard, StaffActivity } from '@/components/staff/ActivityCard';
import { StaffAvatar } from '@/components/staff/StaffAvatar';
import { formatTime, isManagerRole, getStoredUser, staffFetch } from '@/lib/staff';
import { useRouter } from 'next/navigation';

type Dashboard = {
  date: string;
  activities_today: number;
  active_employees_today: number;
  employees_without_activity: number;
  who_worked: any[];
  who_has_not: any[];
  recent: StaffActivity[];
};

export default function StaffDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [reminders, setReminders] = useState<any[]>([]);

  useEffect(() => {
    const user = getStoredUser();
    if (!isManagerRole(user?.role)) {
      router.push('/staff-activity');
      return;
    }
    const load = async () => {
      const dashboard = await staffFetch<Dashboard>('/api/staff/dashboard');
      setData(dashboard);
      const reminderData = await staffFetch<any>('/api/staff/reminders');
      setReminders(reminderData.reminders || []);
    };
    load().catch(console.error);
  }, [router]);

  if (!data) {
    return <div className="text-slate-500">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Activity dashboard</h1>
        <p className="text-slate-600">Who did what, when they did it, and where it happened.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Activities today</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold text-emerald-800">{data.activities_today}</CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Worked today</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{data.active_employees_today}</CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">No activity yet</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold text-amber-700">{data.employees_without_activity}</CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Recent updates</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{data.recent.length}</CardContent>
        </Card>
      </div>

      {reminders.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Quiet reminders: {reminders.map((item) => item.name).join(', ')} have not logged activity recently.
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.recent.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} compact />
            ))}
            {!data.recent.length ? <p className="text-slate-500">No activities recorded yet today.</p> : null}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader><CardTitle>Who worked today</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data.who_worked.map((employee) => (
                <Link key={employee.id} href={`/staff-activity/employees/${employee.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-emerald-50">
                  <StaffAvatar name={employee.name} src={employee.profile_photo_url} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{employee.name}</p>
                    <p className="text-xs text-slate-500">{employee.today_count} updates • last {formatTime(employee.last_activity_at)}</p>
                  </div>
                </Link>
              ))}
              {!data.who_worked.length ? <p className="text-sm text-slate-500">Nobody has logged activity yet.</p> : null}
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader><CardTitle>No activity recorded today</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data.who_has_not.map((employee) => (
                <Link key={employee.id} href={`/staff-activity/employees/${employee.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-amber-50">
                  <StaffAvatar name={employee.name} src={employee.profile_photo_url} />
                  <div>
                    <p className="font-medium">{employee.name}</p>
                    <p className="text-xs text-amber-700">No activity recorded today.</p>
                  </div>
                </Link>
              ))}
              {!data.who_has_not.length ? <p className="text-sm text-slate-500">Everyone has logged something today.</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
