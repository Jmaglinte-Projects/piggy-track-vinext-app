export function formString(data: FormData, key: string): string {
  return String(data.get(key) ?? "").trim();
}

export function formNumber(data: FormData, key: string): number {
  const value = Number(data.get(key));
  if (!Number.isFinite(value)) throw new Error(`${key} must be a number.`);
  return value;
}
