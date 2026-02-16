import Modal from './Modal';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || 'Conferma'}>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
        {message || 'Sei sicuro di voler procedere?'}
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={onClose}>Annulla</button>
        <button className="btn btn-danger" onClick={() => { onConfirm(); onClose(); }}>Elimina</button>
      </div>
    </Modal>
  );
}
