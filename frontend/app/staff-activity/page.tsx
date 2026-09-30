'use client';

import { useEffect, useState } from 'react';
import { ActivityComposer } from '@/components/staff/ActivityComposer';
import { ActivityTimeline } from '@/components/staff/ActivityTimeline';
import { StaffActivity } from '@/components/staff/ActivityCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { formatDateLong, getStoredUser, nairobiToday, staffFetch } from '@/lib/staff';
import { useToast } from '@/hooks/use-toast';

export default function MyActivityPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [activities, setActivities] = useState<StaffActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<StaffActivity | null>(null);
  const [editText, setEditText] = useState('');
  const [reminder, setReminder] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await staffFetch<{ activities: StaffActivity[] }>('/api/staff/activities?preset=today&limit=100');
      setActivities(data.activities);
      const reminderData = await staffFetch<any>('/api/staff/reminders');
      if (reminderData.enabled && reminderData.due) {
        setReminder(`No activity logged for about ${reminderData.hours_without_activity} hours. Add a quick update when you can.`);
      } else {
        setReminder(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setUser(getStoredUser());
    load();
  }, []);

  const saveEdit = async () => {
    if (!editing) return;
    try {
      const data = await staffFetch<{ activity: StaffActivity }>(`/api/staff/activities/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ activity_text: editText }),
      });
      setActivities((current) => current.map((item) => (item.id === data.activity.id ? data.activity : item)));
      setEditing(null);
      toast({ title: 'Activity updated successfully.' });
    } catch (error) {
      toast({
        title: 'Unable to save activity. Please try again.',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="text-sm text-emerald-800 font-medium">{formatDateLong(nairobiToday())}</p>
        <h1 className="text-2xl font-bold text-slate-900">{user?.name || 'My activity'}</h1>
        <p className="text-slate-600 text-sm">Log small updates as work happens. Each note is saved on its own.</p>
      </header>

      {reminder ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {reminder}
        </div>
      ) : null}

      <ActivityComposer
        defaultLocationId={user?.location_id}
        onCreated={(activity) => setActivities((current) => [activity, ...current.filter((item) => item.id !== activity.id)])}
      />

      <section>
        <h2 className="mb-3 text-lg font-semibold">Today's Activity</h2>
        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500">Loading today's activity...</div>
        ) : (
          <ActivityTimeline
            activities={activities}
            emptyText="No activities recorded yet today. Add your first update above."
            canEditId={user?.id}
            onEdit={(activity) => {
              setEditing(activity);
              setEditText(activity.activity_text);
            }}
          />
        )}
      </section>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit activity</DialogTitle>
          </DialogHeader>
          <Textarea value={editText} onChange={(event) => setEditText(event.target.value)} className="min-h-[120px]" />
          <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={() => saveEdit()}>Save changes</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
