# PDF to Markdown Conversion Tools

This document covers four popular tools for converting PDFs and other documents to Markdown format.

## Quick Comparison

| Tool           | Company   | Best For                                             | LLM Support       | Output Quality                                  |
| -------------- | --------- | ---------------------------------------------------- | ----------------- | ----------------------------------------------- |
| **Marker**     | Datalab   | Complex PDFs with tables, equations, forms           | Yes (Gemini)      | Highest accuracy, preserves formatting          |
| **Docling**    | IBM       | Enterprise PDFs, advanced layout understanding       | Yes (VLM/Granite) | Advanced structure analysis, batch processing   |
| **MarkItDown** | Microsoft | Multi-format conversion (PDF, Office, images, audio) | Yes (OpenAI)      | Good for general use, simple API                |
| **PDFPlumber** | Community | Text extraction, table parsing, metadata             | No                | Precise text positioning, command-line friendly |

**Recommendations:**

- Use **Marker** for technical documents with complex layouts, equations, and tables
- Use **Docling** for enterprise document processing, batch workflows, and advanced structure analysis
- Use **MarkItDown** for quick conversions of various file types with optional LLM enhancement
- Use **PDFPlumber** for simple text extraction or when you need precise text positioning

---

## Marker (November 2025)

**marker-pdf**: Converts PDF, image, PPTX, DOCX, XLSX, HTML, and EPUB files to markdown, JSON, chunks, and HTML quickly and accurately (https://github.com/datalab-to/marker)

**Key Features:**

- Formats tables, forms, equations, inline math, links, references, and code blocks
- Extracts and saves images
- Removes headers/footers/artifacts
- Supports all languages
- Works on GPU, CPU, or MPS
- Optional LLM mode for higher accuracy

#### Installation

```bash
python3 -m pip install marker-pdf
pip install pdfplumber
```

#### Usage

Basic usage:

```bash
marker_single /path/to/file.pdf /path/to/output/folder --batch_multiplier 2 --max_pages 10
```

Use Gemini for better accuracy with tables, equations, and complex layouts:

```bash
export GOOGLE_API_KEY=your_api_key
marker_single /path/to/file.pdf /path/to/output/folder --use_llm
```

## PDFPlumber (November 2025)

**pdfplumber**: A Python library for extracting text, tables, and metadata from PDFs with high precision (https://github.com/jsvine/pdfplumber)

**Key Features:**

- Extract text with precise positioning information
- Parse tables with customizable settings
- Extract images and visual elements
- Access detailed page metrics and layout
- Handle complex PDF structures
- Works with encrypted PDFs

#### Installation

```bash
pip install pdfplumber
```

#### Command Line Usage

Extract all text from a PDF:

```bash
pdfplumber background-checks.pdf > background-checks.csv
```

## MarkItDown (November 2025)

**markitdown**: A Python library and CLI tool from Microsoft to convert various file formats to Markdown (https://github.com/microsoft/markitdown)

**Key Features:**

- Converts PDF, PowerPoint, Word, Excel, images, audio, HTML, and more to Markdown
- Supports vision-capable LLMs for image and PDF processing
- Extracts text from images using OCR
- Transcribes audio files (EXIF metadata and speech)
- Processes ZIP files and lists contents
- Simple CLI and Python API

#### Installation

```bash
pip install 'markitdown[all]'
```

#### Command Line Usage

Convert a file to Markdown:

```bash
markitdown path/to/file.pdf
markitdown path/to/file.pptx
markitdown path/to/file.docx
```

Save output to file:

```bash
markitdown document.pdf -o output.md
```

Process with LLM (for better image/PDF handling):

````bash
```bash
markitdown document.pdf --llm-model gpt-4o --llm-api-key YOUR_API_KEY
````

## Docling (November 2025)

**docling**: Advanced document parsing library from IBM for converting PDFs and other formats to Markdown with AI-powered extraction (https://github.com/docling-project/docling)

**Key Features:**

- Advanced PDF parsing with layout understanding
- Table extraction and formatting
- OCR support for scanned documents
- Equation and formula extraction
- Document structure analysis
- Batch processing capabilities

#### Installation

```bash
pip install docling
```

#### Command Line Usage

Convert a PDF to Markdown:

```bash
docling https://arxiv.org/pdf/2206.01062
```

Convert a local file:

```bash
docling path/to/document.pdf
```

Use VLM (Vision Language Model) for better accuracy:

```bash
docling --pipeline vlm --vlm-model granite_docling document.pdf
```

For all options:

```bash
docling --help
```

```

```
