import { Icon, type IconName } from "@/components/ui/icon";

interface MetricCardProps {
  label: string;
  value: string;
  hint: string;
  icon: IconName;
  tone?: "default" | "positive" | "warning";
}

export function MetricCard({ label, value, hint, icon, tone = "default" }: MetricCardProps) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon name={icon} /></span></div>
      <strong>{value}</strong>
      <p>{hint}</p>
    </article>
  );
}
