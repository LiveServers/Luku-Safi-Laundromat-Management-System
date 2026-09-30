'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateLong, formatTime, getStoredUser, isManagerRole, staffFetch } from '@/lib/staff';
import { useToast } from '@/hooks/use-toast';

export default function ManagementNotesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [notes, setNotes] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [form, setForm] = useState({ employee_id: '', note: '', note_type_id: 'none', note_date: '' });
  const [filterEmployee, setFilterEmployee] = useState('all');

  const load = async () => {
    const query = filterEmployee !== 'all' ? `?employee_id=${filterEmployee}` : '';
    const [noteRows, staff, noteTypes] = await Promise.all([
      staffFetch<any[]>(`/api/staff/notes${query}`),
      staffFetch<any[]>('/api/staff/employees'),
      staffFetch<any[]>('/api/staff/note-types'),
    ]);
    setNotes(noteRows);
    setEmployees(staff);
    setTypes(noteTypes);
  };

  useEffect(() => {
    if (!isManagerRole(getStoredUser()?.role)) {
      router.push('/staff-activity');
      return;
    }
    load().catch(console.error);
  }, [filterEmployee, router]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await staffFetch('/api/staff/notes', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          note_type_id: form.note_type_id === 'none' ? null : form.note_type_id,
          note_date: form.note_date || null,
        }),
      });
      toast({ title: 'Note added successfully.' });
      setForm({ employee_id: '', note: '', note_type_id: 'none', note_date: '' });
      await load();
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Unable to save note', variant: 'destructive' });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <h1 className="text-2xl font-bold mb-2">Management notes</h1>
        <p className="text-slate-600 mb-4 text-sm">Internal notes visible to managers only. These are separate from work activity.</p>
        <form onSubmit={submit} className="rounded-2xl border bg-white p-4 space-y-3">
          <div>
            <Label>Employee</Label>
            <Select value={form.employee_id} onValueChange={(value) => setForm({ ...form, employee_id: value })}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.note_type_id} onValueChange={(value) => setForm({ ...form, note_type_id: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Uncategorized</SelectItem>
                {types.map((type) => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={form.note_date} onChange={(e) => setForm({ ...form, note_date: e.target.value })} />
          </div>
          <div>
            <Label>Note</Label>
            <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} required />
          </div>
          <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800">Add note</Button>
        </form>
      </div>
      <div className="lg:col-span-2 space-y-4">
        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
          <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All employees</SelectItem>
            {employees.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {notes.map((note) => (
          <Card key={note.id} className="rounded-2xl">
            <CardContent className="pt-5">
              <p className="font-semibold">{note.employee_name}</p>
              <p className="text-xs text-slate-500">
                {formatDateLong(note.note_date)} • {formatTime(note.created_at)} • {note.manager_name}
                {note.note_type_name ? ` • ${note.note_type_name}` : ''}
              </p>
              <p className="mt-2 text-slate-800">{note.note}</p>
            </CardContent>
          </Card>
        ))}
        {!notes.length ? <p className="text-slate-500">No management notes yet.</p> : null}
      </div>
    </div>
  );
}
