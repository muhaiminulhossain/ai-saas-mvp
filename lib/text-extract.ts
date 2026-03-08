export function stripHtmlToText(html: string): string {
  const noScripts = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ");
  const noTags = noScripts.replace(/<[^>]+>/g, " ");
  return noTags.replace(/\s+/g, " ").trim();
}