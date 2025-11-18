#!/usr/bin/env python3
"""
Extract chapters from PDF documentation using pdfplumber
Saves each chapter (first 2 levels) as individual PDF files

Usage:
    ./convert_pdf_to_chapters.py input.pdf          # Extract all chapters
    ./convert_pdf_to_chapters.py input.pdf --max 5  # Extract only first 5 chapters
    ./convert_pdf_to_chapters.py input.pdf --show   # Show chapters and page ranges without extracting
"""
import pdfplumber
import re
import argparse
from pathlib import Path
from PyPDF2 import PdfReader, PdfWriter

def extract_toc_from_pdf(pdf_path):
    """
    Extract table of contents from PDF
    Returns list of chapters with their page numbers
    """
    chapters = []
    
    with pdfplumber.open(pdf_path) as pdf:
        # Try to find TOC in first few pages
        for page_num in range(min(20, len(pdf.pages))):
            page = pdf.pages[page_num]
            text = page.extract_text()
            
            if not text:
                continue
            
            # Look for chapter patterns (adjust regex based on actual TOC format)
            # Common patterns: "1 Chapter Name ... 5" or "1. Chapter Name 5"
            lines = text.split('\n')
            
            for line in lines:
                # Match patterns like "1 Introduction ... 5" or "1.1 Getting Started ... 10"
                match = re.match(r'^(\d+(?:\.\d+)?)\s+(.+?)\s+\.{2,}\s*(\d+)', line)
                if not match:
                    # Try alternative pattern: "1 Introduction 5"
                    match = re.match(r'^(\d+(?:\.\d+)?)\s+(.+?)\s+(\d+)$', line)
                
                if match:
                    chapter_num = match.group(1)
                    title = match.group(2).strip()
                    page_num_str = match.group(3)
                    
                    # Only keep level 1 (subsections like 1.1, 2.1), skip level 0 (1, 2, 3)
                    level = chapter_num.count('.')
                    if level == 1:  # Only subsections (1.1, 1.2, etc.)
                        chapters.append({
                            'number': chapter_num,
                            'title': title,
                            'page': int(page_num_str),
                            'level': level
                        })
    
    return chapters

def auto_detect_page_offset(pdf_path, chapters):
    """
    Automatically detect page offset by searching for the first chapter in the PDF
    """
    if not chapters:
        return 0
    
    first_chapter = chapters[0]
    toc_page = first_chapter['page']
    chapter_title = first_chapter['title']
    chapter_num = first_chapter['number']
    
    print(f"Auto-detecting page offset...")
    print(f"Looking for chapter {chapter_num}: '{chapter_title}' (TOC says page {toc_page})")
    
    with pdfplumber.open(pdf_path) as pdf:
        # Search in a wider range around the TOC page number
        search_start = max(0, toc_page - 20)
        search_end = min(len(pdf.pages), toc_page + 30)
        
        best_match_page = None
        best_match_score = 0
        
        for actual_page_index in range(search_start, search_end):
            page = pdf.pages[actual_page_index]
            text = page.extract_text()
            
            if not text:
                continue
            
            # Clean and normalize text for better matching
            text_clean = ' '.join(text.split())
            title_clean = ' '.join(chapter_title.split())
            
            # Score this page based on multiple criteria
            score = 0
            
            # Look for chapter number at the start of a line
            lines = text.split('\n')
            for i, line in enumerate(lines):
                line = line.strip()
                
                # Strong match: chapter number at start of line
                if line.startswith(chapter_num + ' ') or line.startswith(chapter_num + '\t'):
                    score += 50
                    
                    # Even stronger if title follows
                    if i + 1 < len(lines):
                        next_line = lines[i + 1].strip()
                        if title_clean[:30].lower() in next_line.lower():
                            score += 50
                
                # Check if chapter number and title are on same line
                if chapter_num in line:
                    # Count how many words from title appear in this line
                    title_words = title_clean.lower().split()[:5]  # First 5 words
                    matching_words = sum(1 for word in title_words if word in line.lower())
                    score += matching_words * 10
            
            # Additional check: title appears somewhere on page
            if title_clean[:20].lower() in text_clean.lower():
                score += 20
            
            # Update best match
            if score > best_match_score:
                best_match_score = score
                best_match_page = actual_page_index
        
        # Accept match if score is good enough
        if best_match_page is not None and best_match_score >= 30:
            actual_page = best_match_page + 1  # Convert to 1-based
            offset = actual_page - toc_page
            print(f"✓ Found chapter at actual PDF page {actual_page} (confidence score: {best_match_score})")
            print(f"✓ Calculated offset: {offset}\n")
            return offset
    
    print(f"⚠ Could not auto-detect offset with confidence")
    print(f"  Using offset 0 - extracted pages may be incorrect\n")
    return 0

