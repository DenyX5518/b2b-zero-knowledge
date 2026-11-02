// Актау живёт в UTC+5 без перехода на летнее время — считаем вручную, не завися от Intl в Hermes.
const AKTAU_OFFSET_MS = 5 * 60 * 60 * 1000;

export function formatTime(value: string | number | Date = Date.now()): string {
  const shifted = new Date(new Date(value).getTime() + AKTAU_OFFSET_MS);
  return `${String(shifted.getUTCHours()).padStart(2, "0")}:${String(shifted.getUTCMinutes()).padStart(2, "0")}`;
}

export function formatDateTime(value: string): string {
  const shifted = new Date(new Date(value).getTime() + AKTAU_OFFSET_MS);
  return `${String(shifted.getUTCDate()).padStart(2, "0")}.${String(shifted.getUTCMonth() + 1).padStart(2, "0")} · ${formatTime(value)}`;
}

export function greeting(): string {
  const hour = new Date(Date.now() + AKTAU_OFFSET_MS).getUTCHours();
  if (hour < 5) return "ДОБРОЙ НОЧИ";
  if (hour < 12) return "ДОБРОЕ УТРО";
  if (hour < 18) return "ДОБРЫЙ ДЕНЬ";
  return "ДОБРЫЙ ВЕЧЕР";
}

export function plural(count: number, forms: [string, string, string]): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const form = mod10 === 1 && mod100 !== 11 ? forms[0] : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? forms[1] : forms[2];
  return `${count} ${form}`;
}
