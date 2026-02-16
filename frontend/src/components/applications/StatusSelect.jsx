import { useTranslation } from 'react-i18next';
import { STATUS_CONFIG } from './StatusBadge';

export default function StatusSelect({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <select
      className="form-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ maxWidth: 180 }}
    >
      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
        <option key={key} value={key}>{t(config.labelKey)}</option>
      ))}
    </select>
  );
}
