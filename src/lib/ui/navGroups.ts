import type { ShellNavItem } from "@/components/ui/AppShell";

// Shared between AppShell's desktop sidebar and ShellHeader's mobile
// drawer so both render the exact same grouping without duplicating the
// logic. Stable order = first-seen order of each group in the input array,
// not alphabetical — callers (layout.tsx files) control group order simply
// by the order they list items in.
export function groupNavItems(items: ShellNavItem[]): {
  pinned: ShellNavItem[];
  groups: { label: string; items: ShellNavItem[] }[];
} {
  const pinned: ShellNavItem[] = [];
  const groups: { label: string; items: ShellNavItem[] }[] = [];
  const groupIndex = new Map<string, number>();

  for (const item of items) {
    if (!item.group) {
      pinned.push(item);
      continue;
    }
    let idx = groupIndex.get(item.group);
    if (idx === undefined) {
      idx = groups.length;
      groupIndex.set(item.group, idx);
      groups.push({ label: item.group, items: [] });
    }
    groups[idx].items.push(item);
  }

  return { pinned, groups };
}
