import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './FileUpload.css';

export default function FileUpload({ onUpload, loading, fixedCategory }) {
  const { t } = useTranslation();
  const [dragOver, setDragOver] = useState(false);
  const [category, setCategory] = useState(fixedCategory || 'cv');
  const fileRef = useRef(null);

  const handleFile = (file) => {
    if (file) onUpload(file, fixedCategory || category);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  return (
    <div className="file-upload-wrapper">
      {!fixedCategory && (
        <div className="file-upload-controls">
          <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)} style={{ maxWidth: 160 }}>
            <option value="cv">{t('documents.cv')}</option>
            <option value="cover_letter">{t('documents.coverLetter')}</option>
            <option value="other">{t('documents.other')}</option>
          </select>
        </div>
      )}
      <div
        className={`file-upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          hidden
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        {loading ? (
          <div className="spinner" />
        ) : (
          <>
            <p className="file-upload-text">{t('documents.dragDrop')} <span>{t('documents.browse')}</span></p>
            <p className="file-upload-hint">{t('documents.hint')}</p>
          </>
        )}
      </div>
    </div>
  );
}
