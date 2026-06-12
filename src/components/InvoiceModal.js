'use client';

import { useMemo, useState } from 'react';

function parseDate(str) {
  if (!str) return null;
  const parts = String(str).split('/');
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    const date = new Date(y, m, d);
    if (!isNaN(date.getTime())) return date;
  }
  const date = new Date(str);
  if (!isNaN(date.getTime())) return date;
  return null;
}

function formatDate(value) {
  if (!value) return '—';
  const str = String(value).trim();
  const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (match) {
    const d = match[1].padStart(2, '0');
    const m = match[2].padStart(2, '0');
    let y = match[3];
    if (y.length === 2) y = '20' + y;
    return `${d}/${m}/${y}`;
  }
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }
  return str;
}

function formatEngDate(dateObj) {
  if (!dateObj) return '—';
  return dateObj.toLocaleDateString('en-GB', { month: 'short', day: '2-digit', year: 'numeric' });
}

function formatViDate(dateObj) {
  if (!dateObj) return '—';
  const d = String(dateObj.getDate()).padStart(2, '0');
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const y = dateObj.getFullYear();
  return `${d}/${m}/${y}`;
}

export default function InvoiceModal({ open, onClose, customer }) {
  const [lang, setLang] = useState('vi');

  const { periods, totalDue, overdueDays, paidPeriodsCount } = useMemo(() => {
    if (!customer) return { periods: [], totalDue: 0, overdueDays: 0, paidPeriodsCount: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = parseDate(customer.ngayBatDau);
    const end = parseDate(customer.ngayKetThuc);
    const rentAmount = parseFloat(String(customer.giaThue || '0').replace(/[^\d.-]/g, '')) || 0;

    let overdueDays = 0;
    let paidPeriodsCount = 0;
    
    if (start && end) {
      // Calculate paid periods roughly by months between start and end
      let temp = new Date(start);
      while (temp < end) {
        temp.setMonth(temp.getMonth() + 1);
        paidPeriodsCount++;
      }
    }

    if (end) {
      const diffTime = today.getTime() - end.getTime();
      overdueDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    }

    const unpaidPeriods = [];
    if (end) {
      let currentPeriodStart = new Date(end);
      
      // Generate periods until we cover "today"
      let periodIndex = 1;
      while (currentPeriodStart < today) {
        let currentPeriodEnd = new Date(currentPeriodStart);
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
        
        let daysLate = Math.max(0, Math.floor((today.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24)));

        unpaidPeriods.push({
          num: periodIndex++,
          start: currentPeriodStart,
          end: currentPeriodEnd,
          daysLate,
          amount: rentAmount
        });

        currentPeriodStart = new Date(currentPeriodEnd);
      }
    }

    const totalDue = unpaidPeriods.length * rentAmount;

    return {
      periods: unpaidPeriods,
      totalDue,
      overdueDays,
      paidPeriodsCount
    };
  }, [customer]);

  if (!open || !customer) return null;

  const fmtDate = lang === 'vi' ? formatViDate : formatEngDate;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', border: '1px solid var(--border)',
        borderRadius: '16px', width: '100%', maxWidth: '360px',
        maxHeight: '95vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        overflow: 'hidden'
      }}>
        
        {/* Language Toggle */}
        <div style={{ display: 'flex', gap: '8px', padding: '16px 16px 0', justifyContent: 'center' }}>
          <button onClick={() => setLang('vi')} style={{ padding: '6px 12px', borderRadius: '8px', background: lang === 'vi' ? '#1e3a8a' : '#f1f5f9', color: lang === 'vi' ? '#fff' : '#64748b', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', transition: 'all 0.2s' }}>Tiếng Việt</button>
          <button onClick={() => setLang('en')} style={{ padding: '6px 12px', borderRadius: '8px', background: lang === 'en' ? '#1e3a8a' : '#f1f5f9', color: lang === 'en' ? '#fff' : '#64748b', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', transition: 'all 0.2s' }}>English</button>
        </div>

        {/* Printable Area */}
        <div id="invoice-printable" style={{ padding: '16px', color: '#333', overflowY: 'auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <h2 style={{ margin: '0 0 2px', fontSize: '16px', fontWeight: '900', letterSpacing: '1px', color: '#111' }}>JAN&apos;S MOTORBIKE</h2>
            <p style={{ margin: 0, fontSize: '10px', color: '#666' }}>Hồ Chí Minh</p>
          </div>

          {overdueDays > 0 && (
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <span style={{ 
                background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', 
                padding: '2px 10px', borderRadius: '16px', fontSize: '10px', fontWeight: 'bold' 
              }}>
                {lang === 'vi' ? `⚠️ QUÁ HẠN ${overdueDays} NGÀY` : `⚠️ OVERDUE ${overdueDays} DAYS`}
              </span>
            </div>
          )}

          <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
            <p style={{ textAlign: 'center', margin: '0 0 10px', fontSize: '10px', fontWeight: 'bold', color: '#64748b', letterSpacing: '0.5px' }}>
              {lang === 'vi' ? 'THÔNG TIN KHÁCH HÀNG' : 'CUSTOMER INFORMATION'}
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '6px 0', fontSize: '11px' }}>
              <span style={{ color: '#64748b' }}>{lang === 'vi' ? 'Khách hàng' : 'Customer'}</span>
              <span style={{ fontWeight: '600', textAlign: 'right' }}>{customer.tenKH || '—'}</span>

              <span style={{ color: '#64748b' }}>{lang === 'vi' ? 'Liên hệ' : 'Contact'}</span>
              <span style={{ fontWeight: '600', textAlign: 'right' }}>{customer.lienLac || customer.sdt || '—'}</span>

              <span style={{ color: '#64748b' }}>{lang === 'vi' ? 'Xe thuê' : 'Vehicle'}</span>
              <span style={{ fontWeight: '600', textAlign: 'right' }}>{customer.xeThue || '—'}</span>

              <span style={{ color: '#64748b' }}>{lang === 'vi' ? 'Biển số' : 'License Plate'}</span>
              <span style={{ fontWeight: '600', textAlign: 'right' }}>{customer.bienSo || '—'}</span>

              <span style={{ color: '#64748b' }}>{lang === 'vi' ? 'Giá thuê tháng' : 'Monthly Rent'}</span>
              <span style={{ fontWeight: '600', textAlign: 'right' }}>{new Intl.NumberFormat('vi-VN').format(customer.giaThue || 0)} VND</span>

              <span style={{ color: '#64748b' }}>{lang === 'vi' ? 'Ngày bắt đầu' : 'Start Date'}</span>
              <span style={{ fontWeight: '600', textAlign: 'right' }}>{fmtDate(parseDate(customer.ngayBatDau))}</span>

              <span style={{ color: '#64748b' }}>{lang === 'vi' ? 'Ngày kết thúc' : 'End Date'}</span>
              <span style={{ fontWeight: '600', textAlign: 'right' }}>{fmtDate(parseDate(customer.ngayKetThuc))}</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#16a34a', margin: '0 0 4px' }}>
              {lang === 'vi' ? `✓ ĐÃ THANH TOÁN (${paidPeriodsCount} KỲ)` : `✓ PAID (${paidPeriodsCount} PERIODS)`}
            </p>
            {paidPeriodsCount === 0 ? (
              <p style={{ fontSize: '11px', fontStyle: 'italic', color: '#94a3b8', margin: 0 }}>
                {lang === 'vi' ? 'Chưa thanh toán kỳ nào' : 'No payments made yet'}
              </p>
            ) : (
              <p style={{ fontSize: '11px', fontStyle: 'italic', color: '#94a3b8', margin: 0 }}>
                {lang === 'vi' ? `Đã thanh toán đến ${fmtDate(parseDate(customer.ngayKetThuc))}` : `Paid up to ${fmtDate(parseDate(customer.ngayKetThuc))}`}
              </p>
            )}
          </div>

          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#b91c1c', margin: '0' }}>
              {lang === 'vi' ? `CHƯA THANH TOÁN (${periods.length} KỲ)` : `UNPAID (${periods.length} PERIODS)`}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
            {periods.length === 0 ? (
              <p style={{ textAlign: 'center', fontSize: '11px', fontStyle: 'italic', color: '#94a3b8', margin: 0 }}>
                {lang === 'vi' ? 'Không có nợ' : 'No unpaid periods'}
              </p>
            ) : periods.map((p, i) => (
              <div key={i} style={{ 
                background: '#fef2f2', borderLeft: '3px solid #b91c1c', borderRadius: '4px', 
                padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: '10px', color: '#7f1d1d' }}>
                    {lang === 'vi' ? `Kỳ ${p.num}:` : `Period ${p.num}:`} {fmtDate(p.start)} → {fmtDate(p.end)}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {p.daysLate > 0 && (
                    <span style={{ background: '#fecaca', color: '#991b1b', fontSize: '9px', padding: '2px 4px', borderRadius: '4px' }}>
                      {lang === 'vi' ? `Trễ ${p.daysLate} ngày` : `${p.daysLate}d late`}
                    </span>
                  )}
                  <span style={{ fontWeight: 'bold', color: '#b91c1c', fontSize: '11px' }}>
                    {new Intl.NumberFormat('vi-VN').format(p.amount)} VND
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ 
            background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', 
            padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
          }}>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: '11px', fontWeight: 'bold', color: '#7f1d1d' }}>
                {lang === 'vi' ? 'Tổng Nợ' : 'Total Due'}
              </p>
              <p style={{ margin: 0, fontSize: '10px', color: '#16a34a' }}>
                {lang === 'vi' ? 'Đã trả: 0 VND' : 'Paid: 0 VND'}
              </p>
            </div>
            <div style={{ fontSize: '16px', fontWeight: '900', color: '#dc2626' }}>
              {new Intl.NumberFormat('vi-VN').format(totalDue)} VND
            </div>
          </div>

        </div>

        {/* Modal Actions */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button onClick={onClose} style={{ 
            padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', 
            background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' 
          }}>
            {lang === 'vi' ? 'Đóng' : 'Close'}
          </button>
          <button 
            onClick={() => {
              const printContent = document.getElementById('invoice-printable').innerHTML;
              const originalContent = document.body.innerHTML;
              document.body.innerHTML = `<div style="max-width: 600px; margin: 0 auto;">${printContent}</div>`;
              window.print();
              document.body.innerHTML = originalContent;
              window.location.reload(); // Reload to restore React state cleanly after innerHTML swap
            }} 
            style={{ 
              padding: '8px 20px', borderRadius: '8px', border: 'none', 
              background: '#22c55e', color: '#fff', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            🖨️ {lang === 'vi' ? 'In / PDF' : 'Print / PDF'}
          </button>
        </div>

      </div>
    </div>
  );
}
