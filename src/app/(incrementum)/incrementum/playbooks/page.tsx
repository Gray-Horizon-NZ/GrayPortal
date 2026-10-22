import PlaybooksView from "@/components/incrementum/terminal/playbooks";

export default async function PlaybooksPage({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string }> }) {
  const sp = await searchParams;
  return <PlaybooksView edit={sp.edit === "1"} creating={sp.new === "1"} />;
}
