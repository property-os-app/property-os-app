import { describe, expect, it } from "vitest";
import { colors, groupAccents } from "@/tokens";
import { groupByProperty } from "@/features/rent-roll/yearStats";
import { accentOrderOf, GROUP_ACCENT_COUNT, groupAccent, hashId } from "@/lib/groupAccent";

const props = [
  { id: "p-c", name: "Maple Court" },
  { id: "p-a", name: "746 SPW LLC" },
  { id: "p-b2", name: "birch house" }, // case doesn't matter
  { id: "p-b1", name: "Birch House" }, // same name: id decides
];

describe("accentOrderOf / groupAccent", () => {
  it("orders by name A→Z (ignoring case), then id, whatever order the list comes in", () => {
    const order = accentOrderOf(props);
    expect([...order.entries()]).toEqual([["p-a", 0], ["p-b1", 1], ["p-b2", 2], ["p-c", 3]]);
    expect(accentOrderOf([...props].reverse())).toEqual(order);
  });

  it("matches the API's text order for names starting with numbers (746 … before 8 …)", () => {
    const order = accentOrderOf([
      { id: "x", name: "8 MHR LLC" },
      { id: "y", name: "746 SPW LLC" },
    ]);
    expect(order.get("y")).toBe(0);
    expect(order.get("x")).toBe(1);
  });

  it("gives up to 5 properties all different colours, in name order", () => {
    const five = [...props, { id: "p-d", name: "Oak Row" }];
    const order = accentOrderOf(five);
    expect(new Set(five.map((p) => groupAccent(p.id, order).slot)).size).toBe(5);
    expect(groupAccent("p-a", order)).toEqual({ slot: 0, color: "var(--group-1)", barClass: "shadow-[inset_4px_0_0_var(--group-1)]" });
    expect(groupAccent("p-d", order).color).toBe("var(--group-5)");
  });

  it("neighbours in display order always differ, and the 6th wraps to the first colour", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: `id-${i}`, name: `Property ${String.fromCharCode(65 + i)}` }));
    const order = accentOrderOf([...many].reverse());
    // The display order: the grids show groups by name A→Z (the API's propertyTotals order).
    const display = [...many].sort((a, b) => a.name.localeCompare(b.name));
    const slots = display.map((p) => groupAccent(p.id, order).slot);
    slots.forEach((s, i) => i > 0 && expect(s).not.toBe(slots[i - 1]));
    expect(slots[5]).toBe(slots[0]);
  });

  it("the filter doesn't change a colour: the order comes from the full list, not the shown groups", () => {
    const order = accentOrderOf([...props, { id: "p-d", name: "Oak Row" }]);
    const row = (propertyId: string, name: string) => ({ unit: { property: { id: propertyId, name } } }) as never;
    const totals = (id: string, name: string) => ({ property: { id, name } }) as never;
    const all = groupByProperty([row("p-a", "746 SPW LLC"), row("p-c", "Maple Court")], [totals("p-a", "746 SPW LLC"), totals("p-c", "Maple Court")]);
    const filtered = groupByProperty([row("p-c", "Maple Court")], [totals("p-c", "Maple Court")]);
    const colourOf = (groups: typeof all, id: string) => groupAccent(groups.find((g) => g.property.id === id)!.property.id, order).color;
    expect(colourOf(filtered, "p-c")).toBe(colourOf(all, "p-c"));
    expect(colourOf(filtered, "p-c")).toBe("var(--group-4)");
  });

  it("falls back to a stable hash for an id not in the list (or no list yet)", () => {
    const order = accentOrderOf(props);
    const a = groupAccent("unknown-property", order);
    expect(a).toEqual(groupAccent("unknown-property"));
    expect(a.slot).toBe(hashId("unknown-property") % GROUP_ACCENT_COUNT);
    expect(hashId("abc")).toBe(hashId("abc"));
    expect(hashId("abc")).not.toBe(hashId("abd"));
  });
});

/** Hue (0–360) and saturation (0–1, HSL) of "#rrggbb". */
function hsl(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s };
}
const hueGap = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

describe("group accent palette", () => {
  it("has 5 colours per theme", () => {
    expect(groupAccents.light).toHaveLength(GROUP_ACCENT_COUNT);
    expect(groupAccents.dark).toHaveLength(GROUP_ACCENT_COUNT);
  });

  it("never uses a status colour: at least 30° of hue from Paid (green), Overdue/Unpaid (red), Partial (amber), and not grey", () => {
    const statusHues = (["light", "dark"] as const).flatMap((t) => [colors[t].success, colors[t].danger, colors[t].warning].map((c) => hsl(c).h));
    for (const accent of [...groupAccents.light, ...groupAccents.dark]) {
      const { h, s } = hsl(accent);
      expect(s, `${accent} is too grey`).toBeGreaterThan(0.4);
      for (const sh of statusHues) expect(hueGap(h, sh), `${accent} is close to a status hue`).toBeGreaterThanOrEqual(30);
    }
  });
});
