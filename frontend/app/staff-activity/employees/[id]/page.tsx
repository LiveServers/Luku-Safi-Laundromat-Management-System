'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StaffAvatar } from '@/components/staff/StaffAvatar';
import { ActivityTimeline } from '@/components/staff/ActivityTimeline';
import { StaffActivity } from '@/components/staff/ActivityCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatDateLong, formatTime, getStoredUser, isManagerRole, nairobiToday, nairobiYesterday, staffFetch } from '@/lib/staff';

const ranges = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'custom', label: 'Custom Date Range' },
];

export default function EmployeeProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [activities, setActivities] = useState<StaffActivity[]>([]);
  const [preset, setPreset] = useState('today');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    const user = getStoredUser();
    if (!isManagerRole(user?.role) && user?.id !== params.id) {
      router.push('/staff-activity');
    }
  }, [params.id, router]);

  useEffect(() => {
    staffFetch(`/api/staff/employees/${params.id}`).then(setProfile).catch(console.error);
  }, [params.id]);

  useEffect(() => {
    const query = new URLSearchParams({ employee_id: params.id, limit: '200' });
    if (preset === 'custom') {
      if (from) query.set('from', from);
      if (to) query.set('to', to);
    } else {
      query.set('preset', preset);
    }
    staffFetch<{ activities: StaffActivity[] }>(`/api/staff/activities?${query.toString()}`)
      .then((data) => setActivities(data.activities))
      .catch(console.error);
  }, [params.id, preset, from, to]);

  if (!profile) return <div className="text-slate-500">Loading profile...</div>;
  const employee = profile.employee;
  const stats = profile.stats;

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl overflow-hidden">
        <div className="h-20 bg-emerald-700" />
        <CardContent className="-mt-8 flex flex-col sm:flex-row sm:items-end gap-4">
          <StaffAvatar name={employee.name} src={employee.profile_photo_url} className="h-16 w-16 border-4 border-white" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{employee.name}</h1>
            <p className="text-slate-600">{employee.job_title || employee.role} • {employee.location?.display_name}</p>
            <Badge className={employee.is_active ? 'mt-2 bg-emerald-50 text-emerald-800' : 'mt-2'}>
              {employee.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl"><CardContent className="pt-6"><p className="text-sm text-slate-500">Today</p><p className="text-2xl font-bold">{stats.today_count}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="pt-6"><p className="text-sm text-slate-500">This week</p><p className="text-2xl font-bold">{stats.week_count}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="pt-6"><p className="text-sm text-slate-500">Most recent</p><p className="text-sm font-medium">{stats.last_activity ? `${formatTime(stats.last_activity.created_at)} · ${stats.last_activity.activity_text}` : 'No activity yet'}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {ranges.map((range) => (
          <Button
            key={range.id}
            size="sm"
            variant={preset === range.id ? 'default' : 'outline'}
            className={preset === range.id ? 'bg-emerald-700 hover:bg-emerald-800' : ''}
            onClick={() => {
              setPreset(range.id);
              if (range.id === 'today') {
                setFrom(nairobiToday());
                setTo(nairobiToday());
              }
              if (range.id === 'yesterday') {
                setFrom(nairobiYesterday());
                setTo(nairobiYesterday());
              }
            }}
          >
            {range.label}
          </Button>
        ))}
      </div>
      {preset === 'custom' ? (
        <div className="flex gap-3">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      ) : null}

      <ActivityTimeline
        activities={activities}
        emptyText={`No activity recorded for ${employee.name} in this period.`}
      />
    </div>
  );
}
