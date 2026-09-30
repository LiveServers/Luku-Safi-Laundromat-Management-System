'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { defaultFilters, FilterBar, toQuery } from '@/components/staff/FilterBar';
import { branchLabel, formatDateLong, formatTime, getStoredUser, isManagerRole, staffFetch } from '@/lib/staff';
import { StaffActivity } from '@/components/staff/ActivityCard';
import { useToast } from '@/hooks/use-toast';

export default function ReportsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [filters, setFilters] = useState(defaultFilters());
  const [activities, setActivities] = useState<StaffActivity[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    if (!isManagerRole(getStoredUser()?.role)) {
      router.push('/staff-activity');
    }
  }, [router]);

  useEffect(() => {
    Promise.all([
      staffFetch<any[]>('/api/staff/employees'),
      staffFetch<any[]>('/api/locations'),
      staffFetch<any[]>('/api/staff/categories'),
    ]).then(([staff, locs, cats]) => {
      setEmployees(staff);
      setLocations(locs);
      setCategories(cats);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    staffFetch<{ activities: StaffActivity[] }>(`/api/staff/activities?${toQuery(filters)}&limit=200`)
      .then((data) => setActivities(data.activities))
      .catch(console.error);
  }, [filters]);

  const exportCsv = async () => {
    try {
      const blob = await staffFetch<Blob>(`/api/staff/export?${toQuery(filters)}`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'staff-activity.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Export failed', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-slate-600">Export the currently filtered activity records.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>Printable report</Button>
          <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={exportCsv}>Export CSV</Button>
        </div>
      </div>
      <div className="print:hidden">
        <FilterBar filters={filters} onChange={setFilters} employees={employees} locations={locations} categories={categories} />
      </div>
      <div className="rounded-2xl border bg-white overflow-x-auto print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-emerald-50 text-left">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Time</th>
              <th className="p-3">Employee</th>
              <th className="p-3">Branch</th>
              <th className="p-3">Category</th>
              <th className="p-3">Activity</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((activity) => (
              <tr key={activity.id} className="border-t align-top">
                <td className="p-3 whitespace-nowrap">{formatDateLong(activity.activity_date)}</td>
                <td className="p-3 whitespace-nowrap">{formatTime(activity.created_at)}</td>
                <td className="p-3">{activity.employee.name}</td>
                <td className="p-3">{branchLabel(activity)}</td>
                <td className="p-3">{activity.category?.name || ''}</td>
                <td className="p-3">{activity.activity_text}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!activities.length ? <p className="p-6 text-slate-500">No records match the current filters.</p> : null}
      </div>
    </div>
  );
}