def find_chapter_actual_pages(pdf_path, chapters):
    """
    Find actual start page for each chapter by searching for chapter titles in the PDF
    """
    print("Finding actual chapter pages...")
    
    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        
        for chapter in chapters:
            chapter_num = chapter['number']
            chapter_title = chapter['title']
            toc_page = chapter['page']
            
            # Search in a range around the TOC page
            search_start = max(0, toc_page - 5)
            search_end = min(total_pages, toc_page + 15)
            
            found = False
            best_match_page = None
            best_match_score = 0
            
            for page_index in range(search_start, search_end):
                page = pdf.pages[page_index]
                text = page.extract_text()
                
                if not text:
                    continue
                
                lines = text.split('\n')
                score = 0
                
                for i, line in enumerate(lines):
                    line_stripped = line.strip()
                    
                    # Look for chapter number at start of line
                    if line_stripped.startswith(chapter_num + ' ') or line_stripped.startswith(chapter_num + '\t'):
                        score += 100
                        
                        # Check if title is on same line or next line
                        title_words = chapter_title.lower().split()[:3]
                        if any(word in line_stripped.lower() for word in title_words):
                            score += 50
                        elif i + 1 < len(lines):
                            next_line = lines[i + 1].strip().lower()
                            if any(word in next_line for word in title_words):
                                score += 50
                
                if score > best_match_score:
                    best_match_score = score
                    best_match_page = page_index + 1  # Convert to 1-based
            
            # Update chapter page if we found a good match
            if best_match_page is not None and best_match_score >= 100:
                chapter['actual_page'] = best_match_page
                found = True
            else:
                # Fallback to TOC page if not found
                chapter['actual_page'] = toc_page
                print(f"⚠ Could not locate chapter {chapter_num}, using TOC page {toc_page}")
    
    print("✓ Chapter page detection complete\n")
    return chapters

def split_pdf_by_chapters(pdf_path, chapters, output_dir, max_files=None):
    """
    Split PDF into individual chapter files using exact page ranges from TOC
    """
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    reader = PdfReader(pdf_path)
    total_pages = len(reader.pages)
    
    print(f"Total pages in PDF: {total_pages}")
    print(f"Found {len(chapters)} subsection chapters")
    
    if max_files:
        chapters = chapters[:max_files]
        print(f"Processing only first {max_files} chapters (--max-files option)\n")
    else:
        print()
    
    for i, chapter in enumerate(chapters):
        # Use actual detected page
        start_page = chapter['actual_page'] - 1  # PyPDF2 uses 0-based indexing
        
        # Find the next chapter at the same or higher level to determine end page
        end_page = total_pages  # Default to end of document
        
        for j in range(i + 1, len(chapters)):
            next_chapter = chapters[j]
            # End at the next subsection (same level) or next main section
            if next_chapter['actual_page'] > chapter['actual_page']:
                end_page = next_chapter['actual_page'] - 1
                break
        
        # Validate page range
        if start_page >= total_pages:
            print(f"⚠ Skipping {chapter['number']}: start page {chapter['actual_page']} exceeds total pages")
            continue
            
        if end_page > total_pages:
            end_page = total_pages
        
        if start_page >= end_page:
            print(f"⚠ Skipping {chapter['number']}: invalid page range ({start_page + 1} to {end_page})")
            continue
        
        # Create new PDF for this chapter
        writer = PdfWriter()
        
        for page_num in range(start_page, end_page):
            if page_num < total_pages:
                writer.add_page(reader.pages[page_num])
        
        # Generate filename: micropython-docs1-1.pdf (chapter 1.1)
        chapter_num_clean = chapter['number'].replace('.', '-')
        output_filename = f"micropython-docs{chapter_num_clean}.pdf"
        output_file = output_path / output_filename
        
        # Save chapter PDF
        with open(output_file, 'wb') as f:
            writer.write(f)
        
        print(f"✓ Saved: {output_filename}")
        print(f"  Title: {chapter['title']}")
        print(f"  Pages: {start_page + 1} to {end_page} ({end_page - start_page} pages)\n")

