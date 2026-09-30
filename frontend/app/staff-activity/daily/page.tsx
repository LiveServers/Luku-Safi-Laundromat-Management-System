'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StaffAvatar } from '@/components/staff/StaffAvatar';
import { ActivityCard, StaffActivity } from '@/components/staff/ActivityCard';
import { formatDateLong, getStoredUser, isManagerRole, nairobiToday, staffFetch } from '@/lib/staff';
import { cn } from '@/lib/utils';

type OverviewEmployee = {
  id: string;
  name: string;
  job_title?: string;
  profile_photo_url?: string;
  location?: { display_name: string };
  activity_count: number;
  activities: StaffActivity[];
};

export default function DailyOverviewPage() {
  const router = useRouter();
  const [date, setDate] = useState(nairobiToday());
  const [employees, setEmployees] = useState<OverviewEmployee[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!isManagerRole(getStoredUser()?.role)) {
      router.push('/staff-activity');
    }
  }, [router]);

  useEffect(() => {
    staffFetch<{ employees: OverviewEmployee[] }>(`/api/staff/overview?date=${date}`)
      .then((data) => setEmployees(data.employees))
      .catch(console.error);
  }, [date]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Daily overview</h1>
          <p className="text-slate-600">{formatDateLong(date)}</p>
        </div>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {employees.map((employee) => {
          const open = openId === employee.id;
          return (
            <Card key={employee.id} className={cn('rounded-2xl', employee.activity_count === 0 && 'border-amber-200')}>
              <CardContent className="pt-6">
                <button className="flex w-full items-start gap-3 text-left" onClick={() => setOpenId(open ? null : employee.id)}>
                  <StaffAvatar name={employee.name} src={employee.profile_photo_url} />
                  <div className="flex-1">
                    <p className="font-semibold">{employee.name}</p>
                    <p className="text-xs text-slate-500">{employee.job_title} • {employee.location?.display_name}</p>
                    <p className={cn('mt-1 text-sm font-medium', employee.activity_count ? 'text-emerald-800' : 'text-amber-700')}>
                      {employee.activity_count ? `${employee.activity_count} activities` : 'No activity recorded today.'}
                    </p>
                  </div>
                </button>
                {open ? (
                  <div className="mt-4 space-y-3">
                    {employee.activities.map((activity) => (
                      <ActivityCard key={activity.id} activity={activity} compact />
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
