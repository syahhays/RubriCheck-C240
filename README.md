# RubriCheck-C240

RubriCheck uses Gemini for feedback, ChromaDB for local document retrieval, and Ollama for local text embeddings.

## Local Setup

1. Install Node dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from `.env.example` and add your Gemini API key:

   ```env
   PORT=3000
   GEMINI_API_KEY=your_gemini_key_here
   GEMINI_MODEL=gemini-2.5-flash
   CHROMA_URL=http://127.0.0.1:8000
   CHROMA_COLLECTION=rubricheck_documents
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_EMBEDDING_MODEL=nomic-embed-text
   ```

3. Start ChromaDB locally.

   With Docker:

   ```bash
   docker run -p 8000:8000 chromadb/chroma
   ```

   Without Docker:

   ```bash
   python -m pip install chromadb fastapi uvicorn opentelemetry-instrumentation-fastapi
   python -m uvicorn chromadb.app:app --host 127.0.0.1 --port 8000
   ```

4. Install Ollama, make sure it is running in the background, and pull the embedding model:

   ```bash
   ollama pull nomic-embed-text
   ```

5. Start the app:

   ```bash
   npm start
   ```

## Expected Logs

After uploading documents, the terminal should show messages like:

```text
Stored X chunks in ChromaDB
Retrieved X chunks from ChromaDB for Gemini feedback
```

Each teammate needs ChromaDB and Ollama running locally for the document retrieval feature to work.
