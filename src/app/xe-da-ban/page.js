'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';

function fmtMoney(n) {
  if (!n && n !== 0) return '—';
  const num = parseFloat(n);
  if (isNaN(num)) return '—';
  if (num === 0) return '0 đ';
  return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
}

function fmtDate(d) {
  if (!d) return '—';
  return String(d).trim();
}

export default function XeDaBanPage() {
  const { xeDaBan, thuChi, loading, error, reload } = useStore();
  const [search, setSearch] = useState('');

  // Use dedicated xeDaBan data; fallback to "Bán xe" transactions in thuChi
  const soldData = useMemo(() => {
    if (xeDaBan && xeDaBan.length > 0) return xeDaBan;
    // Fallback: filter "Bán xe" entries from thuChi
    return thuChi.filter(r => (r.danhMuc || '').toLowerCase().includes('bán xe'));
  }, [xeDaBan, thuChi]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return soldData;
    return soldData.filter(r =>
      (r.model || r.tenXe || '').toLowerCase().includes(q) ||
      (r.bienSo || '').toLowerCase().includes(q) ||
      (r.nguoiMua || r.khach || '').toLowerCase().includes(q) ||
      (r.chiNhanh || '').toLowerCase().includes(q)
    );
  }, [soldData, search]);

  // Stats
  const tongBan = soldData.length;
  const tongDoanhThu = soldData.reduce((s, r) => s + (parseFloat(r.giaBan || r.soTien) || 0), 0);
  const tongVon = soldData.reduce((s, r) => s + (parseFloat(r.giaVon) || 0), 0);
  const tongLoiNhuan = soldData.reduce((s, r) => {
    const ln = parseFloat(r.loiNhuan);
    if (!isNaN(ln)) return s + ln;
    const gb = parseFloat(r.giaBan || r.soTien) || 0;
    const gv = parseFloat(r.giaVon) || 0;
    return s + (gb - gv);
  }, 0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '24px', transition: 'background-color 0.15s, color 0.15s' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ color: '#3b82f6', fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }}>JAN&apos;S MOTORBIKE</p>
        <h1 style={{ color: 'var(--text-primary)', fontSize: '28px', fontWeight: 700, margin: 0 }}>Xe đã bán</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 0' }}>Lịch sử xe đã giao dịch bán</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Tổng xe đã bán', value: tongBan, unit: 'xe', color: '#60a5fa' },
          { label: 'Tổng doanh thu', value: fmtMoney(tongDoanhThu), color: '#22c55e' },
          { label: 'Tổng giá vốn', value: fmtMoney(tongVon), color: '#3b82f6' },
          { label: 'Lợi nhuận', value: fmtMoney(tongLoiNhuan), color: tongLoiNhuan >= 0 ? '#22c55e' : '#ef4444' },
        ].map(card => (
          <div key={card.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', transition: 'background-color 0.15s, border-color 0.15s' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 6px', fontWeight: 500 }}>{card.label}</p>
            <p style={{ color: card.color, fontSize: card.unit ? '28px' : '18px', fontWeight: 700, margin: 0 }}>
              {card.value}
              {card.unit && <span style={{ fontSize: '14px', color: 'var(--text-secondary)', marginLeft: '4px' }}>{card.unit}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm theo tên xe, biển số, người mua..."
          style={{
            width: '100%', padding: '9px 12px 9px 36px',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px',
            outline: 'none', boxSizing: 'border-box',
            transition: 'background-color 0.15s, border-color 0.15s',
          }}
        />
      </div>

      {!loading && !error && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
          {filtered.length} / {tongBan} xe
        </p>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '64px', textAlign: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #1e3a8a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Đang tải dữ liệu...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
          <p style={{ color: '#fca5a5', marginBottom: '12px' }}>{error}</p>
          <button onClick={reload} style={{ background: '#1e3a8a', border: 'none', borderRadius: '8px', color: '#fff', padding: '8px 20px', cursor: 'pointer' }}>Thử lại</button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
                  {[
                    { label: 'Ngày bán', align: 'left' },
                    { label: 'Xe / Biển số', align: 'left' },
                    { label: 'Người mua', align: 'left' },
                    { label: 'Chi nhánh', align: 'left' },
                    { label: 'Giá vốn', align: 'right' },
                    { label: 'Giá bán', align: 'right' },
                    { label: 'Lợi nhuận', align: 'right' },
                  ].map(h => (
                    <th key={h.label} style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontWeight: 500, textAlign: h.align, whiteSpace: 'nowrap' }}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                      {search ? 'Không tìm thấy xe phù hợp' : 'Chưa có dữ liệu xe đã bán'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, i) => {
                    const giaBan = parseFloat(r.giaBan || r.soTien) || 0;
                    const giaVon = parseFloat(r.giaVon) || 0;
                    const loiNhuan = !isNaN(parseFloat(r.loiNhuan)) ? parseFloat(r.loiNhuan) : giaBan - giaVon;
                    return (
                      <tr key={i}
                        style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '11px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fmtDate(r.ngayBan || r.ngay)}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.model || r.tenXe || '—'}</div>
                          {r.bienSo && (
                            <span style={{ fontFamily: 'monospace', background: 'var(--bg-hover)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '11px', marginTop: '3px', display: 'inline-block' }}>
                              {r.bienSo}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '11px 14px', color: 'var(--text-primary)' }}>{r.nguoiMua || r.khach || '—'}</td>
                        <td style={{ padding: '11px 14px', color: 'var(--text-secondary)' }}>{r.chiNhanh || '—'}</td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', color: '#3b82f6', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtMoney(giaVon)}</td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', color: '#60a5fa', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtMoney(giaBan)}</td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: loiNhuan >= 0 ? '#22c55e' : '#ef4444', whiteSpace: 'nowrap' }}>
                          {loiNhuan >= 0 ? '+' : ''}{fmtMoney(loiNhuan)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
