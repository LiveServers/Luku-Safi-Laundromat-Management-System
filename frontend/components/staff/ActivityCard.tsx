'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { StaffAvatar } from '@/components/staff/StaffAvatar';
import { branchLabel, formatTime } from '@/lib/staff';

export type StaffActivity = {
  id: string;
  activity_text: string;
  activity_date: string;
  created_at: string;
  updated_at?: string | null;
  was_edited?: boolean;
  related_order_id?: string | null;
  related_order_ref?: string | null;
  related_customer_name?: string | null;
  employee: {
    id: string;
    name: string;
    job_title?: string;
    role?: string;
    profile_photo_url?: string | null;
  };
  branch: { id: string; name: string; display_name: string };
  secondary_branch?: { id: string; name: string; display_name: string } | null;
  category?: { id: string; name: string } | null;
};

export function ActivityCard({
  activity,
  compact = false,
  canEdit = false,
  onEdit,
}: {
  activity: StaffActivity;
  compact?: boolean;
  canEdit?: boolean;
  onEdit?: (activity: StaffActivity) => void;
}) {
  return (
    <article className="rounded-2xl border border-emerald-50 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <StaffAvatar name={activity.employee.name} src={activity.employee.profile_photo_url} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-900">{activity.employee.name}</p>
              <p className="text-xs text-slate-500">
                {branchLabel(activity)} • {formatTime(activity.created_at)}
                {activity.was_edited ? ' • edited' : ''}
              </p>
            </div>
            {canEdit && onEdit ? (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={() => onEdit(activity)}>
                <Pencil className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
          <blockquote className="mt-2 border-l-2 border-emerald-600 pl-3 text-slate-800 leading-relaxed">
            {activity.activity_text}
          </blockquote>
          <div className="mt-3 flex flex-wrap gap-2">
            {activity.category ? (
              <Badge className="bg-emerald-50 text-emerald-800 hover:bg-emerald-50">{activity.category.name}</Badge>
            ) : null}
            {activity.related_order_ref ? (
              <Badge variant="outline">{activity.related_order_ref}</Badge>
            ) : null}
            {activity.related_customer_name ? (
              <Badge variant="outline">{activity.related_customer_name}</Badge>
            ) : null}
            {!compact && activity.employee.job_title ? (
              <Badge variant="secondary">{activity.employee.job_title}</Badge>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