def main():
    parser = argparse.ArgumentParser(
        description='Extract chapters from PDF documentation',
        epilog='''
Examples:
  %(prog)s input.pdf                Extract all chapters
  %(prog)s input.pdf --max 5        Extract only first 5 chapters
  %(prog)s input.pdf --show         Show chapters and page ranges without extracting
        ''',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        'pdf',
        help='Path to the PDF file to process'
    )
    parser.add_argument(
        '--max-files', '--max',
        type=int,
        metavar='N',
        help='Process only the first N chapters'
    )
    parser.add_argument(
        '--show-only', '--show',
        action='store_true',
        help='Only display chapters and page ranges without creating PDF files'
    )
    
    args = parser.parse_args()
    
    pdf_path = args.pdf
    output_dir = 'chapters'
    max_files = args.max_files
    
    # Check if PDF exists
    if not Path(pdf_path).exists():
        print(f"Error: {pdf_path} not found!")
        print("\nUsage examples:")
        print(f"  {parser.prog} input.pdf")
        print(f"  {parser.prog} input.pdf --show          # Preview chapters")
        print(f"  {parser.prog} input.pdf --max 5         # Extract first 5 chapters")
        return
    
    print(f"Analyzing {pdf_path}...\n")
    
    # Extract TOC
    chapters = extract_toc_from_pdf(pdf_path)
    
    if not chapters:
        print("Error: Could not find any subsection chapters in the PDF table of contents")
        return
    
    # Auto-detect page offset
    page_offset = auto_detect_page_offset(pdf_path, chapters)
    
    # Apply page offset
    if page_offset != 0:
        for chapter in chapters:
            chapter['page'] += page_offset
    
    # Find actual chapter pages by searching for titles
    chapters = find_chapter_actual_pages(pdf_path, chapters)
    
    # Sort chapters by actual page number
    chapters.sort(key=lambda x: x['actual_page'])
    
    # If show-only mode, display chapters and exit
    if args.show_only:
        print(f"\n{'='*70}")
        print(f"Found {len(chapters)} subsection chapters:")
        print(f"{'='*70}\n")
        
        reader = PdfReader(pdf_path)
        total_pages = len(reader.pages)
        
        # Get all chapters for proper end page calculation
        all_chapters = chapters[:]
        display_chapters = chapters[:args.max_files] if args.max_files else chapters
        
        for i, chapter in enumerate(display_chapters):
            start_page = chapter['actual_page']
            
            # Find end page by looking at ALL chapters, not just displayed ones
            end_page = total_pages
            current_index = all_chapters.index(chapter)
            
            for j in range(current_index + 1, len(all_chapters)):
                next_chapter = all_chapters[j]
                if next_chapter['actual_page'] > chapter['actual_page']:
                    end_page = next_chapter['actual_page'] - 1
                    break
            
            page_count = end_page - start_page + 1
            
            print(f"Chapter {chapter['number']}: {chapter['title']}")
            print(f"  Pages: {start_page} to {end_page} ({page_count} pages)")
            print(f"  Output: micropython-docs{chapter['number'].replace('.', '-')}.pdf\n")
        
        print(f"{'='*70}")
        print(f"Total: {len(display_chapters)} chapters")
        if args.max_files:
            print(f"(Limited to first {args.max_files} due to --max-files option)")
        print(f"{'='*70}")
        return
    
    # Split PDF by chapters
    split_pdf_by_chapters(pdf_path, chapters, output_dir, max_files)
    
    files_created = min(len(chapters), max_files) if max_files else len(chapters)
    
    print(f"\n{'='*50}")
    print(f"✓ Extraction complete!")
    print(f"  Created {files_created} chapter files in '{output_dir}/'")
    print(f"{'='*50}")

if __name__ == "__main__":
    main()
