import { describe, expect, it } from "vitest";
import { foldText, matchesQuery } from "@/lib/textMatch";

const holman = ["Cha'Mara M Holman", "Unit 7, 2-9 DLF LLC", "LSE-0012"];

describe("foldText", () => {
  it("drops case, accents, punctuation and extra spaces", () => {
    expect(foldText("  Cha'Mara   M. Holman ")).toBe("chamara m holman");
    expect(foldText("Cha’Mara")).toBe("chamara"); // curly apostrophe
    expect(foldText("José Núñez")).toBe("jose nunez");
    expect(foldText("Marie-Louise")).toBe("marielouise");
    expect(foldText("'-.,")).toBe("");
  });
});

describe("matchesQuery", () => {
  it("finds a name whatever the case or punctuation, on either side", () => {
    for (const q of ["chamara", "CHA'MARA", "cha’mara", "holman", "hol"]) expect(matchesQuery(q, holman), q).toBe(true);
    expect(matchesQuery("o'brien", ["OBrien"])).toBe(true);
    expect(matchesQuery("jose", ["José Núñez"])).toBe(true);
    for (const q of ["marie louise", "marie-louise", "marielouise"]) expect(matchesQuery(q, ["Marie-Louise Enderle"]), q).toBe(true);
  });

  it("finds by unit, property and lease number", () => {
    for (const q of ["unit 7", "dlf", "2-9 dlf", "LSE-0012", "lse0012", "0012"]) expect(matchesQuery(q, holman), q).toBe(true);
  });

  it("needs every word, in any order and any of the texts", () => {
    expect(matchesQuery("dlf chamara", holman)).toBe(true);
    expect(matchesQuery("holman 7", holman)).toBe(true);
    expect(matchesQuery("chamara spw", holman)).toBe(false);
  });

  it("doesn't match across two texts as one word", () => {
    expect(matchesQuery("holmanunit", holman)).toBe(false);
  });

  it("matches everything with nothing typed, spaces or only punctuation", () => {
    for (const q of ["", "   ", "'", "-."]) expect(matchesQuery(q, holman)).toBe(true);
  });

  it("copes with missing texts and finds nothing for an unknown word", () => {
    expect(matchesQuery("ana", [null, undefined, "Ana Ruiz"])).toBe(true);
    expect(matchesQuery("zzz", holman)).toBe(false);
    expect(matchesQuery("a", [null])).toBe(false);
  });
});
