'use client';

import { useState, useMemo, useEffect } from 'react';
import { callAPI } from '@/lib/api';
import { useStore } from '@/lib/store';
import CustomerProfileModal from '@/components/CustomerProfileModal';

function fmtMoney(n) {
  if (!n || isNaN(n) || n === 0) return '0 đ';
  return new Intl.NumberFormat('vi-VN').format(n) + ' đ';
}

function fmtDate(d) {
  if (!d) return '—';
  return String(d).trim();
}

function formatEngDate(dateStr) {
  if (!dateStr || dateStr === '—') return '—';
  const parts = String(dateStr).split('/');
  if (parts.length !== 3) return dateStr;
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const y = parseInt(parts[2], 10);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = months[m - 1] || m;
  const suffix = (d % 10 === 1 && d !== 11) ? 'st' : (d % 10 === 2 && d !== 12) ? 'nd' : (d % 10 === 3 && d !== 13) ? 'rd' : 'th';
  return `${d}${suffix} ${monthName} ${y}`;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  if (!msg) return null;
  const bg = type === 'error' ? 'var(--border)' : type === 'success' ? '#14532d' : 'var(--bg-hover)';
  const color = type === 'error' ? '#fca5a5' : type === 'success' ? '#86efac' : 'var(--text-primary)';
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
      background: bg, border: `1px solid ${color}40`,
      borderRadius: '10px', padding: '12px 20px',
      color, fontSize: '14px', fontWeight: 600,
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      animation: 'fadeInUp 0.2s ease',
    }}>
      {msg}
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}

// ── Modal Wrapper ─────────────────────────────────────────────────────────────
function Modal({ open, onClose, children, title, width = '520px' }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '16px', width: '100%', maxWidth: width,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '16px' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '2px 6px' }}>×</button>
        </div>
        <div style={{ padding: '22px' }}>{children}</div>
      </div>
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '9px 12px',
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px',
  outline: 'none', boxSizing: 'border-box',
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconPencil = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6.536-6.536a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 13.5l-4.5 1 1-4.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18" />
  </svg>
);
const IconReceipt = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);
const IconTrash = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const DANH_MUC_THU = ['Tiền thuê tháng', 'Thuê mới', 'Thuê ngắn', 'Phụ thu', 'Bán xe'];
const DANH_MUC_CHI = ['Bảo dưỡng', 'Thay phụ tùng', 'Nhiên liệu', 'Sửa chữa', 'Chi phí khác', 'Dịch vụ sửa xe', 'Thuế / phí cầu đường'];
const CHI_NHANH_OPTIONS = ['Giang', 'Châu Vân', 'Ân', 'Minh Minh', 'Ân ACB', 'Nghĩa', 'JCAR', 'Tường'];

function shouldShowBillSent(r) {
  if (r.loai !== 'Thu') return false;
  const dm = (r.danhMuc || '').toLowerCase();
  return dm.includes('thuê mới') || dm.includes('thue moi') || dm.includes('thuê tháng') || dm.includes('thue thang') || dm.includes('tiền thuê');
}

