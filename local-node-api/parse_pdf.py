#!/usr/bin/env python3
import sys
import json
import pdfplumber
import io

def extract_tables_and_text(pdf_bytes):
    text_output = ""
    tables_output = []
    # Wrap the raw bytes in a BytesIO object
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            # Extract plain text
            page_text = page.extract_text() or ""
            text_output += page_text + "\n"

            # Extract tables (each table is a list of rows)
            # Only if you actually need them:
            page_tables = page.extract_tables()
            if page_tables:
                tables_output.extend(page_tables)

    return text_output.strip(), tables_output

def main():
    # Read the entire PDF from stdin
    pdf_bytes = sys.stdin.buffer.read()
    text, tables = extract_tables_and_text(pdf_bytes)

    # Build a JSON object
    result = {
        "text": text,
        "tables": tables
    }
    print(json.dumps(result))

if __name__ == "__main__":
    main()
