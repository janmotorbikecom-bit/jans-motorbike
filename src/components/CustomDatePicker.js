import React from 'react';
import DatePicker from 'react-datepicker';
import { vi } from 'date-fns/locale/vi';
import 'react-datepicker/dist/react-datepicker.css';

// value is expected as DD/MM/YYYY
// onChange will emit an event-like object { target: { value: 'DD/MM/YYYY' } }
export default function CustomDatePicker({ value, onChange, className, placeholderText, required, style }) {
  const parseDate = (str) => {
    if (!str) return null;
    const parts = str.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const date = new Date(y, m, d);
      if (!isNaN(date.getTime())) return date;
    }
    if (str.includes('-')) {
        const parts = str.split('-');
        if (parts.length === 3) {
            const date = new Date(parts[0], parseInt(parts[1], 10) - 1, parts[2]);
            if (!isNaN(date.getTime())) return date;
        }
    }
    return null;
  };

  const formatDate = (date) => {
    if (!date) return '';
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  return (
    <div style={{ width: '100%', ...style }}>
      <DatePicker
        selected={parseDate(value)}
        onChange={(date) => onChange({ target: { value: formatDate(date) } })}
        dateFormat="dd/MM/yyyy"
        locale={vi}
        className={className}
        placeholderText={placeholderText || "DD/MM/YYYY"}
        required={required}
        customInput={<input style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />}
      />
    </div>
  );
}
