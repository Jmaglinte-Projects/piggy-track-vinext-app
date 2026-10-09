const phpCurrency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

const philippineDate = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "Asia/Manila",
});

export function formatCurrency(value: number): string {
  return phpCurrency.format(value).replace("PHP", "₱");
}

export function formatDate(value: string): string {
  return philippineDate.format(new Date(`${value}T00:00:00+08:00`));
}

export function formatWeight(value: number): string {
  return `${new Intl.NumberFormat("en-PH", { maximumFractionDigits: 1 }).format(value)} kg`;
}

export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("en-PH", { maximumFractionDigits: 1 }).format(value)}%`;
}
