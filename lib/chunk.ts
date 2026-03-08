export function chunkText(text: string, chunkSize = 1200, overlap = 150): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const chunks: string[] = [];
  let i = 0;

  while (i < cleaned.length) {
    const end = Math.min(i + chunkSize, cleaned.length);
    chunks.push(cleaned.slice(i, end));
    if (end === cleaned.length) break;
    i = Math.max(0, end - overlap);
  }
  return chunks;
}