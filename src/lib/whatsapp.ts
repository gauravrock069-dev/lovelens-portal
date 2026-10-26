// wa.me links break when the URL gets very long, so a huge selection falls back to
// a short message plus the full list copied to the clipboard.
const MAX_URL = 6000;

export function buildWhatsAppUrl(opts: {
  phone: string;
  clientName: string;
  title: string;
  names: string[];
}) {
  const { phone, clientName, title, names } = opts;
  const head = `Hello Love Lens Wedding! ${clientName} (${title}) ne album ke liye ${names.length} photos select ki hain`;
  const full = `${head}:\n\n${names.join(", ")}`;
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(full)}`;
  if (url.length <= MAX_URL) return { url, full, truncated: false };
  const short = `${head}. Poori list neeche paste kar raha/rahi hoon:`;
  return { url: `https://wa.me/${phone}?text=${encodeURIComponent(short)}`, full, truncated: true };
}
