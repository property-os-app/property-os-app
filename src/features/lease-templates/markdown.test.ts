import { describe, expect, it } from "vitest";
import {
  groupMergeFields,
  insertAtCursor,
  insertBlock,
  mergeKeysIn,
  mergeToken,
  prefixLines,
  unknownMergeKeys,
  wrapSelection,
  type TextEdit,
} from "@/features/lease-templates/markdown";
import type { MergeField } from "@/types/leaseTemplate";

/** Writes the selection into the text as [ ] so expectations read like the textarea. */
const show = ({ text, selStart, selEnd }: TextEdit) =>
  selStart === selEnd ? `${text.slice(0, selStart)}|${text.slice(selStart)}` : `${text.slice(0, selStart)}[${text.slice(selStart, selEnd)}]${text.slice(selEnd)}`;

describe("insertAtCursor", () => {
  it("inserts at the cursor and moves the cursor after it", () => {
    expect(show(insertAtCursor("Rent is  per month", 8, 8, "{{lease.rent}}"))).toBe("Rent is {{lease.rent}}| per month");
  });

  it("replaces the selection", () => {
    expect(show(insertAtCursor("Hello NAME!", 6, 10, "{{tenant.fullName}}"))).toBe("Hello {{tenant.fullName}}|!");
  });

  it("works at the start and the end", () => {
    expect(show(insertAtCursor("abc", 0, 0, "x"))).toBe("x|abc");
    expect(show(insertAtCursor("abc", 3, 3, "x"))).toBe("abcx|");
    expect(show(insertAtCursor("", 0, 0, "{{today}}"))).toBe("{{today}}|");
  });
});

describe("mergeToken", () => {
  it("wraps a key in double braces", () => {
    expect(mergeToken("lease.rent")).toBe("{{lease.rent}}");
  });
});

describe("wrapSelection", () => {
  it("wraps the selected word in bold", () => {
    expect(show(wrapSelection("Pay the rent now", 8, 12, "**", "bold text"))).toBe("Pay the **[rent]** now");
  });

  it("wraps in italic", () => {
    expect(show(wrapSelection("a word b", 2, 6, "*", "italic text"))).toBe("a *[word]* b");
  });

  it("inserts a selected placeholder without a selection", () => {
    expect(show(wrapSelection("Hi ", 3, 3, "**", "bold text"))).toBe("Hi **[bold text]**");
  });

  it("keeps edge spaces outside the markers", () => {
    expect(show(wrapSelection("a  word  b", 1, 8, "**", "bold text"))).toBe("a  **[word]**  b");
  });

  it("treats a selection of only spaces like no selection", () => {
    expect(show(wrapSelection("a   b", 1, 4, "*", "italic text"))).toBe("a*[italic text]*b");
  });

  it("unwraps text that is already wrapped (toggle)", () => {
    expect(show(wrapSelection("Pay **rent** now", 6, 10, "**", "bold text"))).toBe("Pay [rent] now");
    expect(show(wrapSelection("a *b* c", 3, 4, "*", "italic text"))).toBe("a [b] c");
  });

  it("italic doesn't unwrap bold text", () => {
    expect(show(wrapSelection("**rent**", 2, 6, "*", "italic text"))).toBe("***[rent]***");
  });
});

