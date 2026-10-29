import { describe, expect, it } from "vitest";
import { dropResult, dropTargets, reopenColumn } from "@/features/maintenance/dropRules";
import { BOARD_COLUMNS } from "@/features/maintenance/ticketQuery";
import type { MaintenanceStatus, MaintenanceTicket, TicketAllowedActions } from "@/types/maintenance";

const none: TicketAllowedActions = { edit: false, assign: false, unassign: false, start: false, resolve: false, reopen: false, cancel: false };

/** Only the fields the rules read. */
const ticket = (status: MaintenanceStatus, allowed: Partial<TicketAllowedActions> = {}, vendorId: string | null = null) =>
  ({ ticketNumber: 1042, status, vendorId, allowedActions: { ...none, ...allowed } }) as MaintenanceTicket;

describe("dropResult", () => {
  it("same column does nothing", () => {
    expect(dropResult(ticket("OPEN", { start: true }), "OPEN")).toEqual({ type: "none" });
  });

  it("→ In progress starts (open or assigned)", () => {
    expect(dropResult(ticket("OPEN", { start: true }), "IN_PROGRESS")).toEqual({ type: "move", kind: "start", lands: "IN_PROGRESS" });
    expect(dropResult(ticket("ASSIGNED", { start: true }), "IN_PROGRESS")).toMatchObject({ kind: "start" });
  });

  it("→ Assigned opens Assign from Open; In progress is blocked (it would stay in progress)", () => {
    expect(dropResult(ticket("OPEN", { assign: true }), "ASSIGNED")).toEqual({ type: "move", kind: "assign", lands: "ASSIGNED" });
    expect(dropResult(ticket("IN_PROGRESS", { assign: true }), "ASSIGNED")).toMatchObject({ type: "blocked" });
  });

  it("→ Resolved opens Resolve from any active column", () => {
    for (const s of ["OPEN", "ASSIGNED", "IN_PROGRESS"] as const) expect(dropResult(ticket(s, { resolve: true }), "RESOLVED")).toMatchObject({ kind: "resolve", lands: "RESOLVED" });
  });

  it("Assigned → Open unassigns; In progress → Open is blocked", () => {
    expect(dropResult(ticket("ASSIGNED", { unassign: true }, "v1"), "OPEN")).toEqual({ type: "move", kind: "unassign", lands: "OPEN" });
    expect(dropResult(ticket("IN_PROGRESS", { unassign: true }, "v1"), "OPEN")).toEqual({ type: "blocked", message: "In-progress tickets can't go back to Open." });
  });

  it("Resolved → Open or Assigned reopens where the backend puts it", () => {
    expect(dropResult(ticket("RESOLVED", { reopen: true }, "v1"), "OPEN")).toEqual({ type: "move", kind: "reopen", lands: "ASSIGNED" });
    expect(dropResult(ticket("RESOLVED", { reopen: true }), "ASSIGNED")).toEqual({ type: "move", kind: "reopen", lands: "OPEN" });
    expect(dropResult(ticket("RESOLVED", { reopen: true }), "IN_PROGRESS")).toMatchObject({ type: "blocked" });
  });

  it("blocked with a reason when allowedActions says no", () => {
    expect(dropResult(ticket("OPEN"), "IN_PROGRESS")).toEqual({ type: "blocked", message: "You can't start #1042." });
    expect(dropResult(ticket("ASSIGNED"), "OPEN")).toEqual({ type: "blocked", message: "You can't unassign #1042." });
    expect(dropResult(ticket("RESOLVED"), "OPEN")).toEqual({ type: "blocked", message: "You can't reopen #1042." });
  });
});

describe("dropTargets / reopenColumn", () => {
  it("lists the columns that accept the card", () => {
    expect(dropTargets(ticket("ASSIGNED", { start: true, resolve: true, unassign: true }, "v1"), BOARD_COLUMNS)).toEqual(["OPEN", "IN_PROGRESS", "RESOLVED"]);
    expect(dropTargets(ticket("IN_PROGRESS", { resolve: true, assign: true, unassign: true }, "v1"), BOARD_COLUMNS)).toEqual(["RESOLVED"]);
    expect(dropTargets(ticket("OPEN"), BOARD_COLUMNS)).toEqual([]);
  });
  it("reopen lands in Assigned with a vendor, else Open", () => {
    expect(reopenColumn({ vendorId: "v1" })).toBe("ASSIGNED");
    expect(reopenColumn({ vendorId: null })).toBe("OPEN");
  });
});
