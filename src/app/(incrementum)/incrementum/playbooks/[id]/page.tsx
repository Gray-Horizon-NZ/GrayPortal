import PlaybooksView from "@/components/incrementum/terminal/playbooks";

export default async function PlaybookPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string; new?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  return <PlaybooksView id={id} edit={sp.edit === "1"} creating={sp.new === "1"} />;
}
