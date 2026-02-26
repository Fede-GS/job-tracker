import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { chatAI } from '../../api/profile';
import './Chat.css';

export default function ChatSidebar({ context = {}, collapsed = false, onToggle }) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
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
        history: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        application_id: context.applicationId,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Errore nella risposta AI. Riprova.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (collapsed) {
    return null;
  }

  return (
    <div className="chat-sidebar">
      <div className="chat-header">
        <h3>{t('chat.title')}</h3>
        <button className="btn btn-ghost btn-sm" onClick={onToggle}>✕</button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>💬 Chiedi all'AI qualsiasi cosa su questa candidatura</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="chat-message assistant">
            <div className="message-content typing">
              <span className="spinner" /> {t('chat.thinking')}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <input
          className="form-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t('chat.placeholder')}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          disabled={loading}
        />
        <button className="btn btn-primary btn-sm" onClick={handleSend} disabled={loading || !input.trim()}>
          {t('chat.send')}
        </button>
      </div>
    </div>
  );
}
