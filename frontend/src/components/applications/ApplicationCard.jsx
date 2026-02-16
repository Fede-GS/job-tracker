import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import './ApplicationCard.css';

export default function ApplicationCard({ app }) {
  return (
    <Link to={`/applications/${app.id}`} className="app-card">
      <div className="app-card-main">
        <div className="app-card-info">
          <h3 className="app-card-role">{app.role}</h3>
          <p className="app-card-company">{app.company}</p>
        </div>
        <StatusBadge status={app.status} />
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
