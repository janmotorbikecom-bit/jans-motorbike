'use client';

import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { callAPI } from '@/lib/api';
import { getUser, canWrite, canDelete } from '@/lib/auth';
import MoneyInput from '@/components/MoneyInput';

function fmtMoney(n) {
  if (!n || isNaN(n)) return '—';
  return new Intl.NumberFormat('vi-VN').format(n) + ' đ';
}

function getTrangThaiStyle(tt) {
  const s = (tt || '').toLowerCase();
  if (s.includes('thuê') || s.includes('thue')) {
    return { bg: 'bg-green-500/20', text: 'text-green-500', border: 'border-green-500/30', label: 'Đang thuê' };
  }
  return { bg: 'bg-red-500/20', text: 'text-red-500', border: 'border-red-500/30', label: 'Trống' };
}

// --- VEHICLE PROFILE MODAL ---
function VehicleProfileModal({ open, onClose, xe, thuChiData, onSuccess, uniqueBrands }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  // eslint-disable-next-line
  useEffect(() => {
    setTimeout(() => {
      setUser(getUser());
      if (open && xe) {
        setFormData(xe);
        setIsEditing(false);
      }
    }, 0);
  }, [open, xe]);

  if (!open || !xe) return null;

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await callAPI('updateXe', { ...formData, originalBienSo: xe.bienSo });
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      alert('Lỗi cập nhật: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa xe này không? Mọi dữ liệu liên quan có thể bị ảnh hưởng. Hành động này không thể hoàn tác!')) return;
    setLoading(true);
    try {
      await callAPI('deleteXe', xe.bienSo);
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      alert('Lỗi xóa: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Lọc thu chi của xe này
  const relatedTC = (thuChiData || []).filter(r => {
    const b = (r.bienSo || '').toLowerCase();
    const xB = (xe.bienSo || '').toLowerCase();
    return b && xB && b === xB;
  }).sort((a, b) => (parseInt(b.rowNum) || 0) - (parseInt(a.rowNum) || 0));

  const listThu = relatedTC.filter(r => r.loai === 'Thu');
  const listChi = relatedTC.filter(r => r.loai === 'Chi');

  const isRevenue = (r) => !(r.danhMuc || '').toLowerCase().includes('cọc');
  const isExpense = (r) => !(r.danhMuc || '').toLowerCase().includes('cọc');

  const tongThu = listThu.filter(isRevenue).reduce((s, r) => s + (parseFloat(r.soTien) || 0), 0);
  const tongChi = listChi.filter(isExpense).reduce((s, r) => s + (parseFloat(r.soTien) || 0), 0);
  const loiNhuan = tongThu - tongChi;
  const giaVon = parseFloat(xe.giaVon) || 0;
  const roi = giaVon > 0 ? ((loiNhuan / giaVon) * 100).toFixed(1) : 0;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '16px', width: '100%', maxWidth: '850px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '18px' }}>
              Hồ sơ Xe: <span className="text-blue-500">{xe.tenXe || xe.model || '—'}</span>
            </span>
            <span className="ml-3 font-mono text-sm bg-[var(--bg-hover)] px-2 py-1 rounded border border-[var(--border)]">{xe.bienSo}</span>
          </div>
          <div className="flex items-center gap-3">
            {!isEditing && (
              <>
                {canWrite(user) && <button onClick={() => setIsEditing(true)} className="text-sm px-3 py-1.5 rounded bg-[var(--bg-hover)] text-[var(--text-primary)] hover:text-blue-500 transition-colors">✏️ Sửa</button>}
                {canDelete(user) && <button onClick={handleDelete} disabled={loading} className="text-sm px-3 py-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors">🗑️ Xóa</button>}
              </>
            )}
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '24px', lineHeight: 1 }}>×</button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto" style={{ flex: 1 }}>
          {isEditing ? (
            <form onSubmit={handleUpdate} className="space-y-4 mb-6 pb-6 border-b border-[var(--border)]">
              <h3 className="font-bold text-blue-500 mb-2">Chỉnh sửa thông tin xe</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tên xe <span className="text-red-500">*</span></label>
                  <input required type="text" value={formData.tenXe || ''} onChange={e => setFormData({...formData, tenXe: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Hãng xe</label>
                  <input type="text" list="brands-list-edit" value={formData.hangXe || ''} onChange={e => setFormData({...formData, hangXe: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" />
                  <datalist id="brands-list-edit">
                    {(uniqueBrands || []).map(b => <option key={b} value={b} />)}
                  </datalist>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Biển số <span className="text-red-500">*</span></label>
                  <input required type="text" value={formData.bienSo || ''} onChange={e => setFormData({...formData, bienSo: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)] font-mono uppercase" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Màu sơn</label>
                  <input type="text" value={formData.mauSon || ''} onChange={e => setFormData({...formData, mauSon: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Năm SX</label>
                  <input type="text" value={formData.nam || ''} onChange={e => setFormData({...formData, nam: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Giá vốn</label>
                  <MoneyInput value={formData.giaVon || ''} onChange={e => setFormData({...formData, giaVon: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Trạng thái</label>
                <input type="text" value={formData.trangThai || ''} onChange={e => setFormData({...formData, trangThai: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <textarea value={formData.ghiChu || ''} onChange={e => setFormData({...formData, ghiChu: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" rows="2" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">Hủy</button>
                <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-blue-900 text-white font-medium hover:bg-blue-950 disabled:opacity-50 transition-colors">
                  {loading ? 'Đang lưu...' : 'Lưu cập nhật'}
                </button>
              </div>
            </form>
          ) : null}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[var(--bg-hover)]/50 border border-[var(--border)] rounded-xl p-4 text-center">
              <p className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-wider mb-1">Tổng Doanh Thu</p>
              <p className="text-xl font-bold text-green-500">+{fmtMoney(tongThu)}</p>
            </div>
            <div className="bg-[var(--bg-hover)]/50 border border-[var(--border)] rounded-xl p-4 text-center">
              <p className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-wider mb-1">Tổng Chi Phí</p>
              <p className="text-xl font-bold text-red-500">-{fmtMoney(tongChi)}</p>
            </div>
            <div className="bg-[var(--bg-hover)]/50 border border-[var(--border)] rounded-xl p-4 text-center">
              <p className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-wider mb-1">Lợi Nhuận</p>
              <div className="flex items-center justify-center gap-2">
                <p className={`text-xl font-bold ${loiNhuan >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                  {loiNhuan > 0 ? '+' : ''}{fmtMoney(loiNhuan)}
                </p>
                {giaVon > 0 && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${loiNhuan >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`} title="Tỉ suất Lợi nhuận / Giá vốn">
                    {loiNhuan > 0 ? '+' : ''}{roi}%
                  </span>
                )}
              </div>
              {giaVon > 0 && <p className="text-[10px] text-[var(--text-secondary)] mt-1">Giá vốn: {fmtMoney(giaVon)}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cột Thu */}
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-[var(--border)] pb-2">
                <h3 className="font-semibold text-green-500 flex items-center gap-2">
                  <span className="text-lg">🟢</span> Lịch sử Thu (Khách thuê)
                </h3>
                <span className="text-xs bg-[var(--bg-hover)] px-2 py-1 rounded font-bold">{listThu.length} GD</span>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {listThu.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)] text-center py-4">Chưa có dữ liệu thu.</p>
                ) : (
                  listThu.map((r, i) => (
                    <div key={i} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 text-sm hover:border-green-500/30 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-[var(--text-primary)]">{r.khach || r.nguoiMua || '—'}</span>
                        <span className="font-bold text-green-500 whitespace-nowrap">+{fmtMoney(r.soTien)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-[var(--text-secondary)] mt-1">
                        <span>{r.ngay} · <span className="bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded">{r.danhMuc}</span></span>
                      </div>
                      {r.batDau && r.ketThuc && <p className="text-[11px] text-[var(--text-secondary)] mt-1">Kỳ: {r.batDau} → {r.ketThuc}</p>}
                      {r.ghiChu && <p className="text-[11px] mt-1 text-[var(--text-secondary)] italic">&quot;{r.ghiChu}&quot;</p>}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Cột Chi */}
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-[var(--border)] pb-2">
                <h3 className="font-semibold text-red-500 flex items-center gap-2">
                  <span className="text-lg">🔴</span> Lịch sử Chi (Bảo dưỡng, Sửa...)
                </h3>
                <span className="text-xs bg-[var(--bg-hover)] px-2 py-1 rounded font-bold">{listChi.length} GD</span>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {listChi.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)] text-center py-4">Chưa có dữ liệu chi.</p>
                ) : (
                  listChi.map((r, i) => (
                    <div key={i} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 text-sm hover:border-red-500/30 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-[var(--text-primary)]"><span className="bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded text-xs mr-2">{r.danhMuc || 'Chi'}</span></span>
                        <span className="font-bold text-red-500 whitespace-nowrap">-{fmtMoney(r.soTien)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-[var(--text-secondary)] mt-1.5">
                        <span>{r.ngay}</span>
                      </div>
                      {r.ghiChu && <p className="text-[11px] mt-1 text-[var(--text-secondary)] italic">&quot;{r.ghiChu}&quot;</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

// --- ADD VEHICLE MODAL ---
function AddVehicleModal({ open, onClose, onSuccess, uniqueBrands }) {
  const [formData, setFormData] = useState({ tenXe: '', hangXe: '', bienSo: '', mauSon: '', nam: '', giaVon: '', ghiChu: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await callAPI('addXe', formData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi thêm xe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '24px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        <h2 className="text-xl font-bold mb-4">Thêm xe mới</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tên xe <span className="text-red-500">*</span></label>
            <input required type="text" value={formData.tenXe} onChange={e => setFormData({...formData, tenXe: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Hãng xe</label>
              <input type="text" list="brands-list" value={formData.hangXe} onChange={e => setFormData({...formData, hangXe: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" placeholder="Chọn hoặc nhập mới..." />
              <datalist id="brands-list">
                {(uniqueBrands || []).map(b => <option key={b} value={b} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Biển số <span className="text-red-500">*</span></label>
              <input required type="text" value={formData.bienSo} onChange={e => setFormData({...formData, bienSo: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)] font-mono uppercase" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Màu sơn</label>
              <input type="text" value={formData.mauSon} onChange={e => setFormData({...formData, mauSon: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Năm SX</label>
              <input type="text" value={formData.nam} onChange={e => setFormData({...formData, nam: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Giá vốn</label>
            <MoneyInput value={formData.giaVon} onChange={e => setFormData({...formData, giaVon: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ghi chú</label>
            <textarea value={formData.ghiChu} onChange={e => setFormData({...formData, ghiChu: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" rows="2" />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">Hủy</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-blue-900 text-white font-medium hover:bg-blue-950 disabled:opacity-50 transition-colors">
              {loading ? 'Đang lưu...' : 'Lưu thông tin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- UPDATE CAPITAL MODAL ---
function UpdateCapitalModal({ open, onClose, onSuccess }) {
  const [val, setVal] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!val) return;
    setLoading(true);
    try {
      await callAPI('saveDashboardCapital', parseFloat(val));
      onSuccess();
      onClose();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '400px', padding: '24px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        <h2 className="text-xl font-bold mb-2">Cập nhật Vốn Chu Kỳ Trước</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">Nhập tổng số vốn của chu kỳ trước để tính toán tăng trưởng vốn hiện tại.</p>
        <form onSubmit={handleSubmit}>
          <MoneyInput autoFocus required placeholder="Nhập số tiền..." value={val} onChange={e => setVal(e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2 mb-4 text-[var(--text-primary)]" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">Hủy</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors">
              {loading ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function QuanLyXe() {
  const { xe, xeStats, thuChi, khachHang, loading, error, reload } = useStore();
  const [search, setSearch] = useState('');
  const [activeBrand, setActiveBrand] = useState('All');
  const [activeStatus, setActiveStatus] = useState('All'); // 'All', 'Trống', 'Đang thuê'
  const [selectedXe, setSelectedXe] = useState(null);
  const [showAddXe, setShowAddXe] = useState(false);
  const [showCapital, setShowCapital] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setTimeout(() => setUser(getUser()), 0);
  }, []);

  const uniqueBrands = useMemo(() => {
    const brands = new Set();
    xe.forEach(x => {
      const b = (x.hangXe || 'Khác').trim();
      if (b) brands.add(b);
    });
    return Array.from(brands).sort();
  }, [xe]);

  const filtered = useMemo(() => {
    let result = xe;

    if (activeStatus === 'Trống') {
      result = result.filter(x => {
        const tt = (x.trangThai || '').toLowerCase();
        return tt === 'trống' || tt === 'trong' || tt === '' || tt === 'available';
      });
    } else if (activeStatus === 'Đang thuê') {
      result = result.filter(x => {
        const tt = (x.trangThai || '').toLowerCase();
        return tt.includes('thuê') || tt.includes('thue') || tt === 'đang thuê';
      });
    }

    if (activeBrand !== 'All') {
      result = result.filter(x => {
        const b = (x.hangXe || 'Khác').trim();
        return b === activeBrand;
      });
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(x => {
        let match = (x.tenXe || '').toLowerCase().includes(q) ||
          (x.bienSo || '').toLowerCase().includes(q) ||
          (x.hangXe || '').toLowerCase().includes(q) ||
          (x.model || '').toLowerCase().includes(q);
          
        if (!match) {
          const b1 = (x.bienSo || '').toLowerCase();
          const renter = khachHang.find(k => {
            const b2 = (k.bienSo || '').toLowerCase();
            return b1 && b2 && b1 === b2 && k.tenKH;
          });
          if (renter && renter.tenKH.toLowerCase().includes(q)) {
            match = true;
          }
        }
        return match;
      });
    }
    return result;
  }, [xe, search, activeBrand, activeStatus, khachHang]);

  // Stats
  const tongXe = xe.length;
  const dangTrong = xe.filter(x => {
    const tt = (x.trangThai || '').toLowerCase();
    return tt === 'trống' || tt === 'trong' || tt === '' || tt === 'available';
  }).length;
  const dangThue = xe.filter(x => {
    const tt = (x.trangThai || '').toLowerCase();
    return tt.includes('thuê') || tt.includes('thue') || tt === 'đang thuê';
  }).length;
  const tongVon = xe.reduce((s, x) => s + (parseFloat(x.giaVon) || 0), 0);
  const vonChuKyTruoc = parseFloat(xeStats?.vonChuKyTruoc) || 0;
  const tangVon = tongVon - vonChuKyTruoc;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 transition-colors duration-150">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-blue-500 text-sm font-semibold mb-1">JAN&apos;S MOTORBIKE</p>
          <h1 className="text-3xl font-bold">Quản lý xe</h1>
          <p className="text-[var(--text-secondary)] mt-1">Danh sách toàn bộ xe trong hệ thống</p>
        </div>
        {canWrite(user) && (
          <button onClick={() => setShowAddXe(true)} className="bg-blue-900 hover:bg-blue-950 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2">
            <span className="text-lg leading-none">+</span> Thêm xe mới
          </button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div 
          onClick={() => setActiveStatus('All')}
          className={`bg-[var(--bg-card)] border ${activeStatus === 'All' ? 'border-blue-900 shadow-sm shadow-blue-900/20 ring-1 ring-blue-900' : 'border-[var(--border)]'} rounded-xl p-4 cursor-pointer hover:border-blue-900/50 transition-all`}
        >
          <p className="text-[var(--text-secondary)] text-sm">Tổng số xe</p>
          <p className="text-2xl font-bold mt-1">{tongXe}</p>
        </div>
        <div 
          onClick={() => setActiveStatus('Trống')}
          className={`bg-[var(--bg-card)] border ${activeStatus === 'Trống' ? 'border-red-500 shadow-sm shadow-red-500/20 ring-1 ring-red-500' : 'border-[var(--border)]'} rounded-xl p-4 cursor-pointer hover:border-red-500/50 transition-all`}
        >
          <p className="text-[var(--text-secondary)] text-sm">Đang trống</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{dangTrong}</p>
        </div>
        <div 
          onClick={() => setActiveStatus('Đang thuê')}
          className={`bg-[var(--bg-card)] border ${activeStatus === 'Đang thuê' ? 'border-green-500 shadow-sm shadow-green-500/20 ring-1 ring-green-500' : 'border-[var(--border)]'} rounded-xl p-4 cursor-pointer hover:border-green-500/50 transition-all`}
        >
          <p className="text-[var(--text-secondary)] text-sm">Đang cho thuê</p>
          <p className="text-2xl font-bold text-green-500 mt-1">{dangThue}</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-[var(--text-secondary)] text-sm flex items-center justify-between">
            Tổng giá vốn
            {canWrite(user) && <button onClick={() => setShowCapital(true)} className="text-xs bg-[var(--bg-hover)] px-2 py-0.5 rounded text-[var(--text-primary)] hover:text-blue-500 transition-colors">Sửa vốn CK trước</button>}
          </p>
          <p className="text-xl font-bold text-red-500 mt-1">{fmtMoney(tongVon)}</p>
          
          {vonChuKyTruoc > 0 && (
            <div className="mt-2 text-xs flex items-center justify-between border-t border-[var(--border)] pt-2">
              <span className="text-[var(--text-secondary)]">Tăng vốn:</span>
              <span className={`font-bold ${tangVon >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {tangVon > 0 ? '+' : ''}{fmtMoney(tangVon)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Search and Tags */}
      <div className="mb-4">
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm theo tên xe, biển số, hãng..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-blue-900 transition-colors"
          />
        </div>
        
        {/* Tags */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button 
            onClick={() => setActiveBrand('All')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${activeBrand === 'All' ? 'bg-blue-900 text-white border-blue-900' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-blue-900 hover:text-[var(--text-primary)]'}`}
          >
            Tất cả hãng
          </button>
          {uniqueBrands.map(b => (
            <button 
              key={b}
              onClick={() => setActiveBrand(b)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${activeBrand === b ? 'bg-blue-900 text-white border-blue-900' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-blue-900 hover:text-[var(--text-primary)]'}`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      {!loading && !error && (
        <p className="text-[var(--text-secondary)] text-sm mb-3">{filtered.length} / {tongXe} xe</p>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-16 text-center">
          <div className="w-8 h-8 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-[var(--text-secondary)]">Đang tải dữ liệu...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-12 text-center">
          <p className="text-red-500 font-medium mb-2">Không thể tải dữ liệu</p>
          <p className="text-red-500/70 text-sm mb-4">{error}</p>
          <button onClick={reload} className="bg-blue-900 hover:bg-blue-950 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
            Thử lại
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-card)]">
                  <th className="text-left text-[var(--text-secondary)] text-sm font-medium px-4 py-3">Tên xe</th>
                  <th className="text-left text-[var(--text-secondary)] text-sm font-medium px-4 py-3">Hãng</th>
                  <th className="text-left text-[var(--text-secondary)] text-sm font-medium px-4 py-3">Biển số</th>
                  <th className="text-left text-[var(--text-secondary)] text-sm font-medium px-4 py-3">Màu sơn</th>
                  <th className="text-left text-[var(--text-secondary)] text-sm font-medium px-4 py-3">Năm</th>
                  <th className="text-left text-[var(--text-secondary)] text-sm font-medium px-4 py-3">Khách thuê</th>
                  <th className="text-right text-[var(--text-secondary)] text-sm font-medium px-4 py-3">Giá vốn</th>
                  <th className="text-center text-[var(--text-secondary)] text-sm font-medium px-4 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-[var(--text-secondary)] py-12">
                      {search ? 'Không tìm thấy xe phù hợp' : 'Chưa có xe nào'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((x, i) => {
                    const tt = getTrangThaiStyle(x.trangThai);
                    return (
                      <tr key={i} onClick={() => setSelectedXe(x)} className="hover:bg-[var(--bg-hover)]/40 transition-colors cursor-pointer group">
                        <td className="px-4 py-3">
                          <p className="font-medium">{x.tenXe || x.model || '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">{x.hangXe || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm bg-[var(--bg-hover)] px-2 py-1 rounded text-[var(--text-primary)] border border-[var(--border)]">
                            {x.bienSo || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">{x.mauSon || '—'}</td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">{x.nam || '—'}</td>
                        <td className="px-4 py-3">
                          {(() => {
                            if (!tt.label.includes('Đang thuê')) return <span className="text-[var(--text-secondary)]">—</span>;
                            // Find active renter
                            const b1 = (x.bienSo || '').toLowerCase();
                            const renter = khachHang.find(k => {
                              const b2 = (k.bienSo || '').toLowerCase();
                              return b1 && b2 && b1 === b2 && k.tenKH;
                            });
                            return renter ? (
                              <span className="font-medium text-[var(--text-primary)]">{renter.tenKH}</span>
                            ) : (
                              <span className="text-[var(--text-secondary)] text-xs italic">Không rõ</span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-right text-red-500 font-medium">{fmtMoney(x.giaVon)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${tt.bg} ${tt.text} ${tt.border}`}>
                            {tt.label}
                          </span>
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

      <VehicleProfileModal 
        open={!!selectedXe} 
        onClose={() => setSelectedXe(null)} 
        xe={selectedXe} 
        thuChiData={thuChi} 
        onSuccess={reload}
        uniqueBrands={uniqueBrands}
      />
      <AddVehicleModal open={showAddXe} onClose={() => setShowAddXe(false)} onSuccess={reload} uniqueBrands={uniqueBrands} />
      <UpdateCapitalModal open={showCapital} onClose={() => setShowCapital(false)} onSuccess={reload} />
    </div>
  );
}