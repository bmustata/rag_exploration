#!/usr/bin/env python3
"""
Convert PDF files to Markdown using Docling
"""
import os
import sys
import time
import argparse
from pathlib import Path
from docling.document_converter import DocumentConverter

try:
    from markitdown import MarkItDown
    MARKITDOWN_AVAILABLE = True
except ImportError:
    MARKITDOWN_AVAILABLE = False

def convert_chapters(input_dir, max_files=None):
    """
    Convert PDF files in input directory to Markdown
    
    Args:
        input_dir: Directory containing PDF files
        max_files: Maximum number of files to convert (None for all)
    """
    input_path = Path(input_dir)
    
    # Find all PDF files
    pdf_files = sorted(input_path.glob("*.pdf"))
    
    if not pdf_files:
        print(f"No PDF files found in {input_dir}")
        return
    
    # Limit number of files if specified
    if max_files is not None:
        pdf_files = pdf_files[:max_files]
        print(f"Found {len(pdf_files)} PDF files to convert (limited to {max_files})")
    else:
        print(f"Found {len(pdf_files)} PDF files to convert")
    
    # Initialize converters
    converter = DocumentConverter()
    markitdown = MarkItDown() if MARKITDOWN_AVAILABLE else None
    
    # Statistics
    converted = 0
    failed = 0
    fallback_used = 0
    start_time = time.time()
    
    for pdf_file in pdf_files:
        print(f"\nConverting: {pdf_file.name}")
        file_start = time.time()
        
        success = False
        
        # Try Docling first
        try:
            # Convert the PDF
            result = converter.convert(str(pdf_file))
            doc = result.document
            
            # Export to Markdown
            markdown_content = doc.export_to_markdown()
            
            # Create output filename in same directory (replace .pdf with .md)
            output_file = pdf_file.with_suffix('.md')
            
            # Save the Markdown file
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(markdown_content)
            
            file_time = time.time() - file_start
            print(f"  ✓ Saved to: {output_file} ({file_time:.2f}s)")
            converted += 1
            success = True
            
        except Exception as e:
            print(f"  ✗ Docling failed: {e}")
            
            # Try MarkItDown as fallback
            if markitdown is not None:
                try:
                    print(f"  → Trying MarkItDown fallback...")
                    result = markitdown.convert(str(pdf_file))
                    markdown_content = result.text_content
                    
                    # Create output filename
                    output_file = pdf_file.with_suffix('.md')
                    
                    # Save the Markdown file
                    with open(output_file, 'w', encoding='utf-8') as f:
                        f.write(markdown_content)
                    
                    file_time = time.time() - file_start
                    print(f"  ✓ Saved to: {output_file} ({file_time:.2f}s) [MarkItDown]")
                    converted += 1
                    fallback_used += 1
                    success = True
                    
                except Exception as fallback_error:
                    print(f"  ✗ MarkItDown also failed: {fallback_error}")
            else:
                print(f"  ℹ MarkItDown not available for fallback")
        
        if not success:
            failed += 1
    
    total_time = time.time() - start_time
    avg_time = total_time / len(pdf_files) if pdf_files else 0
    
    print(f"\n{'='*50}")
    print(f"✓ Conversion complete!")
    print(f"  Converted: {converted}/{len(pdf_files)}")
    if fallback_used > 0:
        print(f"  MarkItDown fallback: {fallback_used}")
    print(f"  Failed: {failed}/{len(pdf_files)}")
    print(f"  Total time: {total_time:.2f}s")
    print(f"  Average time per file: {avg_time:.2f}s")
    print(f"{'='*50}")

def main():
    parser = argparse.ArgumentParser(
        description='Convert PDF files to Markdown using Docling'
    )
    parser.add_argument(
        'input_dir',
        help='Directory containing PDF files'
    )
    parser.add_argument(
        '-m', '--max-files',
        type=int,
        default=None,
        help='Maximum number of files to convert'
    )
    
    args = parser.parse_args()
    
    # Check if input directory exists
    if not os.path.exists(args.input_dir):
        print(f"Error: Directory '{args.input_dir}' not found")
        sys.exit(1)
    
    convert_chapters(args.input_dir, args.max_files)

if __name__ == "__main__":
    main()
