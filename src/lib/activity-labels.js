// Shared teacher-facing wording distinguishes an activity from its source list.
export function savedActivityLabel(activity) {
  return `Activity: ${activity.title} — Word list: ${activity.listTitle}`;
}

export function libraryActivityHref(id) {
  return `/library?activity=${encodeURIComponent(id)}#activity-editor`;
}

export function formatTimestamp(value, timeZone) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  const parts = new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    ...(timeZone ? { timeZone } : {}),
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${values.day}/${values.month}/${values.year} ${values.hour}:${values.minute}`;
}
