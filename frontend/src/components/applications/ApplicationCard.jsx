import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import './ApplicationCard.css';

const scoreColor = (score) => {
  if (score >= 7) return 'var(--success)';
  if (score >= 4) return 'var(--warning)';
  return 'var(--error)';
};

export default function ApplicationCard({ app }) {
  return (
    <Link to={`/applications/${app.id}`} className="app-card">
      <div className="app-card-main">
        <div className="app-card-info">
          <h3 className="app-card-role">{app.role}</h3>
          <p className="app-card-company">{app.company}</p>
        </div>
        <div className="app-card-right">
          {app.match_score != null && (
            <div className="app-card-score" style={{ '--score-color': scoreColor(app.match_score) }}>
              <svg className="score-ring" viewBox="0 0 36 36">
                <circle className="score-ring-bg" cx="18" cy="18" r="15.5" />
                <circle
                  className="score-ring-fill"
                  cx="18" cy="18" r="15.5"
                  strokeDasharray={`${(app.match_score / 10) * 97.4} 97.4`}
                />
              </svg>
              <span className="score-text">{app.match_score}</span>
            </div>
          )}
          <StatusBadge status={app.status} />
        </div>
      </div>
      <div className="app-card-meta">
        {app.location && <span className="app-card-location">{app.location}</span>}
        {app.salary_min && app.salary_max && (
          <span className="app-card-salary">
            {app.salary_min.toLocaleString()}-{app.salary_max.toLocaleString()} {app.salary_currency}
          </span>
        )}
        <span className="app-card-date">
          {new Date(app.applied_date).toLocaleDateString('it-IT')}
        </span>
      </div>
    </Link>
  );
}
