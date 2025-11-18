import { QdrantClient } from "@qdrant/js-client-rest";
import {
  Document,
  VectorStoreIndex,
  Settings,
  storageContextFromDefaults,
} from "llamaindex";
import { QdrantVectorStore } from "@llamaindex/qdrant";
import { OllamaEmbedding, Ollama } from "@llamaindex/ollama";
import { OpenAI } from "@llamaindex/openai";
import { readMarkdownFiles } from "./fileUtils.js";
import path from "path";

// Global configuration
const DEFAULT_EMBEDDING_MODEL = "embeddinggemma"; // old: "nomic-embed-text";
const DEFAULT_LLM_MODEL = "llama3.2";
const DEFAULT_CHUNK_SIZE = 512; // Default chunk size for text splitting (characters)
const DEFAULT_CHUNK_OVERLAP = 20; // Default overlap between chunks (characters)

/**
 * Generates collection name based on knowledge directory
 * @param {string} knowledgeDir - The knowledge directory path
 * @returns {string} - The collection name
 */
function getCollectionName(knowledgeDir) {
  const dirName = path.basename(knowledgeDir);
  return `${dirName}_documents`;
}

/**
 * Creates an LLM instance based on the model name
 * @param {string} llmModel - The LLM model to use
 * @returns {Object} - LLM instance (Ollama or OpenAI)
 */
function createLLMInstance(llmModel) {
  // Check if it's an OpenAI model
  if (
    llmModel === "gpt-5-mini" ||
    llmModel === "gpt-5" ||
    llmModel === "gpt-5-nano" ||
    llmModel === "gpt-4o-mini"
  ) {
    const openaiKey = process.env.OPENAI_KEY;

    // Validate OpenAI API key
    if (!openaiKey) {
      console.error("- OPENAI_KEY not set");
      throw new Error("OPENAI_KEY not set");
    }

    if (openaiKey.length < 20) {
      console.error("- Invalid OPENAI_KEY");
      throw new Error("Invalid OPENAI_KEY");
    }

    console.log("- OpenAI API key validated");

    return new OpenAI({
      model: llmModel, // Use the actual model name (gpt-5-mini, gpt-5, gpt-5-nano, or gpt-4o-mini)
      apiKey: openaiKey,
      temperature: llmModel.startsWith("gpt-5") ? 1.0 : Math.random(), // Set temperature: 1 for gpt-5* models, else random [0, 1]
    });
  }

  // Default to Ollama for other models
  console.log(`- Using Ollama model: ${llmModel}`);
  return new Ollama({
    model: llmModel,
    config: {
      host: "http://localhost:11434",
    },
  });
}

/**
 * Inserts all markdown documents into Qdrant collection using LlamaIndex
 * @param {string} knowledgeDir - Directory containing markdown files
 * @returns {Promise<Object>} - Result object with client, vectorStore, index, and metadata
 */
