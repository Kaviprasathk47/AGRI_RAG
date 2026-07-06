# AGRI RAG: Production-Grade Pesticide Registration Assistant

A complete, production-ready, full-stack Retrieval-Augmented Generation (RAG) chatbot application. The application allows users to upload pesticide registration PDFs, parse their contents, chunk them with page-level metadata, generate OpenAI embeddings, store them in a Pinecone vector database, and perform context-accurate QA searches using Google Gemini.

---

## ⚡ Architecture Diagram

The system employs a clean, decoupled architecture dividing the React Frontend (Vite) and the Express.js Backend.

```text
  [ React Client (Port 3000) ]
              │
              │ REST API Calls (Axios / CORS)
              ▼
  [ Express.js Server (Port 5000) ]
   ├── Middleware (Helmet, CORS, Rate Limit)
   ├── Routers (/chat, /ingest, /documents, /statistics)
   └── Controllers ( thin execution layers )
              │
              ▼
  [ Services layer (decoupled) ]
   ├── Parser Service (pdf-parse page-by-page)
   ├── Chunker Service (overlapping semantic splitter)
   ├── Ingestion Service (orchestrator)
   ├── Retrieval Service (question embedding + Pinecone query)
   ├── Prompt Service (compiles RAG directives)
   └── LLM Service (Gemini 2.x API executor)
              │
              ├───────────────────────────────┐
              ▼                               ▼
      [ External Clients ]           [ Local Registry ]
       ├── OpenAI API                 └── registry.json (document stats)
       ├── Pinecone Vector DB
       └── Google Gemini API
```

---

## 📂 Folder Structure

The project has been cleaned and structured with separation of concerns:

```text
AGRI_EDU/
├── src/                      # Express.js Backend
│   ├── app.js                # App definition, middleware mounting
│   ├── server.js             # Listener entrypoint with graceful shutdown
│   ├── config/
│   │   ├── gemini.js         # Gemini client configuration
│   │   ├── openai.js         # OpenAI client configuration
│   │   └── pinecone.js       # Pinecone client configuration
│   ├── constants/
│   │   ├── config.js         # Port, models, and path configurations
│   │   └── prompts.js        # Strict RAG prompt templates
│   ├── controllers/
│   │   ├── chat.controller.js
│   │   ├── document.controller.js
│   │   ├── ingest.controller.js
│   │   └── statistics.controller.js
│   ├── middleware/
│   │   └── errorHandler.js   # Global express error-catching middleware
│   ├── routes/
│   │   ├── chat.routes.js
│   │   ├── document.routes.js
│   │   ├── ingest.routes.js
│   │   └── statistics.routes.js
│   ├── services/
│   │   ├── parser.service.js      # Page-by-page text parser
│   │   ├── chunker.service.js     # Semantic sentence/word text splitter
│   │   ├── embedding.service.js   # Batch OpenAI embedding generation
│   │   ├── pinecone.service.js    # Batch upserts and metadata filter deletes
│   │   ├── retrieval.service.js   # Query vector embedding & Pinecone query
│   │   ├── prompt.service.js      # Compiles RAG context & prompts
│   │   ├── registry.service.js    # Syncs files metadata in data/registry.json
│   │   ├── llm.service.js         # Gemini generation API client
│   │   └── ingestion.service.js   # Pipeline orchestrator
│   ├── uploads/               # Target folder containing PDF files
│   └── utils/
│       ├── logger.js         # Structured logs & performance time monitor
│       └── tokenizer.js      # Word/char-based token estimator
│
├── data/
│   └── registry.json         # Document registry database tracking
│
├── frontend/                 # React (Vite + Tailwind CSS + Lucide)
│   ├── src/
│   │   ├── App.jsx           # Tab routing & Dark/Light mode shell
│   │   ├── index.css         # Tailwind directives & scrollbar styles
│   │   ├── components/
│   │   │   ├── ChatWindow.jsx   # Chat message feed, interactive citations
│   │   │   ├── Dashboard.jsx    # System analytics tiles & registered files table
│   │   │   └── UploadCard.jsx   # Drag & Drop PDF uploader & progress bar
│   │   └── utils/
│   │       └── api.js        # Axios instance with backoff retry handling
│   ├── index.html
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js        # Configured to port 3000
│
├── .env.example              # Environments template
├── .env                      # Active configurations file
├── package.json              # Backend dependencies and startup scripts
└── README.md
```

