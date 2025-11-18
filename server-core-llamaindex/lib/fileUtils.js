import { promises as fsPromises } from "fs";
import path from "path";
import { randomUUID } from "crypto";

/**
 * Reads markdown files from a directory recursively
 *
 * Filtering rules:
 * - Skips virtual environment directories (venv, .venv)
 * - Skips README.md files
 * - Only processes files with .md extension
 * @param {string} directory - The directory to read from
 * @returns {Promise<Array>} - Array of markdown file objects with id, type, path, filename, content, and title
 */
async function readMarkdownFiles(directory) {
  const files = await fsPromises.readdir(directory);
  const markdownFiles = [];

  for (const file of files) {
    const filePath = path.join(directory, file);
    const stats = await fsPromises.stat(filePath);

    if (stats.isDirectory()) {
      // Skip virtual environment directories
      if (file === "venv" || file === ".venv") {
        continue;
      }

      // Recursively read files from subdirectories
      const subDirFiles = await readMarkdownFiles(filePath);
      markdownFiles.push(...subDirFiles);
    } else if (file.endsWith(".md")) {
      // Skip README files
      if (file.toLowerCase() === "readme.md") {
        continue;
      }

      const content = await fsPromises.readFile(filePath, "utf8");

      // Extract filename without extension for processing
      const baseFilename = path.basename(file, ".md");

      // Handle different filename patterns
      let type, id;

      if (baseFilename.includes("-")) {
        const parts = baseFilename.split("-");
        type = parts[0]; // First part is always the type

        // Check if we have a UUID pattern (5 parts total: type-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
        if (parts.length === 5) {
          const potentialUUID = parts.slice(1).join("-");
          // Check UUID length (should be 36 characters: 8-4-4-4-12 + 4 dashes)

          if (potentialUUID.length === 36) {
            // Pattern: "FAQ-0a92ac1d-5b76-4a55-8dbb-fefe24019137"
            id = potentialUUID; // Use the UUID
          } else {
            // Not correct length, generate random
            id = randomUUID();
          }
        } else {
          // Other patterns: generate random UUID
          id = randomUUID();
        }
      } else {
        // No dash in filename - generate random ID
        type = baseFilename;
        id = randomUUID();
      }

      markdownFiles.push({
        id: id, // Unique identifier (UUID format)
        type: type, // Document type extracted from filename
        path: filePath, // Absolute path to the markdown file
        filename: file, // Filename with extension
        content: content, // Full markdown content
        title: content.split("\n")[0]?.replace(/^#\s+/, "") || file, // Extracted from first heading or filename
      });
    }
  }

  return markdownFiles;
}

export { readMarkdownFiles };
