'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ActivityFilters = {
  employee_id: string;
  location_id: string;
  category_id: string;
  role: string;
  search: string;
  preset: string;
  from: string;
  to: string;
};

const presets = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: 'Last 7 Days' },
  { id: 'this_month', label: 'This Month' },
  { id: 'all', label: 'All Time' },
  { id: 'custom', label: 'Custom' },
];

export function FilterBar({
  filters,
  onChange,
  employees,
  locations,
  categories,
}: {
  filters: ActivityFilters;
  onChange: (filters: ActivityFilters) => void;
  employees: { id: string; name: string }[];
  locations: { id: string; display_name: string }[];
  categories: { id: string; name: string }[];
}) {
  const update = (patch: Partial<ActivityFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-4">
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            size="sm"
            variant={filters.preset === preset.id ? 'default' : 'outline'}
            className={cn(filters.preset === preset.id && 'bg-emerald-700 hover:bg-emerald-800')}
            onClick={() => update({ preset: preset.id })}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <Input
          placeholder="Search activity, e.g. delivery"
          value={filters.search}
          onChange={(event) => update({ search: event.target.value })}
        />
        <Select value={filters.employee_id} onValueChange={(value) => update({ employee_id: value })}>
          <SelectTrigger><SelectValue placeholder="All employees" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All employees</SelectItem>
            {employees.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.location_id} onValueChange={(value) => update({ location_id: value })}>
          <SelectTrigger><SelectValue placeholder="All branches" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location.id} value={location.id}>{location.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.category_id} onValueChange={(value) => update({ category_id: value })}>
          <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Role / job title"
          value={filters.role}
          onChange={(event) => update({ role: event.target.value })}
        />
        {filters.preset === 'custom' ? (
          <>
            <Input type="date" value={filters.from} onChange={(event) => update({ from: event.target.value })} />
            <Input type="date" value={filters.to} onChange={(event) => update({ to: event.target.value })} />
          </>
        ) : null}
      </div>
    </div>
  );
}

export function toQuery(filters: ActivityFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.employee_id && filters.employee_id !== 'all') params.set('employee_id', filters.employee_id);
  if (filters.location_id && filters.location_id !== 'all') params.set('location_id', filters.location_id);
  if (filters.category_id && filters.category_id !== 'all') params.set('category_id', filters.category_id);
  if (filters.role) params.set('role', filters.role);
  if (filters.preset === 'custom') {
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
  } else if (filters.preset) {
    params.set('preset', filters.preset);
  }
  return params.toString();
}

export const defaultFilters = (): ActivityFilters => ({
  employee_id: 'all',
  location_id: 'all',
  category_id: 'all',
  role: '',
  search: '',
  preset: 'today',
  from: '',
  to: '',
});
