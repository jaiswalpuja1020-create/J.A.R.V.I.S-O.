// services/file.service.ts - Document indexing, chunking, and search

export interface DocumentChunk {
  id: string;
  fileId: string;
  filename: string;
  chunkIndex: number;
  content: string;
}

export interface IndexedFile {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  chunksCount: number;
  preview: string;
}

// In-memory document storage isolated by sessionId
const sessionFileStore: Map<string, { files: Map<string, IndexedFile>; chunks: DocumentChunk[] }> = new Map();

function getSessionStore(sessionId: string) {
  if (!sessionFileStore.has(sessionId)) {
    sessionFileStore.set(sessionId, { files: new Map(), chunks: [] });
  }
  return sessionFileStore.get(sessionId)!;
}

export function listFiles(sessionId: string): IndexedFile[] {
  const store = getSessionStore(sessionId);
  return Array.from(store.files.values());
}

export function indexDocument(
  sessionId: string,
  filename: string,
  mimeType: string,
  rawText: string,
  sizeBytes: number
): IndexedFile {
  const store = getSessionStore(sessionId);
  const fileId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Safe chunking (split into ~500 word or ~1500 char paragraphs)
  const paragraphs = rawText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const fileChunks: DocumentChunk[] = [];

  let chunkIdx = 0;
  for (const para of paragraphs) {
    if (para.trim().length > 0) {
      fileChunks.push({
        id: `chk-${fileId}-${chunkIdx++}`,
        fileId,
        filename,
        chunkIndex: chunkIdx,
        content: para.trim().slice(0, 1500),
      });
    }
  }

  // If no paragraphs (e.g. single block of text), chunk by character slices
  if (fileChunks.length === 0 && rawText.trim().length > 0) {
    const chunkSize = 1000;
    for (let i = 0; i < rawText.length; i += chunkSize) {
      fileChunks.push({
        id: `chk-${fileId}-${chunkIdx++}`,
        fileId,
        filename,
        chunkIndex: chunkIdx,
        content: rawText.slice(i, i + chunkSize),
      });
    }
  }

  const indexedFile: IndexedFile = {
    id: fileId,
    filename,
    mimeType,
    sizeBytes,
    uploadedAt: new Date().toISOString(),
    chunksCount: fileChunks.length,
    preview: rawText.slice(0, 200) + (rawText.length > 200 ? '...' : ''),
  };

  store.files.set(fileId, indexedFile);
  store.chunks.push(...fileChunks);

  return indexedFile;
}

export function searchDocuments(
  sessionId: string,
  query: string,
  limit = 5
): Array<{ filename: string; fileId: string; chunkIndex: number; content: string; score: number }> {
  const store = getSessionStore(sessionId);
  const queryWords = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (queryWords.length === 0 || store.chunks.length === 0) {
    return [];
  }

  const scored = store.chunks.map((chunk) => {
    const textLower = chunk.content.toLowerCase();
    let score = 0;
    for (const word of queryWords) {
      if (textLower.includes(word)) {
        score += 10;
        // Frequency boost
        const occurrences = (textLower.match(new RegExp(word, 'g')) || []).length;
        score += Math.min(occurrences, 5);
      }
    }
    return {
      filename: chunk.filename,
      fileId: chunk.fileId,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      score,
    };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function removeFile(sessionId: string, fileId: string): boolean {
  const store = getSessionStore(sessionId);
  const deleted = store.files.delete(fileId);
  store.chunks = store.chunks.filter((c) => c.fileId !== fileId);
  return deleted;
}
