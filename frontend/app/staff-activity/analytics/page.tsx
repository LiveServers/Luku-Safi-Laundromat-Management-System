'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getStoredUser, isManagerRole, staffFetch } from '@/lib/staff';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function StaffAnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [preset, setPreset] = useState('this_month');
  const [locationId, setLocationId] = useState('all');
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    if (!isManagerRole(getStoredUser()?.role)) {
      router.push('/staff-activity');
    }
  }, [router]);

  useEffect(() => {
    staffFetch<any[]>('/api/locations').then(setLocations).catch(console.error);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ preset });
    if (locationId !== 'all') params.set('location_id', locationId);
    staffFetch(`/api/staff/analytics?${params.toString()}`).then(setData).catch(console.error);
  }, [preset, locationId]);

  if (!data) return <div className="text-slate-500">Loading analytics...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-slate-600">Operational visibility, not surveillance scores.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['today', 'last7', 'this_month', 'all'].map((id) => (
            <Button key={id} size="sm" variant={preset === id ? 'default' : 'outline'} className={preset === id ? 'bg-emerald-700 hover:bg-emerald-800' : ''} onClick={() => setPreset(id)}>
              {id === 'last7' ? 'Last 7 days' : id === 'this_month' ? 'This month' : id === 'all' ? 'All time' : 'Today'}
            </Button>
          ))}
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>{location.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total activities" value={data.total_activities} />
        <Stat label="Activities today" value={data.activities_today} />
        <Stat label="Active employees today" value={data.active_employees_today} />
        <Stat label="No entries today" value={data.employees_with_no_entries_today} />
      </div>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle>Daily activity trend</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.daily_trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#047857" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <BarCard title="By employee" data={data.by_employee} />
        <BarCard title="By branch" data={data.by_branch} />
        <BarCard title="By category" data={data.by_category} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="pt-6">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-3xl font-bold text-emerald-800">{value}</p>
      </CardContent>
    </Card>
  );
}

function BarCard({ title, data }: { title: string; data: { name: string; count: number }[] }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" hide={data.length > 6} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#047857" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