async function rag_insertDocs(knowledgeDir) {
  console.log("\n+ rag_insertDocs", { knowledgeDir });
  try {
    // Generate dynamic collection name based on knowledge directory
    const COLLECTION_NAME = getCollectionName(knowledgeDir);
    console.log(`Using dynamic collection name: ${COLLECTION_NAME}`);

    // Read markdown files from the knowledge directory
    console.log(`Reading markdown files from: ${knowledgeDir}`);

    const markdownFiles = await readMarkdownFiles(knowledgeDir);
    console.log(`Found ${markdownFiles.length} markdown files`);

    if (markdownFiles.length > 0) {
      // Convert markdown files to LlamaIndex documents, filtering out empty files
      const documents = markdownFiles
        .filter((file) => {
          // Skip files with no content or only whitespace
          if (!file.content || file.content.trim().length === 0) {
            console.log(`⚠️  Skipping empty file: ${file.filename}`);
            return false;
          }
          return true;
        })
        .map((file) => {
          return new Document({
            text: file.content,
            metadata: {
              id: file.id,
              title: file.title,
              type: file.type,
              filename: file.filename,
              path: file.path,
            },
          });
        });

      console.log(
        `Created ${documents.length} LlamaIndex documents (filtered ${
          markdownFiles.length - documents.length
        } empty files)`
      );

      // Initialize Ollama embedding model
      const embedModel = new OllamaEmbedding({
        model: DEFAULT_EMBEDDING_MODEL,
        config: {
          host: "http://localhost:11434",
        },
      });

      // Initialize Ollama LLM
      const llm = new Ollama({
        model: DEFAULT_LLM_MODEL,
        config: {
          host: "http://localhost:11434",
        },
      });

      // Set global models for LlamaIndex
      Settings.embedModel = embedModel;
      Settings.llm = llm;
      Settings.chunkSize = DEFAULT_CHUNK_SIZE;
      Settings.chunkOverlap = DEFAULT_CHUNK_OVERLAP;
      console.log(`Set global embedding model: ${DEFAULT_EMBEDDING_MODEL}`);
      console.log(`Set global LLM: ${DEFAULT_LLM_MODEL}`);
      console.log(
        `Set chunk size: ${DEFAULT_CHUNK_SIZE}, overlap: ${DEFAULT_CHUNK_OVERLAP}`
      );

      // Initialize Qdrant client
      const qdrantClient = new QdrantClient({
        host: "localhost",
        port: 6333,
      });

      console.log("Connected to Qdrant client on localhost:6333");

      // Delete existing collection to start fresh
      try {
        await qdrantClient.deleteCollection(COLLECTION_NAME);
        console.log(`Deleted existing collection "${COLLECTION_NAME}"`);
      } catch (deleteError) {
        console.log(
          `Collection "${COLLECTION_NAME}" doesn't exist or couldn't be deleted:`,
          deleteError.message
        );
      }

      // Create Qdrant vector store
      let vectorStore = new QdrantVectorStore({
        client: qdrantClient,
        collectionName: COLLECTION_NAME,
      });

      console.log(
        `Initialized Qdrant vector store with collection: ${COLLECTION_NAME}`
      );

      // Check collections before creating index
      const collectionsBefore = await qdrantClient.getCollections();
      console.log(
        "Collections before index creation:",
        collectionsBefore.collections?.map((c) => c.name) || []
      );

      // Create vector store index with documents - let LlamaIndex handle everything
      console.log("Creating vector store index and inserting documents...");

      // console.log("First document preview:", documents[0]);

      // Create proper storage context
      const storageContext = await storageContextFromDefaults({
        vectorStore,
      });

      let index = await VectorStoreIndex.fromDocuments(documents, {
        storageContext,
        logProgress: true,
      });

      console.log(
        `Successfully created index with ${documents.length} documents for Qdrant collection "${COLLECTION_NAME}"`
      );

      // Wait a moment for the indexing to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Get collection info to verify points were inserted
      try {
        const collectionInfo = await qdrantClient.getCollection(
          COLLECTION_NAME
        );
        console.log(
          `Collection "${COLLECTION_NAME}" final info:`,
          collectionInfo
        );

        if (collectionInfo.points_count === 0) {
          console.warn(
            "WARNING: Collection was created but no points were inserted!"
          );
        }
      } catch (error) {
        console.error(
          `Error getting collection "${COLLECTION_NAME}" info:`,
          error.message
        );
      }

      // Final verification - list all collections
      const finalCollections = await qdrantClient.getCollections();
      console.log(
        "Final available collections:",
        finalCollections.collections?.map((c) => c.name) || []
      );

      return {
        qdrantClient,
        vectorStore,
        index,
        documentsCount: documents.length,
        collectionName: COLLECTION_NAME,
      };
    } else {
      console.log("No documents found to process");
      return {
        qdrantClient,
        vectorStore: null,
        index: null,
        documentsCount: 0,
        collectionName: null,
      };
    }
  } catch (error) {
    console.error("Error in rag_insertDocs:", error);
    throw error;
  }
}

