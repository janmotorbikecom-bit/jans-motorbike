'use client';

import { useState, useEffect } from 'react';
import { callAPI } from '@/lib/api';

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

export default function CustomerProfileModal({ open, onClose, customer, thuChiData, onSuccess }) {
  const [activeTab, setActiveTab] = useState('info');
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Notes state
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Files state
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  useEffect(() => {
    if (open && customer) {
      setActiveTab('info');
      setFormData(customer);
      setIsEditing(false);
      fetchNotes();
    }
  }, [open, customer]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await callAPI('updateKhachHang', { ...formData, originalBienSo: customer.bienSo, originalTenKH: customer.tenKH });
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      alert('Lỗi cập nhật: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa khách hàng này không? Hành động này không thể hoàn tác!')) return;
    setSaving(true);
    try {
      await callAPI('deleteKhachHang', { tenKH: customer.tenKH, bienSo: customer.bienSo });
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      alert('Lỗi xóa: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const fetchNotes = async () => {
    if (!customer) return;
    setLoadingNotes(true);
    try {
      const res = await callAPI('getKhachHangNotes', customer.tenKH, customer.bienSo);
      if (res && res.notes) setNotes(res.notes);
    } catch (e) {
      console.error('Lỗi lấy ghi chú:', e);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !customer) return;
    setAddingNote(true);
    try {
      const res = await callAPI('addKhachHangNote', {
        tenKH: customer.tenKH,
        bienSo: customer.bienSo,
        loai: 'Ghi chú',
        noiDung: newNote.trim()
      });
      if (res && res.notes) setNotes(res.notes);
      setNewNote('');
    } catch (e) {
      alert('Lỗi: ' + e.message);
    } finally {
      setAddingNote(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !customer) return;
    
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

    setUploading(true);
    setUploadMsg('Đang nén và tải lên...');
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

      await callAPI('uploadFileToDrive', {
        tenKH: customer.tenKH,
        bienSo: customer.bienSo,
        fileName: file.name,
        mimeType: file.type,
        base64Data
      });
      
      setUploadMsg('Tải lên thành công! File đã lưu vào thư mục Drive.');
    } catch (err) {
      setUploadMsg('Lỗi: ' + err.message);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadMsg(''), 5000);
      e.target.value = null; // reset input
    }
  };

  if (!open || !customer) return null;

  const paymentHistory = (thuChiData || []).filter(r => {
    if (!r.khach && !r.nguoiMua) return false;
    const ten = (r.khach || r.nguoiMua || '').toLowerCase();
    const cTen = (customer.tenKH || '').toLowerCase();
    const b = (r.bienSo || '').toLowerCase();
    const cB = (customer.bienSo || '').toLowerCase();
    return (ten === cTen) || (b && cB && b === cB);
  }).sort((a, b) => (parseInt(b.rowNum) || 0) - (parseInt(a.rowNum) || 0));

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '16px', width: '100%', maxWidth: '750px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '18px' }}>
            Hồ sơ: <span className="text-orange-500">{customer.tenKH}</span>
            {customer.isGuest && <span className="ml-2 text-[10px] bg-zinc-500/20 text-zinc-400 px-2 py-0.5 rounded-full uppercase tracking-wider">Khách ngoài / Cũ</span>}
          </span>
          <div className="flex items-center gap-3">
            {!isEditing && !customer.isGuest && (
              <>
                <button onClick={() => setIsEditing(true)} className="text-sm px-3 py-1.5 rounded bg-[var(--bg-hover)] text-[var(--text-primary)] hover:text-orange-500 transition-colors">✏️ Sửa</button>
                <button onClick={handleDelete} disabled={saving} className="text-sm px-3 py-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors">🗑️ Xóa</button>
              </>
            )}
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '24px', lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Tabs header */}
        <div className="flex border-b border-[var(--border)] px-4 pt-2 overflow-x-auto">
          {[
            { id: 'info', label: 'Thông tin' },
            { id: 'history', label: 'Lịch sử thanh toán' },
            ...(!customer.isGuest ? [
              { id: 'notes', label: 'Ghi chú' },
              { id: 'docs', label: 'Tài liệu & Upload' },
            ] : []),
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === t.id ? 'border-orange-500 text-orange-500' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto" style={{ flex: 1 }}>
          
          {/* TAB: INFO */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              {isEditing ? (
                <form onSubmit={handleUpdate} className="space-y-4 bg-[var(--bg-hover)]/30 p-4 rounded-xl border border-[var(--border)]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Tên khách hàng <span className="text-red-500">*</span></label>
                      <input required type="text" value={formData.tenKH || ''} onChange={e => setFormData({...formData, tenKH: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                      <input type="text" value={formData.lienLac || formData.sdt || ''} onChange={e => setFormData({...formData, lienLac: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Xe thuê <span className="text-red-500">*</span></label>
                      <input required type="text" value={formData.xeThue || ''} onChange={e => setFormData({...formData, xeThue: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Biển số <span className="text-red-500">*</span></label>
                      <input required type="text" value={formData.bienSo || ''} onChange={e => setFormData({...formData, bienSo: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)] font-mono uppercase" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Giá thuê</label>
                      <input type="number" value={formData.giaThue || ''} onChange={e => setFormData({...formData, giaThue: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Tiền cọc</label>
                      <input type="number" value={formData.tienCoc || ''} onChange={e => setFormData({...formData, tienCoc: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Ngày bắt đầu</label>
                      <input type="text" value={formData.ngayBatDau || ''} onChange={e => setFormData({...formData, ngayBatDau: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Ngày kết thúc</label>
                      <input type="text" value={formData.ngayKetThuc || ''} onChange={e => setFormData({...formData, ngayKetThuc: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Chi nhánh</label>
                      <input type="text" value={formData.chiNhanh || ''} onChange={e => setFormData({...formData, chiNhanh: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Cộng tác viên</label>
                      <input type="text" value={formData.congTacVien || ''} onChange={e => setFormData({...formData, congTacVien: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Ghi chú gốc</label>
                    <textarea value={formData.ghiChu || ''} onChange={e => setFormData({...formData, ghiChu: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" rows="2" />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">Hủy</button>
                    <button type="submit" disabled={saving} className="px-4 py-2 rounded bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors">
                      {saving ? 'Đang lưu...' : 'Lưu cập nhật'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-1">Tên khách hàng</p>
                    <p className="font-medium">{customer.tenKH || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-1">Số điện thoại</p>
                    <p className="font-medium text-blue-500">{customer.lienLac || customer.sdt || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-1">Xe thuê</p>
                    <p className="font-medium">{customer.xeThue || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-1">Biển số</p>
                    <p className="font-medium font-mono bg-[var(--bg-hover)] inline-block px-2 py-0.5 rounded border border-[var(--border)] text-xs">{customer.bienSo || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-1">Giá thuê</p>
                    <p className="font-medium text-orange-500">{new Intl.NumberFormat('vi-VN').format(customer.giaThue || 0)} đ</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-1">Tiền cọc</p>
                    <p className="font-medium text-orange-500">{new Intl.NumberFormat('vi-VN').format(customer.tienCoc || 0)} đ</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-1">Thời gian thuê</p>
                    <p className="font-medium text-orange-500 bg-orange-500/10 px-3 py-1.5 rounded inline-flex items-center gap-2">
                      <span>{formatDate(customer.ngayBatDau)}</span>
                      <span className="text-orange-300">→</span>
                      <span>{formatDate(customer.ngayKetThuc)}</span>
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-[var(--bg-hover)] p-3 rounded-xl border border-[var(--border)] mt-4">
                <p className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-2">Chi nhánh & CTV</p>
                <p className="text-sm">Chi nhánh: <span className="font-medium text-[var(--text-primary)]">{customer.chiNhanh || '—'}</span></p>
                <p className="text-sm">CTV: <span className="font-medium text-[var(--text-primary)]">{customer.congTacVien || '—'} {customer.tyLeHoaHong ? `(${customer.tyLeHoaHong}%)` : ''}</span></p>
              </div>

              {customer.ghiChu && (
                <div className="mt-4">
                  <p className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-1">Ghi chú gốc</p>
                  <p className="text-sm bg-[var(--bg-hover)] p-3 rounded-lg border border-[var(--border)] italic">{customer.ghiChu}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: LỊCH SỬ THANH TOÁN */}
          {activeTab === 'history' && (
            <div>
              {paymentHistory.length === 0 ? (
                <p className="text-[var(--text-secondary)] text-sm text-center py-8">Chưa có giao dịch nào liên quan.</p>
              ) : (
                <div className="overflow-x-auto border border-[var(--border)] rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[var(--bg-hover)] text-[var(--text-secondary)] text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 border-b border-[var(--border)]">Ngày</th>
                        <th className="px-4 py-3 border-b border-[var(--border)]">Loại</th>
                        <th className="px-4 py-3 border-b border-[var(--border)]">Danh mục</th>
                        <th className="px-4 py-3 border-b border-[var(--border)] text-right">Số tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {paymentHistory.map((r, i) => {
                        const isThu = r.loai === 'Thu';
                        return (
                          <tr key={i} className="hover:bg-[var(--bg-hover)]/50">
                            <td className="px-4 py-3">{r.ngay || '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${isThu ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {r.loai}
                              </span>
                            </td>
                            <td className="px-4 py-3">{r.danhMuc || '—'}</td>
                            <td className={`px-4 py-3 text-right font-bold ${isThu ? 'text-green-500' : 'text-red-500'}`}>
                              {isThu ? '+' : '-'}{new Intl.NumberFormat('vi-VN').format(r.soTien || 0)} đ
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: NOTES */}
          {activeTab === 'notes' && (
            <div className="flex flex-col h-full space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newNote} 
                  onChange={e => setNewNote(e.target.value)} 
                  placeholder="Nhập nội dung ghi chú..."
                  className="flex-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                  onKeyDown={e => { if (e.key === 'Enter') handleAddNote(); }}
                />
                <button 
                  onClick={handleAddNote}
                  disabled={addingNote || !newNote.trim()}
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-orange-600 transition-colors"
                >
                  {addingNote ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto border border-[var(--border)] rounded-lg bg-[var(--bg-hover)]/30 p-3 space-y-3 min-h-[250px] max-h-[350px]">
                {loadingNotes ? (
                  <p className="text-center text-[var(--text-secondary)] text-sm py-4">Đang tải ghi chú...</p>
                ) : notes.length === 0 ? (
                  <p className="text-center text-[var(--text-secondary)] text-sm py-4">Chưa có ghi chú nào.</p>
                ) : (
                  notes.map((n, i) => (
                    <div key={i} className="bg-[var(--bg-card)] border border-[var(--border)] rounded p-3 text-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-orange-500 text-xs">{n.nguoiTao}</span>
                        <span className="text-[10px] text-[var(--text-secondary)]">{n.thoiGian}</span>
                      </div>
                      <p className="text-[var(--text-primary)] whitespace-pre-wrap">{n.noiDung}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: DOCS */}
          {activeTab === 'docs' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-[var(--border)] hover:border-orange-500 rounded-xl p-8 text-center transition-colors">
                <input type="file" id="file-upload" className="hidden" onChange={handleFileUpload} />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center">
                  <svg className="w-10 h-10 text-[var(--text-secondary)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Nhấp để chọn file Upload</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Ảnh (CCCD, Hợp đồng) sẽ tự động được nén gọn trước khi gửi lên Drive để chống giật lag.</p>
                </label>
              </div>

              {uploading && (
                <div className="text-center p-3 bg-orange-500/10 text-orange-500 rounded-lg text-sm font-medium animate-pulse">
                  {uploadMsg || 'Đang xử lý...'}
                </div>
              )}
              {!uploading && uploadMsg && (
                <div className="text-center p-3 bg-emerald-500/10 text-emerald-500 rounded-lg text-sm font-medium">
                  {uploadMsg}
                </div>
              )}

              <div className="bg-[var(--bg-hover)] p-4 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] mt-4">
                <p className="font-semibold text-[var(--text-primary)] mb-1">Lưu ý kỹ thuật:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Web đang gọi hàm API <code className="text-orange-500 bg-[var(--bg-card)] px-1 rounded">uploadFileToDrive</code> trên Apps Script của bạn.</li>
                  <li>Nếu bạn đã viết sẵn hàm với tên khác (vd: <code>uploadHoSo</code>), vui lòng đổi tên hàm trên Apps Script cho trùng khớp.</li>
                </ul>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
