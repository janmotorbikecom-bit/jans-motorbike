import React, { useState, useEffect } from 'react';

export default function MoneyInput({ value, onChange, ...props }) {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    // Only update display value if it's different from what would be formatted
    if (value === '' || value === null || value === undefined) {
      setDisplayValue('');
    } else {
      const numStr = String(value).replace(/\D/g, '');
      const num = parseInt(numStr, 10);
      if (!isNaN(num)) {
        const formatted = new Intl.NumberFormat('vi-VN').format(num);
        // Only update if it doesn't match to avoid overriding user typing . instead of ,
        if (displayValue.replace(/\D/g, '') !== numStr) {
          setDisplayValue(formatted);
        }
      } else {
        setDisplayValue('');
      }
    }
  }, [value]);

  const handleChange = (e) => {
    let raw = e.target.value;
    // Xóa tất cả các ký tự không phải số
    let numStr = raw.replace(/\D/g, '');
    
    if (numStr === '') {
      setDisplayValue('');
      if (onChange) {
        onChange({ target: { value: '' } });
      }
      return;
    }

    const num = parseInt(numStr, 10);
    const formatted = new Intl.NumberFormat('vi-VN').format(num);
    setDisplayValue(formatted);
    // Vẫn trả về số thật (không có dấu chấm) cho component cha
    if (onChange) {
      onChange({ target: { value: numStr } });
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      {...props}
    />
  );
}
