'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { staffFetch } from '@/lib/staff';
import { useToast } from '@/hooks/use-toast';
import { StaffActivity } from '@/components/staff/ActivityCard';

type Location = { id: string; name: string; display_name: string };
type Category = { id: string; name: string };

export function ActivityComposer({
  defaultLocationId,
  onCreated,
}: {
  defaultLocationId?: string;
  onCreated: (activity: StaffActivity) => void;
}) {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [categoryId, setCategoryId] = useState('none');
  const [locationId, setLocationId] = useState(defaultLocationId || '');
  const [secondaryLocationId, setSecondaryLocationId] = useState('none');
  const [relatedReference, setRelatedReference] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);


  useEffect(() => {
    const load = async () => {
      try {
        const [locs, cats] = await Promise.all([
          staffFetch<Location[]>('/api/locations'),
          staffFetch<Category[]>('/api/staff/categories'),
        ]);
        setLocations(locs);
        setCategories(cats);
        if (!locationId && (defaultLocationId || locs[0]?.id)) {
          setLocationId(defaultLocationId || locs[0].id);
        }
      } catch (error) {
        console.error(error);
      }
    };
    load();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const activityText = text.trim();
    if (!activityText) {
      toast({ title: 'Please enter what you did', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const data = await staffFetch<{ message: string; activity: StaffActivity }>('/api/staff/activities', {
        method: 'POST',
        body: JSON.stringify({
          activity_text: activityText,
          category_id: categoryId === 'none' ? null : categoryId,
          location_id: locationId || undefined,
          secondary_location_id: secondaryLocationId === 'none' ? null : secondaryLocationId,
          related_reference: relatedReference.trim() || null,
        }),
      });
      toast({ title: data.message || 'Activity added successfully.' });
      setText('');
      setCategoryId('none');
      setSecondaryLocationId('none');
      setRelatedReference('');
      onCreated(data.activity);
    } catch (error) {
      toast({
        title: 'Unable to save activity. Please try again.',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };
console.log("LOCATION AND CATEGORIES", locations, categories);
  return (
    <form onSubmit={(e) => handleSubmit(e)} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm space-y-4">
      <div>
        <Label htmlFor="activity-text" className="text-base font-semibold text-slate-900">What did you do?</Label>
        <Textarea
          id="activity-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Received and sorted 3 customer orders."
          className="mt-2 min-h-[96px] text-base"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Category (optional)</Label>
          <Select value={categoryId} onValueChange={(value) => setCategoryId(value)}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {Array.isArray(categories) && categories.length > 0 && categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Branch</Label>
          <Select value={locationId} onValueChange={(value) => setLocationId(value)}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(locations) && locations.length > 0 && locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>{location.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Also involved (optional)</Label>
          <Select value={secondaryLocationId} onValueChange={(value) => setSecondaryLocationId(value)}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {Array.isArray(locations) && locations.length > 0 && locations.filter((location) => location.id !== locationId).map((location) => (
                <SelectItem key={location.id} value={location.id}>{location.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Order / customer (optional)</Label>
          <Input
            className="mt-1"
            value={relatedReference}
            onChange={(event) => setRelatedReference(event.target.value)}
            placeholder="e.g. Order #123"
          />
        </div>
      </div>
      <Button type="submit" disabled={submitting} className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800">
        {submitting ? 'Saving...' : 'Add Activity'}
      </Button>
    </form>
  );
}
