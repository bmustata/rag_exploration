import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  elastic_searchExact,
  elastic_searchFuzzy,
  elastic_updateKnowledgeBase,
} from "./lib/elasticsearch.js";
import { readMarkdownFiles } from "./lib/fileUtils.js";
import {
  rag_insertDocs,
  rag_searchDocs,
  rag_generateResponse,
} from "./lib/rag.js";
import { API_ENDPOINTS, logEndpoints } from "./lib/apiConfig.js";

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get command line arguments
const args = process.argv.slice(2);
const knowledgeDirArg = args[0]; // First argument after script name

// Environment configuration
const env = {
  baseDir: __dirname,
  knowledgeDir: knowledgeDirArg
    ? path.join(__dirname, "..", "knowledge", knowledgeDirArg)
    : process.env.KNOWLEDGE_DIR ||
      path.join(__dirname, "..", "knowledge", "micropython"),
};

// Validate knowledge directory exists
if (!fs.existsSync(env.knowledgeDir)) {
  console.error(
    `❌ Error: Knowledge directory does not exist: ${env.knowledgeDir}`
  );
  console.error(`Usage: node response_server.js [directory_name]`);
  process.exit(1);
}

// LLM Models configuration
const LLM_MODELS = {
  VALID_MODELS: [
    "llama3.1",
    "llama3.2",
    "gpt-oss:20b",
    "gemma3-4",
    "gemma3-12",
    "gpt-5",
    "gpt-5-mini",
    "gpt-5-nano",
    "gpt-4o-mini",
    "qwen3",
  ],
  MODEL_MAPPING: {
    "llama3.1": "llama3.1",
    "llama3.2": "llama3.2",
    "gpt-oss:20b": "gpt-oss:20b",
    "gemma3-4": "gemma3:4b",
    "gemma3-12": "gemma3:12b",
    "gpt-5": "gpt-5",
    "gpt-5-mini": "gpt-5-mini",
    "gpt-5-nano": "gpt-5-nano",
    "gpt-4o-mini": "gpt-4o-mini",
    qwen3: "qwen3",
  },
};

// Initialize express app
const app = express();
const PORT = process.env.PORT || 4000;

// Set up EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(cors());
app.use(express.json());

// Root endpoint that lists all available endpoints and their parameters
app.get("/", (req, res) => {
  // Check if request wants JSON (API call) or HTML (browser)
  if (req.headers.accept && req.headers.accept.includes("application/json")) {
    res.json({ endpoints: API_ENDPOINTS });
  } else {
    // Render HTML page
    res.render("index", {
      endpoints: API_ENDPOINTS,
      serverUrl: `http://localhost:${PORT}`,
    });
  }
});

// Endpoint for knowledge directory information
app.get("/koDir", async (req, res) => {
  try {
    const knowledgeDir = env.knowledgeDir;

    // Extract just the directory name from the full path
    const dirName = path.basename(knowledgeDir);

    // Read markdown files to get the count
    const markdownFiles = await readMarkdownFiles(knowledgeDir);

    res.json({
      knowledgeDir: dirName,
      knowledgeDirFullName: knowledgeDir,
      markdownFilesCount: markdownFiles.length,
    });
  } catch (error) {
    console.error("Knowledge directory info error:", error);
    return res.status(500).json({
      error: "An error occurred while getting knowledge directory information",
    });
  }
});

// Endpoint for searching
app.get("/search", async (req, res) => {
  try {
    const { q } = req.query;

    // Search implementation using Elasticsearch
    const searchResults = await elastic_searchExact(q, env.knowledgeDir);

    res.json({
      query: q,
      total: searchResults.total,
      results: searchResults.results,
    });
  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({ error: "An error occurred during search" });
  }
});

// Endpoint for fuzzy searching (tolerant to typos)
app.get("/search_fuzz", async (req, res) => {
  try {
    const { q } = req.query;

    // Search implementation using Elasticsearch with fuzzy matching
    const searchResults = await elastic_searchFuzzy(q, env.knowledgeDir);

    res.json({
      query: q,
      total: searchResults.total,
      results: searchResults.results,
    });
  } catch (error) {
    console.error("Fuzzy search error:", error);
    return res
      .status(500)
      .json({ error: "An error occurred during fuzzy search" });
  }
});

