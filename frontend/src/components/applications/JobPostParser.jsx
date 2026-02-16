import { useState } from 'react';
import { parseJobPost } from '../../api/ai';
import './JobPostParser.css';

export default function JobPostParser({ onParsed }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleParse = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { parsed } = await parseJobPost(text);
      onParsed({
        company: parsed.company || '',
        role: parsed.role || '',
        location: parsed.location || '',
        salary_min: parsed.salary_min || '',
        salary_max: parsed.salary_max || '',
        salary_currency: parsed.salary_currency || 'EUR',
        requirements: Array.isArray(parsed.requirements) ? parsed.requirements.join('\n') : parsed.requirements || '',
        job_description: text,
      });
    } catch (err) {
      setError(err.message || 'Errore nel parsing. Verifica la API key nelle impostazioni.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="job-parser">
      <div className="job-parser-header">
        <h3>Parsing automatico annuncio</h3>
        <p>Incolla il testo dell'annuncio e l'AI estrarrà le informazioni</p>
      </div>
      <textarea
        className="form-textarea job-parser-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Incolla qui il testo completo dell'annuncio di lavoro..."
        rows={8}
      />
      {error && <p className="job-parser-error">{error}</p>}
      <button
        className="btn btn-primary"
        onClick={handleParse}
        disabled={loading || !text.trim()}
      >
        {loading ? (
          <>
            <span className="spinner" />
            Analisi in corso...
          </>
        ) : (
          'Analizza con AI'
        )}
      </button>
    </div>
  );
}
