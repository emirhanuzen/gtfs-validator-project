const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "short",
  timeStyle: "medium",
});

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return dateFormatter.format(date);
}

export function formatCell(value) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export function shortenChecksum(checksum) {
  if (!checksum) return "—";
  return `${checksum.slice(0, 12)}…`;
}
