'use client';

import { useState, useMemo, useEffect } from 'react';
import { callAPI } from '@/lib/api';
import { useStore } from '@/lib/store';
import { getUser, canWrite, canDelete } from '@/lib/auth';
import CustomerProfileModal from '@/components/CustomerProfileModal';
import MoneyInput from '@/components/MoneyInput';
import CustomDatePicker from '@/components/CustomDatePicker';

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

function toDateInputFormat(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('/');
  if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  if (dateStr.includes('-')) return dateStr;
  return dateStr;
}

function fromDateInputFormat(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
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

function ManageCategoriesModal({ open, onClose, thu, chi, onSave }) {
  const [localThu, setLocalThu] = useState(thu);
  const [localChi, setLocalChi] = useState(chi);
  const [newThu, setNewThu] = useState('');
  const [newChi, setNewChi] = useState('');

  useEffect(() => {
    if (open) {
      setLocalThu(thu);
      setLocalChi(chi);
      setNewThu('');
      setNewChi('');
    }
  }, [open, thu, chi]);

  const handleSave = () => {
    onSave(localThu, localChi);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Tùy chỉnh danh mục" width="600px">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div>
          <h3 style={{ color: '#22c55e', fontSize: '15px', marginTop: 0 }}>Danh mục Thu</h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input value={newThu} onChange={e => setNewThu(e.target.value)} style={inputStyle} placeholder="Thêm mục thu..." />
            <button type="button" onClick={() => { if(newThu.trim()) { setLocalThu([...localThu, newThu.trim()]); setNewThu(''); } }} style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 12px', cursor: 'pointer', fontSize: '18px' }}>+</button>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {localThu.map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: '6px', fontSize: '13px', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-primary)' }}>{t}</span>
                <button type="button" onClick={() => setLocalThu(localThu.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px', fontSize: '14px' }}>✕</button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 style={{ color: '#ef4444', fontSize: '15px', marginTop: 0 }}>Danh mục Chi</h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input value={newChi} onChange={e => setNewChi(e.target.value)} style={inputStyle} placeholder="Thêm mục chi..." />
            <button type="button" onClick={() => { if(newChi.trim()) { setLocalChi([...localChi, newChi.trim()]); setNewChi(''); } }} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 12px', cursor: 'pointer', fontSize: '18px' }}>+</button>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {localChi.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: '6px', fontSize: '13px', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-primary)' }}>{c}</span>
                <button type="button" onClick={() => setLocalChi(localChi.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px', fontSize: '14px' }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
        <button type="button" onClick={onClose} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}>Hủy</button>
        <button type="button" onClick={handleSave} style={{ padding: '8px 16px', background: '#1e3a8a', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Lưu thay đổi</button>
      </div>
    </Modal>
  );
}

const DEFAULT_DANH_MUC_THU = ['Tiền thuê tháng', 'Thuê mới', 'Thuê ngắn', 'Phụ thu', 'Tiền cọc', 'Bán xe'];
const DEFAULT_DANH_MUC_CHI = ['Bảo dưỡng', 'Thay phụ tùng', 'Nhiên liệu', 'Sửa chữa', 'Chi phí khác', 'Dịch vụ sửa xe', 'Thuế / phí cầu đường'];
const CHI_NHANH_OPTIONS = ['Giang', 'Châu Vân', 'Ân', 'Minh Minh', 'Ân ACB', 'Nghĩa', 'JCAR', 'Tường'];

function shouldShowBillSent(r) {
  if (r.loai !== 'Thu') return false;
  const dm = (r.danhMuc || '').toLowerCase();
  return dm.includes('thuê mới') || dm.includes('thue moi') || dm.includes('thuê tháng') || dm.includes('thue thang') || dm.includes('tiền thuê');
}

export default function ThuChiPage() {
  const { thuChi: data, khachHang, xe, loading, error, reload, dispatch } = useStore();
  
  const getCurrentMonthKey = () => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  };

  const [danhMucThu, setDanhMucThu] = useState(DEFAULT_DANH_MUC_THU);
  const [danhMucChi, setDanhMucChi] = useState(DEFAULT_DANH_MUC_CHI);
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);

  useEffect(() => {
    try {
      const savedThu = localStorage.getItem('CUSTOM_DANH_MUC_THU');
      const savedChi = localStorage.getItem('CUSTOM_DANH_MUC_CHI');
      if (savedThu) { const parsed = JSON.parse(savedThu); if (Array.isArray(parsed)) setDanhMucThu(parsed); }
      if (savedChi) { const parsed = JSON.parse(savedChi); if (Array.isArray(parsed)) setDanhMucChi(parsed); }
    } catch (e) {}
  }, []);

  const handleSaveCategories = (newThu, newChi) => {
    setDanhMucThu(newThu);
    setDanhMucChi(newChi);
    localStorage.setItem('CUSTOM_DANH_MUC_THU', JSON.stringify(newThu));
    localStorage.setItem('CUSTOM_DANH_MUC_CHI', JSON.stringify(newChi));
    showToast('Đã lưu danh mục', 'success');
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
        // Next.js dev server shows overlay for console.error, so we suppress it if it's just a missing function.
        // console.error('Lỗi khi tải thông tin cửa hàng:', e);
      }
    }
    fetchShopInfo();
  }, []);

  // Modals & forms state
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    ngay: '', loai: 'Thu', danhMuc: '', khach: '', tenXe: '', bienSo: '', soTien: '', tienCoc: '', chiNhanh: '', batDau: '', ketThuc: '', ghiChu: ''
  });
  const [savingAdd, setSavingAdd] = useState(false);

  const openCustomerProfile = async (tenKH, bienSo) => {
    // 1. Tìm chính xác theo tên và biển số
    let kh = khachHang?.find(k => k.tenKH === tenKH && k.bienSo === bienSo);
    
    // 2. Nếu không thấy (có thể khách đã đổi xe), thử tìm theo tên
    if (!kh) {
      kh = khachHang?.find(k => k.tenKH === tenKH);
    }
    
    if (kh) {
      setSelectedCustomer(kh);
    } else {
      // Create guest profile if not found
      setSelectedCustomer({ tenKH, bienSo, isGuest: true });
    }
  };

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    rowNum: '', ngay: '', loai: 'Thu', danhMuc: '', khach: '', tenXe: '', bienSo: '', soTien: '', tienCoc: '', chiNhanh: '', batDau: '', ketThuc: '', ghiChu: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  const [receiptRow, setReceiptRow] = useState(null);
  const [toast, setToast] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState({});
  const [billSentLoading, setBillSentLoading] = useState({});
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [user, setUser] = useState(null);

   
  // eslint-disable-next-line
  useEffect(() => {
    setTimeout(() => setUser(getUser()), 0);
  }, []);

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
      if (r.loai === 'Thu' && !(r.danhMuc || '').toLowerCase().includes('cọc')) {
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
  const isRevenue = (r) => r.loai === 'Thu' && !(r.danhMuc || '').toLowerCase().includes('cọc');
  const isExpense = (r) => r.loai === 'Chi' && !(r.danhMuc || '').toLowerCase().includes('cọc');

  const filteredThu = filtered.filter(isRevenue).reduce((s, r) => s + (parseFloat(r.soTien) || 0), 0);
  const filteredChi = filtered.filter(isExpense).reduce((s, r) => s + (parseFloat(r.soTien) || 0), 0);
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
      tenXe: r.tenXe || r.xeThue || '',
      bienSo: r.bienSo || '',
      soTien: r.soTien || '',
      tienCoc: r.tienCoc || '',
      chiNhanh: r.chiNhanh || '',
      batDau: r.batDau || '',
      ketThuc: r.ketThuc || '',
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
      
      // Auto ghi nhận lợi nhuận nếu là Bán xe
      if (formData.danhMuc === 'Bán xe' && formData.bienSo) {
         const soldVehicle = xe?.find(x => x.bienSo === formData.bienSo);
         if (soldVehicle) {
            const cost = Number(soldVehicle.giaVon) || 0;
            const profit = formData.soTien - cost;
            const profitStr = `[Bán xe] Giá vốn: ${fmtMoney(cost)} | Lợi nhuận: ${fmtMoney(profit)}`;
            if (!formData.ghiChu?.includes('[Bán xe]')) {
              formData.ghiChu = formData.ghiChu ? `${formData.ghiChu} \n${profitStr}` : profitStr;
            } else {
              formData.ghiChu = formData.ghiChu.replace(/\[Bán xe\].*?(?=\n|$)/, profitStr);
            }
         }
      }

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

  async function handleAddSave(e) {
    e.preventDefault();
    const payload = { ...addForm };
    payload.soTien = parseFloat(payload.soTien) || 0;
    
    // Auto ghi nhận lợi nhuận nếu là Bán xe
    if (payload.danhMuc === 'Bán xe' && payload.bienSo) {
        const soldVehicle = xe?.find(x => x.bienSo === payload.bienSo);
        if (soldVehicle) {
          const cost = Number(soldVehicle.giaVon) || 0;
          const profit = payload.soTien - cost;
          const profitNote = `[Bán xe] Giá vốn: ${fmtMoney(cost)} | Lợi nhuận: ${fmtMoney(profit)}`;
          payload.ghiChu = payload.ghiChu ? `${payload.ghiChu} \n${profitNote}` : profitNote;
        }
    }

    // 1. Optimistic Update (instant UI)
    const newRow = { ...payload, rowNum: 'temp_' + Date.now() }; // temporary ID
    dispatch({ type: 'ADD_THU_CHI_ROW', payload: newRow });
    setAddOpen(false);
    showToast('Đã thêm giao dịch', 'success');
    setAddForm({ ngay: '', loai: 'Thu', danhMuc: danhMucThu[0] || '', khach: '', tenXe: '', bienSo: '', soTien: '', tienCoc: '', chiNhanh: '', batDau: '', ketThuc: '', ghiChu: '' });

    // 2. Background Sync
    (async () => {
      try {
        // Xử lý Thuê mới
        if (payload.danhMuc === 'Thuê mới' && payload.khach && payload.bienSo) {
          const customerForm = {
            tenKH: payload.khach,
            bienSo: payload.bienSo,
            xeThue: payload.tenXe || '',
            giaThue: payload.soTien || '',
            tienCoc: payload.tienCoc || '',
            ngayBatDau: payload.batDau || '',
            ngayKetThuc: payload.ketThuc || '',
            chiNhanh: payload.chiNhanh || '',
            congTacVien: '',
            ghiChu: payload.ghiChu || ''
          };
          await callAPI('addKhachHang', customerForm);
        }

        await callAPI('addThuChi', payload);
        reload(true); // silent reload
      } catch (err) {
        dispatch({ type: 'DELETE_THU_CHI_ROW', rowNum: newRow.rowNum });
        showToast('Lỗi khi thêm: ' + err.message, 'error');
      }
    })();
  }

  const handleFileUpload = async (e, formState, setForm) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Yêu cầu phải có thông tin để tạo folder Drive
    const tenKH = formState.khach?.trim() || formState.danhMuc?.trim() || 'Giao Dich Khac';
    const bienSo = formState.bienSo?.trim() || 'Chung';

    const compressImage = (f) => new Promise((resolve) => {
      if (!f.type.startsWith('image/')) return resolve({ base64: null, isImage: false });
      const reader = new FileReader();
      reader.readAsDataURL(f);
      reader.onload = (ev) => {
        const img = new Image();
        img.src = ev.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          let scaleSize = 1;
          if (img.width > MAX_WIDTH) scaleSize = MAX_WIDTH / img.width;
          canvas.width = img.width * scaleSize;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          resolve({ base64: compressed.split(',')[1], isImage: true });
        };
      };
    });

    setUploadingFile(true);
    setUploadMsg('Đang tải lên...');
    try {
      let base64Data = '';
      const comp = await compressImage(file);
      if (comp.isImage) {
        base64Data = comp.base64;
      } else {
        const readBase64 = (f2) => new Promise((resolve) => {
          const r = new FileReader();
          r.readAsDataURL(f2);
          r.onload = () => resolve(r.result.split(',')[1]);
        });
        base64Data = await readBase64(file);
      }

      const overrideName = tenKH && bienSo ? `${tenKH} - ${bienSo}` : file.name;
      await callAPI('uploadFileToDrive', base64Data, file.name, file.type, overrideName);
      
      setUploadMsg('Tải lên thành công!');
      const newGhiChu = formState.ghiChu ? `${formState.ghiChu} | Đã upload: ${file.name}` : `Đã upload: ${file.name}`;
      setForm(prev => ({ ...prev, ghiChu: newGhiChu }));
    } catch (err) {
      setUploadMsg('Lỗi upload: ' + err.message);
    } finally {
      setUploadingFile(false);
      setTimeout(() => setUploadMsg(''), 5000);
      e.target.value = null; // reset
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(r) {
    if (!window.confirm(`Xóa giao dịch này?\n${r.khach || r.danhMuc} — ${fmtMoney(r.soTien)}`)) return;
    const rowNum = r.rowNum;
    
    // 1. Optimistic delete
    dispatch({ type: 'DELETE_THU_CHI_ROW', rowNum });
    showToast('Đã xóa giao dịch', 'success');

    // 2. Background sync
    (async () => {
      try {
        await callAPI('deleteThuChi', rowNum);
      } catch (err) {
        // Revert on fail
        showToast('Lỗi xóa: ' + err.message, 'error');
        reload(true);
      }
    })();
  }

  const handleResetFilters = () => {
    setFilterLoai('');
    setFilterMonth(getCurrentMonthKey());
    setFilterChiNhanh('');
    setFilterCTV('');
    setFilterDanhMuc('');
    setSearch('');
  };

  const danhMucOptions = editForm.loai === 'Chi' ? danhMucChi : danhMucThu;

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
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: '#3b82f6', fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }}>JAN&apos;S MOTORBIKE</p>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '28px', fontWeight: 700, margin: 0 }}>Quản lý Thu - Chi</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 0' }}>Sổ thu chi toàn bộ giao dịch</p>
        </div>
        {canWrite(user) && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setManageCategoriesOpen(true)} style={{ padding: '10px 16px', background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Danh mục
            </button>
            <button onClick={() => {
              const now = new Date();
              const today = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
              setAddForm(prev => ({ ...prev, ngay: today, loai: 'Thu', danhMuc: danhMucThu[0] || '' }));
              setAddOpen(true);
            }} style={{ padding: '10px 16px', background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              + Thêm Thu Chi
            </button>
          </div>
        )}
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
                      <tr key={ctv.name} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>{ctv.name}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-primary)' }}>{ctv.count}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#22c55e', fontWeight: 600 }}>{fmtMoney(ctv.totalRevenue)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#3b82f6', fontWeight: 700 }}>{fmtMoney(ctv.totalCommission)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: 'var(--bg-hover)', fontWeight: 700 }}>
                      <td style={{ padding: '12px', color: 'var(--text-primary)', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.5px' }}>TỔNG CỘNG</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: 'var(--text-primary)' }}>{ctvSummary.reduce((sum, c) => sum + c.count, 0)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#16a34a' }}>{fmtMoney(ctvSummary.reduce((sum, c) => sum + c.totalRevenue, 0))}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#2563eb', fontSize: '14px' }}>{fmtMoney(ctvSummary.reduce((sum, c) => sum + c.totalCommission, 0))}</td>
                    </tr>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px', fontSize: '14px', background: 'var(--bg-card)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', fontWeight: 600, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <span style={{ color: 'var(--text-primary)' }}>{filtered.length} giao dịch</span>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span style={{ color: '#16a34a' }}>Thu: +{fmtMoney(filteredThu)}</span>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span style={{ color: '#dc2626' }}>Chi: -{fmtMoney(filteredChi)}</span>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span style={{ color: (filteredThu - filteredChi) >= 0 ? '#2563eb' : '#dc2626', fontSize: '15px' }}>Lợi nhuận: {fmtMoney(filteredThu - filteredChi)}</span>
        </div>
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

                        <td style={{ padding: '11px 14px' }}>
                          {(() => {
                            const name = r.danhMuc || '—';
                            if (name === '—') return <span style={{ color: 'var(--text-primary)' }}>—</span>;
                            let bg, color, border;
                            const lower = name.toLowerCase();
                            if (lower.includes('thuê tháng') || lower.includes('tiền thuê')) { bg = '#22c55e15'; color = '#16a34a'; border = '#22c55e30'; }
                            else if (lower.includes('thuê mới')) { bg = '#ef444415'; color = '#dc2626'; border = '#ef444430'; }
                            else if (lower.includes('phụ thu')) { bg = '#f59e0b15'; color = '#d97706'; border = '#f59e0b30'; }
                            else if (lower.includes('thuê ngắn')) { bg = '#8b5cf615'; color = '#7c3aed'; border = '#8b5cf630'; }
                            else if (lower.includes('cọc')) { bg = '#3b82f615'; color = '#2563eb'; border = '#3b82f630'; }
                            else if (lower.includes('bảo dưỡng') || lower.includes('sửa')) { bg = '#f43f5e15'; color = '#e11d48'; border = '#f43f5e30'; }
                            else if (lower.includes('bán xe')) { bg = '#06b6d415'; color = '#0891b2'; border = '#06b6d430'; }
                            else { bg = isThu ? '#10b98115' : '#f43f5e15'; color = isThu ? '#059669' : '#be123c'; border = isThu ? '#10b98130' : '#f43f5e30'; }
                            
                            return (
                              <span style={{ 
                                display: 'inline-block', padding: '3px 10px', borderRadius: '6px', 
                                fontSize: '12px', fontWeight: 600, background: bg, color: color, border: `1px solid ${border}` 
                              }}>
                                {name}
                              </span>
                            );
                          })()}
                        </td>

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
                            onMouseEnter={e => e.currentTarget.style.color = '#1e3a8a'}
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
                                onMouseEnter={e => { e.currentTarget.style.background = '#1e3a8a20'; e.currentTarget.style.borderColor = '#1e3a8a'; e.currentTarget.style.color = '#1e3a8a'; }}
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

      {/* Add Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Thêm giao dịch mới">
        <form onSubmit={handleAddSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Ngày (DD/MM/YYYY)">
              <CustomDatePicker value={addForm.ngay} onChange={e => setAddForm(prev => ({ ...prev, ngay: e.target.value }))} required />
            </Field>
            <Field label="Loại">
              <select value={addForm.loai} onChange={e => setAddForm(prev => ({ ...prev, loai: e.target.value, danhMuc: e.target.value === 'Thu' ? danhMucThu[0] : danhMucChi[0] }))} style={inputStyle}>
                <option value="Thu">Thu</option>
                <option value="Chi">Chi</option>
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: addForm.danhMuc === 'Thuê mới' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '12px' }}>
            <Field label="Danh mục">
              <select value={addForm.danhMuc} onChange={e => setAddForm(prev => ({ ...prev, danhMuc: e.target.value }))} style={inputStyle} required>
                <option value="">Chọn danh mục</option>
                {(addForm.loai === 'Chi' ? (danhMucChi || []) : (danhMucThu || [])).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Số tiền (Đơn giá)">
              <MoneyInput value={addForm.soTien} onChange={e => setAddForm(prev => ({ ...prev, soTien: e.target.value }))} style={inputStyle} required />
              {addForm.danhMuc === 'Bán xe' && addForm.bienSo && (
                (() => {
                  const soldVeh = xe?.find(x => x.bienSo === addForm.bienSo);
                  if (!soldVeh) return null;
                  const cost = Number(soldVeh.giaVon) || 0;
                  const price = Number(addForm.soTien) || 0;
                  const profit = price - cost;
                  return (
                    <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Giá vốn: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fmtMoney(cost)}</span>
                      <span style={{ margin: '0 8px' }}>|</span>
                      Lợi nhuận: <span style={{ fontWeight: 600, color: profit >= 0 ? '#22c55e' : '#ef4444' }}>{fmtMoney(profit)}</span>
                    </div>
                  );
                })()
              )}
            </Field>
            {addForm.danhMuc === 'Thuê mới' && (
              <Field label="Tiền cọc">
                <MoneyInput value={addForm.tienCoc} onChange={e => setAddForm(prev => ({ ...prev, tienCoc: e.target.value }))} style={inputStyle} />
              </Field>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <Field label="Khách hàng / Người mua">
              {addForm.danhMuc === 'Tiền thuê tháng' ? (
                <select 
                  value={addForm.khach} 
                  onChange={e => {
                    const val = e.target.value;
                    const found = khachHang?.find(k => k.tenKH === val);
                    setAddForm(prev => {
                      const updates = { khach: val };
                      if (found) {
                        updates.bienSo = found.bienSo;
                        if (found.chiNhanh) updates.chiNhanh = found.chiNhanh;
                        if (found.ngayKetThuc) {
                           const d = new Date(found.ngayKetThuc);
                           if (!isNaN(d)) {
                             const dd = String(d.getDate()).padStart(2, '0');
                             const mm = String(d.getMonth() + 1).padStart(2, '0');
                             updates.batDau = `${dd}/${mm}/${d.getFullYear()}`;
                           }
                        }
                      }
                      return { ...prev, ...updates };
                    });
                  }} 
                  style={inputStyle}
                >
                  <option value="">-- Chọn khách hàng --</option>
                  {khachHang?.map((k, i) => (
                    <option key={`add-kh-${i}`} value={k.tenKH}>{k.tenKH} - {k.bienSo}</option>
                  ))}
                </select>
              ) : (
                <input 
                  type="text" 
                  value={addForm.khach} 
                  onChange={e => setAddForm(prev => ({ ...prev, khach: e.target.value }))} 
                  style={inputStyle} 
                />
              )}
            </Field>
            <Field label="Tên xe (Ví dụ: Vision)">
              <input type="text" value={addForm.tenXe} onChange={e => setAddForm(prev => ({ ...prev, tenXe: e.target.value }))} style={inputStyle} placeholder="VD: Vision" />
            </Field>
            <Field label="Biển số xe">
              {addForm.danhMuc === 'Bán xe' || addForm.danhMuc === 'Thuê mới' ? (
                <select 
                  value={addForm.bienSo} 
                  onChange={e => setAddForm(prev => ({ ...prev, bienSo: e.target.value }))} 
                  style={inputStyle}
                >
                  <option value="">-- Chọn xe trống --</option>
                  {(xe || []).filter(x => x.trangThai === 'Trống').map(x => (
                    <option key={x.bienSo} value={x.bienSo}>{x.tenXe || x.model} ({x.bienSo})</option>
                  ))}
                </select>
              ) : (
                <input type="text" value={addForm.bienSo} onChange={e => setAddForm(prev => ({ ...prev, bienSo: e.target.value }))} style={inputStyle} />
              )}
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Từ ngày">
              <CustomDatePicker value={addForm.batDau} onChange={e => setAddForm(prev => ({ ...prev, batDau: e.target.value }))} placeholderText="DD/MM/YYYY" />
            </Field>
            <Field label="Đến ngày">
              <CustomDatePicker value={addForm.ketThuc} onChange={e => setAddForm(prev => ({ ...prev, ketThuc: e.target.value }))} placeholderText="DD/MM/YYYY" />
            </Field>
          </div>

          <Field label="Chi nhánh">
            <select value={addForm.chiNhanh} onChange={e => setAddForm(prev => ({ ...prev, chiNhanh: e.target.value }))} style={inputStyle}>
              <option value="">Chọn chi nhánh</option>
              {CHI_NHANH_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>

          <Field label="Ghi chú">
            <textarea value={addForm.ghiChu} onChange={e => setAddForm(prev => ({ ...prev, ghiChu: e.target.value }))} style={{ ...inputStyle, height: '60px', resize: 'vertical' }} />
          </Field>

          <div style={{ marginTop: '12px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Hồ sơ / Giấy tờ</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input 
                type="file" 
                id="file-upload-add" 
                style={{ display: 'none' }} 
                onChange={e => handleFileUpload(e, addForm, setAddForm)} 
                disabled={uploadingFile}
              />
              <button 
                type="button"
                onClick={() => document.getElementById('file-upload-add').click()}
                disabled={uploadingFile}
                style={{ padding: '8px 16px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', cursor: uploadingFile ? 'wait' : 'pointer', color: 'var(--text-primary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Upload File
              </button>
              {uploadMsg && <span style={{ fontSize: '13px', color: uploadMsg.includes('Lỗi') ? '#ef4444' : '#10b981' }}>{uploadMsg}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setAddOpen(false)} style={{ padding: '9px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}>Hủy</button>
            <button type="submit" disabled={savingAdd} style={{ padding: '9px 20px', background: '#1e3a8a', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: savingAdd ? 'wait' : 'pointer' }}>
              {savingAdd ? 'Đang lưu...' : 'Lưu lại'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Chỉnh sửa giao dịch">
        <form onSubmit={handleEditSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Ngày (DD/MM/YYYY)">
              <CustomDatePicker value={editForm.ngay} onChange={e => setEditForm(prev => ({ ...prev, ngay: e.target.value }))} required />
            </Field>
            <Field label="Loại">
              <select value={editForm.loai} onChange={e => setEditForm(prev => ({ ...prev, loai: e.target.value, danhMuc: '' }))} style={inputStyle}>
                <option value="Thu">Thu</option>
                <option value="Chi">Chi</option>
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: editForm.danhMuc === 'Thuê mới' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '12px' }}>
            <Field label="Danh mục">
              <select value={editForm.danhMuc} onChange={e => setEditForm(prev => ({ ...prev, danhMuc: e.target.value }))} style={inputStyle} required>
                <option value="">Chọn danh mục</option>
                {(editForm.loai === 'Chi' ? (danhMucChi || []) : (danhMucThu || [])).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Số tiền (Đơn giá)">
              <MoneyInput value={editForm.soTien} onChange={e => setEditForm(prev => ({ ...prev, soTien: e.target.value }))} style={inputStyle} required />
              {editForm.danhMuc === 'Bán xe' && editForm.bienSo && (
                (() => {
                  const soldVeh = xe?.find(x => x.bienSo === editForm.bienSo);
                  if (!soldVeh) return null;
                  const cost = Number(soldVeh.giaVon) || 0;
                  const price = Number(editForm.soTien) || 0;
                  const profit = price - cost;
                  return (
                    <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Giá vốn: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fmtMoney(cost)}</span>
                      <span style={{ margin: '0 8px' }}>|</span>
                      Lợi nhuận: <span style={{ fontWeight: 600, color: profit >= 0 ? '#22c55e' : '#ef4444' }}>{fmtMoney(profit)}</span>
                    </div>
                  );
                })()
              )}
            </Field>
            {editForm.danhMuc === 'Thuê mới' && (
              <Field label="Tiền cọc">
                <MoneyInput value={editForm.tienCoc} onChange={e => setEditForm(prev => ({ ...prev, tienCoc: e.target.value }))} style={inputStyle} />
              </Field>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <Field label="Khách hàng / Người mua">
              {editForm.danhMuc === 'Tiền thuê tháng' ? (
                <select 
                  value={editForm.khach} 
                  onChange={e => {
                    const val = e.target.value;
                    const found = khachHang?.find(k => k.tenKH === val);
                    setEditForm(prev => {
                      const updates = { khach: val };
                      if (found) {
                        updates.bienSo = found.bienSo;
                        if (found.chiNhanh) updates.chiNhanh = found.chiNhanh;
                        if (found.ngayKetThuc) {
                           const d = new Date(found.ngayKetThuc);
                           if (!isNaN(d)) {
                             const dd = String(d.getDate()).padStart(2, '0');
                             const mm = String(d.getMonth() + 1).padStart(2, '0');
                             updates.batDau = `${dd}/${mm}/${d.getFullYear()}`;
                           }
                        }
                      }
                      return { ...prev, ...updates };
                    });
                  }} 
                  style={inputStyle}
                >
                  <option value="">-- Chọn khách hàng --</option>
                  {khachHang?.map((k, i) => (
                    <option key={`edit-kh-${i}`} value={k.tenKH}>{k.tenKH} - {k.bienSo}</option>
                  ))}
                </select>
              ) : (
                <input 
                  type="text" 
                  value={editForm.khach} 
                  onChange={e => setEditForm(prev => ({ ...prev, khach: e.target.value }))} 
                  style={inputStyle} 
                />
              )}
            </Field>
            <Field label="Tên xe (Ví dụ: Vision)">
              <input type="text" value={editForm.tenXe} onChange={e => setEditForm(prev => ({ ...prev, tenXe: e.target.value }))} style={inputStyle} placeholder="VD: Vision" />
            </Field>
            <Field label="Biển số xe">
              {editForm.danhMuc === 'Bán xe' || editForm.danhMuc === 'Thuê mới' ? (
                <select 
                  value={editForm.bienSo} 
                  onChange={e => setEditForm(prev => ({ ...prev, bienSo: e.target.value }))} 
                  style={inputStyle}
                >
                  <option value="">-- Chọn xe trống --</option>
                  {(xe || []).filter(x => x.trangThai === 'Trống').map(x => (
                    <option key={x.bienSo} value={x.bienSo}>{x.tenXe || x.model} ({x.bienSo})</option>
                  ))}
                </select>
              ) : (
                <input type="text" value={editForm.bienSo} onChange={e => setEditForm(prev => ({ ...prev, bienSo: e.target.value }))} style={inputStyle} />
              )}
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Từ ngày">
              <CustomDatePicker value={editForm.batDau} onChange={e => setEditForm(prev => ({ ...prev, batDau: e.target.value }))} placeholderText="DD/MM/YYYY" />
            </Field>
            <Field label="Đến ngày">
              <CustomDatePicker value={editForm.ketThuc} onChange={e => setEditForm(prev => ({ ...prev, ketThuc: e.target.value }))} placeholderText="DD/MM/YYYY" />
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

          <div style={{ marginTop: '12px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Hồ sơ / Giấy tờ</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input 
                type="file" 
                id="file-upload-edit" 
                style={{ display: 'none' }} 
                onChange={e => handleFileUpload(e, editForm, setEditForm)} 
                disabled={uploadingFile}
              />
              <button 
                type="button"
                onClick={() => document.getElementById('file-upload-edit').click()}
                disabled={uploadingFile}
                style={{ padding: '8px 16px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', cursor: uploadingFile ? 'wait' : 'pointer', color: 'var(--text-primary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Upload File
              </button>
              {uploadMsg && <span style={{ fontSize: '13px', color: uploadMsg.includes('Lỗi') ? '#ef4444' : '#10b981' }}>{uploadMsg}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setEditOpen(false)} style={{ padding: '9px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}>Hủy</button>
            <button type="submit" disabled={savingEdit} style={{ padding: '9px 20px', background: '#1e3a8a', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: savingEdit ? 'wait' : 'pointer' }}>
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
              background: receiptLang === 'vi' ? '#1e3a8a' : 'var(--bg-hover)',
              color: receiptLang === 'vi' ? '#fff' : 'var(--text-secondary)',
              border: receiptLang === 'vi' ? 'none' : '1px solid var(--border)',
              transition: 'all 0.15s'
            }}>
              🇻🇳 Tiếng Việt
            </button>
            <button onClick={() => setReceiptLang('en')} style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              background: receiptLang === 'en' ? '#1e3a8a' : 'var(--bg-hover)',
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
                  <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 'bold', letterSpacing: '1px' }}>JAN&apos;S MOTORBIKE</h2>
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
                    <p style={{ margin: 0, fontWeight: 'bold' }}>JAN&apos;S MOTORBIKE</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center' }}>
                  <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 'bold', letterSpacing: '1px' }}>JAN&apos;S MOTORBIKE</h2>
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

      <ManageCategoriesModal
        open={manageCategoriesOpen}
        onClose={() => setManageCategoriesOpen(false)}
        thu={danhMucThu}
        chi={danhMucChi}
        onSave={handleSaveCategories}
      />
    </div>
  );
}