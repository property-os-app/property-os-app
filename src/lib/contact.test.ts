import { describe, expect, it } from "vitest";
import { firstName, mailtoHref, telHref } from "@/lib/contact";

describe("telHref", () => {
  it.each([
    ["(555) 123-4567", "tel:+15551234567"],
    ["555.123.4567", "tel:+15551234567"],
    ["1 555 123 4567", "tel:+15551234567"],
    ["+1 (555) 123-4567", "tel:+15551234567"],
    ["+44 20 7946 0958", "tel:+442079460958"],
    ["  5551234567  ", "tel:+15551234567"],
    ["123-4567", "tel:1234567"],
    ["25551234567", "tel:25551234567"],
  ])("%s -> %s", (phone, href) => {
    expect(telHref(phone)).toBe(href);
  });

  it("null without digits", () => {
    for (const v of [null, undefined, "", "   ", "n/a", "+"]) expect(telHref(v)).toBeNull();
  });
});

describe("mailtoHref", () => {
  it("a plain link without subject or body", () => {
    expect(mailtoHref({ to: "grace@example.com" })).toBe("mailto:grace%40example.com");
    expect(mailtoHref({ to: "  grace@example.com ", subject: "", body: "" })).toBe("mailto:grace%40example.com");
  });

  it("encodes CC, subject and body (spaces %20, line breaks CRLF)", () => {
    const href = mailtoHref({ to: "grace@example.com", cc: ["a@b.com", "c+d@e.com"], subject: "Rent reminder – Maple 101", body: "Hi Grace,\nYou owe $1,200.00.\r\nThanks" });
    expect(href).toBe(
      "mailto:grace%40example.com?cc=a%40b.com,c%2Bd%40e.com&subject=Rent%20reminder%20%E2%80%93%20Maple%20101&body=Hi%20Grace%2C%0D%0AYou%20owe%20%241%2C200.00.%0D%0AThanks",
    );
  });

  it("only the parts that are set", () => {
    expect(mailtoHref({ to: "a@b.com", subject: "Hi" })).toBe("mailto:a%40b.com?subject=Hi");
    expect(mailtoHref({ to: "a@b.com", cc: ["c@d.com"] })).toBe("mailto:a%40b.com?cc=c%40d.com");
  });

  it("null without a To address", () => {
    for (const to of [null, undefined, "", "  "]) expect(mailtoHref({ to, subject: "x", body: "y" })).toBeNull();
  });
});

describe("firstName", () => {
  it("first word, trimmed", () => {
    expect(firstName("Grace Carter")).toBe("Grace");
    expect(firstName("  Ana   María López ")).toBe("Ana");
    expect(firstName("Cher")).toBe("Cher");
    expect(firstName("")).toBe("");
  });
});
