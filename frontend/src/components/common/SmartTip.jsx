import { useState } from 'react';
import './SmartTip.css';

export default function SmartTip({ icon, message, action, onAction, onDismiss }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="smart-tip">
      <span className="material-icon smart-tip-icon">{icon || 'lightbulb'}</span>
      <p className="smart-tip-message">{message}</p>
      <div className="smart-tip-actions">
        {action && (
          <button className="btn btn-sm btn-primary" onClick={onAction}>
            {action}
          </button>
        )}
        <button className="smart-tip-dismiss" onClick={handleDismiss}>
          <span className="material-icon">close</span>
        </button>
      </div>
    </div>
  );
}
