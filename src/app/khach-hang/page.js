'use client';

import { useMemo, useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { callAPI } from '@/lib/api';
import { getUser, canWrite } from '@/lib/auth';
import CustomerProfileModal from '@/components/CustomerProfileModal';
import InvoiceModal from '@/components/InvoiceModal';
import MoneyInput from '@/components/MoneyInput';
import CustomDatePicker from '@/components/CustomDatePicker';

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

function formatPrice(value) {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(num);
}

function fmtMoney(value) {
  if (value == null || value === '' || Number(value) === 0 || isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('vi-VN').format(Number(value)) + ' đ';
}

function getTrangThai(ngayKetThuc) {
  if (!ngayKetThuc) return { label: '—', type: 'unknown' };
  
  const str = String(ngayKetThuc).trim();
  let end;
  
  const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (match) {
    const d = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) - 1;
    let y = parseInt(match[3], 10);
    if (y < 100) y += 2000;
    end = new Date(y, m, d);
  } else {
    end = new Date(ngayKetThuc);
  }

  if (Number.isNaN(end?.getTime())) return { label: '—', type: 'unknown' };

  end.setHours(23, 59, 59, 999);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end >= today
    ? { label: 'Còn hạn', type: 'active' }
    : { label: 'Quá hạn', type: 'expired' };
}

function StatusBadge({ ngayKetThuc }) {
  const { label, type } = getTrangThai(ngayKetThuc);
  const styles = {
    active: 'bg-emerald-500/15 text-emerald-500 ring-emerald-500/30',
    expired: 'bg-red-500/15 text-red-500 ring-red-500/30',
    unknown: 'bg-zinc-500/15 text-zinc-500 ring-zinc-500/30',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${styles[type]}`}>
      {label}
    </span>
  );
}

function CustomerCard({ item, onClick, onInvoice }) {
  return (
    <article onClick={onClick} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 transition-colors hover:border-blue-900 hover:bg-[var(--bg-hover)]/30 cursor-pointer">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">{item.tenKH || '—'}</h3>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            {item.xeThue || '—'}
            {item.bienSo ? ` · ${item.bienSo}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge ngayKetThuc={item.ngayKetThuc} />
          <button 
            onClick={(e) => { e.stopPropagation(); onInvoice(); }}
            className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded text-xs font-bold hover:bg-blue-500 hover:text-white transition-colors"
          >
            INVOICE
          </button>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-[var(--text-secondary)]">Thời gian thuê</dt>
          <dd className="text-[var(--text-primary)]">{formatDate(item.ngayBatDau)} → {formatDate(item.ngayKetThuc)}</dd>
        </div>
        <div>
          <dt className="text-[var(--text-secondary)]">Giá thuê</dt>
          <dd className="font-medium text-blue-500">{formatPrice(item.giaThue)}</dd>
        </div>
        <div>
          <dt className="text-[var(--text-secondary)]">Tiền cọc</dt>
          <dd className="font-medium text-red-500">{fmtMoney(item.tienCoc)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[var(--text-secondary)]">Ghi chú</dt>
          <dd className="text-[var(--text-primary)] line-clamp-2" title={item.ghiChu}>{item.ghiChu || '—'}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[var(--text-secondary)]">CTV</dt>
          <dd className="text-[var(--text-primary)]">{item.congTacVien || '—'}</dd>
        </div>
      </dl>
    </article>
  );
}

// --- ADD CUSTOMER MODAL ---
const emptyForm = { tenKH: '', bienSo: '', xeThue: '', giaThue: '', tienCoc: '', ngayBatDau: '', ngayKetThuc: '', chiNhanh: '', congTacVien: '', ghiChu: '' };

function AddCustomerModal({ open, onClose, onSuccess, xeList }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [fileToUpload, setFileToUpload] = useState(null);
  const [uploadMsg, setUploadMsg] = useState('');

  useEffect(() => { 
    if (open) {
      setForm(emptyForm); 
      setFileToUpload(null);
      setUploadMsg('');
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.tenKH.trim() || !form.bienSo.trim()) return alert('Vui lòng nhập tên và biển số!');
    
    // 1. Optimistic Update (UI updates instantly)
    const newKhachHang = { ...form };
    dispatch({ type: 'ADD_KHACH_HANG', payload: newKhachHang });
    onSuccess && onSuccess();
    onClose();

    // 2. Background task for API and file upload
    (async () => {
      try {
        await callAPI('addKhachHang', form);

        if (fileToUpload) {
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

          let base64Data = '';
          const comp = await compressImage(fileToUpload);
          if (comp.isImage) {
            base64Data = comp.base64;
          } else {
            const readBase64 = (f2) => new Promise((resolve) => {
              const r = new FileReader();
              r.readAsDataURL(f2);
              r.onload = () => resolve(r.result.split(',')[1]);
            });
            base64Data = await readBase64(fileToUpload);
          }

          await callAPI('uploadFileToDrive', base64Data, fileToUpload.name, fileToUpload.type, `${form.tenKH} - ${form.bienSo}`);
        }
        
        // Refresh silently to sync with Google Sheet
        onSuccess && onSuccess(true);
      } catch (err) {
        // Revert optimistic update if API fails
        dispatch({ type: 'DELETE_KHACH_HANG', originalName: form.tenKH, originalBienSo: form.bienSo });
        alert('Lỗi lưu khách hàng: ' + err.message);
      }
    })();
  };

  if (!open) return null;
  const inp = 'w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-900';
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '640px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 700, fontSize: '18px' }}>Thêm Khách Hàng Mới</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '24px' }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold mb-1 text-[var(--text-secondary)] uppercase tracking-wider">Tên khách hàng *</label><input required className={inp} value={form.tenKH} onChange={e => setForm({...form, tenKH: e.target.value})} placeholder="Nguyễn Văn A" /></div>
            <div><label className="block text-xs font-semibold mb-1 text-[var(--text-secondary)] uppercase tracking-wider">Biển số *</label><input required className={inp + ' uppercase font-mono'} value={form.bienSo} onChange={e => setForm({...form, bienSo: e.target.value.toUpperCase()})} placeholder="79A1 123.45" /></div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-[var(--text-secondary)] uppercase tracking-wider">Xe thuê *</label>
              <select required className={inp} value={form.bienSo} onChange={e => {
                const bienSo = e.target.value;
                const found = xeList?.find(x => x.bienSo === bienSo);
                setForm({...form, xeThue: found ? (found.tenXe || found.model || '') : form.xeThue, bienSo: bienSo, giaThue: found ? (found.giaThue || form.giaThue) : form.giaThue});
              }}>
                <option value="">-- Chọn xe --</option>
                {(xeList || []).filter(x => x.trangThai === 'Trống').map(x => (
                  <option key={x.bienSo} value={x.bienSo}>{x.tenXe || x.model} ({x.bienSo})</option>
                ))}
              </select>
            </div>
            <div><label className="block text-xs font-semibold mb-1 text-[var(--text-secondary)] uppercase tracking-wider">Số điện thoại</label><input className={inp} value={form.lienLac} onChange={e => setForm({...form, lienLac: e.target.value})} placeholder="09xxxxxxxx" /></div>
            <div><label className="block text-xs font-semibold mb-1 text-[var(--text-secondary)] uppercase tracking-wider">Giá thuê (VND)</label><MoneyInput className={inp} value={form.giaThue} onChange={e => setForm({...form, giaThue: e.target.value})} placeholder="1500000" /></div>
            <div><label className="block text-xs font-semibold mb-1 text-[var(--text-secondary)] uppercase tracking-wider">Tiền cọc (VND)</label><MoneyInput className={inp} value={form.tienCoc} onChange={e => setForm({...form, tienCoc: e.target.value})} placeholder="2500000" /></div>
            <div><label className="block text-xs font-semibold mb-1 text-[var(--text-secondary)] uppercase tracking-wider">Ngày bắt đầu</label><CustomDatePicker value={form.ngayBatDau} onChange={e => setForm({...form, ngayBatDau: e.target.value})} /></div>
            <div><label className="block text-xs font-semibold mb-1 text-[var(--text-secondary)] uppercase tracking-wider">Ngày kết thúc</label><CustomDatePicker value={form.ngayKetThuc} onChange={e => setForm({...form, ngayKetThuc: e.target.value})} /></div>
            <div><label className="block text-xs font-semibold mb-1 text-[var(--text-secondary)] uppercase tracking-wider">Chi nhánh</label><input className={inp} value={form.chiNhanh} onChange={e => setForm({...form, chiNhanh: e.target.value})} /></div>
            <div><label className="block text-xs font-semibold mb-1 text-[var(--text-secondary)] uppercase tracking-wider">Cộng tác viên</label><input className={inp} value={form.congTacVien} onChange={e => setForm({...form, congTacVien: e.target.value})} /></div>
          </div>
          <div><label className="block text-xs font-semibold mb-1 text-[var(--text-secondary)] uppercase tracking-wider">Ghi chú</label><textarea className={inp} rows={2} value={form.ghiChu} onChange={e => setForm({...form, ghiChu: e.target.value})} /></div>
          
          <div>
            <label className="block text-xs font-semibold mb-1 text-[var(--text-secondary)] uppercase tracking-wider">Hồ sơ / Giấy tờ (CCCD, Bằng lái...)</label>
            <div className="flex items-center gap-3">
              <input 
                type="file" 
                id="kh-file-upload" 
                className="hidden" 
                onChange={e => setFileToUpload(e.target.files[0])} 
              />
              <button 
                type="button" 
                onClick={() => document.getElementById('kh-file-upload').click()}
                className="px-4 py-2 rounded-lg bg-[var(--bg-hover)] border border-[var(--border)] text-sm font-medium transition-colors hover:bg-blue-900/10 hover:text-blue-500 hover:border-blue-900 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Chọn File
              </button>
              <span className="text-sm text-[var(--text-secondary)] truncate max-w-[200px] sm:max-w-[300px]">
                {fileToUpload ? fileToUpload.name : 'Chưa chọn file nào'}
              </span>
            </div>
            {uploadMsg && <p className="mt-2 text-sm text-blue-500 font-medium">{uploadMsg}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">Hủy</button>
            <button type="submit" disabled={saving} className="px-6 py-2 rounded-lg bg-blue-900 hover:bg-blue-950 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
              {saving ? (uploadMsg || 'Đang lưu...') : 'Thêm Khách Hàng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function KhachHangPage() {
  const { khachHang: customers, xe, thuChi, loading, error, reload } = useStore();
  const [search, setSearch] = useState('');
  const [filterTrangThai, setFilterTrangThai] = useState('');
  const [filterCTV, setFilterCTV] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [invoiceCustomer, setInvoiceCustomer] = useState(null);
  const [user, setUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // eslint-disable-next-line
  useEffect(() => {
    setTimeout(() => setUser(getUser()), 0);
  }, []);

  const ctvs = useMemo(() => {
    const set = new Set();
    customers.forEach(c => {
      if (c.congTacVien) set.add(c.congTacVien.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [customers]);

  const filtered = useMemo(() => {
    let list = customers;

    if (filterTrangThai) {
      list = list.filter(item => getTrangThai(item.ngayKetThuc).label === filterTrangThai);
    }

    if (filterCTV) {
      list = list.filter(item => item.congTacVien === filterCTV);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (item) => {
          let match = String(item.tenKH || '').toLowerCase().includes(q) ||
                      String(item.bienSo || '').toLowerCase().includes(q) ||
                      String(item.xeThue || '').toLowerCase().includes(q);
          
          if (!match && xe) {
            const foundXe = xe.find(x => x.bienSo === item.bienSo);
            if (foundXe) {
              match = String(foundXe.hangXe || '').toLowerCase().includes(q) ||
                      String(foundXe.model || '').toLowerCase().includes(q) ||
                      String(foundXe.tenXe || '').toLowerCase().includes(q);
            }
          }
          return match;
        }
      );
    }
    return list;
  }, [customers, search, filterTrangThai, filterCTV, xe]);

  const totalCoc = useMemo(() =>
    customers.reduce((sum, c) => sum + (Number(c.tienCoc) || 0), 0)
  , [customers]);

  const filteredCoc = useMemo(() =>
    filtered.reduce((sum, c) => sum + (Number(c.tienCoc) || 0), 0)
  , [filtered]);

  const overdueCount = useMemo(() =>
    customers.filter(c => getTrangThai(c.ngayKetThuc).type === 'expired').length
  , [customers]);

  const filteredOverdueCount = useMemo(() =>
    filtered.filter(c => getTrangThai(c.ngayKetThuc).type === 'expired').length
  , [filtered]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 transition-colors duration-150">
      <div className="w-full">
        <header className="mb-6 sm:mb-8 flex items-center justify-between">
          <div>
            <p className="text-blue-500 text-sm font-semibold mb-1">JAN&apos;S MOTORBIKE</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Quản lý khách hàng</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Danh sách khách hàng đang thuê xe</p>
          </div>
          {canWrite(user) && (
            <button 
              onClick={() => {
                setEditingCustomer({});
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-blue-900 hover:bg-blue-950 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Thêm Khách Hàng
            </button>
          )}
        </header>

        {/* Stats tổng tiền cọc */}
        {!loading && !error && customers.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <p className="text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wider mb-1">Tổng khách hàng</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{customers.length}</p>
              {(search || filterTrangThai || filterCTV) && <p className="text-xs text-[var(--text-secondary)] mt-0.5">Lọc: {filtered.length}</p>}
            </div>
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
              <p className="text-xs text-red-800 font-semibold uppercase tracking-wider mb-1">Tổng tiền cọc</p>
              <p className="text-xl font-bold text-red-500">{new Intl.NumberFormat('vi-VN').format(totalCoc)} đ</p>
              {(search || filterTrangThai || filterCTV) && filteredCoc !== totalCoc && <p className="text-xs text-red-800 mt-0.5">Lọc: {new Intl.NumberFormat('vi-VN').format(filteredCoc)} đ</p>}
            </div>
            <div 
              onClick={() => setFilterTrangThai('Quá hạn')}
              className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 hidden sm:block cursor-pointer transition-colors hover:bg-amber-500/10 hover:border-amber-500/50"
              title="Nhấn để lọc khách quá hạn"
            >
              <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-1">Khách quá hạn</p>
              <p className="text-2xl font-bold text-amber-500">{overdueCount}</p>
              {(search || filterTrangThai || filterCTV) && filteredOverdueCount !== overdueCount && <p className="text-xs text-amber-600 mt-0.5">Lọc: {filteredOverdueCount}</p>}
            </div>
          </div>
        )}

        <div className="mb-6 space-y-3">
          <label htmlFor="kh-search" className="sr-only">Tìm kiếm theo tên hoặc biển số</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                id="kh-search"
                type="search"
                placeholder="Tìm theo tên khách, biển số, xe..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-3 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none transition focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            
            <select 
              value={filterTrangThai} 
              onChange={e => setFilterTrangThai(e.target.value)}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 min-w-[160px]"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Còn hạn">Còn hạn</option>
              <option value="Quá hạn">Quá hạn</option>
            </select>

            <select 
              value={filterCTV} 
              onChange={e => setFilterCTV(e.target.value)}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 min-w-[160px]"
            >
              <option value="">Tất cả CTV</option>
              {ctvs.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {!loading && !error && (
            <div className="flex items-center gap-3">
              <p className="text-xs text-[var(--text-secondary)]">{filtered.length} / {customers.length} khách hàng</p>
              {(search || filterTrangThai || filterCTV) && (
                <button 
                  onClick={() => { setSearch(''); setFilterTrangThai(''); setFilterCTV(''); }}
                  className="text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors"
                >
                  Xóa lọc
                </button>
              )}
            </div>
          )}
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            <p className="text-sm text-[var(--text-secondary)]">Đang tải danh sách khách hàng...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-16 text-center">
            <p className="font-medium text-red-400">Không thể tải dữ liệu</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{error}</p>
            <button type="button" onClick={reload} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-400">
              Thử lại
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-6 py-16 text-center">
            <p className="text-[var(--text-primary)]">
              {search ? 'Không tìm thấy khách hàng phù hợp' : 'Chưa có khách hàng nào'}
            </p>
          </div>
        )}

        {/* Data */}
        {!loading && !error && filtered.length > 0 && (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {filtered.map((item, index) => (
                <CustomerCard key={index} item={item} onClick={() => setSelectedCustomer(item)} onInvoice={() => setInvoiceCustomer(item)} />
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-card)]">
                      <th className="px-4 py-3 font-medium text-[var(--text-secondary)]">Tên khách hàng</th>
                      <th className="px-4 py-3 font-medium text-[var(--text-secondary)]">Xe thuê + Biển số</th>
                      <th className="px-4 py-3 font-medium text-[var(--text-secondary)]">Thời gian thuê</th>
                      <th className="px-4 py-3 font-medium text-[var(--text-secondary)]">Giá thuê</th>
                      <th className="px-4 py-3 font-medium text-[var(--text-secondary)]">Tiền cọc</th>
                      <th className="px-4 py-3 font-medium text-[var(--text-secondary)]">Trạng thái</th>
                      <th className="px-4 py-3 font-medium text-[var(--text-secondary)]">Ghi chú</th>
                      <th className="px-4 py-3 font-medium text-[var(--text-secondary)]">CTV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filtered.map((item, index) => (
                      <tr key={`${item.bienSo}-${item.tenKH}-${index}`} className="transition-colors hover:bg-[var(--bg-hover)] cursor-pointer" onClick={() => setSelectedCustomer(item)}>
                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{item.tenKH || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="text-[var(--text-primary)]">{item.xeThue || '—'}</div>
                          <div className="text-xs text-[var(--text-secondary)]">{item.bienSo || '—'}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[var(--text-primary)]">
                          {formatDate(item.ngayBatDau)} → {formatDate(item.ngayKetThuc)}
                        </td>
                        <td className="px-4 py-3 font-medium text-blue-500 whitespace-nowrap">{formatPrice(item.giaThue)}</td>
                        <td className="px-4 py-3 font-medium text-red-500 whitespace-nowrap">{fmtMoney(item.tienCoc)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <StatusBadge ngayKetThuc={item.ngayKetThuc} />
                            <button 
                              onClick={(e) => { e.stopPropagation(); setInvoiceCustomer(item); }}
                              className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded text-xs font-bold hover:bg-blue-500 hover:text-white transition-colors"
                            >
                              INVOICE
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-primary)] max-w-[200px] truncate" title={item.ghiChu}>{item.ghiChu || '—'}</td>
                        <td className="px-4 py-3 text-[var(--text-primary)]">{item.congTacVien || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <AddCustomerModal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={reload} 
        xeList={xe}
      />
      <CustomerProfileModal 
        open={!!selectedCustomer} 
        onClose={() => setSelectedCustomer(null)} 
        customer={selectedCustomer} 
        thuChiData={thuChi} 
        xeList={xe}
        onSuccess={reload}
      />
      
      <InvoiceModal 
        open={!!invoiceCustomer} 
        onClose={() => setInvoiceCustomer(null)} 
        customer={invoiceCustomer} 
      />
    </div>
  );
}
