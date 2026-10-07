import Library from "@/components/library/Library";

export const metadata = { title: "Library | Phonemele" };
export default async function LibraryPage({ searchParams }) {
  const query = await searchParams;
  const activityId = typeof query?.activity === "string" ? query.activity : "";
  // A different linked activity starts a fresh workspace, including on back/forward.
  return <Library key={activityId} initialActivityId={activityId} />;
}
