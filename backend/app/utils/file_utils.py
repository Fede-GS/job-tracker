import os
import uuid
from werkzeug.utils import secure_filename

ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def save_uploaded_file(file, upload_folder):
    filename = secure_filename(file.filename)
    stored_name = f"{uuid.uuid4().hex}_{filename}"
    filepath = os.path.join(upload_folder, stored_name)
    file.save(filepath)
    return stored_name, file.content_type, os.path.getsize(filepath)