export default function ThuChiPage() {
  const { thuChi: data, khachHang, loading, error, reload, dispatch } = useStore();
  
  const getCurrentMonthKey = () => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  };

  const [search, setSearch] = useState('');
  const [filterLoai, setFilterLoai] = useState(''); // '' | 'Thu' | 'Chi'
  const [filterMonth, setFilterMonth] = useState(getCurrentMonthKey());
  const [filterChiNhanh, setFilterChiNhanh] = useState('');
  const [filterCTV, setFilterCTV] = useState('');
  const [filterDanhMuc, setFilterDanhMuc] = useState('');
  const [receiptLang, setReceiptLang] = useState('vi'); // 'vi' | 'en'
  const [ctvSummaryOpen, setCtvSummaryOpen] = useState(false);
  const [shopInfo, setShopInfo] = useState({ address: 'Hồ Chí Minh', phone: '090.xxx.xxxx' });

  useEffect(() => {
    async function fetchShopInfo() {
      try {
        const info = await callAPI('getShopInfo');
        if (info && (info.address || info.phone)) {
          setShopInfo({
            address: info.address || 'Hồ Chí Minh',
            phone: info.phone || '090.xxx.xxxx'
          });
        }
      } catch (e) {
        console.error('Lỗi khi tải thông tin cửa hàng:', e);
      }
    }
    fetchShopInfo();
  }, []);

  // Modals & forms state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    rowNum: '', ngay: '', loai: 'Thu', danhMuc: '', khach: '', bienSo: '', soTien: '', chiNhanh: '', ghiChu: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const [receiptRow, setReceiptRow] = useState(null);
  const [toast, setToast] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState({});
  const [billSentLoading, setBillSentLoading] = useState({});
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Unique month keys (MM/YYYY) sorted descending, ensuring current month is always available
  const months = useMemo(() => {
    const set = new Set();
    set.add(getCurrentMonthKey());
    data.forEach(r => {
      if (r.ngay) {
        const parts = String(r.ngay).split('/');
        if (parts.length >= 3) {
          set.add(`${parts[1]}/${parts[2]}`);
        }
      }
    });
    return Array.from(set).sort((a, b) => {
      const [ma, ya] = a.split('/').map(Number);
      const [mb, yb] = b.split('/').map(Number);
      if (ya !== yb) return yb - ya;
      return mb - ma;
    });
  }, [data]);

  // Unique branches list
  const branches = useMemo(() => {
    const set = new Set();
    data.forEach(r => {
      if (r.chiNhanh) set.add(r.chiNhanh.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [data]);

  // Unique CTVs list
  const ctvs = useMemo(() => {
    const set = new Set();
    data.forEach(r => {
      if (r.congTacVien) set.add(r.congTacVien.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [data]);

  // Unique Danh mục list
  const danhMucs = useMemo(() => {
    const set = new Set();
    data.forEach(r => {
      if (filterLoai && r.loai !== filterLoai) return;
      if (r.danhMuc) set.add(r.danhMuc.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [data, filterLoai]);

  // Group by month data for CTV Summary (filter only by month)
  const monthFilteredData = useMemo(() => {
    if (!filterMonth) return data;
    return data.filter(r => {
      if (!r.ngay) return false;
      const parts = String(r.ngay).split('/');
      const m = parts.length >= 3 ? `${parts[1]}/${parts[2]}` : '';
      return m === filterMonth;
    });
  }, [data, filterMonth]);

  const ctvSummary = useMemo(() => {
    const groups = {};
    monthFilteredData.forEach(r => {
      const ctv = (r.congTacVien || '').trim();
      if (!ctv) return;
      if (!groups[ctv]) {
        groups[ctv] = { name: ctv, count: 0, totalRevenue: 0, totalCommission: 0 };
      }
      groups[ctv].count += 1;
      if (r.loai === 'Thu') {
        groups[ctv].totalRevenue += parseFloat(r.soTien) || 0;
      }
      groups[ctv].totalCommission += parseFloat(r.hoaHong) || 0;
    });
    return Object.values(groups).sort((a, b) => b.totalCommission - a.totalCommission);
  }, [monthFilteredData]);

  const getReceiptYear = (ngay) => {
    if (!ngay) return new Date().getFullYear();
    const parts = String(ngay).split('/');
    if (parts.length >= 3) return parts[2];
    return new Date().getFullYear();
  };

  const renderHH = (r) => {
    const hh = parseFloat(r.hoaHong) || 0;
    if (hh === 0) return '—';
    if (r.hhType === 'fixed') {
      return fmtMoney(hh) + " (CĐ)";
    }
    const tyLe = parseFloat(r.tyLeHoaHong) || 0;
    if (tyLe > 0) {
      return fmtMoney(hh) + " (" + tyLe + "%)";
    }
    return '—';
  };

  // Filters application
  const filtered = useMemo(() => {
    let list = [...data];
    if (filterLoai) {
      list = list.filter(r => r.loai === filterLoai);
    }
    if (filterMonth) {
      list = list.filter(r => {
        if (!r.ngay) return false;
        const parts = String(r.ngay).split('/');
        const m = parts.length >= 3 ? `${parts[1]}/${parts[2]}` : '';
        return m === filterMonth;
      });
    }
    if (filterChiNhanh) {
      list = list.filter(r => r.chiNhanh === filterChiNhanh);
    }
    if (filterCTV) {
      list = list.filter(r => r.congTacVien === filterCTV);
    }
    if (filterDanhMuc) {
      list = list.filter(r => r.danhMuc === filterDanhMuc);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r =>
        (r.khach || '').toLowerCase().includes(q) ||
        (r.bienSo || '').toLowerCase().includes(q) ||
        (r.danhMuc || '').toLowerCase().includes(q) ||
        (r.ghiChu || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, filterLoai, filterMonth, filterChiNhanh, filterCTV, filterDanhMuc, search]);

  // Main stats cards reflect filtered data
  const filteredThu = filtered.filter(r => r.loai === 'Thu').reduce((s, r) => s + (parseFloat(r.soTien) || 0), 0);
  const filteredChi = filtered.filter(r => r.loai === 'Chi').reduce((s, r) => s + (parseFloat(r.soTien) || 0), 0);
  const loiNhuan = filteredThu - filteredChi;

  // ── Bill Sent Checkbox ──────────────────────────────────────────────────────
  async function handleBillSentChange(r, checked) {
    const rowNum = r.rowNum;
    setBillSentLoading(prev => ({ ...prev, [rowNum]: true }));
    
    // Optimistic Update
    dispatch({ type: 'UPDATE_THU_CHI_ROW', rowNum, data: { billSent: checked } });

    try {
      await callAPI('updateBillSentStatus', rowNum, checked);
      showToast('Đã cập nhật', 'success');
    } catch (err) {
      // Revert on failure
      dispatch({ type: 'UPDATE_THU_CHI_ROW', rowNum, data: { billSent: !checked } });
      showToast('Lỗi cập nhật: ' + err.message, 'error');
    } finally {
      setBillSentLoading(prev => ({ ...prev, [rowNum]: false }));
    }
  }

  // ── Edit modal handlers ─────────────────────────────────────────────────────
  function openEdit(r) {
    setEditForm({
      rowNum: r.rowNum,
      ngay: r.ngay || '',
      loai: r.loai || 'Thu',
      danhMuc: r.danhMuc || '',
      khach: r.khach || '',
      bienSo: r.bienSo || '',
      soTien: r.soTien || '',
      chiNhanh: r.chiNhanh || '',
      ghiChu: r.ghiChu || ''
    });
    setEditOpen(true);
  }

  async function handleEditSave(e) {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const { rowNum, ...formData } = editForm;
      // Convert soTien to float/number
      formData.soTien = parseFloat(formData.soTien) || 0;
      await callAPI('updateThuChi', rowNum, formData);

      // Update store
      dispatch({ type: 'UPDATE_THU_CHI_ROW', rowNum, data: formData });
      
      showToast('Đã lưu thay đổi', 'success');
      setEditOpen(false);
    } catch (err) {
      showToast('Lỗi khi lưu: ' + err.message, 'error');
    } finally {
      setSavingEdit(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(r) {
    if (!window.confirm(`Xóa giao dịch này?\n${r.khach || r.danhMuc} — ${fmtMoney(r.soTien)}`)) return;
    const rowNum = r.rowNum;
    setDeleteLoading(prev => ({ ...prev, [rowNum]: true }));
    try {
      await callAPI('deleteThuChi', rowNum);
      dispatch({ type: 'DELETE_THU_CHI_ROW', rowNum });
      showToast('Đã xóa giao dịch', 'success');
    } catch (err) {
      showToast('Lỗi xóa: ' + err.message, 'error');
    } finally {
      setDeleteLoading(prev => ({ ...prev, [rowNum]: false }));
    }
  }

  const handleResetFilters = () => {
    setFilterLoai('');
    setFilterMonth(getCurrentMonthKey());
    setFilterChiNhanh('');
    setFilterCTV('');
    setFilterDanhMuc('');
    setSearch('');
  };

  const danhMucOptions = editForm.loai === 'Chi' ? DANH_MUC_CHI : DANH_MUC_THU;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '24px', transition: 'background-color 0.15s, color 0.15s' }}>

      <Toast msg={toast?.msg} type={toast?.type} />

      <style>{`
        @media print {
          body {
            background: #fff !important;
            color: #000 !important;
          }
          body * {
            visibility: hidden !important;
          }
          #receipt-printable, #receipt-printable * {
            visibility: visible !important;
          }
          #receipt-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
            box-shadow: none !important;
          }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ color: '#f97316', fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }}>JAN&apos;S MOTORBIKE</p>
        <h1 style={{ color: 'var(--text-primary)', fontSize: '28px', fontWeight: 700, margin: 0 }}>Quản lý Thu - Chi</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 0' }}>Sổ thu chi toàn bộ giao dịch</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 6px' }}>Tổng thu</p>
          <p style={{ color: '#22c55e', fontSize: '22px', fontWeight: 700, margin: 0 }}>{fmtMoney(filteredThu)}</p>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 6px' }}>Tổng chi</p>
          <p style={{ color: '#ef4444', fontSize: '22px', fontWeight: 700, margin: 0 }}>{fmtMoney(filteredChi)}</p>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 6px' }}>Lợi nhuận</p>
          <p style={{ color: loiNhuan >= 0 ? '#22c55e' : '#ef4444', fontSize: '22px', fontWeight: 700, margin: 0 }}>{fmtMoney(loiNhuan)}</p>
        </div>
      </div>

      {/* CTV Summary collapsible section */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
        <div onClick={() => setCtvSummaryOpen(!ctvSummaryOpen)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🤝 Tổng hoa hồng CTV</span>
            {ctvSummary.length > 0 && (
              <span style={{ fontSize: '12px', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: '12px', color: 'var(--text-secondary)' }}>
                {ctvSummary.length} CTV
              </span>
            )}
          </h3>
          <span style={{ color: 'var(--text-secondary)', fontSize: '16px', transform: ctvSummaryOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            ▼
          </span>
        </div>
        
        {ctvSummaryOpen && (
          <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            {ctvSummary.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>Không có dữ liệu cộng tác viên trong tháng này</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500 }}>Tên CTV</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 500 }}>Số giao dịch</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500 }}>Tổng tiền thu</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500 }}>Tổng hoa hồng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ctvSummary.map((ctv, index) => (
                      <tr key={ctv.name} style={{ borderBottom: index === ctvSummary.length - 1 ? 'none' : '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>{ctv.name}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-primary)' }}>{ctv.count}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#22c55e', fontWeight: 600 }}>{fmtMoney(ctv.totalRevenue)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#f97316', fontWeight: 700 }}>{fmtMoney(ctv.totalCommission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm khách, danh mục, biển số..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <select value={filterLoai} onChange={e => { setFilterLoai(e.target.value); setFilterDanhMuc(''); }}
          style={{ padding: '9px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}>
          <option value="">Tất cả loại</option>
          <option value="Thu">Thu</option>
          <option value="Chi">Chi</option>
        </select>

        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          style={{ padding: '9px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}>
          {months.map(m => <option key={m} value={m}>Tháng {m}</option>)}
        </select>

        <select value={filterChiNhanh} onChange={e => setFilterChiNhanh(e.target.value)}
          style={{ padding: '9px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}>
          <option value="">Tất cả chi nhánh</option>
          {branches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <select value={filterCTV} onChange={e => setFilterCTV(e.target.value)}
          style={{ padding: '9px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}>
          <option value="">Tất cả CTV</option>
          {ctvs.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={filterDanhMuc} onChange={e => setFilterDanhMuc(e.target.value)}
          style={{ padding: '9px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}>
          <option value="">Tất cả danh mục</option>
          {danhMucs.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {(filterLoai || filterMonth !== getCurrentMonthKey() || filterChiNhanh || filterCTV || filterDanhMuc || search) && (
          <button onClick={handleResetFilters}
            style={{ padding: '9px 14px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}>
            Xóa lọc
          </button>
        )}
      </div>

      {/* Summary filtered */}
      {!loading && !error && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '13px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{filtered.length} giao dịch | Thu: {fmtMoney(filteredThu)} | Chi: {fmtMoney(filteredChi)} | Lợi nhuận: {fmtMoney(filteredThu - filteredChi)}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '64px', textAlign: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #f97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Đang tải dữ liệu...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
          <p style={{ color: '#fca5a5', marginBottom: '12px' }}>{error}</p>
          <button onClick={reload} style={{ background: '#f97316', border: 'none', borderRadius: '8px', color: '#fff', padding: '8px 20px', cursor: 'pointer' }}>Thử lại</button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
                  {['Ngày', 'Loại', 'Danh mục', 'Khách / Ghi chú', 'Biển số', 'Chi nhánh', 'CTV', 'HH', 'Số tiền', 'Thao tác'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontWeight: 500, textAlign: h === 'Số tiền' ? 'right' : h === 'Thao tác' ? 'center' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                    {search || filterLoai || filterMonth ? 'Không tìm thấy giao dịch phù hợp' : 'Chưa có giao dịch nào'}
                  </td></tr>
                ) : (
                  filtered.map((r, i) => {
                    const isThu = r.loai === 'Thu';
                    const showBill = shouldShowBillSent(r);
                    return (
                      <tr key={r.rowNum ?? i}
                        style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                        <td style={{ padding: '11px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fmtDate(r.ngay)}</td>

                        <td style={{ padding: '11px 14px' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                            background: isThu ? '#166534' : '#7f1d1d',
                            color: isThu ? '#86efac' : '#fca5a5',
                          }}>{r.loai}</span>
                        </td>

                        <td style={{ padding: '11px 14px', color: 'var(--text-primary)' }}>{r.danhMuc || '—'}</td>

                        <td style={{ padding: '11px 14px' }}>
                          <div 
                            style={{ color: 'var(--text-primary)', fontWeight: 500, cursor: 'pointer', display: 'inline-block', transition: 'color 0.15s' }}
                            onClick={() => {
                              const name = r.khach || r.tenKH || r.tenKhachHang || r.khachHang || r.nguoiMua;
                              if (!name || name === '—') return;
                              let match = khachHang.find(k => {
                                const kName = (k.tenKH || '').toLowerCase();
                                const rName = name.toLowerCase();
                                const kBien = (k.bienSo || '').toLowerCase();
                                const rBien = (r.bienSo || '').toLowerCase();
                                return (kName === rName) || (kBien && rBien && kBien === rBien);
                              });
                              
                              if (!match) {
                                match = {
                                  tenKH: name,
                                  bienSo: r.bienSo || '',
                                  isGuest: true
                                };
                              }
                              
                              setSelectedCustomer(match);
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = '#f97316'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
                          >
                            {r.khach || r.tenKH || r.tenKhachHang || r.khachHang || r.nguoiMua || '—'}
                          </div>
                          {r.ghiChu && <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>{r.ghiChu}</div>}
                        </td>

                        <td style={{ padding: '11px 14px' }}>
                          {r.bienSo ? (
                            <span style={{ fontFamily: 'monospace', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-primary)', border: '1px solid var(--border)', fontSize: '12px' }}>
                              {r.bienSo}
                            </span>
                          ) : '—'}
                        </td>

                        <td style={{ padding: '11px 14px', color: 'var(--text-secondary)' }}>{r.chiNhanh || '—'}</td>
                        <td style={{ padding: '11px 14px', color: 'var(--text-primary)' }}>{r.congTacVien || '—'}</td>
                        <td style={{ padding: '11px 14px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{renderHH(r)}</td>

                        <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: isThu ? '#22c55e' : '#ef4444', whiteSpace: 'nowrap' }}>
                          {isThu ? '+' : '-'}{fmtMoney(r.soTien)}
                        </td>

                        {/* Action column */}
                        <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>

                            {/* Bill Sent */}
                            {showBill && (
                              <label title={r.billSent ? 'Bill đã gửi' : 'Chưa gửi bill'}
                                style={{ display: 'flex', alignItems: 'center', cursor: billSentLoading[r.rowNum] ? 'wait' : 'pointer' }}>
                                <input type="checkbox" checked={!!r.billSent} disabled={!!billSentLoading[r.rowNum]}
                                  onChange={e => handleBillSentChange(r, e.target.checked)} style={{ display: 'none' }} />
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  width: '26px', height: '26px', borderRadius: '6px',
                                  border: r.billSent ? '2px solid #22c55e' : '2px solid var(--border)',
                                  background: r.billSent ? '#166534' : 'var(--bg-hover)',
                                  transition: 'all 0.15s',
                                }}>
                                  {r.billSent && (
                                    <svg width="13" height="13" fill="none" stroke="#86efac" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </span>
                              </label>
                            )}

                            {/* Edit */}
                            <button title="Chỉnh sửa" onClick={() => openEdit(r)}
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#3b82f620'; e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#60a5fa'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                              <IconPencil />
                            </button>

                            {/* Receipt — Thu only */}
                            {isThu && (
                              <button title="Xem biên lai" onClick={() => setReceiptRow(r)}
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#f9731620'; e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.color = '#f97316'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                                <IconReceipt />
                              </button>
                            )}

                            {/* Delete */}
                            <button title="Xóa giao dịch" onClick={() => handleDelete(r)} disabled={!!deleteLoading[r.rowNum]}
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: deleteLoading[r.rowNum] ? 'wait' : 'pointer', transition: 'all 0.15s', opacity: deleteLoading[r.rowNum] ? 0.5 : 1 }}
                              onMouseEnter={e => { if (!deleteLoading[r.rowNum]) { e.currentTarget.style.background = '#dc262620'; e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.color = '#ef4444'; } }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                              <IconTrash />
                            </button>

                          </div>
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

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Chỉnh sửa giao dịch">
        <form onSubmit={handleEditSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Ngày (DD/MM/YYYY)">
              <input type="text" value={editForm.ngay} onChange={e => setEditForm(prev => ({ ...prev, ngay: e.target.value }))} style={inputStyle} required />
            </Field>
            <Field label="Loại">
              <select value={editForm.loai} onChange={e => setEditForm(prev => ({ ...prev, loai: e.target.value, danhMuc: '' }))} style={inputStyle}>
                <option value="Thu">Thu</option>
                <option value="Chi">Chi</option>
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Danh mục">
              <select value={editForm.danhMuc} onChange={e => setEditForm(prev => ({ ...prev, danhMuc: e.target.value }))} style={inputStyle} required>
                <option value="">Chọn danh mục</option>
                {danhMucOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Số tiền">
              <input type="number" value={editForm.soTien} onChange={e => setEditForm(prev => ({ ...prev, soTien: e.target.value }))} style={inputStyle} required />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Khách hàng / Người mua">
              <input type="text" value={editForm.khach} onChange={e => setEditForm(prev => ({ ...prev, khach: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Biển số xe">
              <input type="text" value={editForm.bienSo} onChange={e => setEditForm(prev => ({ ...prev, bienSo: e.target.value }))} style={inputStyle} />
            </Field>
          </div>

          <Field label="Chi nhánh">
            <select value={editForm.chiNhanh} onChange={e => setEditForm(prev => ({ ...prev, chiNhanh: e.target.value }))} style={inputStyle}>
              <option value="">Chọn chi nhánh</option>
              {CHI_NHANH_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>

          <Field label="Ghi chú">
            <textarea value={editForm.ghiChu} onChange={e => setEditForm(prev => ({ ...prev, ghiChu: e.target.value }))} style={{ ...inputStyle, height: '60px', resize: 'vertical' }} />
          </Field>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setEditOpen(false)} style={{ padding: '9px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}>Hủy</button>
            <button type="submit" disabled={savingEdit} style={{ padding: '9px 20px', background: '#f97316', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: savingEdit ? 'wait' : 'pointer' }}>
              {savingEdit ? 'Đang lưu...' : 'Lưu lại'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Receipt Modal */}
      {receiptRow && (
        <Modal 
          open={!!receiptRow} 
          onClose={() => setReceiptRow(null)} 
          title={receiptLang === 'vi' ? "Biên lai thanh toán" : "Payment Receipt"} 
          width="450px"
        >
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <button onClick={() => setReceiptLang('vi')} style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              background: receiptLang === 'vi' ? '#f97316' : 'var(--bg-hover)',
              color: receiptLang === 'vi' ? '#fff' : 'var(--text-secondary)',
              border: receiptLang === 'vi' ? 'none' : '1px solid var(--border)',
              transition: 'all 0.15s'
            }}>
              🇻🇳 Tiếng Việt
            </button>
            <button onClick={() => setReceiptLang('en')} style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              background: receiptLang === 'en' ? '#f97316' : 'var(--bg-hover)',
              color: receiptLang === 'en' ? '#fff' : 'var(--text-secondary)',
              border: receiptLang === 'en' ? 'none' : '1px solid var(--border)',
              transition: 'all 0.15s'
            }}>
              🇬🇧 English
            </button>
          </div>

          <div id="receipt-printable" style={{ padding: '20px', color: '#000', background: '#fff', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5' }}>
            {receiptLang === 'vi' ? (
              <>
                <div style={{ textAlign: 'center' }}>
                  <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 'bold', letterSpacing: '1px' }}>JAN'S MOTORBIKE</h2>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#333' }}>Dịch vụ cho thuê xe máy</p>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#333' }}>📍 {shopInfo.address}</p>
                </div>

                <div style={{ borderBottom: '1px solid #000', margin: '12px 0' }} />

                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>BIÊN LAI THANH TOÁN</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px' }}>
                    <span>Số BL: RC{receiptRow.rowNum}-{getReceiptYear(receiptRow.ngay)}</span>
                    <span>Ngày: {receiptRow.ngay || '—'}</span>
                  </div>
                </div>

                <div style={{ borderBottom: '1px solid #000', margin: '12px 0' }} />

                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 0', fontSize: '13px' }}>
                  <span>Khách hàng:</span>
                  <span style={{ fontWeight: 'bold' }}>{receiptRow.khach || '—'}</span>

                  <span>Xe thuê:</span>
                  <span>{receiptRow.xeThue || receiptRow.tenXe || receiptRow.bienSo || '—'}</span>

                  <span>Biển số:</span>
                  <span style={{ fontWeight: 'bold' }}>{receiptRow.bienSo || '—'}</span>

                  <span>Danh mục:</span>
                  <span>{receiptRow.danhMuc || '—'}</span>



                  <span>Kỳ thuê:</span>
                  <span>{receiptRow.batDau || '—'} → {receiptRow.ketThuc || '—'}</span>

                  <span>Ghi chú:</span>
                  <span style={{ fontStyle: 'italic' }}>{receiptRow.ghiChu || '—'}</span>
                </div>

                <div style={{ borderBottom: '1px solid #000', margin: '12px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '15px' }}>
                  <span>TỔNG TIỀN:</span>
                  <span>{new Intl.NumberFormat('vi-VN').format(receiptRow.soTien || 0)} VNĐ</span>
                </div>

                <div style={{ borderBottom: '1px solid #000', margin: '12px 0' }} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', textAlign: 'center', marginTop: '20px', fontSize: '12px' }}>
                  <div>
                    <p style={{ margin: '0 0 50px', fontWeight: 'bold' }}>Người nộp tiền</p>
                    <p style={{ margin: 0, fontStyle: 'italic', fontSize: '11px', color: '#555' }}>(Ký, ghi rõ họ tên)</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 50px', fontWeight: 'bold' }}>Người nhận tiền</p>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>JAN'S MOTORBIKE</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center' }}>
                  <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 'bold', letterSpacing: '1px' }}>JAN'S MOTORBIKE</h2>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#333' }}>Motorbike Rental Service</p>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#333' }}>📍 Ho Chi Minh City</p>
                </div>

                <div style={{ borderBottom: '1px solid #000', margin: '12px 0' }} />

                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>PAYMENT RECEIPT</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px' }}>
                    <span>No: RC{receiptRow.rowNum}-{getReceiptYear(receiptRow.ngay)}</span>
                    <span>Date: {receiptRow.ngay || '—'}</span>
                  </div>
                </div>

                <div style={{ borderBottom: '1px solid #000', margin: '12px 0' }} />

                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 0', fontSize: '13px' }}>
                  <span>Customer:</span>
                  <span style={{ fontWeight: 'bold' }}>{receiptRow.khach || '—'}</span>

                  <span>Vehicle:</span>
                  <span>{receiptRow.xeThue || receiptRow.tenXe || receiptRow.bienSo || '—'}</span>

                  <span>License Plate:</span>
                  <span style={{ fontWeight: 'bold' }}>{receiptRow.bienSo || '—'}</span>

                  <span>Category:</span>
                  <span>
                    {(() => {
                      const cat = receiptRow.danhMuc || '';
                      const map = {
                        'tiền thuê tháng': 'Monthly Rent',
                        'tiền cọc': 'Deposit',
                        'thuê mới': 'New Rental',
                        'thuê ngắn': 'Short-term Rent',
                        'phụ thu': 'Surcharge',
                        'bán xe': 'Vehicle Sale',
                        'bảo dưỡng': 'Maintenance',
                        'thay phụ tùng': 'Parts Replacement',
                        'nhiên liệu': 'Fuel',
                        'sửa chữa': 'Repair',
                        'chi phí khác': 'Other Expenses',
                        'dịch vụ sửa xe': 'Repair Service',
                        'thuế / phí cầu đường': 'Tolls / Taxes'
                      };
                      return map[cat.toLowerCase()] || cat || '—';
                    })()}
                  </span>



                  <span>Rental Period:</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{receiptRow.batDau || '—'} → {receiptRow.ketThuc || '—'}</span>
                    <span style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
                      {formatEngDate(receiptRow.batDau)} → {formatEngDate(receiptRow.ketThuc)}
                    </span>
                  </div>

                  <span>Note:</span>
                  <span style={{ fontStyle: 'italic' }}>{receiptRow.ghiChu || '—'}</span>
                </div>

                <div style={{ borderBottom: '1px solid #000', margin: '12px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '15px' }}>
                  <span>AMOUNT PAID:</span>
                  <span>{new Intl.NumberFormat('vi-VN').format(receiptRow.soTien || 0)} VND</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', margin: '12px 0' }}>
                  <div style={{ flex: 1, borderBottom: '1px solid #000' }} />
                  <span style={{ padding: '0 8px', fontSize: '12px', fontWeight: 'bold' }}>✅ Payment received</span>
                  <div style={{ flex: 1, borderBottom: '1px solid #000' }} />
                </div>
                <div style={{ textAlign: 'center', margin: '18px 0 12px', fontSize: '12px', fontStyle: 'italic' }}>
                  <p style={{ margin: 0 }}>Thank you for your payment!</p>
                  <p style={{ margin: '4px 0 0' }}>We thanks a billion times to you!</p>
                </div>

              </>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button onClick={() => setReceiptRow(null)} style={{ padding: '9px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              {receiptLang === 'vi' ? '✕ Đóng' : '✕ Close'}
            </button>
            <button onClick={() => window.print()} style={{ padding: '9px 20px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
              {receiptLang === 'vi' ? '🖨️ In biên lai' : '🖨️ Print'}
            </button>
          </div>
        </Modal>
      )}

      <CustomerProfileModal 
        open={!!selectedCustomer} 
        onClose={() => setSelectedCustomer(null)} 
        customer={selectedCustomer} 
        thuChiData={data} 
        onSuccess={reload}
      />
    </div>
  );
}