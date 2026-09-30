'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { StaffAvatar } from '@/components/staff/StaffAvatar';
import { getStoredUser, isManagerRole, staffFetch } from '@/lib/staff';
import { useToast } from '@/hooks/use-toast';

type Employee = {
  id: string;
  name: string;
  email: string;
  role: string;
  job_title?: string;
  phone?: string;
  profile_photo_url?: string;
  is_active: boolean;
  location?: { id: string; display_name: string };
};

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'attendant',
  location_id: '',
  job_title: '',
  phone: '',
  profile_photo_url: '',
};

export default function EmployeesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const [staff, locs] = await Promise.all([
      staffFetch<Employee[]>('/api/staff/employees?include_inactive=true'),
      staffFetch<any[]>('/api/locations'),
    ]);
    setEmployees(staff);
    setLocations(locs);
  };

  useEffect(() => {
    if (!isManagerRole(getStoredUser()?.role)) {
      router.push('/staff-activity');
      return;
    }
    load().catch(console.error);
  }, [router]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (editing) {
        await staffFetch(`/api/staff/employees/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ ...form, password: form.password || undefined }),
        });
        toast({ title: 'Employee updated successfully.' });
      } else {
        await staffFetch('/api/staff/employees', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        toast({ title: 'Employee created successfully.' });
      }
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await load();
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Unable to save employee', variant: 'destructive' });
    }
  };

  const deactivate = async (employee: Employee) => {
    if (!confirm(`Deactivate ${employee.name}?`)) return;
    try {
      await staffFetch(`/api/staff/employees/${employee.id}/deactivate`, { method: 'POST' });
      toast({ title: 'Employee deactivated' });
      await load();
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Unable to deactivate', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-slate-600">Add, edit and deactivate staff without hard-coding names.</p>
        </div>
        <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true); }}>
          Add employee
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {employees.map((employee) => (
          <Card key={employee.id} className="rounded-2xl">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-start gap-3">
                <StaffAvatar name={employee.name} src={employee.profile_photo_url} />
                <div className="min-w-0">
                  <Link href={`/staff-activity/employees/${employee.id}`} className="font-semibold hover:text-emerald-800">
                    {employee.name}
                  </Link>
                  <p className="text-sm text-slate-500">{employee.job_title || employee.role}</p>
                  <p className="text-xs text-slate-500">{employee.location?.display_name}</p>
                </div>
                <Badge className={employee.is_active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}>
                  {employee.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => {
                  setEditing(employee);
                  setForm({
                    name: employee.name,
                    email: employee.email,
                    password: '',
                    role: employee.role,
                    location_id: employee.location?.id || '',
                    job_title: employee.job_title || '',
                    phone: employee.phone || '',
                    profile_photo_url: employee.profile_photo_url || '',
                  });
                  setOpen(true);
                }}>Edit</Button>
                {employee.is_active ? (
                  <Button size="sm" variant="outline" onClick={() => deactivate(employee)}>Deactivate</Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={async () => {
                    await staffFetch(`/api/staff/employees/${employee.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: true }) });
                    await load();
                  }}>Reactivate</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit employee' : 'Add employee'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={Boolean(editing)} /></div>
            <div>
              <Label>{editing ? 'New password (optional)' : 'Password'}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
            </div>
            <div>
              <Label>Job title</Label>
              <Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} placeholder="Rider, Customer Service..." />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="attendant">Employee</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Default branch</Label>
              <Select value={form.location_id} onValueChange={(value) => setForm({ ...form, location_id: value })}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>{location.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Photo URL</Label><Input value={form.profile_photo_url} onChange={(e) => setForm({ ...form, profile_photo_url: e.target.value })} /></div>
            <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800">Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
