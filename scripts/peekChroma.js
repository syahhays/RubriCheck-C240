require('dotenv').config();

const { ChromaClient } = require('chromadb');
const { CHROMA_HOST, CHROMA_PORT, CHROMA_COLLECTION } = require('../config/appConfig');

async function main() {
  const client = new ChromaClient({ host: CHROMA_HOST, port: CHROMA_PORT });

  const collection = await client.getCollection({
    name: CHROMA_COLLECTION,
    embeddingFunction: null
  });

  const results = await collection.peek({ limit: 10 });

  console.log(JSON.stringify({
    ids: results.ids,
    documents: results.documents,
    metadatas: results.metadatas
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
