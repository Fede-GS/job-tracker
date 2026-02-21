import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { searchJobs, analyzeJobMatch, saveJobApplication, getSmartSuggestions } from '../api/jobSearch';
import { useNotification } from '../context/NotificationContext';
import Modal from '../components/common/Modal';
import PageTutorial from '../components/common/PageTutorial';
import './JobSearch.css';

// Adzuna API supported countries only
const COUNTRIES = [
  'gb', 'us', 'de', 'fr', 'au', 'nz', 'ca', 'in', 'pl', 'br', 'at', 'za',
];

const scoreColor = (score) => {
  if (score >= 7) return 'var(--success)';
  if (score >= 4) return 'var(--warning)';
  return 'var(--error)';
};

export default function JobSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('gb');
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Match analysis state
  const [analyzingId, setAnalyzingId] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [matchJob, setMatchJob] = useState(null);
  const [showMatchModal, setShowMatchModal] = useState(false);

  // Save state
  const [savingId, setSavingId] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());

  // API not configured state
  const [apiNotConfigured, setApiNotConfigured] = useState(false);

  // Smart suggestions state
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  const handleSearch = async (targetPage = 1) => {
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    setApiNotConfigured(false);

    try {
      const result = await searchJobs({ q: query.trim(), location: location.trim(), country, page: targetPage });
      setJobs(result.jobs || []);
      setTotal(result.total || 0);
      setPage(result.page || 1);
      setPages(result.pages || 0);
    } catch (err) {
      if (err.status === 422) {
        setApiNotConfigured(true);
      } else {
        addNotification(err.message || t('common.error'), 'error');
      }
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (job) => {
    setAnalyzingId(job.adzuna_id);
    try {
      const { analysis } = await analyzeJobMatch({
        job_description: job.description,
        job_title: job.title,
        company: job.company,
      });
      setMatchResult(analysis);
      setMatchJob(job);
      setShowMatchModal(true);
    } catch (err) {
      addNotification(err.message || t('common.error'), 'error');
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleSave = async (job, analysis = null) => {
    setSavingId(job.adzuna_id);
    try {
      const { application } = await saveJobApplication({
        title: job.title,
        company: job.company,
        location: job.location,
        url: job.url,
        description: job.description,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        match_analysis: analysis,
      });
      setSavedIds((prev) => new Set(prev).add(job.adzuna_id));
      addNotification(t('common.success'), 'success');
      // Navigate to the new application
      navigate(`/applications/${application.id}`);
    } catch (err) {
      addNotification(err.message || t('common.error'), 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleSmartSearch = async () => {
    setLoadingSuggestions(true);
    try {
      const data = await getSmartSuggestions();
      setSuggestions(data.suggestions || []);
      if (data.profile_location) setLocation(data.profile_location);
    } catch (err) {
      if (err.status === 422) {
        setApiNotConfigured(true);
      } else {
        addNotification(err.message || t('common.error'), 'error');
      }
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const useSuggestion = (suggestion) => {
    setQuery(suggestion.query);
    if (suggestion.location) setLocation(suggestion.location);
    setSuggestions(null);
    setTimeout(() => handleSearch(1), 100);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(1);
    }
  };

  const closeModal = () => {
    setShowMatchModal(false);
    setMatchResult(null);
    setMatchJob(null);
  };

  return (
    <div className="job-search-page">
      <PageTutorial pageKey="jobSearch" icon="travel_explore" />
      <div className="page-header">
        <h1>{t('jobSearch.title')}</h1>
        <p>{t('jobSearch.subtitle')}</p>
      </div>

      {/* Search bar */}
      <div className="job-search-bar">
        <input
          className="form-input job-search-input"
          type="text"
          placeholder={t('jobSearch.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <input
          className="form-input job-location-input"
          type="text"
          placeholder={t('jobSearch.locationPlaceholder')}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <select className="form-select job-country-select" value={country} onChange={(e) => setCountry(e.target.value)}>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>{t(`jobSearch.countries.${c}`)}</option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={() => handleSearch(1)} disabled={loading || !query.trim()}>
          {loading ? <><span className="spinner" /> {t('jobSearch.searching')}</> : t('jobSearch.search')}
        </button>
        <button
          className="btn btn-secondary btn-smart-search"
          onClick={handleSmartSearch}
          disabled={loadingSuggestions}
          title={t('jobSearch.smartSearchTooltip')}
        >
          {loadingSuggestions
            ? <><span className="spinner" /></>
            : <><span className="material-icon">auto_awesome</span> {t('jobSearch.smartSearch')}</>
          }
        </button>
      </div>

      {/* Smart suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="smart-suggestions">
          <span className="smart-suggestions-label">{t('jobSearch.suggestedSearches')}</span>
          <div className="smart-suggestions-chips">
            {suggestions.map((s, i) => (
              <button key={i} className="suggestion-chip" onClick={() => useSuggestion(s)}>
                <span className="material-icon">search</span>
                {s.query}{s.location ? ` — ${s.location}` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* API not configured */}
      {apiNotConfigured && (
        <div className="card job-search-empty">
          <span className="material-icon" style={{ fontSize: 40, color: 'var(--warning)', marginBottom: 12 }}>key</span>
          <h3>{t('jobSearch.configureApi')}</h3>
          <p>{t('jobSearch.configureApiDesc')}</p>
          <Link to="/settings" className="btn btn-primary" style={{ marginTop: 12 }}>{t('jobSearch.goToSettings')}</Link>
        </div>
      )}

      {/* No search yet */}
      {!searched && !apiNotConfigured && (
        <div className="card job-search-empty">
          <span className="material-icon" style={{ fontSize: 48, color: 'var(--text-muted)', marginBottom: 12 }}>travel_explore</span>
          <h3>{t('jobSearch.noSearch')}</h3>
          <p>{t('jobSearch.noSearchDesc')}</p>
        </div>
      )}

      {/* Results header */}
      {searched && !apiNotConfigured && !loading && (
        <p className="job-results-count">{total.toLocaleString()} {t('jobSearch.results')}</p>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto', width: 32, height: 32 }} />
        </div>
      )}

      {/* Results */}
      {!loading && searched && !apiNotConfigured && jobs.length > 0 && (
        <>
          <div className="job-results-grid">
            {jobs.map((job) => (
              <div key={job.adzuna_id} className="card job-card">
                <div className="job-card-header">
                  <h3 className="job-card-title">{job.title}</h3>
                  <span className="job-card-company">{job.company}</span>
                </div>

                <div className="job-card-meta">
                  {job.location && (
                    <span className="job-meta-item">
                      <span className="material-icon">location_on</span> {job.location}
                    </span>
                  )}
                  {(job.salary_min || job.salary_max) && (
                    <span className="job-meta-item job-salary">
                      <span className="material-icon">payments</span>
                      {job.salary_min && job.salary_max
                        ? `${Math.round(job.salary_min).toLocaleString()} - ${Math.round(job.salary_max).toLocaleString()}`
                        : job.salary_max
                        ? `${t('jobSearch.salary')} ${Math.round(job.salary_max).toLocaleString()}`
                        : `${Math.round(job.salary_min).toLocaleString()}+`
                      }
                    </span>
                  )}
                  {job.category && (
                    <span className="job-meta-item">
                      <span className="material-icon">category</span> {job.category}
                    </span>
                  )}
                </div>

                <p className="job-card-description">{job.description}</p>

                <div className="job-card-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleAnalyze(job)}
                    disabled={analyzingId === job.adzuna_id}
                  >
                    {analyzingId === job.adzuna_id
                      ? <><span className="spinner" /> {t('jobSearch.analyzing')}</>
                      : t('jobSearch.analyzeMatch')
                    }
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleSave(job)}
                    disabled={savingId === job.adzuna_id || savedIds.has(job.adzuna_id)}
                  >
                    {savedIds.has(job.adzuna_id)
                      ? t('jobSearch.saved')
                      : savingId === job.adzuna_id
                      ? <><span className="spinner" /> {t('jobSearch.saving')}</>
                      : t('jobSearch.saveApplication')
                    }
                  </button>
                  {job.url && (
                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                      {t('jobSearch.viewOriginal')} ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="pagination">
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => handleSearch(page - 1)}>
                &larr;
              </button>
              <span className="pagination-info">{page} / {pages}</span>
              <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => handleSearch(page + 1)}>
                &rarr;
              </button>
            </div>
          )}
        </>
      )}

      {/* No results */}
      {!loading && searched && !apiNotConfigured && jobs.length === 0 && (
        <div className="card job-search-empty">
          <h3>{t('jobSearch.noResults')}</h3>
        </div>
      )}

      {/* Match analysis modal */}
      <Modal isOpen={showMatchModal} onClose={closeModal} title={t('jobSearch.matchScore')}>
        {matchResult && matchJob && (
          <div className="match-modal-content">
            <div className="match-modal-header">
              <div className="score-circle" style={{ borderColor: scoreColor(matchResult.match_score) }}>
                <span className="score-value">{matchResult.match_score}</span>
                <span className="score-label">/10</span>
              </div>
              <div>
                <h3 style={{ margin: 0 }}>{matchJob.title}</h3>
                <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>{matchJob.company}</p>
              </div>
            </div>

            {matchResult.recommendation && (
              <p className="match-recommendation">{matchResult.recommendation}</p>
            )}

            <div className="match-columns">
              {matchResult.strengths && matchResult.strengths.length > 0 && (
                <div className="match-column strengths">
                  <h4>{t('jobSearch.strengths')}</h4>
                  <ul>
                    {matchResult.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {matchResult.gaps && matchResult.gaps.length > 0 && (
                <div className="match-column gaps">
                  <h4>{t('jobSearch.gaps')}</h4>
                  <ul>
                    {matchResult.gaps.map((g, i) => <li key={i}>{g}</li>)}
                  </ul>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={closeModal}>{t('jobSearch.closeAnalysis')}</button>
              <button
                className="btn btn-primary"
                onClick={() => { handleSave(matchJob, matchResult); closeModal(); }}
                disabled={savedIds.has(matchJob.adzuna_id)}
              >
                {savedIds.has(matchJob.adzuna_id) ? t('jobSearch.saved') : t('jobSearch.saveApplication')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
