import os
import uuid
from datetime import datetime


def extract_text_from_pdf(filepath):
    """Extract text from a PDF file using pdfplumber."""
    import pdfplumber
    text_parts = []
    with pdfplumber.open(filepath) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return '\n\n'.join(text_parts)


def html_to_pdf(html_content, upload_folder, doc_type='cv'):
    """Convert HTML content to PDF using xhtml2pdf. Returns (filename, filepath, file_size)."""
    from xhtml2pdf import pisa

    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    unique_id = uuid.uuid4().hex[:8]
    filename = f"{doc_type}_{timestamp}_{unique_id}.pdf"
    filepath = os.path.join(upload_folder, filename)

    css_string = """
    @page { size: A4; margin: 2cm; }
    body {
        font-family: Helvetica, Arial, sans-serif;
        font-size: 10pt;
        line-height: 1.5;
        color: #333;
    }
    h1 { font-size: 18pt; color: #1a1a2e; margin-bottom: 8px; }
    h2 { font-size: 14pt; color: #1a1a2e; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-top: 16px; }
    h3 { font-size: 12pt; color: #333; }
    ul { padding-left: 20px; }
    li { margin-bottom: 4px; }
    p { margin-bottom: 8px; }
    """

    full_html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>{css_string}</style></head>
<body>{html_content}</body>
</html>"""

    with open(filepath, 'wb') as pdf_file:
        pisa_status = pisa.CreatePDF(full_html, dest=pdf_file)
        if pisa_status.err:
            raise RuntimeError(f'PDF generation failed with {pisa_status.err} errors')

    file_size = os.path.getsize(filepath)
    return filename, filepath, file_size
