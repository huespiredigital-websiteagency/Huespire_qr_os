export function formatCurrency(amount: number, currency: string = "INR", locale: string = "en-IN"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  }).format(amount);
}

export function formatDate(date: Date | string, locale: string = "en-IN"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function calculateTax(subtotal: number, taxPercentage: number): number {
  return Math.round(subtotal * (taxPercentage / 100) * 100) / 100;
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
}
