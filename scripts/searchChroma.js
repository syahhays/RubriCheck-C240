require('dotenv').config();

const { ChromaClient } = require('chromadb');
const { CHROMA_HOST, CHROMA_PORT, CHROMA_COLLECTION } = require('../config/appConfig');
const { embedText } = require('../services/ollamaEmbeddingService');
const { searchChunks } = require('../services/chromaService');

async function getLatestSubmissionId() {
  const client = new ChromaClient({ host: CHROMA_HOST, port: CHROMA_PORT });

  const collection = await client.getCollection({
    name: CHROMA_COLLECTION,
    embeddingFunction: null
  });

  const results = await collection.peek({ limit: 1 });
  return results.metadatas && results.metadatas[0] && results.metadatas[0].submissionId;
}

async function main() {
  const query = process.argv.slice(2).join(' ')
    || 'Check whether the student draft meets the marking rubric and assignment brief.';
  const submissionId = await getLatestSubmissionId();

  if (!submissionId) {
    throw new Error('No ChromaDB chunks found. Upload documents through the app first.');
  }

  const queryEmbedding = await embedText(query);
  const chunks = await searchChunks(queryEmbedding, null, submissionId, 5);

  console.log(`Query: ${query}`);
  console.log(`Submission: ${submissionId}`);
  console.log('');

  chunks.forEach((chunk, index) => {
    console.log(`Result ${index + 1}`);
    console.log(`Document type: ${chunk.metadata.documentType}`);
    console.log(`File: ${chunk.metadata.fileName}`);
    console.log(`Distance: ${chunk.distance}`);
    console.log(chunk.text.slice(0, 700));
    console.log('');
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
