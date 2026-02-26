import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { chatAI } from '../../api/profile';
import './FloatingAI.css';

const PAGE_TIPS = {
  '/': 'dashboard',
  '/applications': 'applications',
  '/applications/new': 'newApplication',
  '/search': 'jobSearch',
  '/profile': 'profile',
  '/settings': 'settings',
  '/ai': 'aiAssistant',
};

export default function FloatingAI({ context = {}, sidebarCollapsed = false, isOpen = false, onToggle }) {
  const { t } = useTranslation();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const prevContextRef = useRef(context);

  const pageKey = PAGE_TIPS[location.pathname] || (location.pathname.match(/^\/applications\/\d+$/) ? 'applicationDetail' : 'general');

  useEffect(() => {
    const prev = prevContextRef.current;
    if (prev.applicationId !== context.applicationId || prev.page !== context.page) {
      setMessages([]);
    }
    prevContextRef.current = context;
  }, [context]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (text) => {
    const msgText = text || input.trim();
    if (!msgText || loading) return;
    const userMsg = { role: 'user', content: msgText };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { response } = await chatAI({
        message: userMsg.content,
        step: context.step || 'general',
        company: context.company || '',
        role: context.role || '',
        profile: context.profile,
        job_posting: context.jobPosting || '',
        match_analysis: context.matchAnalysis,
        history: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        application_id: context.applicationId,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: t('floatingAI.errorMessage') }]);
    } finally {
      setLoading(false);
    }
  };

  const getSuggestions = () => {
    const key = `floatingAI.tips.${pageKey}`;
    const tips = t(key, { returnObjects: true });
    if (Array.isArray(tips)) return tips;
    return [t('floatingAI.suggestGeneral1'), t('floatingAI.suggestGeneral2')];
  };

  // Calculate panel position based on sidebar state
  const panelLeft = sidebarCollapsed ? 'calc(var(--sidebar-width-collapsed) + 12px)' : 'calc(var(--sidebar-width) + 12px)';

  // Don't render anything if not open
  if (!isOpen) return null;

  return (
    <div className="floating-ai-panel" style={{ left: panelLeft }}>
      <div className="floating-ai-header">
        <div className="floating-ai-header-info">
          <img src="/logo.png" alt="Finix" className="finix-header-logo" />
          <div>
            <h4>Finix AI</h4>
            <span className="floating-ai-status">
              {loading ? t('floatingAI.thinking') : 'Online'}
            </span>
          </div>
        </div>
        <button className="floating-ai-close" onClick={onToggle}>
          <span className="material-icon">close</span>
        </button>
      </div>

      <div className="floating-ai-messages">
        {messages.length === 0 && (
          <div className="floating-ai-welcome">
            <div className="floating-ai-message assistant">
              <div className="floating-ai-message-content">
                {t(`floatingAI.welcome.${pageKey}`, { defaultValue: t('floatingAI.welcome.general') })}
              </div>
            </div>
            <div className="floating-ai-suggestions">
              {getSuggestions().map((s, i) => (
                <button
                  key={i}
                  className="floating-ai-suggestion"
                  onClick={() => handleSend(s)}
                >
                  <span className="material-icon" style={{ fontSize: 14 }}>arrow_forward</span>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`floating-ai-message ${msg.role}`}>
            {msg.role === 'assistant' && (
              <img src="/logo.png" alt="Finix" className="finix-msg-avatar" />
            )}
            <div className="floating-ai-message-content">{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="floating-ai-message assistant">
            <img src="/logo.png" alt="Finix" className="finix-msg-avatar" />
            <div className="floating-ai-message-content typing">
              <span className="spinner" /> {t('floatingAI.thinking')}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="floating-ai-input">
        <input
          className="form-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('floatingAI.placeholder')}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={loading}
        />
        <button
          className="btn btn-primary btn-sm"
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
        >
          <span className="material-icon" style={{ fontSize: 18 }}>send</span>
        </button>
      </div>
    </div>
  );
}
