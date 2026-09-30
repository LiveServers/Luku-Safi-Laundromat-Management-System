'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getStoredUser, isManagerRole, staffFetch } from '@/lib/staff';
import { useToast } from '@/hooks/use-toast';

export default function StaffSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [hours, setHours] = useState(4);

  const load = async () => {
    const [cats, settings] = await Promise.all([
      staffFetch<any[]>('/api/staff/categories?include_inactive=true'),
      staffFetch<any>('/api/staff/settings'),
    ]);
    setCategories(cats);
    setEnabled(Boolean(settings.enabled));
    setHours(settings.hours_without_activity || 4);
  };

  useEffect(() => {
    if (!isManagerRole(getStoredUser()?.role)) {
      router.push('/staff-activity');
      return;
    }
    load().catch(console.error);
  }, [router]);

  const saveReminders = async () => {
    try {
      await staffFetch('/api/staff/settings', {
        method: 'PATCH',
        body: JSON.stringify({ enabled, hours_without_activity: hours }),
      });
      toast({ title: 'Reminder settings saved' });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Unable to save settings', variant: 'destructive' });
    }
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await staffFetch('/api/staff/categories', { method: 'POST', body: JSON.stringify({ name: newCategory.trim() }) });
      setNewCategory('');
      await load();
      toast({ title: 'Category added' });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Unable to add category', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-slate-600">Categories and optional activity reminders.</p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle>Quiet reminders</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="reminders">Remind staff after a quiet stretch</Label>
            <Switch id="reminders" checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div>
            <Label>Hours without activity</Label>
            <Input type="number" min={1} max={12} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="mt-1 w-32" />
          </div>
          <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={saveReminders}>Save reminders</Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle>Activity categories</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category" />
            <Button onClick={addCategory} className="bg-emerald-700 hover:bg-emerald-800">Add</Button>
          </div>
          {categories.map((category) => (
            <div key={category.id} className="flex items-center gap-2">
              <Input
                defaultValue={category.name}
                onBlur={async (event) => {
                  const name = event.target.value.trim();
                  if (name && name !== category.name) {
                    await staffFetch(`/api/staff/categories/${category.id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
                    await load();
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={async () => {
                  await staffFetch(`/api/staff/categories/${category.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ is_active: !category.is_active }),
                  });
                  await load();
                }}
              >
                {category.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
