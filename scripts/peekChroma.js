require('dotenv').config();

const { ChromaClient } = require('chromadb');

async function main() {
  const client = new ChromaClient({
    path: process.env.CHROMA_URL || 'http://127.0.0.1:8000'
  });

  const collection = await client.getCollection({
    name: process.env.CHROMA_COLLECTION || 'rubricheck_documents',
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
