import { Client } from "@elastic/elasticsearch";
import path from "path";

// Initialize Elasticsearch client
const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
});

/**
 * Generates index name based on knowledge directory
 * @param {string} knowledgeDir - The knowledge directory path
 * @returns {string} - The index name
 */
function getIndexName(knowledgeDir) {
  // console.log("+ getIndexName", { knowledgeDir });
  const dirName = path.basename(knowledgeDir);
  return `${dirName}_content`;
}

/**
 * Creates an Elasticsearch index with appropriate mappings
 * @param {string} knowledgeDir - The knowledge directory path
 * @returns {Promise<boolean>} - Returns true if successful, false otherwise
 */
async function elastic_createIndex(knowledgeDir) {
  console.log("+ elastic_createIndex", { knowledgeDir });
  try {
    const INDEX_NAME = getIndexName(knowledgeDir);

    // Check if index exists
    const indexExists = await esClient.indices.exists({ index: INDEX_NAME });

    // If it exists, delete it
    if (indexExists) {
      await esClient.indices.delete({ index: INDEX_NAME });
      console.log(`Deleted existing index: ${INDEX_NAME}`);
    }

    // Create a new index
    await esClient.indices.create({
      index: INDEX_NAME,
      body: {
        mappings: {
          properties: {
            title: { type: "text" },
            content: { type: "text" },
            path: { type: "keyword" },
            filename: { type: "keyword" },
            id: { type: "keyword" },
            type: { type: "keyword" },
          },
        },
      },
    });

    console.log(`Created new index: ${INDEX_NAME}`);
    return true;
  } catch (error) {
    console.error("Error creating index:", error);
    return false;
  }
}

/**
 * Performs a search with exact matching
 * @param {string} query - The search query
 * @param {string} knowledgeDir - The knowledge directory path
 * @returns {Promise<Object>} - The search results
 */
async function elastic_searchExact(query, knowledgeDir) {
  console.log("+ elastic_searchExact", { query, knowledgeDir });
  try {
    const INDEX_NAME = getIndexName(knowledgeDir);

    const searchResults = await esClient.search({
      index: INDEX_NAME,
      body: {
        query: query
          ? {
              multi_match: {
                query: query,
                fields: ["title^2", "content", "type"],
              },
            }
          : {
              match_all: {}, // Return all documents if no query is provided
            },
        size: 1000, // Return up to 1000 documents
      },
    });

    return {
      total: searchResults.hits.total.value,
      results: searchResults.hits.hits.map((hit) => ({
        id: hit._id,
        score: hit._score,
        document: hit._source,
      })),
    };
  } catch (error) {
    console.error("Search error:", error);
    throw new Error("An error occurred during search");
  }
}

/**
 * Performs a fuzzy search (tolerant to typos)
 * @param {string} query - The search query
 * @param {string} knowledgeDir - The knowledge directory path
 * @returns {Promise<Object>} - The search results
 */
async function elastic_searchFuzzy(query, knowledgeDir) {
  console.log("+ elastic_searchFuzzy", { query, knowledgeDir });
  try {
    const INDEX_NAME = getIndexName(knowledgeDir);

    const searchResults = await esClient.search({
      index: INDEX_NAME,
      body: {
        query: query
          ? {
              multi_match: {
                query: query,
                fields: ["title^2", "content", "type"],
                fuzziness: "AUTO",
              },
            }
          : {
              match_all: {}, // Return all documents if no query is provided
            },
        size: 1000, // Return up to 1000 documents
      },
    });

    return {
      total: searchResults.hits.total.value,
      results: searchResults.hits.hits.map((hit) => ({
        id: hit._id,
        score: hit._score,
        document: hit._source,
      })),
    };
  } catch (error) {
    console.error("Fuzzy search error:", error);
    throw new Error("An error occurred during fuzzy search");
  }
}

/**
 * Indexes documents in bulk to Elasticsearch
 * @param {Array} documents - Array of documents to index
 * @param {string} knowledgeDir - The knowledge directory path
 * @returns {Promise<Object>} - The bulk indexing response
 */
async function elastic_bulkIndex(documents, knowledgeDir) {
  console.log("+ elastic_bulkIndex", {
    documentsCount: documents.length,
    knowledgeDir,
  });
  try {
    const INDEX_NAME = getIndexName(knowledgeDir);

    // Prepare bulk operations for Elasticsearch
    const operations = [];

    for (const doc of documents) {
      operations.push({ index: { _index: INDEX_NAME, _id: doc.id } }, doc);
    }

    // Index all documents in a single bulk operation
    const bulkResponse = await esClient.bulk({
      refresh: true,
      operations,
    });

    // Check if there were any errors
    if (bulkResponse.errors) {
      const errorDetails = bulkResponse.items
        .filter((item) => item.index && item.index.error)
        .map((item) => item.index.error);

      console.error("Bulk indexing errors:", errorDetails);
      throw new Error("Some documents failed to index");
    }

    return {
      success: true,
      indexed: documents.length,
    };
  } catch (error) {
    console.error("Bulk indexing error:", error);
    throw error;
  }
}

/**
 * Updates the knowledge base by recreating the index and indexing documents
 * @param {Array} documents - Array of documents to index
 * @param {string} knowledgeDir - The knowledge directory path
 * @returns {Promise<Object>} - The update result
 */
async function elastic_updateKnowledgeBase(documents, knowledgeDir) {
  console.log("+ elastic_updateKnowledgeBase", {
    documentsCount: documents.length,
    knowledgeDir,
  });
  try {
    // First, recreate the index to clear existing data
    const indexCreated = await elastic_createIndex(knowledgeDir);
    if (!indexCreated) {
      throw new Error("Failed to create Elasticsearch index");
    }

    if (documents.length === 0) {
      return {
        status: "success",
        message: "No documents found to index",
      };
    }

    // Index all documents
    const result = await elastic_bulkIndex(documents, knowledgeDir);

    return {
      status: "success",
      message: `${result.indexed} documents indexed successfully`,
    };
  } catch (error) {
    console.error("Update knowledge base error:", error);
    throw error;
  }
}

export {
  elastic_createIndex,
  elastic_searchExact,
  elastic_searchFuzzy,
  elastic_bulkIndex,
  elastic_updateKnowledgeBase,
  getIndexName,
};
