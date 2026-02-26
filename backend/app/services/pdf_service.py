import os
import uuid
from datetime import datetime


TEMPLATE_CSS = {
    'classic': """
        @page { size: A4; margin: 1.8cm 2cm; }
        body { font-family: 'Times New Roman', Georgia, serif; font-size: 9.5pt; line-height: 1.55; color: #222; }
        h1 { font-size: 20pt; color: #111; margin: 0 0 2px 0; font-weight: 700; }
        h2 { font-size: 10.5pt; color: #111; border-bottom: 1.5px solid #111; padding-bottom: 3px; margin-top: 14px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 700; }
        h3 { font-size: 9.5pt; color: #222; margin: 4px 0 2px 0; font-weight: 600; }
        ul { padding-left: 16px; margin: 4px 0; }
        li { margin-bottom: 2px; line-height: 1.45; }
        p { margin: 0 0 4px 0; }
        hr { border: none; border-top: 1px solid #ccc; margin: 8px 0; }
        .contact-line { font-size: 8.5pt; color: #555; margin-bottom: 6px; }
        strong { font-weight: 600; }
    """,
    'modern': """
        @page { size: A4; margin: 0; }
        body { font-family: Helvetica, Arial, sans-serif; font-size: 9.5pt; line-height: 1.5; color: #333; margin: 0; }
        h1 { font-size: 19pt; color: #1a1a2e; margin-bottom: 3px; font-weight: 700; }
        h2 { font-size: 10pt; color: #6366f1; margin-top: 14px; margin-bottom: 5px; border-bottom: 1.5px solid #6366f1; padding-bottom: 2px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; }
        h3 { font-size: 9.5pt; color: #333; margin: 3px 0 2px 0; font-weight: 600; }
        ul { padding-left: 16px; margin: 3px 0; }
        li { margin-bottom: 2px; line-height: 1.45; }
        p { margin: 0 0 4px 0; }
        strong { font-weight: 600; }
    """,
    'creative': """
        @page { size: A4; margin: 1.5cm; }
        body { font-family: Helvetica, Arial, sans-serif; font-size: 9.5pt; line-height: 1.5; color: #333; }
        h1 { font-size: 21pt; color: #1a1a2e; margin: 0 0 2px 0; font-weight: 800; }
        h2 { font-size: 10pt; color: #6366f1; margin-top: 14px; margin-bottom: 5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        h3 { font-size: 9.5pt; color: #333; margin: 3px 0 2px 0; font-weight: 600; }
        ul { padding-left: 16px; list-style-type: none; margin: 3px 0; }
        li { margin-bottom: 2px; padding-left: 10px; line-height: 1.45; }
        li::before { content: "▸ "; color: #6366f1; font-size: 8pt; }
        p { margin: 0 0 4px 0; }
        strong { font-weight: 700; }
    """,
    'minimal': """
        @page { size: A4; margin: 1.8cm 2.2cm; }
        body { font-family: Helvetica, Arial, sans-serif; font-size: 9.5pt; line-height: 1.6; color: #333; }
        h1 { font-size: 20pt; color: #111; font-weight: 400; margin: 0 0 2px 0; letter-spacing: -0.3px; }
        h2 { font-size: 9pt; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 2px; margin-top: 14px; margin-bottom: 6px; font-weight: 400; text-transform: uppercase; letter-spacing: 2px; }
        h3 { font-size: 9.5pt; color: #222; font-weight: 600; margin: 3px 0 1px 0; }
        ul { padding-left: 14px; margin: 3px 0; }
        li { margin-bottom: 2px; line-height: 1.5; }
        p { margin: 0 0 4px 0; }
        hr { border: none; border-top: 1px solid #eee; margin: 8px 0; }
        strong { font-weight: 600; }
    """,
}

DEFAULT_CSS = """
    @page { size: A4; margin: 1.8cm 2cm; }
    body {
        font-family: Helvetica, Arial, sans-serif;
        font-size: 9.5pt;
        line-height: 1.55;
        color: #222;
    }
    h1 { font-size: 20pt; color: #111; margin: 0 0 4px 0; font-weight: 700; }
    h2 { font-size: 10.5pt; color: #111; border-bottom: 1.5px solid #111; padding-bottom: 3px; margin-top: 14px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
    h3 { font-size: 9.5pt; color: #222; margin: 4px 0 2px 0; font-weight: 600; }
    ul { padding-left: 16px; margin: 4px 0; }
    li { margin-bottom: 2px; line-height: 1.45; }
    p { margin: 0 0 4px 0; }
    hr { border: none; border-top: 1px solid #ccc; margin: 8px 0; }
    strong { font-weight: 600; }
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
