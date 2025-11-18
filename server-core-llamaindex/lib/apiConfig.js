/**
 * API endpoints configuration for the search server
 * Contains endpoint definitions with paths, methods, descriptions, and parameters
 */
const API_ENDPOINTS = [
  {
    path: "/",
    method: "GET",
    description:
      "Lists all available API endpoints with detailed documentation",
    parameters: [],
  },
  {
    path: "/koDir",
    method: "GET",
    description:
      "Returns the current knowledge directory path and count of markdown files",
    parameters: [],
  },
  {
    path: "/rag/response",
    method: "GET",
    description:
      "Generates an LLM response using RAG context from the vector knowledge base",
    parameters: [
      {
        name: "q",
        type: "string",
        description: "Query for which to generate an LLM response",
        required: true,
      },
      {
        name: "topK",
        type: "number",
        description: "Number of context documents to use (default: 5)",
        required: false,
      },
      {
        name: "llmModel",
        type: "string",
        description:
          "LLM model to use: llama3.1, llama3.2, gpt-oss (maps to gpt-oss:20b), gemma3 (maps to gemma3:12b) (default: llama3.2)",
        required: false,
      },
    ],
  },
  {
    path: "/rag/search",
    method: "GET",
    description:
      "Searches the RAG knowledge base using vector similarity matching",
    parameters: [
      {
        name: "q",
        type: "string",
        description: "Search query for vector similarity search",
        required: true,
      },
      {
        name: "topK",
        type: "number",
        description: "Number of top results to return (default: 5)",
        required: false,
      },
    ],
  },
  {
    path: "/rag/update",
    method: "POST",
    description:
      "Updates the RAG knowledge base by inserting all markdown files into Qdrant vector store",
    parameters: [],
  },
  {
    path: "/search",
    method: "GET",
    description: "Searches the knowledge base using exact matching",
    parameters: [
      {
        name: "q",
        type: "string",
        description: "Search query (optional, returns all documents if empty)",
        required: false,
      },
    ],
  },
  {
    path: "/search_fuzz",
    method: "GET",
    description:
      "Searches the knowledge base with fuzzy matching (tolerant to typos)",
    parameters: [
      {
        name: "q",
        type: "string",
        description:
          "Search query (fuzzy matching applied, optional, returns all documents if empty)",
        required: false,
      },
    ],
  },
  {
    path: "/update",
    method: "POST",
    description:
      "Updates the Elasticsearch knowledge base by indexing all markdown files",
    parameters: [],
  },
];

/**
 * Helper function to log all available endpoints
 * @param {number} port - The server port
 */
function logEndpoints(port) {
  API_ENDPOINTS.forEach((endpoint) => {
    if (endpoint.path !== "/") {
      const exampleUrl = `http://localhost:${port}${endpoint.path}`;
      const hasQueryParams =
        endpoint.parameters && endpoint.parameters.length > 0;
      const fullUrl = hasQueryParams
        ? `${exampleUrl}?${endpoint.parameters[0].name}=example`
        : exampleUrl;

      console.log(`- ${endpoint.description}: ${fullUrl}`);
    }
  });
}

export { API_ENDPOINTS, logEndpoints };
