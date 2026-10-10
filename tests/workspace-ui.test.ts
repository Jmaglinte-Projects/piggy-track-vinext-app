import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BatchesPage } from "@/features/batches/batches-page";
import { PigsPage } from "@/features/pigs/pigs-page";
import { ExpensesPage } from "@/features/expenses/expenses-page";
import { FeedPage } from "@/features/feed/feed-page";
import { SalesPage } from "@/features/sales/sales-page";
import { InvestmentsPage } from "@/features/investments/investments-page";
import { InvestmentSummary } from "@/features/investments/investment-summary";
import { BuyersPage } from "@/features/buyers/buyers-page";
import { SettingsPage } from "@/features/settings/settings-page";
import { mockData } from "@/infrastructure/local/mock-data";

const noop = async () => {};
const base = {
  data: mockData,
  saving: false,
  selectedBatchId: mockData.batches[0].id,
  onBatchChange: () => {},
};
function buttons(html: string): string[] {
  return Array.from(html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g), (match) =>
    match[1].replace(/<[^>]*>/g, "").trim(),
  );
}

test("Viewer pages retain browsing controls and hide every record mutation action", () => {
  const cases = [
    [BatchesPage, { ...base, onSave: noop, onDelete: noop }, "Add batch"],
    [PigsPage, { ...base, onSave: noop, onDelete: noop }, "Add pig"],
    [ExpensesPage, { ...base, onSave: noop, onDelete: noop, onReconcile: noop }, "Add expense"],
    [FeedPage, { ...base, onSave: noop, onDelete: noop }, "Add feed"],
    [
      SalesPage,
      {
        ...base,
        onSaveSale: noop,
        onDeleteSale: noop,
        onSavePayment: noop,
        onDeletePayment: noop,
        onOpenBuyers: () => {},
      },
      "Record sale",
    ],
    [
      InvestmentsPage,
      {
        ...base,
        data: {
          ...mockData,
          investments: [
            {
              id: "investment",
              name: "Pigpen",
              category: "Construction" as const,
              amount: 100000,
              investmentDate: "2026-10-10",
              notes: "",
            },
          ],
        },
        onSave: noop,
        onDelete: noop,
      },
      "Add investment",
    ],
    [BuyersPage, { ...base, onSave: noop, onDelete: noop }, "Add buyer"],
  ] as const;
  for (const [Component, props] of cases) {
    // Each page has distinct input callback types; the fixture provides the union of those props.
    const render = (canEdit: boolean) =>
      renderToStaticMarkup(
        createElement(Component as React.ComponentType<typeof props & { canEdit: boolean }>, {
          ...props,
          canEdit,
        }),
      );
    const ownerButtons = buttons(render(true));
    assert.ok(
      ownerButtons.some((label) => /Add|Record|Edit/.test(label)),
      Component.name,
    );
    const viewerHtml = render(false);
    const viewerButtons = buttons(viewerHtml);
    assert.equal(
      viewerButtons.some((label) =>
        /^(Add |Record |Edit(?: |$)|Delete$|Remove$|Review purchase costs$)/.test(label),
      ),
      false,
      Component.name,
    );
    assert.ok(viewerHtml.includes("Read only"), Component.name);
  }
});

test("Viewer settings show the correct workspace role without member emails or owner controls", () => {
  const html = renderToStaticMarkup(
    createElement(SettingsPage, {
      workspace: {
        farmId: "shared",
        farmName: "Shared farm",
        farmRole: "Viewer",
        farms: [{ id: "shared", name: "Shared farm", role: "Viewer" }],
        members: [
          {
            userId: "owner",
            email: "private-owner@example.test",
            role: "Owner",
            joinedAt: "2026-10-10",
          },
        ],
        data: mockData,
      },
      cloudEnabled: true,
      saving: false,
      onSwitchFarm: noop,
      onRenameFarm: noop,
      onAcceptInvitation: noop,
      onRemoveMember: noop,
      onCreateInvitation: async () => ({ code: "test", expiresAt: "" }),
    }),
  );
  assert.equal(html.includes("private-owner@example.test"), false);
  assert.equal(
    buttons(html).some((label) => /Save farm name|Create invitation|Remove/.test(label)),
    false,
  );
  assert.equal((html.match(/>Current</g) ?? []).length, 1);
  assert.ok(html.includes("Viewer"));
  assert.ok(buttons(html).includes("Join farm workspace"));
});

test("farm setup records and their report render without batches", () => {
  const data = {
    ...mockData,
    batches: [],
    investments: [
      {
        id: "investment",
        name: "Pigpen",
        category: "Construction" as const,
        amount: 100000,
        investmentDate: "2026-10-10",
        notes: "Foundation",
      },
    ],
  };
  const html = renderToStaticMarkup(
    createElement(InvestmentsPage, {
      data,
      canEdit: true,
      saving: false,
      onSave: noop,
      onDelete: noop,
    }),
  );
  assert.match(html, /Add investment/);
  assert.match(html, /Pigpen/);
  assert.match(html, /₱100,000.00/);
  const report = renderToStaticMarkup(
    createElement(InvestmentSummary, { investments: data.investments, details: true }),
  );
  assert.match(report, /Foundation/);
  assert.match(report, /Whole farm/);
  assert.match(report, /₱100,000.00/);
});
