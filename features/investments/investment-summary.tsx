import type { FarmInvestment } from "@/domain/entities";
import { buildInvestmentReport } from "@/domain/investments";
import { formatCurrency, formatDate } from "@/presentation/formatters";
import { Button } from "@/components/ui/button";

export function InvestmentSummary({
  investments,
  onOpen,
  details = false,
}: {
  investments: FarmInvestment[];
  onOpen?: () => void;
  details?: boolean;
}) {
  const report = buildInvestmentReport(investments);
  return (
    <section className="panel my-5" aria-label="Farm investments">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div>
          <p className="eyebrow">Whole farm · All time</p>
          <h2 className="mt-1 font-serif text-2xl">Farm Investments</h2>
          <p className="mt-2 text-sm text-[#68746f]">
            Setup, construction, and equipment costs. Separate from batch expenses, profit, and ROI.
          </p>
        </div>
        {onOpen && (
          <Button className="secondary-button" onClick={onOpen}>
            View investments
          </Button>
        )}
      </div>
      <div className="px-5 pb-5">
        <strong className="block text-3xl text-[#315c50]">
          {formatCurrency(report.totalInvested)}
        </strong>
        <p className="mt-2 text-sm text-[#68746f]">
          {report.recordCount} investment {report.recordCount === 1 ? "record" : "records"}
        </p>
        {investments.length === 0 && (
          <p className="mt-3 text-sm">
            No investments recorded yet. You can record farm setup costs before creating a batch.
          </p>
        )}
        {details && (
          <>
            <div className="mt-4 flex flex-wrap gap-3">
              {report.categoryBreakdown.map((item) => (
                <span className="rounded-lg bg-[#eef2e9] px-3 py-2 text-sm" key={item.category}>
                  {item.category}: {formatCurrency(item.amount)}
                </span>
              ))}
            </div>
            <div className="mt-4 space-y-3">
              {[...investments]
                .sort((a, b) => b.investmentDate.localeCompare(a.investmentDate))
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap justify-between gap-2 border-t border-[#e3e5dc] pt-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <strong className="break-words">{item.name}</strong>
                      <p className="text-[#68746f]">
                        {item.category} · {formatDate(item.investmentDate)}
                      </p>
                      {item.notes && (
                        <p className="mt-1 whitespace-pre-wrap break-words">{item.notes}</p>
                      )}
                    </div>
                    <strong>{formatCurrency(item.amount)}</strong>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
