import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Combobox, type ComboboxProps } from "@/components/molecules/Combobox";

const options = [
  { value: "l1", label: "Ana Ruiz", description: "Unit 2, Birch Hollow", selectedLabel: "Ana Ruiz, Unit 2, Birch Hollow" },
  { value: "l2", label: "Ben Ode" },
];
const render = (over: Partial<ComboboxProps> = {}) =>
  renderToStaticMarkup(createElement(Combobox, { id: "t", options, value: "", onChange: () => {}, listLabel: "Tenant", placeholder: "Choose a tenant", ...over }));

// Tests run without a DOM: this covers the closed field. The open list is checked in the browser.
describe("Combobox (closed)", () => {
  it("is a collapsed combobox with its placeholder, no list and no clear button", () => {
    const html = render();
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('placeholder="Choose a tenant"');
    expect(html).not.toContain("listbox");
    expect(html).not.toContain("aria-activedescendant");
    expect(html).not.toContain("Clear tenant");
  });

  it("shows the chosen option's selectedLabel (or label) and a clear button", () => {
    expect(render({ value: "l1" })).toContain('value="Ana Ruiz, Unit 2, Birch Hollow"');
    expect(render({ value: "l2" })).toContain('value="Ben Ode"');
    expect(render({ value: "l1" })).toContain('aria-label="Clear tenant"');
  });

  it("shows nothing for a value that isn't in the options", () => {
    expect(render({ value: "gone" })).toContain('value=""');
  });

  it("passes on the error state and its description, and hides clear when disabled", () => {
    const html = render({ value: "l1", invalid: true, disabled: true, "aria-describedby": "err" });
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="err"');
    expect(html).not.toContain("Clear tenant");
  });
});
