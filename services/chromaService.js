// services/chromaService.js

const { ChromaClient } = require('chromadb');
const { CHROMA_HOST, CHROMA_PORT, CHROMA_COLLECTION } = require('../config/appConfig');

const client = new ChromaClient({ host: CHROMA_HOST, port: CHROMA_PORT });

async function getCollection() {
  return client.getOrCreateCollection({
    name: CHROMA_COLLECTION,
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

  const where = documentType
    ? { $and: [{ submissionId: { $eq: submissionId } }, { documentType: { $eq: documentType } }] }
    : { submissionId: { $eq: submissionId } };

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

async function deleteSubmission(submissionId) {
  const collection = await getCollection();
  await collection.delete({ where: { submissionId } });
}

module.exports = {
  storeChunks,
  searchChunks,
  deleteSubmission
};
