import type { EmbeddingInput } from "./types";

/** Placeholder for pgvector-era embeddings + RAG workloads (architecture north star). */

export async function generateEmbedding(input: EmbeddingInput): Promise<number[]> {
  throw new Error(
    `Embeddings gateway not implemented yet — wire Gemini/OpenAI embeddings here (model=${input.model ?? "unset"}).`
  );
}
