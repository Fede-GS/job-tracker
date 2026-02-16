import { useTranslation } from 'react-i18next';
import { downloadDocument } from '../../api/documents';
import './FileList.css';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileList({ documents, onDelete, filterCategory }) {
  const { t } = useTranslation();

  const CATEGORY_LABELS = {
    cv: t('documents.cv'),
    cover_letter: t('documents.coverLetter'),
    other: t('documents.other'),
  };

  const filteredDocs = filterCategory
    ? documents?.filter((d) => d.doc_category === filterCategory)
    : documents;

  if (!filteredDocs || filteredDocs.length === 0) {
    return <p className="file-list-empty">{t('documents.noDocuments')}</p>;
  }

  return (
    <div className="file-list">
      {filteredDocs.map((doc) => (
        <div key={doc.id} className="file-item">
          <div className="file-info">
            <span className="file-name">{doc.filename}</span>
            <span className="file-meta">
              {CATEGORY_LABELS[doc.doc_category] || doc.doc_category} &middot; {formatSize(doc.file_size)}
            </span>
          </div>
          <div className="file-actions">
            <a href={downloadDocument(doc.id)} className="btn btn-sm btn-secondary" download>
              {t('documents.download')}
            </a>
            {onDelete && (
              <button className="btn btn-sm btn-ghost" onClick={() => onDelete(doc.id)}>
                {t('documents.delete')}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
