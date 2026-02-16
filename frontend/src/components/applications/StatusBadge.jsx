import { useTranslation } from 'react-i18next';
import './StatusBadge.css';

const STATUS_CONFIG = {
  draft:     { labelKey: 'statuses.draft',     color: 'var(--status-draft)',     bg: 'var(--status-draft-bg)' },
  sent:      { labelKey: 'statuses.sent',      color: 'var(--status-sent)',      bg: 'var(--status-sent-bg)' },
  interview: { labelKey: 'statuses.interview',  color: 'var(--status-interview)', bg: 'var(--status-interview-bg)' },
  rejected:  { labelKey: 'statuses.rejected',   color: 'var(--status-rejected)',  bg: 'var(--status-rejected-bg)' },
};

export { STATUS_CONFIG };

export default function StatusBadge({ status }) {
  const { t } = useTranslation();
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.sent;
  return (
    <span
      className="status-badge"
      style={{ color: config.color, background: config.bg }}
    >
      {t(config.labelKey)}
    </span>
  );
}
