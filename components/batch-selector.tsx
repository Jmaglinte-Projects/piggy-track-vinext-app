import type { Batch } from "@/domain/entities";
import { formatDate } from "@/presentation/formatters";
import { AppSelect } from "@/components/ui/select";

interface BatchSelectorProps {
  batches: Batch[];
  selectedBatchId: string;
  onChange: (batchId: string) => void;
}

export function BatchSelector({ batches, selectedBatchId, onChange }: BatchSelectorProps) {
  const selected = batches.find((batch) => batch.id === selectedBatchId) ?? batches[0];
  return (
    <div className="batch-selector">
      <label htmlFor="batch-select">Viewing batch</label>
      <div className="batch-select-wrap">
        <span className="batch-status-dot" aria-hidden="true" />
        <div className="batch-select-copy">
          <AppSelect
            ariaLabel="Viewing batch"
            id="batch-select"
            value={selectedBatchId}
            onValueChange={onChange}
            options={batches.map((batch) => ({ value: batch.id, label: batch.name }))}
          />
          <p>
            {selected.status} · Started {formatDate(selected.startDate)}
          </p>
        </div>
      </div>
    </div>
  );
}
