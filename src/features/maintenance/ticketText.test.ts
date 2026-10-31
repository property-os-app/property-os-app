import { describe, expect, it } from "vitest";
import {
  ageText,
  closedText,
  emergencyNote,
  isActive,
  locationLabel,
  slaHoursText,
  slaText,
  spanText,
  startOfWeek,
  ticketNo,
} from "@/features/maintenance/ticketText";
import type { MaintenanceStatus } from "@/types/maintenance";

const property = { id: "p1", name: "Maple Court" };
const now = new Date("2026-10-29T12:00:00.000Z");
const sla = (hours: number | null, dueAt: string | null, pastSla = false) => ({ hours, dueAt, pastSla });

describe("ticketNo / isActive", () => {
  it("shows #1042", () => expect(ticketNo({ ticketNumber: 1042 })).toBe("#1042"));
  it("active = open, assigned, in progress", () => {
    const active: MaintenanceStatus[] = ["OPEN", "ASSIGNED", "IN_PROGRESS"];
    expect(active.every(isActive)).toBe(true);
    expect(isActive("RESOLVED")).toBe(false);
    expect(isActive("CANCELLED")).toBe(false);
  });
});

describe("locationLabel", () => {
  it("unit first", () => expect(locationLabel({ property, unit: { id: "u", unitNumber: "7D" }, locationNote: "Kitchen" })).toBe("Unit 7D, Maple Court"));
  it("then the note", () => expect(locationLabel({ property, unit: null, locationNote: "Common area" })).toBe("Common area, Maple Court"));
  it("else the property", () => expect(locationLabel({ property, unit: null, locationNote: null })).toBe("Maple Court"));
});

describe("spanText / ageText", () => {
  it("minutes, hours up to 48, then days (rounded down)", () => {
    expect(spanText(0)).toBe("1m");
    expect(spanText(45 * 60_000)).toBe("45m");
    expect(spanText(179 * 60_000)).toBe("2h");
    expect(spanText(47 * 3_600_000)).toBe("47h");
    expect(spanText(50 * 3_600_000)).toBe("2d");
  });
  it("age", () => {
    expect(ageText("2026-10-29T11:59:30.000Z", now)).toBe("Just now");
    expect(ageText("2026-10-29T10:00:00.000Z", now)).toBe("2h ago");
    expect(ageText("2026-10-25T12:00:00.000Z", now)).toBe("4d ago");
  });
});

describe("slaText", () => {
  it("null without SLA or when not active", () => {
    expect(slaText({ status: "OPEN", sla: sla(null, null) }, now)).toBeNull();
    expect(slaText({ status: "RESOLVED", sla: sla(4, "2026-10-29T10:00:00.000Z") }, now)).toBeNull();
  });
  it("due in", () => expect(slaText({ status: "OPEN", sla: sla(4, "2026-10-29T15:00:00.000Z") }, now)).toEqual({ label: "Due in 3h", tone: "warning" }));
  it("past SLA comes from the server flag", () => {
    expect(slaText({ status: "ASSIGNED", sla: sla(24, "2026-10-29T10:00:00.000Z", true) }, now)).toEqual({ label: "Past SLA by 2h", tone: "danger" });
    // The due time passed but the server hasn't flagged it: not called past SLA.
    expect(slaText({ status: "OPEN", sla: sla(4, "2026-10-29T11:00:00.000Z", false) }, now)).toEqual({ label: "Due now", tone: "warning" });
  });
  it("SLA hours", () => {
    expect(slaHoursText({ sla: sla(4, null) })).toBe("SLA 4h");
    expect(slaHoursText({ sla: sla(null, null) })).toBeNull();
  });
});

describe("closedText", () => {
  it("with and without a cost", () => {
    expect(closedText({ resolvedAt: "2026-10-06T15:00:00.000Z", actualCost: "18.00" })).toBe("Closed Oct 6 · $18.00");
    expect(closedText({ resolvedAt: "2026-10-06T15:00:00.000Z", actualCost: null })).toBe("Closed Oct 6");
    expect(closedText({ resolvedAt: null, actualCost: null })).toBeNull();
  });
});

describe("startOfWeek (Sunday)", () => {
  it("returns the Sunday on or before", () => {
    expect(startOfWeek("2026-10-29")).toBe("2026-10-25"); // Thursday
    expect(startOfWeek("2026-10-25")).toBe("2026-10-25"); // Sunday
    expect(startOfWeek("2026-10-31")).toBe("2026-10-25"); // Saturday
    expect(startOfWeek("2027-01-02")).toBe("2026-12-27"); // across a year
  });
  it("null when invalid", () => expect(startOfWeek("nope")).toBeNull());
});

describe("emergencyNote", () => {
  const oldest = "2026-10-29T10:00:00.000Z";
  it("none, one, several", () => {
    expect(emergencyNote({ openCount: 0, unassignedCount: 0, oldestCreatedAt: null }, now)).toBe("None open");
    expect(emergencyNote({ openCount: 1, unassignedCount: 1, oldestCreatedAt: oldest }, now)).toBe("Open 2h, unassigned");
    expect(emergencyNote({ openCount: 1, unassignedCount: 0, oldestCreatedAt: oldest }, now)).toBe("Open 2h");
    expect(emergencyNote({ openCount: 3, unassignedCount: 1, oldestCreatedAt: oldest }, now)).toBe("Oldest open 2h · 1 unassigned");
    expect(emergencyNote({ openCount: 3, unassignedCount: 0, oldestCreatedAt: oldest }, now)).toBe("Oldest open 2h");
  });
});
