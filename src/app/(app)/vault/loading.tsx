import { SkeletonBlock, SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 760 }}>
      <SkeletonBlock width={160} height={28} />
      <SkeletonCard lines={4} />
      <SkeletonCard lines={2} />
    </div>
  );
}
