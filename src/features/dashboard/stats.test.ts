import { describe, expect, it } from "vitest";
import { maintenanceAttention } from "@/features/dashboard/stats";

const now = new Date("2026-10-29T12:00:00.000Z");
const emergency = (openCount: number, unassignedCount = 0) => ({ openCount, unassignedCount, oldestCreatedAt: openCount > 0 ? "2026-10-29T10:00:00.000Z" : null });

describe("maintenanceAttention", () => {
  it("nothing when no emergency and nothing past SLA", () => {
    expect(maintenanceAttention({ emergency: emergency(0), pastSlaCount: 0 }, now)).toEqual([]);
  });

  it("emergencies first, then past SLA, each linking to the filtered Maintenance page", () => {
    const items = maintenanceAttention({ emergency: emergency(1, 1), pastSlaCount: 2 }, now);
    expect(items.map((i) => i.key)).toEqual(["emergencies", "past-sla"]);
    expect(items[0]).toMatchObject({ title: "1 open emergency", text: "Open 2h, unassigned. Emergencies have a 4-hour SLA.", action: { to: "/maintenance?priority=EMERGENCY" } });
    expect(items[1]).toMatchObject({ title: "2 tickets past SLA", action: { to: "/maintenance?pastSla=1" } });
  });

  it("plural emergencies", () => {
    expect(maintenanceAttention({ emergency: emergency(3), pastSlaCount: 0 }, now)[0].title).toBe("3 open emergencies");
  });
});
