import { SkeletonBlock, SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)" }}>
      <SkeletonBlock width={180} height={30} />
      <SkeletonCard lines={1} />
      <div className="gh-deal-grid" style={{ gap: "var(--gh-space-4)" }}>
        <SkeletonCard lines={2} />
        <SkeletonCard lines={4} />
        <SkeletonCard lines={2} />
      </div>
    </div>
  );
}
