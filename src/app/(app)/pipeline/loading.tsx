import { SkeletonBlock, SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)" }}>
      <SkeletonBlock width={140} height={28} />
      <div style={{ display: "flex", gap: "var(--gh-space-4)", overflowX: "auto" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ minWidth: 260, flexShrink: 0, display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
            <SkeletonBlock width={100} height={12} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
        ))}
      </div>
    </div>
  );
}
