const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** ISO timestamp for 23:59 local time, `offsetDays` from today (used by the quick presets). */
export function endOfDayIso(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(23, 59, 0, 0);
  return d.toISOString();
}

/** Overdue once the due moment has passed and the item is not done. */
export function isOverdue(due: string | null, checked: boolean): boolean {
  if (!due || checked) return false;
  const t = new Date(due).getTime();
  return !Number.isNaN(t) && t < Date.now();
}

/** e.g. "25 ต.ค. 2569 14:30" (Buddhist year, local time). */
export function formatDue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear() + 543} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'เมื่อสักครู่';
  if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`;
  if (s < 86400) return `${Math.floor(s / 3600)} ชม.ที่แล้ว`;
  return `${Math.floor(s / 86400)} วันที่แล้ว`;
}