// Endpoint for updating the knowledge base
app.post("/update", async (req, res) => {
  try {
    // Read all markdown files from the knowledge/cms directory
    const knowledgeDir = env.knowledgeDir;
    console.log(`Reading markdown files from: ${knowledgeDir}`);

    const markdownFiles = await readMarkdownFiles(knowledgeDir);
    console.log(`Found ${markdownFiles.length} markdown files`);

    // Update the knowledge base
    const result = await elastic_updateKnowledgeBase(
      markdownFiles,
      knowledgeDir
    );

    res.json(result);
  } catch (error) {
    console.error("Update error:", error);
    res
      .status(500)
      .json({ error: error.message || "An error occurred during update" });
  }
});

// Endpoint for updating the RAG knowledge base in Qdrant
app.post("/rag/update", async (req, res) => {
  try {
    // Read all markdown files from the knowledge/cms directory
    const knowledgeDir = env.knowledgeDir;
    console.log(`RAG Update: Reading markdown files from: ${knowledgeDir}`);

    // Insert documents into Qdrant using LlamaIndex
    const result = await rag_insertDocs(knowledgeDir);

    // Format HTTP response
    const httpResponse = {
      status: "success",
      message:
        result.documentsCount > 0
          ? `Successfully inserted ${result.documentsCount} documents into Qdrant collection "${result.collectionName}"`
          : "No documents found to process",
      documentsCount: result.documentsCount,
      collectionName: result.collectionName,
    };

    res.json(httpResponse);
  } catch (error) {
    console.error("RAG Update error:", error);
    res
      .status(500)
      .json({ error: error.message || "An error occurred during RAG update" });
  }
});

// Endpoint for RAG vector similarity search
app.get("/rag/search", async (req, res) => {
  try {
    const { q, topK } = req.query;
    const topKValue = topK ? parseInt(topK, 10) : 5;

    // Search implementation using RAG vector similarity
    const searchResults = await rag_searchDocs(env.knowledgeDir, q, topKValue);

    res.json({
      query: q,
      total: searchResults.total,
      results: searchResults.results,
      response: searchResults.response,
      collectionName: searchResults.collectionName,
    });
  } catch (error) {
    console.error("RAG search error:", error);
    return res
      .status(500)
      .json({ error: "An error occurred during RAG search" });
  }
});

// Endpoint for RAG LLM response generation
app.get("/rag/response", async (req, res) => {
  try {
    const { q, topK, llmModel } = req.query;
    const topKValue = topK ? parseInt(topK, 10) : 5;

    console.log("RAG Response Request:", { q, topKValue, llmModel });

    // Validate llmModel parameter
    const selectedModel =
      llmModel && LLM_MODELS.VALID_MODELS.includes(llmModel)
        ? llmModel
        : undefined;

    const actualModel = selectedModel
      ? LLM_MODELS.MODEL_MAPPING[selectedModel]
      : undefined;

    console.log("Selected LLM Model:", selectedModel, "->", actualModel);

    if (!q) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    // Generate LLM response using RAG context
    const result = await rag_generateResponse(
      env.knowledgeDir,
      q,
      topKValue,
      actualModel
    );

    res.json({
      query: q,
      llmModel: selectedModel || "default",
      response: result.response,
      sources: result.sources,
      sourcesCount: result.sourcesCount,
      collectionName: result.collectionName,
    });
  } catch (error) {
    console.error("RAG response generation error:", error);
    return res
      .status(500)
      .json({ error: "An error occurred during RAG response generation" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log("================================");
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("================================\n");
  console.log(`- API Documentation: http://localhost:${PORT}/`);
  console.log(`- Knowledge Directory: ${env.knowledgeDir}`);
  console.log(`- Supported LLM Models: ${LLM_MODELS.VALID_MODELS.join(", ")}`);
  console.log("================================\n");

  // Log all available endpoints dynamically
  logEndpoints(PORT);
});
