async function embedTexts(texts) {
  const input = Array.isArray(texts) ? texts : [texts];

  const response = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/embed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
      input
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Ollama embedding request failed.');
  }

  return data.embeddings;
}

async function embedText(text) {
  const [embedding] = await embedTexts([text]);
  return embedding;
}

module.exports = {
  embedText,
  embedTexts
};
