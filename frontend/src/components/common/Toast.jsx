import { useState } from 'react';
import { useNotification } from '../../context/NotificationContext';
import './Toast.css';

const TOAST_ICONS = {
  info: 'info',
  success: 'check_circle',
  warning: 'warning',
  error: 'error',
};

export default function Toast() {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="toast-container">
      {notifications.map((notif) => (
        <ToastItem key={notif.id} notif={notif} onClose={() => removeNotification(notif.id)} />
      ))}
    </div>
  );
}

function ToastItem({ notif, onClose }) {
  const [exiting, setExiting] = useState(false);

  const handleClose = () => {
    setExiting(true);
    setTimeout(onClose, 250);
  };

  return (
    <div className={`toast toast-${notif.type} ${exiting ? 'toast-exit' : ''}`}>
      <span className={`material-icon toast-icon toast-icon-${notif.type}`}>
        {TOAST_ICONS[notif.type] || 'info'}
      </span>
      <span className="toast-message">{notif.message}</span>
      <button className="toast-close" onClick={handleClose}>&times;</button>
      <div
        className="toast-progress"
        style={{ animationDuration: `${notif.duration || 5000}ms` }}
      />
    </div>
  );
}
