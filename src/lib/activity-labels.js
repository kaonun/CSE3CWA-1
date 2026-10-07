// Shared teacher-facing wording distinguishes an activity from its source list.
export function savedActivityLabel(activity) {
  return `Activity: ${activity.title} — Word list: ${activity.listTitle}`;
}
