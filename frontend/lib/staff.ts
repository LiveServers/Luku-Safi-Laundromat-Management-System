export const NAIROBI_TZ = 'Africa/Nairobi';

export function formatTime(value?: string | Date | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: NAIROBI_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value));
}

export function formatDateLong(value?: string | Date | null) {
  if (!value) return '';
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)
    ? new Date(`${value.slice(0, 10)}T12:00:00+03:00`)
    : new Date(value);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: NAIROBI_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatDateShort(value?: string | Date | null) {
  if (!value) return '';
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)
    ? new Date(`${value.slice(0, 10)}T12:00:00+03:00`)
    : new Date(value);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: NAIROBI_TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function nairobiToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: NAIROBI_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function nairobiYesterday() {
  const today = nairobiToday();
  const date = new Date(`${today}T12:00:00+03:00`);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function initials(name?: string) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function branchLabel(activity: {
  branch?: { display_name?: string; name?: string } | null;
  secondary_branch?: { display_name?: string; name?: string } | null;
}) {
  const primary = activity.branch?.display_name || activity.branch?.name || '';
  if (!activity.secondary_branch) return primary;
  const secondary = activity.secondary_branch.display_name || activity.secondary_branch.name;
  return `${primary} → ${secondary}`;
}

export function isManagerRole(role?: string) {
  return role === 'owner' || role === 'manager';
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

export async function staffFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(path, { ...options, headers });
  if (response.status === 401 || response.status === 403) {
    const data = await response.json().catch(() => ({ error: 'Access denied' }));
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth/login';
    }
    throw new Error(data.error || 'Request failed');
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(data.error || 'Request failed');
  }
  if (response.headers.get('content-type')?.includes('text/csv')) {
    return (await response.blob()) as T;
  }
  return response.json();
}
