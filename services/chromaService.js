// services/chromaService.js

const { ChromaClient } = require('chromadb');

const client = new ChromaClient({
  path: process.env.CHROMA_URL || 'http://localhost:8000'
});

const COLLECTION_NAME = process.env.CHROMA_COLLECTION || 'rubricheck_documents';

async function getCollection() {
  return client.getOrCreateCollection({
    name: COLLECTION_NAME,
    embeddingFunction: null
  });
}

async function storeChunks(submissionId, chunks, embeddings) {
  const collection = await getCollection();

  await collection.upsert({
    ids: chunks.map((chunk) => chunk.id),
    documents: chunks.map((chunk) => chunk.text),
    metadatas: chunks.map((chunk) => ({
      ...chunk.metadata,
      submissionId
    })),
    embeddings
  });

  console.log(`Stored ${chunks.length} chunks in ChromaDB`);
}

async function searchChunks(queryEmbedding, documentType, submissionId, limit = 5) {
  const collection = await getCollection();

  const where = {
    submissionId
  };

  if (documentType) {
    where.documentType = documentType;
  }

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: limit,
    where
  });

  return results.documents[0].map((text, index) => ({
    text,
    metadata: results.metadatas[0][index],
    distance: results.distances ? results.distances[0][index] : null
  }));
}

module.exports = {
  storeChunks,
  searchChunks
};
