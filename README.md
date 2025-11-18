# rag_exploration

Experiments and e2e performance for RAG (Retrieval-Augmented Generation)

## Knowledge Structure

This project uses a structured approach to organize and process documentation for RAG systems.

### Directory Layout

```
knowledge/
├── _convert/              # Conversion tools and utilities
│   ├── convert_dir_to_md.py   # Main conversion script using Docling
│   ├── readme.md              # Tool comparison and usage guide
│   └── requirements.txt       # Python dependencies
│
└── micropython/           # Example: MicroPython documentation
    ├── step1-download_pdf.sh          # Download source PDF
    ├── step2-convert_pdf_to_chapters.py   # Extract chapters using pdfplumber
    ├── step3-convert_chapters_to_md.sh    # Convert to Markdown using Docling
    └── chapters/                      # Generated chapter files
        ├── micropython-docs1-1.pdf    # Sub-chapters (e.g., section 1.1)
        ├── micropython-docs1-2.pdf
        ├── micropython-docs1-1.md     # Converted Markdown files
        └── micropython-docs1-2.md
```

**Result:**

- Subsection chapters extracted from the MicroPython documentation
- Each chapter available as both PDF and Markdown
- Structured by subsections (1.1, 1.2, 2.1, 2.2, etc.)
- Ready for RAG queries about MicroPython APIs, tutorials, and reference material

## RAG Server

The `server-core-llamaindex/` directory contains a Node.js/Express application that provides a unified API for document search and retrieval-augmented generation.

### Core Components

- **Vector Database (Qdrant)** - Stores document embeddings for semantic search
- **Search Engine (Elasticsearch)** - Provides traditional full-text and fuzzy search
- **LlamaIndex** - Orchestrates RAG pipeline with LLM integration
- **Ollama/OpenAI** - LLM providers for generating responses

### Main Endpoints

- `/search` - Traditional Elasticsearch keyword search
- `/search_fuzz` - Fuzzy search for typo-tolerant matching
- `/rag/search` - Vector similarity search using embeddings
- `/rag/response` - Generate LLM responses with RAG context
- `/update` - Reindex Elasticsearch knowledge base
- `/rag/update` - Rebuild Qdrant vector index
- `/koDir` - Get current knowledge directory name

### Starting the Server

```bash
# Install dependencies first
npm install

# Start the server
npm run start-server
```

Server runs on `http://localhost:4000`

## RAG Explorer UI

The `ui-rag-explorer/` directory contains a Gradio-based web interface for interacting with the RAG server.

### Features

**Three Main Tabs:**

1. **Elasticsearch Search** - Traditional keyword and fuzzy text search
2. **RAG Vector Search** - Semantic similarity search using embeddings
3. **RAG LLM Response** - Ask questions and get AI-generated answers with source attribution

**Capabilities:**

- Real-time API calls to the Node.js server
- Multiple LLM model support (local Ollama and cloud APIs)
- Source document attribution - Shows which documents were used to generate answers with relevance scores
- Knowledge base update triggers - Rebuild indexes when adding/modifying documents
- Configurable number of context sources - Adjust top-K parameter for retrieval depth

### Starting the UI

```bash
# Install dependencies first
cd ui-rag-explorer
pip install -r requirements.txt

# Start the UI
cd ..
npm run start-ui
```

UI runs on `http://localhost:7860`

## Models Supported

The RAG system supports multiple LLM models for generating responses. Models are selected via the `/rag/response` endpoint using the `llmModel` parameter.

### Local Models (via Ollama)

These models run locally using [Ollama](https://ollama.ai/). Ensure Ollama is running on `localhost:11434`.

| Model Name        | Size | API Parameter | Description                              | Use Case                              |
| ----------------- | ---- | ------------- | ---------------------------------------- | ------------------------------------- |
| **Llama 3.1**     | 8B   | `llama3.1`    | Meta's latest large language model       | General purpose, high quality         |
| **Llama 3.2**     | 3B   | `llama3.2`    | Newer version of Llama                   | Latest features, improved performance |
| **GPT-OSS 20B**   | 20B  | `gpt-oss:20b` | Open-source GPT variant (20B parameters) | Large context, complex reasoning      |
| **Gemma 3 (4B)**  | 4B   | `gemma3-4`    | Google's Gemma model (4B parameters)     | Fast, efficient for simple queries    |
| **Gemma 3 (12B)** | 12B  | `gemma3-12`   | Larger Gemma variant                     | Better quality, more compute          |
| **Qwen 3**        | 8B   | `qwen3`       | Alibaba's Qwen model                     | Multilingual support                  |

### Online Models (via OpenAI API)

These models require an OpenAI API key set in the `OPENAI_API_KEY` environment variable.

| Model Name      | API Parameter | Description            | Temperature  | Use Case                  |
| --------------- | ------------- | ---------------------- | ------------ | ------------------------- |
| **GPT-5**       | `gpt-5`       | Latest GPT-5 model     | 1.0 (fixed)  | Highest quality responses |
| **GPT-5 Mini**  | `gpt-5-mini`  | Smaller GPT-5 variant  | 1.0 (fixed)  | Fast, cost-effective      |
| **GPT-5 Nano**  | `gpt-5-nano`  | Smallest GPT-5 variant | 1.0 (fixed)  | Ultra-fast, minimal cost  |
| **GPT-4o Mini** | `gpt-4o-mini` | GPT-4 optimized mini   | Random [0,1] | Balanced performance      |