/**
 * Searches the RAG knowledge base using vector similarity
 * @param {string} knowledgeDir - Knowledge directory path for dynamic collection naming
 * @param {string} query - Search query text
 * @param {number} topK - Number of top results to return (default: 5)
 * @returns {Promise<Object>} - Search results with scores and metadata
 */
async function rag_searchDocs(knowledgeDir, query, topK = 5) {
  console.log("\n+ rag_searchDocs", { knowledgeDir, query, topK });
  try {
    // Generate dynamic collection name based on knowledge directory
    const COLLECTION_NAME = getCollectionName(knowledgeDir);
    console.log(`Using dynamic collection name: ${COLLECTION_NAME}`);

    // Initialize Ollama embedding model
    const embedModel = new OllamaEmbedding({
      model: DEFAULT_EMBEDDING_MODEL,
      config: {
        host: "http://localhost:11434",
      },
    });

    // Log the models being used for search
    console.log(`Using embedding model: ${DEFAULT_EMBEDDING_MODEL}`);

    // Use Settings.withEmbedModel for thread-safe, per-request context isolation
    return await Settings.withEmbedModel(embedModel, async () => {
      // Initialize Qdrant client
      const qdrantClient = new QdrantClient({
        host: "localhost",
        port: 6333,
      });

      console.log("Connected to Qdrant client for search");

      // Check if collection exists
      try {
        const collections = await qdrantClient.getCollections();
        console.log(
          "Available collections for search:",
          collections.collections?.map((c) => c.name) || []
        );

        const collectionExists = collections.collections?.some(
          (c) => c.name === COLLECTION_NAME
        );
        if (!collectionExists) {
          throw new Error(
            `Collection "${COLLECTION_NAME}" does not exist. Please run /rag/update first.`
          );
        }

        const collectionInfo = await qdrantClient.getCollection(
          COLLECTION_NAME
        );
        console.log(
          `Collection "${COLLECTION_NAME}" has ${collectionInfo.points_count} points`
        );
      } catch (error) {
        console.error("Error checking collection:", error.message);
        throw error;
      }

      // Create Qdrant vector store
      const vectorStore = new QdrantVectorStore({
        client: qdrantClient,
        collectionName: COLLECTION_NAME,
      });

      // Create index from existing vector store
      const index = await VectorStoreIndex.fromVectorStore(vectorStore);

      console.log(`Searching for: "${query}" with topK=${topK}`);

      // Use retriever - embedModel is now available via Settings context
      const retriever = index.asRetriever({
        similarityTopK: topK,
      });

      // Perform the search - this only does vector similarity, no LLM synthesis
      const nodes = await retriever.retrieve(query);

      // Get the source nodes with metadata and scores
      const results = nodes.map((nodeWithScore, index) => ({
        id: nodeWithScore.node?.metadata?.id || `result_${index}`,
        title: nodeWithScore.node?.metadata?.title || "Untitled",
        filename: nodeWithScore.node?.metadata?.filename || "Unknown file",
        path: nodeWithScore.node?.metadata?.path || "",
        type: nodeWithScore.node?.metadata?.type || "unknown",
        content: nodeWithScore.node?.text || "",
        score: nodeWithScore.score || 0,
        rank: index + 1,
      }));

      console.log(`Found ${results.length} results for query: "${query}"`);

      return {
        query,
        total: results.length,
        results,
        response: `Found ${results.length} relevant documents for "${query}"`,
        collectionName: COLLECTION_NAME,
      };
    });
  } catch (error) {
    console.error("Error in rag_searchDocs:", error);
    throw error;
  }
}

/**
 * Generates an LLM response using RAG context
 * @param {string} knowledgeDir - Knowledge directory path for dynamic collection naming
 * @param {string} query - User query
 * @param {number} topK - Number of context documents to use (default: 5)
 * @param {string} llmModel - LLM model to use (default: DEFAULT_LLM_MODEL)
 * @returns {Promise<Object>} - LLM response with context and sources
 */
