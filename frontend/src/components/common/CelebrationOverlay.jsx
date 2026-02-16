import { useEffect, useState } from 'react';
import './CelebrationOverlay.css';

export default function CelebrationOverlay({ show, icon, title, message, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onDone?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onDone]);

  if (!visible) return null;

  return (
    <div className="celebration-overlay" onClick={() => { setVisible(false); onDone?.(); }}>
      <div className="celebration-card" onClick={(e) => e.stopPropagation()}>
        <span className="material-icon celebration-icon">{icon || 'celebration'}</span>
        <h3 className="celebration-title">{title}</h3>
        <p className="celebration-message">{message}</p>
      </div>
    </div>
  );
}
