// FILE: lib/pinecone.ts
import { Pinecone } from "@pinecone-database/pinecone";

export function pineconeClient() {
  const apiKey = process.env.PINECONE_API_KEY!;
  if (!apiKey) throw new Error("Missing PINECONE_API_KEY");
  return new Pinecone({ apiKey });
}

export function pineconeIndex() {
  const indexName = process.env.PINECONE_INDEX!;
  if (!indexName) throw new Error("Missing PINECONE_INDEX");
  const pc = pineconeClient();
  return pc.index(indexName);
}