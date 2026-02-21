import os
import cloudinary
import cloudinary.uploader


def _ensure_configured():
    """Configure Cloudinary from environment if not already done."""
    if cloudinary.config().cloud_name:
        return  # Already configured (auto-loaded from CLOUDINARY_URL env var)

    url = os.environ.get('CLOUDINARY_URL', '')
    if url:
        cloudinary.config(cloudinary_url=url)
    else:
        raise RuntimeError('Cloudinary not configured (CLOUDINARY_URL missing)')


def upload_file(file, folder='documents'):
    """Upload a file object to Cloudinary.
    Returns (secure_url, public_id).
    """
    _ensure_configured()
    result = cloudinary.uploader.upload(
        file,
        folder=folder,
        resource_type='raw',
    )
    return result['secure_url'], result['public_id']


def upload_file_from_path(filepath, folder='documents'):
    """Upload a file from local path to Cloudinary.
    Returns (secure_url, public_id).
    """
    _ensure_configured()
    result = cloudinary.uploader.upload(
        filepath,
        folder=folder,
        resource_type='raw',
    )
    return result['secure_url'], result['public_id']


def delete_file(public_id):
    """Delete a file from Cloudinary by public_id."""
    _ensure_configured()
    cloudinary.uploader.destroy(public_id, resource_type='raw')
