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
