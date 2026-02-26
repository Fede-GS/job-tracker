import { useState, useEffect, useCallback } from 'react';
import { getHistoryAnalysis, refreshHistoryAnalysis } from '../../api/profile';
import './AIHistoryPanel.css';

export default function AIHistoryPanel() {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  const fetchInsight = useCallback(async () => {
    try {
      const data = await getHistoryAnalysis();
      setInsight(data.insight || null);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load AI analysis.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsight();
  }, [fetchInsight]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError('');
    try {
      const data = await refreshHistoryAnalysis();
      setInsight(data.insight || null);
    } catch (err) {
      setError(err.message || 'Refresh failed.');
    } finally {
      setRefreshing(false);
    }
  };

  const renderInsightContent = () => {
    if (!insight) return null;

    // insight is the full UserAIInsight object: { id, user_id, insight_data, last_updated }
    // The actual AI analysis is in insight.insight_data
    const data = insight.insight_data;
    if (!data) {
      return (
        <div className="ai-panel-empty">
          <p>🚀 No analysis yet. Click refresh to generate AI insights!</p>
        </div>
      );
    }

    // insight_data can be a string (markdown) or a structured object
    if (typeof data === 'string') {
      return (
        <div className="ai-insight-text">
          {data.split('\n').map((line, i) => {
            if (line.startsWith('## ')) return <h3 key={i}>{line.replace('## ', '')}</h3>;
            if (line.startsWith('### ')) return <h4 key={i}>{line.replace('### ', '')}</h4>;
            if (line.startsWith('**') && line.endsWith('**')) return <strong key={i}>{line.replace(/\*\*/g, '')}</strong>;
            if (line.startsWith('- ') || line.startsWith('• ')) {
              return <li key={i}>{line.replace(/^[-•]\s/, '')}</li>;
            }
            if (line.trim() === '') return <br key={i} />;
            return <p key={i}>{line}</p>;
          })}
        </div>
      );
    }

    // Structured object
    return (
      <div className="ai-insight-structured">
        {data.summary && (
          <div className="insight-section">
            <p className="insight-summary">{data.summary}</p>
          </div>
        )}

        {data.metrics && (
          <div className="insight-metrics">
            {Object.entries(data.metrics).map(([key, val]) => (
              <div key={key} className="insight-metric">
                <span className="metric-value">{val}</span>
                <span className="metric-label">{key.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        )}

        {data.strengths?.length > 0 && (
          <div className="insight-section">
            <h4>💪 Strengths</h4>
            <ul>
              {data.strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}

        {data.areas_for_improvement?.length > 0 && (
          <div className="insight-section">
            <h4>🎯 Areas to Improve</h4>
            <ul>
              {data.areas_for_improvement.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}

        {data.recommendations?.length > 0 && (
          <div className="insight-section">
            <h4>💡 Recommendations</h4>
            <ul>
              {data.recommendations.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}

        {data.patterns && (
          <div className="insight-section">
            <h4>📊 Patterns</h4>
            <p>{typeof data.patterns === 'string' ? data.patterns : JSON.stringify(data.patterns)}</p>
          </div>
        )}

        {data.raw && data.summary && (
          <div className="insight-section">
            <p style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{data.summary}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`ai-history-panel ${expanded ? 'expanded' : ''}`}>
      <div className="ai-panel-header" onClick={() => setExpanded(p => !p)}>
        <div className="ai-panel-title">
          <span className="ai-panel-icon">🤖</span>
          <div>
            <h3>AI Career Insights</h3>
            <p>Powered by Blackbox AI · Analyzes your full history</p>
          </div>
        </div>
        <div className="ai-panel-actions" onClick={e => e.stopPropagation()}>
          <button
            className="btn btn-ghost btn-sm ai-refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            title="Refresh analysis"
          >
            {refreshing ? <span className="spinner" /> : '↻'}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setExpanded(p => !p)}
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="ai-panel-body">
          {loading ? (
            <div className="ai-panel-loading">
              <span className="spinner" />
              <p>Analyzing your application history...</p>
            </div>
          ) : error ? (
            <div className="ai-panel-error">
              <p>⚠️ {error}</p>
              <button className="btn btn-secondary btn-sm" onClick={fetchInsight}>
                Try again
              </button>
            </div>
          ) : !insight ? (
            <div className="ai-panel-empty">
              <p>🚀 No analysis yet. Add some applications and click refresh to get AI insights!</p>
              <button className="btn btn-primary btn-sm" onClick={handleRefresh} disabled={refreshing}>
                {refreshing ? <><span className="spinner" /> Analyzing...</> : 'Generate Analysis'}
              </button>
            </div>
          ) : (
            <>
              {renderInsightContent()}
              {insight?.last_updated && (
                <p className="ai-panel-timestamp">
                  Last updated: {new Date(insight.last_updated).toLocaleString()}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
