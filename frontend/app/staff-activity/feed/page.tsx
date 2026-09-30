'use client';

import { useEffect, useState } from 'react';
import { defaultFilters, FilterBar, toQuery } from '@/components/staff/FilterBar';
import { ActivityTimeline } from '@/components/staff/ActivityTimeline';
import { StaffActivity } from '@/components/staff/ActivityCard';
import { getStoredUser, isManagerRole, staffFetch } from '@/lib/staff';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function ActivityFeedPage() {
  const router = useRouter();
  const [filters, setFilters] = useState(defaultFilters());
  const [activities, setActivities] = useState<StaffActivity[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
    const query = `${toQuery(filters)}&page=${page}&limit=40`;
    staffFetch<{ activities: StaffActivity[]; totalPages: number }>(`/api/staff/activities?${query}`)
      .then((data) => {
        setActivities(data.activities);
        setTotalPages(data.totalPages);
      })
      .catch(console.error);
  }, [filters, page]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Activity</h1>
        <p className="text-slate-600">Filter every timestamped update across the business.</p>
      </div>
      <FilterBar
        filters={filters}
        onChange={(next) => {
          setPage(1);
          setFilters(next);
        }}
        employees={employees}
        locations={locations}
        categories={categories}
      />
      <ActivityTimeline
        activities={activities}
        emptyText="No matching activity records."
      />
      {totalPages > 1 ? (
        <div className="flex gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
          <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button>
        </div>
      ) : null}
    </div>
  );
}
