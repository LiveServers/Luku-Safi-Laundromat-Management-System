'use client';

import { useMemo } from 'react';
import { ActivityCard, StaffActivity } from '@/components/staff/ActivityCard';
import { formatDateLong } from '@/lib/staff';

export function ActivityTimeline({
  activities,
  emptyText,
  canEditId,
  onEdit,
}: {
  activities: StaffActivity[];
  emptyText: string;
  canEditId?: string;
  onEdit?: (activity: StaffActivity) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, StaffActivity[]>();
    for (const activity of activities) {
      const key = String(activity.activity_date).slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(activity);
    }
    return Array.from(map.entries());
  }, [activities]);

  if (!activities.length) {
    return (
      <div className="rounded-2xl border border-dashed border-emerald-200 bg-white px-4 py-10 text-center text-slate-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map(([date, items]) => (
        <section key={date}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-800">
            {formatDateLong(date)}
          </h3>
          <div className="relative space-y-3 border-l border-emerald-100 pl-4">
            {items.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                compact
                canEdit={Boolean(canEditId && activity.employee.id === canEditId)}
                onEdit={onEdit}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
