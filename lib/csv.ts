/** RFC 4180 CSV with spreadsheet formula-injection protection. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = Array.isArray(value) ? value.join(", ") : String(value);
  // A leading =, +, -, @, tab, or CR makes spreadsheets evaluate the cell as a formula.
  // Plain numbers (e.g. -5) are left as they are.
  if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  // BOM so Excel opens UTF-8 Japanese text correctly.
  return `﻿${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
