import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DatePicker } from "@/components/ui/date-picker";
import { formatDateValue, parseDateValue } from "@/presentation/date-picker-utils";

test("calendar date values round-trip in local time, including leap days and early years", () => {
  for (const value of ["2026-10-10", "2024-02-29", "0001-01-01", "0099-12-31", "9999-12-31"]) {
    const parsed = parseDateValue(value);
    assert.ok(parsed, value);
    assert.equal(formatDateValue(parsed), value);
    assert.equal(parsed.getHours(), 0);
  }
});

test("invalid dates are rejected instead of rolling into another month", () => {
  for (const value of [
    "",
    "2026-02-29",
    "2024-02-30",
    "2026-04-31",
    "2026-13-01",
    "2026-00-01",
    "2026-01-00",
    "0000-01-01",
    "10000-01-01",
    "2026-1-01",
    "2026-10-10T00:00:00Z",
  ]) {
    assert.equal(parseDateValue(value), undefined, value);
  }
});

test("date picker retains the named form value, required validation, and accessible trigger", () => {
  const html = renderToStaticMarkup(
    createElement(DatePicker, {
      name: "saleDate",
      ariaLabel: "Sale date",
      defaultValue: "2026-10-10",
      required: true,
    }),
  );
  assert.match(html, /name="saleDate"/);
  assert.match(html, /value="2026-10-10"/);
  assert.match(html, /required=""/);
  assert.match(html, /aria-label="Sale date: 2026-10-10"/);
  assert.match(html, /type="button"/);
  assert.doesNotMatch(html, /type="date"/);
});

test("optional and disabled fields preserve their form semantics", () => {
  const optional = renderToStaticMarkup(
    createElement(DatePicker, { name: "endDate", ariaLabel: "End date" }),
  );
  assert.match(optional, /value=""/);
  assert.doesNotMatch(optional, /required=""/);
  const disabled = renderToStaticMarkup(
    createElement(DatePicker, { name: "endDate", ariaLabel: "End date", disabled: true }),
  );
  assert.match(disabled, /disabled=""/);
});