---

## ⚙️ Environment Configuration

Set up a `.env` file at the root of the workspace directory:

```ini
PORT=5000

# OpenAI API Key (Required for text-embedding-3-small)
OPENAI_API_KEY=your_openai_api_key_here

# Google Gemini API Key (Required for gemini-2.0-flash / gemini-2.5-flash)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Pinecone Database Credentials
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX=quickstart
PINECONE_HOST=https://your-pinecone-index-host-url.pinecone.io
PINECONE_NAMESPACE=pesticide-rag
```

---

## 🚀 Running the Application

### 1. Run the Express Backend
From the root workspace directory, run:
```bash
npm install
npm start
```
The server binds to port `5000` by default and prints:
```text
[INFO] RAG Pesticide Chatbot service started successfully.
[INFO] Listening on port: 5000
[INFO] Local URL: http://localhost:5000
[INFO] Health check: http://localhost:5000/health
```

### 2. Run the React Frontend
Navigate to the `frontend/` directory and start the Vite dev server:
```bash
cd frontend
npm run dev
```
The client binds to port `3000` (e.g. `http://localhost:3000`) and proxies calls to the backend.

---

## 🛠️ API Reference Documentation

### Ingest Documents
- **URL**: `POST /ingest`
- **Headers**: `Content-Type: multipart/form-data`
- **Body**: Accepts file attachments under the field name `files`. If files are omitted, it parses existing files in `src/uploads/`.
- **Response**:
  ```json
  {
    "documentsProcessed": ["fungicides.pdf"],
    "chunksCreated": 140,
    "vectorsUploaded": 140,
    "processingTimeMs": 4820
  }
  ```

### Chat (RAG)
- **URL**: `POST /chat`
- **Body**:
  ```json
  {
    "question": "Formulation type of Coragen?",
    "k": 5
  }
  ```
- **Response**:
  ```json
  {
    "answer": "Coragen is formulated as a Suspension Concentrate [updated_mup_insecticide_as_on_31.03.2026_c.pdf, Page 12].",
    "sources": [
      {
        "document": "updated_mup_insecticide_as_on_31.03.2026_c.pdf",
        "page": 12,
        "score": 0.89
      }
    ]
  }
  ```

### Document Registry List
- **URL**: `GET /documents`
- **Response**: List of files registered in the system with metadata (file size, chunk counts, ingestion timestamp).

### Delete Document
- **URL**: `DELETE /documents/:id` (where `:id` is the URL-encoded filename)
- **Action**: Unlinks the physical file on server disk, deletes matching vectors from Pinecone using metadata filter, and unregisters it from `data/registry.json`.

### Dashboard Statistics
- **URL**: `GET /statistics`
- **Response**: Aggregates registry analytics (file count, chunk count, vector counts) and index operational states (metric, dimension, state, host) from Pinecone's client API.

### Service Health
- **URL**: `GET /health`
- **Response**: `{ "status": "ok" }`

---

## 🛡️ Production & Security Standards
- **Input Validation**: Multer restricts upload files only to `.pdf` formats. Express controllers check that request bodies contain valid properties.
- **CORS & Rate Limiting**: REST paths are rate-limited to 200 requests per 15 minutes per IP.
- **CORS Config**: Setup is CORS-ready to safely query backend APIs from local/production addresses.
- **Graceful Shutdown**: The process intercepts termination signals (`SIGINT` and `SIGTERM`) and drains active server HTTP sockets before exit.
- **Hallucination Prevention**: The prompt manager explicitly enforces that Gemini outputs *"I couldn't find that information in the provided documents."* if retrieved sources do not detail the query topic.

---

## 🔮 Future Improvements
The workspace is structured to support these additions without major refactoring:
- **Streaming Responses**: Modify `llm.service` to utilize `generateContentStream` from Gemini and pipe events through Server-Sent Events (SSE) or WebSockets.
- **Conversation Memory**: Append message histories to standard chat payloads and pass them as chat session parameters in Gemini config.
- **Hybrid Search**: Augment `retrieval.service` to invoke sparse index lookups alongside Pinecone's similarity matches.