import { Icon } from "@/components/ui/icon";

interface PageHeaderProps { eyebrow: string; title: string; description: string; actionLabel: string; onAction: () => void }

export function PageHeader({ eyebrow, title, description, actionLabel, onAction }: PageHeaderProps) {
  return <div className="page-heading records-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div><button className="primary-button" type="button" onClick={onAction}><Icon name="plus" />{actionLabel}</button></div>;
}
