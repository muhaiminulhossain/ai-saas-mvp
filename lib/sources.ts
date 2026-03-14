import fs from "fs/promises";
import path from "path";

export type SourceItem = {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  filePath?: string;
  namespace?: string;
};

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "sources.json");

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify([], null, 2), "utf-8");
  }
}

async function readStore(): Promise<SourceItem[]> {
  await ensureStore();
  const raw = await fs.readFile(dataFile, "utf-8");
  return JSON.parse(raw) as SourceItem[];
}

async function writeStore(items: SourceItem[]) {
  await ensureStore();
  await fs.writeFile(dataFile, JSON.stringify(items, null, 2), "utf-8");
}

export async function getAllSources(): Promise<SourceItem[]> {
  const items = await readStore();
  return items.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getSourceById(id: string): Promise<SourceItem | null> {
  const items = await readStore();
  return items.find((item) => item.id === id) ?? null;
}

export async function addSource(source: SourceItem): Promise<void> {
  const items = await readStore();
  items.push(source);
  await writeStore(items);
}

export async function deleteSourceById(id: string): Promise<boolean> {
  const items = await readStore();
  const target = items.find((item) => item.id === id);
  const filtered = items.filter((item) => item.id !== id);

  if (filtered.length === items.length) {
    return false;
  }

  await writeStore(filtered);

  if (target?.filePath) {
    try {
      await fs.unlink(path.join(process.cwd(), target.filePath));
    } catch (error) {
      console.warn("Could not delete file from disk:", target.filePath, error);
    }
  }

  return true;
}