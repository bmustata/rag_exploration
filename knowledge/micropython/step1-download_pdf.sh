#!/bin/bash
# Download MicroPython documentation PDF

PDF_NAME="micropython-docs.pdf"
PDF_URL="http://docs.micropython.org/en/latest/$PDF_NAME"

echo "Downloading the latest MicroPython documentation..."
curl -o "$PDF_NAME" "$PDF_URL"
echo "Downloaded $PDF_NAME to current directory"