async function rag_generateResponse(
  knowledgeDir,
  query,
  topK = 5,
  llmModel = DEFAULT_LLM_MODEL
) {
  console.log("\n+ rag_generateResponse", {
    knowledgeDir,
    query,
    topK,
    llmModel,
  });
  try {
    // Generate dynamic collection name based on knowledge directory
    const COLLECTION_NAME = getCollectionName(knowledgeDir);
    console.log(`Using dynamic collection name: ${COLLECTION_NAME}`);

    // Initialize Ollama embedding model
    const embedModel = new OllamaEmbedding({
      model: DEFAULT_EMBEDDING_MODEL,
      config: {
        host: "http://localhost:11434",
      },
    });

    // Initialize LLM based on model type (Ollama or OpenAI)
    const llm = createLLMInstance(llmModel);

    // Log the models being used for response generation
    console.log(`Using embedding model: ${DEFAULT_EMBEDDING_MODEL}`);
    console.log(`Using LLM model: ${llmModel}`);

    // Use Settings.withEmbedModel and Settings.withLLM for thread-safe, per-request context isolation
    return await Settings.withEmbedModel(embedModel, async () => {
      return await Settings.withLLM(llm, async () => {
        // Initialize Qdrant client
        const qdrantClient = new QdrantClient({
          host: "localhost",
          port: 6333,
        });

        console.log("Connected to Qdrant client for response generation");

        // Check if collection exists
        try {
          const collections = await qdrantClient.getCollections();
          const collectionExists = collections.collections?.some(
            (c) => c.name === COLLECTION_NAME
          );
          if (!collectionExists) {
            throw new Error(
              `Collection "${COLLECTION_NAME}" does not exist. Please run /rag/update first.`
            );
          }

          const collectionInfo = await qdrantClient.getCollection(
            COLLECTION_NAME
          );
          console.log(
            `Collection "${COLLECTION_NAME}" has ${collectionInfo.points_count} points`
          );
        } catch (error) {
          console.error("Error checking collection:", error.message);
          throw error;
        }

        // Create Qdrant vector store
        const vectorStore = new QdrantVectorStore({
          client: qdrantClient,
          collectionName: COLLECTION_NAME,
        });

        // Create index from existing vector store
        const index = await VectorStoreIndex.fromVectorStore(vectorStore);

        console.log(`Generating response for: "${query}" with topK=${topK}`);

        // Create query engine for LLM-powered response generation
        const queryEngine = index.asQueryEngine({
          similarityTopK: topK,
        });

        // Generate response using LLM with RAG context
        const start = Date.now();
        const response = await queryEngine.query({ query });
        console.log(
          `⏱️ queryEngine.query took ${((Date.now() - start) / 1000).toFixed(
            2
          )}s`
        );

        // console.log("response.sourceNodes", response.sourceNodes);

        // Extract source information for transparency
        const sources =
          response.sourceNodes?.map((sourceNode, index) => ({
            id: sourceNode.node?.metadata?.id || `source_${index}`,
            title: sourceNode.node?.metadata?.title || "Untitled",
            filename: sourceNode.node?.metadata?.filename || "Unknown file",
            path: sourceNode.node?.metadata?.path || "",
            type: sourceNode.node?.metadata?.type || "unknown",
            score: sourceNode.score || 0,
            rank: index + 1,
          })) || [];

        // Display first 10 lines of response for debugging
        const responseLines = (response.response || "").split("\n");
        const preview = responseLines.slice(0, 10).join("\n");

        console.log(
          `Generated response with ${sources.length} sources for query: "${query}"`
        );
        console.log("Response preview:");
        console.log("====================");
        console.log(preview);
        if (responseLines.length > 10) {
          console.log("...");
        }
        console.log("====================");

        return {
          query,
          response: response.response || "",
          sources,
          sourcesCount: sources.length,
          collectionName: COLLECTION_NAME,
        };
      });
    });
  } catch (error) {
    console.error("Error in rag_generateResponse:", error);
    throw error;
  }
}

export { rag_insertDocs, rag_searchDocs, rag_generateResponse };
