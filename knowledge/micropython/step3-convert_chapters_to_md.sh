#!/bin/bash
# Convert extracted PDF chapters to Markdown using Docling

CHAPTERS_DIR="chapters"
CONVERT_SCRIPT="../_convert/convert_dir_to_md.py"

echo "Converting PDF chapters to Markdown..."
echo ""

python3 "$CONVERT_SCRIPT" "$CHAPTERS_DIR" "$@"

echo ""
echo "✅ Done! Markdown files saved in $CHAPTERS_DIR/"
