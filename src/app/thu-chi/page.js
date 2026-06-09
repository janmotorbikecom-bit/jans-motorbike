'use client';

import { useState, useEffect, useMemo } from 'react';
import { callAPI } from '@/lib/api';

function fmtMoney(n) {
  if (!n || isNaN(n) || n === 0) return '0 đ';
  return new Intl.NumberFormat('vi-VN').format(n) + ' đ';
}

function fmtDate(d) {
  if (!d) return '—';
  return String(d).trim();
}

export default function ThuChiPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterLoai, setFilterLoai] = useState(''); // '' | 'Thu' | 'Chi'
  const [filterMonth, setFilterMonth] = useState('');

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const result = await callAPI('getThuChiData', '', '', '');
      const userData = result?.data || result;
      let list = [];
      if (Array.isArray(userData)) list = userData;
      else if (Array.isArray(userData?.data)) list = userData.data;
      setData(list);
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  // Stats
  const tongThu = data.filter(r => r.loai === 'Thu').reduce((s, r) => s + (parseFloat(r.soTien) || 0), 0);
  const tongChi = data.filter(r => r.loai === 'Chi').reduce((s, r) => s + (parseFloat(r.soTien) || 0), 0);
  const loiNhuan = tongThu - tongChi;

  // Lấy danh sách tháng unique
  const months = useMemo(() => {
    const set = new Set();
    data.forEach(r => {
      if (r.ngay) {
        const parts = String(r.ngay).split('/');
        if (parts.length >= 3) set.add(`${parts[1]}/${parts[2]}`);
        else if (parts.length === 2) set.add(`${parts[0]}/${parts[1]}`);
      }
    });
    return Array.from(set).sort().reverse();
  }, [data]);

  // Filter
  const filtered = useMemo(() => {
    let list = [...data];
    if (filterLoai) list = list.filter(r => r.loai === filterLoai);
    if (filterMonth) list = list.filter(r => {
      const parts = String(r.ngay || '').split('/');
      const m = parts.length >= 3 ? `${parts[1]}/${parts[2]}` : '';
      return m === filterMonth;
    });
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r =>
        (r.khach || '').toLowerCase().includes(q) ||
        (r.danhMuc || '').toLowerCase().includes(q) ||
        (r.bienSo || '').toLowerCase().includes(q) ||
        (r.ghiChu || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, filterLoai, filterMonth, search]);

  const filteredThu = filtered.filter(r => r.loai === 'Thu').reduce((s, r) => s + (parseFloat(r.soTien) || 0), 0);
  const filteredChi = filtered.filter(r => r.loai === 'Chi').reduce((s, r) => s + (parseFloat(r.soTien) || 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: '#030712', color: '#e2e8f0', padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ color: '#f97316', fontSize: '13px', fontWeight: 600, margin: '0 0 4px' }}>Jan&apos;s Motorbike</p>
        <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: 700, margin: 0 }}>Thu - Chi</h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0' }}>Sổ thu chi toàn bộ giao dịch</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px' }}>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 6px' }}>Tổng thu</p>
          <p style={{ color: '#22c55e', fontSize: '22px', fontWeight: 700, margin: 0 }}>{fmtMoney(tongThu)}</p>
        </div>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px' }}>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 6px' }}>Tổng chi</p>
          <p style={{ color: '#ef4444', fontSize: '22px', fontWeight: 700, margin: 0 }}>{fmtMoney(tongChi)}</p>
        </div>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px' }}>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 6px' }}>Lợi nhuận</p>
          <p style={{ color: loiNhuan >= 0 ? '#22c55e' : '#ef4444', fontSize: '22px', fontWeight: 700, margin: 0 }}>{fmtMoney(loiNhuan)}</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm khách, danh mục, biển số..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Filter loại */}
        <select value={filterLoai} onChange={e => setFilterLoai(e.target.value)}
          style={{ padding: '9px 12px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none' }}>
          <option value="">Tất cả</option>
          <option value="Thu">Thu</option>
          <option value="Chi">Chi</option>
        </select>

        {/* Filter tháng */}
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          style={{ padding: '9px 12px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none' }}>
          <option value="">Tất cả tháng</option>
          {months.map(m => <option key={m} value={m}>Tháng {m}</option>)}
        </select>

        {/* Reset */}
        {(filterLoai || filterMonth || search) && (
          <button onClick={() => { setFilterLoai(''); setFilterMonth(''); setSearch(''); }}
            style={{ padding: '9px 14px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}>
            Xóa lọc
          </button>
        )}
      </div>

      {/* Summary filtered */}
      {!loading && !error && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '13px' }}>
          <span style={{ color: '#64748b' }}>{filtered.length} giao dịch</span>
          <span style={{ color: '#22c55e' }}>Thu: {fmtMoney(filteredThu)}</span>
          <span style={{ color: '#ef4444' }}>Chi: {fmtMoney(filteredChi)}</span>
          <span style={{ color: filteredThu - filteredChi >= 0 ? '#22c55e' : '#ef4444' }}>
            Lợi nhuận: {fmtMoney(filteredThu - filteredChi)}
          </span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '64px', textAlign: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #f97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#64748b' }}>Đang tải dữ liệu...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: '#450a0a', border: '1px solid #991b1b', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
          <p style={{ color: '#fca5a5', marginBottom: '12px' }}>{error}</p>
          <button onClick={loadData} style={{ background: '#f97316', border: 'none', borderRadius: '8px', color: '#fff', padding: '8px 20px', cursor: 'pointer' }}>Thử lại</button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e293b', background: '#0a0f1e' }}>
                  {['Ngày', 'Loại', 'Danh mục', 'Khách / Ghi chú', 'Biển số', 'Chi nhánh', 'Số tiền'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', color: '#64748b', fontWeight: 500, textAlign: h === 'Số tiền' ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                    {search || filterLoai || filterMonth ? 'Không tìm thấy giao dịch phù hợp' : 'Chưa có giao dịch nào'}
                  </td></tr>
                ) : (
                  filtered.map((r, i) => {
                    const isThu = r.loai === 'Thu';
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #0f172a', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#1e293b40'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '11px 14px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmtDate(r.ngay)}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                            background: isThu ? '#166534' : '#7f1d1d',
                            color: isThu ? '#86efac' : '#fca5a5',
                          }}>{r.loai}</span>
                        </td>
                        <td style={{ padding: '11px 14px', color: '#cbd5e1' }}>{r.danhMuc || '—'}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ color: '#fff', fontWeight: 500 }}>{r.khach || r.nguoiMua || '—'}</div>
                          {r.ghiChu && <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>{r.ghiChu}</div>}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          {r.bienSo ? (
                            <span style={{ fontFamily: 'monospace', background: '#1e293b', padding: '2px 8px', borderRadius: '4px', color: '#94a3b8', fontSize: '12px' }}>
                              {r.bienSo}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '11px 14px', color: '#64748b' }}>{r.chiNhanh || '—'}</td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: isThu ? '#22c55e' : '#ef4444', whiteSpace: 'nowrap' }}>
                          {isThu ? '+' : '-'}{fmtMoney(r.soTien)}
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