describe("prefixLines", () => {
  it("makes the cursor's line a heading", () => {
    expect(show(prefixLines("Intro\nTerms\nEnd", 8, 8, "## "))).toBe("Intro\n[## Terms]\nEnd");
  });

  it("replaces another heading level", () => {
    expect(show(prefixLines("### Terms", 0, 0, "## "))).toBe("[## Terms]");
  });

  it("removes the heading when the line already has it (toggle)", () => {
    expect(show(prefixLines("## Terms", 3, 3, "## "))).toBe("[Terms]");
  });

  it("bullets every selected line and skips blank lines", () => {
    expect(show(prefixLines("one\n\ntwo\nthree", 0, 13, "- "))).toBe("[- one\n\n- two\n- three]");
  });

  it("removes bullets when every line has one", () => {
    expect(show(prefixLines("- one\n- two", 0, 11, "- "))).toBe("[one\ntwo]");
  });

  it("numbers lines 1., 2., 3. and renumbers", () => {
    expect(show(prefixLines("a\nb\nc", 0, 5, "numbered"))).toBe("[1. a\n2. b\n3. c]");
    expect(show(prefixLines("x\n1. a\nb", 2, 8, "numbered"))).toBe("x\n[1. a\n2. b]");
  });

  it("removes numbers when every line is numbered", () => {
    expect(show(prefixLines("1. a\n2. b", 0, 9, "numbered"))).toBe("[a\nb]");
  });

  it("quotes lines", () => {
    expect(show(prefixLines("Note this", 2, 2, "> "))).toBe("[> Note this]");
  });

  it("on an empty line adds the prefix with the cursor after it", () => {
    expect(show(prefixLines("a\n\nb", 2, 2, "- "))).toBe("a\n- |\nb");
    expect(show(prefixLines("", 0, 0, "numbered"))).toBe("1. |");
  });

  it("doesn't take the next line when the selection ends right after a newline", () => {
    expect(show(prefixLines("a\nb", 0, 2, "- "))).toBe("[- a]\nb");
  });
});

describe("insertBlock", () => {
  it("puts a divider on its own line with blank lines around", () => {
    expect(show(insertBlock("Para one", 8, 8, "---"))).toBe("Para one\n\n---\n\n|");
  });

  it("doesn't add extra blank lines that are already there", () => {
    expect(show(insertBlock("a\n\n\n\nb", 3, 3, "---"))).toBe("a\n\n---\n\n|b");
  });

  it("at the start of an empty body", () => {
    expect(show(insertBlock("", 0, 0, "---"))).toBe("---\n\n|");
  });
});

const fields: MergeField[] = [
  { key: "lease.rent", group: "Lease", label: "Rent", sample: "$1,200.00" },
  { key: "lease.startDate", group: "Lease", label: "Start date", sample: "November 1, 2026" },
  { key: "tenant.fullName", group: "Primary tenant", label: "Full name", sample: "Jordan Lee" },
  { key: "today", group: "Document", label: "Today", sample: "October 24, 2026" },
];

describe("mergeKeysIn / unknownMergeKeys", () => {
  it("finds each key once, in order, with spaces inside allowed", () => {
    expect(mergeKeysIn("{{ tenant.fullName }} pays {{lease.rent}} from {{lease.rent}}")).toEqual(["tenant.fullName", "lease.rent"]);
  });

  it("ignores {{}}, {{ }} and unclosed braces", () => {
    expect(mergeKeysIn("{{}} {{ }} {{lease.rent")).toEqual([]);
  });

  it("lists keys the catalog doesn't have", () => {
    expect(unknownMergeKeys("{{lease.rent}} {{tenant.nickname}} {{ lease.foo }} {{tenant.nickname}}", fields)).toEqual(["tenant.nickname", "lease.foo"]);
    expect(unknownMergeKeys("{{today}}", fields)).toEqual([]);
  });
});

describe("groupMergeFields", () => {
  it("groups in API order", () => {
    expect(groupMergeFields(fields).map((g) => [g.group, g.fields.length])).toEqual([
      ["Lease", 2],
      ["Primary tenant", 1],
      ["Document", 1],
    ]);
  });

  it("filters by label, key, group or sample, any case, and drops empty groups", () => {
    expect(groupMergeFields(fields, "RENT").map((g) => g.fields.map((f) => f.key))).toEqual([["lease.rent"]]);
    expect(groupMergeFields(fields, "tenant").map((g) => g.group)).toEqual(["Primary tenant"]);
    expect(groupMergeFields(fields, "jordan")[0].fields[0].key).toBe("tenant.fullName");
    expect(groupMergeFields(fields, "zzz")).toEqual([]);
  });
});
