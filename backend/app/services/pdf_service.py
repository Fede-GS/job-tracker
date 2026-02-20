import os
import uuid
from datetime import datetime


TEMPLATE_CSS = {
    'classic': """
        @page { size: A4; margin: 2cm; }
        body { font-family: 'Times New Roman', Georgia, serif; font-size: 10pt; line-height: 1.6; color: #333; }
        h1 { font-size: 20pt; color: #1a1a2e; margin-bottom: 4px; text-align: center; }
        h2 { font-size: 13pt; color: #1a1a2e; border-bottom: 2px solid #1a1a2e; padding-bottom: 4px; margin-top: 18px; text-transform: uppercase; letter-spacing: 1px; }
        h3 { font-size: 11pt; color: #333; }
        ul { padding-left: 20px; }
        li { margin-bottom: 3px; }
        p { margin-bottom: 6px; }
        hr { border: none; border-top: 1px solid #ccc; margin: 12px 0; }
    """,
    'modern': """
        @page { size: A4; margin: 0; }
        body { font-family: Helvetica, Arial, sans-serif; font-size: 10pt; line-height: 1.5; color: #333; margin: 0; }
        h1 { font-size: 20pt; color: #1a1a2e; margin-bottom: 4px; }
        h2 { font-size: 13pt; color: #6366f1; margin-top: 16px; border-bottom: 2px solid #6366f1; padding-bottom: 3px; }
        h3 { font-size: 11pt; color: #333; }
        ul { padding-left: 18px; }
        li { margin-bottom: 3px; }
        p { margin-bottom: 6px; }
    """,
    'creative': """
        @page { size: A4; margin: 1.5cm; }
        body { font-family: Helvetica, Arial, sans-serif; font-size: 10pt; line-height: 1.5; color: #333; }
        h1 { font-size: 22pt; color: #1a1a2e; margin-bottom: 2px; font-weight: 800; }
        h2 { font-size: 13pt; color: #6366f1; margin-top: 16px; font-weight: 700; }
        h3 { font-size: 11pt; color: #333; }
        ul { padding-left: 18px; list-style-type: none; }
        li { margin-bottom: 3px; padding-left: 12px; }
        p { margin-bottom: 6px; }
    """,
    'minimal': """
        @page { size: A4; margin: 2.5cm; }
        body { font-family: Helvetica, Arial, sans-serif; font-size: 9.5pt; line-height: 1.7; color: #444; }
        h1 { font-size: 18pt; color: #222; font-weight: 300; margin-bottom: 4px; }
        h2 { font-size: 11pt; color: #222; border-bottom: 1px solid #ddd; padding-bottom: 3px; margin-top: 16px; font-weight: 400; text-transform: uppercase; letter-spacing: 2px; }
        h3 { font-size: 10pt; color: #444; font-weight: 500; }
        ul { padding-left: 16px; }
        li { margin-bottom: 2px; }
        p { margin-bottom: 6px; }
        hr { border: none; border-top: 1px solid #eee; margin: 10px 0; }
    """,
}

DEFAULT_CSS = """
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


def html_to_pdf(html_content, upload_folder, doc_type='cv', template_id=None):
    """Convert HTML content to PDF using xhtml2pdf. Returns (filename, filepath, file_size)."""
    from xhtml2pdf import pisa

    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    unique_id = uuid.uuid4().hex[:8]
    filename = f"{doc_type}_{timestamp}_{unique_id}.pdf"
    filepath = os.path.join(upload_folder, filename)

    # Use template-specific CSS if available, else default
    if template_id and template_id in TEMPLATE_CSS:
        css_string = TEMPLATE_CSS[template_id]
    else:
        css_string = DEFAULT_CSS

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
