'use client';

import { useState, useEffect } from 'react';
import { callAPI } from '@/lib/api';
import { getUser, canWrite, canDelete } from '@/lib/auth';
import MoneyInput from '@/components/MoneyInput';
import CustomDatePicker from '@/components/CustomDatePicker';

const DANH_MUC_THU = ['Tiền thuê tháng', 'Thuê mới', 'Thuê ngắn', 'Phụ thu', 'Bán xe'];
const DANH_MUC_CHI = ['Bảo dưỡng', 'Thay phụ tùng', 'Nhiên liệu', 'Sửa chữa', 'Chi phí khác', 'Dịch vụ sửa xe', 'Thuế / phí cầu đường'];

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

function autoCalcKetThuc(soTien, giaThue, batDauStr) {
  if (!soTien || !giaThue || !batDauStr) return null;
  const soThang = Math.round(Number(soTien) / Number(giaThue));
  if (soThang <= 0) return null;
  const parts = String(batDauStr).split('/');
  if (parts.length !== 3) return null;
  const d = new Date(parts[2], parseInt(parts[1], 10) - 1, parts[0]);
  if (isNaN(d)) return null;
  d.setMonth(d.getMonth() + soThang);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export default function CustomerProfileModal({ open, onClose, customer, thuChiData, xeList, onSuccess }) {
  const [activeTab, setActiveTab] = useState('info');

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const [addTcOpen, setAddTcOpen] = useState(false);
  const [tcForm, setTcForm] = useState({ loai: 'Thu', danhMuc: 'Tiền thuê tháng', soTien: '', batDau: '', ketThuc: '', ghiChu: '' });
  const [addingTc, setAddingTc] = useState(false);

  // Notes state
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Files state
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [localUrls, setLocalUrls] = useState([]);

  useEffect(() => {
    if (customer) {
      if (Array.isArray(customer.docs) && customer.docs.length > 0) {
        setLocalUrls(customer.docs);
      } else if (customer.giayToUrls) {
        try {
          const parsed = JSON.parse(customer.giayToUrls);
          setLocalUrls(Array.isArray(parsed) ? parsed : []);
        } catch(e) {
          setLocalUrls([]);
        }
      } else {
        setLocalUrls([]);
      }
    } else {
      setLocalUrls([]);
    }
  }, [customer]);

  const [user, setUser] = useState(null);

  async function fetchNotes() {
    if (!customer) return;
    setLoadingNotes(true);
    try {
      let data = [];
      try {
        data = await callAPI('getNotes', customer.tenKH, customer.bienSo);
      } catch (e) {
        if (customer.ghiChu) {
          const parts = customer.ghiChu.split(/(?=\[\d{1,2}\/\d{1,2}\/\d{4}.*?\])/g);
          parts.forEach(p => {
             const m = p.match(/^\[(.*?) - (.*?)\]([\s\S]*)$/);
             if (m) {
               data.push({ thoiGian: m[1], nguoiTao: m[2], noiDung: m[3].trim() });
             } else if (p.trim()) {
               data.push({ thoiGian: '', nguoiTao: 'Ghi chú gốc', noiDung: p.trim() });
             }
          });
        }
      }
      setNotes(data || []);
    } catch (err) {
      console.error('Lỗi tải ghi chú:', err);
    } finally {
      setLoadingNotes(false);
    }
  }

  useEffect(() => {
    setTimeout(() => {
      setUser(getUser());
      if (open && customer) {
        setActiveTab('info');
        setFormData(customer);
        setIsEditing(false);
        fetchNotes();
      }
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customer]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Whitelist chỉ các field đúng schema KhachHang — tránh field lạ làm GAS crash/overwrite sai row
      const cleanData = {
        tenKH: formData.tenKH,
        bienSo: formData.bienSo,
        xeThue: formData.xeThue,
        lienLac: formData.lienLac || formData.sdt || '',
        giaThue: formData.giaThue,
        tienCoc: formData.tienCoc,
        ngayBatDau: formData.ngayBatDau,
        ngayKetThuc: formData.ngayKetThuc,
        chiNhanh: formData.chiNhanh,
        congTacVien: formData.congTacVien,
        ghiChu: formData.ghiChu,
      };

      if (!cleanData.tenKH || !cleanData.bienSo) {
        alert('Lỗi: Thiếu tên khách hàng hoặc biển số. Không thể lưu!');
        setSaving(false);
        return;
      }

      // Dùng customer.tenKH và customer.bienSo GỐC để GAS tìm đúng row cần update
      // cleanData.bienSo là biển số MỚI (xe vừa đổi) sẽ được ghi vào row đó
      await callAPI('updateKhachHang', customer.tenKH, cleanData);

      // Chờ GAS commit vào Google Sheets trước khi reload
      await new Promise(r => setTimeout(r, 1500));
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
      await callAPI('deleteKhachHang', customer.tenKH, customer.bienSo);
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      alert('Lỗi xóa: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !customer) return;
    setAddingNote(true);
    try {
      const now = new Date();
      const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const author = user?.taiKhoan || 'Admin';
      
      const formattedNote = `\n[${timeStr} - ${author}] ${newNote.trim()}`;
      const updatedGhiChu = customer.ghiChu ? `${customer.ghiChu}${formattedNote}` : formattedNote.trim();

      const cleanData = {
        tenKH: customer.tenKH,
        bienSo: customer.bienSo,
        xeThue: customer.xeThue,
        lienLac: customer.lienLac || customer.sdt || '',
        giaThue: customer.giaThue,
        tienCoc: customer.tienCoc,
        ngayBatDau: customer.ngayBatDau,
        ngayKetThuc: customer.ngayKetThuc,
        chiNhanh: customer.chiNhanh,
        congTacVien: customer.congTacVien,
        ghiChu: updatedGhiChu,
      };

      await callAPI('updateKhachHang', customer.tenKH, cleanData);

      const newNoteObj = { thoiGian: timeStr, nguoiTao: author, noiDung: newNote.trim() };
      setNotes([...notes, newNoteObj]);
      customer.ghiChu = updatedGhiChu;
      
      setNewNote('');
      onSuccess && onSuccess();
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

      const res = await callAPI('uploadFileToDrive', base64Data, file.name, file.type, `${customer.tenKH} - ${customer.bienSo}`);

      if (res && res.fileUrl) {
        let urls = [];
        if (Array.isArray(customer.docs)) {
          urls = [...customer.docs];
        } else {
          try {
            urls = JSON.parse(customer.giayToUrls || '[]');
            if (!Array.isArray(urls)) urls = [];
          } catch(e) {
            urls = [];
          }
        }
        urls.push({ url: res.fileUrl, name: file.name, date: new Date().toISOString() });
        const newUrlsStr = JSON.stringify(urls);
        setLocalUrls(urls);
        
        const payload = { ...customer, giayToUrls: newUrlsStr };
        await callAPI('updateKhachHang', customer.tenKH, payload);
        if (onSuccess) onSuccess();
      }

      setUploadMsg('Tải lên thành công! File đã lưu vào thư mục Drive và đính kèm vào hồ sơ.');
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
    const ten = String(r.khach || r.nguoiMua || '').toLowerCase();
    const cTen = String(customer.tenKH || '').toLowerCase();
    const b = String(r.bienSo || '').toLowerCase();
    const cB = String(customer.bienSo || '').toLowerCase();
    return (ten === cTen) || (b && cB && b === cB);
  }).sort((a, b) => (parseInt(b.rowNum) || 0) - (parseInt(a.rowNum) || 0));

  const handleAddThuChi = async (e) => {
    e.preventDefault();
    if (!tcForm.soTien || !tcForm.danhMuc) return;
    setAddingTc(true);
    try {
      const now = new Date();
      const ngay = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

      const payload = {
        ngay,
        loai: tcForm.loai,
        danhMuc: tcForm.danhMuc,
        khach: tcForm.loai === 'Thu' ? customer.tenKH : '',
        nguoiMua: tcForm.loai === 'Chi' ? customer.tenKH : '',
        bienSo: customer.bienSo || '',
        soTien: tcForm.soTien,
        batDau: tcForm.batDau,
        ketThuc: tcForm.ketThuc,
        chiNhanh: customer.chiNhanh || '',
        congTacVien: customer.congTacVien || '',
        ghiChu: tcForm.ghiChu || ''
      };

      await callAPI('addThuChi', payload);
      setTcForm({ loai: 'Thu', danhMuc: 'Tiền thuê tháng', soTien: '', batDau: '', ketThuc: '', ghiChu: '' });
      setAddTcOpen(false);
      onSuccess && onSuccess();
    } catch (err) {
      alert('Lỗi thêm thu chi: ' + err.message);
    } finally {
      setAddingTc(false);
    }
  };

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
            Hồ sơ: <span className="text-blue-500">{customer.tenKH}</span>
            {customer.isGuest && <span className="ml-2 text-[10px] bg-zinc-500/20 text-zinc-400 px-2 py-0.5 rounded-full uppercase tracking-wider">Khách ngoài / Cũ</span>}
          </span>
          <div className="flex items-center gap-3">
            {!isEditing && !customer.isGuest && (
              <>
                {canWrite(user) && (
                  <button onClick={() => setIsEditing(true)} className="text-sm px-3 py-1.5 rounded bg-[var(--bg-hover)] text-[var(--text-primary)] hover:text-blue-500 transition-colors">✏️ Sửa</button>
                )}
                {canDelete(user) && (
                  <button onClick={handleDelete} disabled={saving} className="text-sm px-3 py-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors">🗑️ Xóa</button>
                )}
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
              className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === t.id ? 'border-blue-900 text-blue-500' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
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
                      <input readOnly required type="text" value={formData.tenKH || ''} className="w-full bg-[var(--bg-hover)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-secondary)] cursor-not-allowed" title="Không thể đổi tên. Xóa và tạo mới nếu cần đổi tên." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                      <input type="text" value={formData.lienLac || formData.sdt || ''} onChange={e => setFormData({ ...formData, lienLac: e.target.value })} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Xe thuê <span className="text-red-500">*</span></label>
                      <select required value={formData.bienSo || ''} onChange={e => {
                        const bienSo = e.target.value;
                        const found = xeList?.find(x => x.bienSo === bienSo);
                        setFormData({ ...formData, xeThue: found ? (found.tenXe || found.model || '') : formData.xeThue, bienSo: bienSo, giaThue: formData.giaThue || found?.giaThue || '' });
                      }} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]">
                        {/* Xe hiện tại - luôn hiển thị dù đang thuê */}
                        {formData.bienSo && !xeList?.find(x => x.trangThai === 'Trống' && x.bienSo === formData.bienSo) && (
                          <option value={formData.bienSo}>{formData.xeThue} ({formData.bienSo}) - Đang thuê</option>
                        )}
                        {/* Xe trống có thể chọn */}
                        {xeList?.filter(x => x.trangThai === 'Trống').map(x => (
                          <option key={x.bienSo} value={x.bienSo}>{x.tenXe || x.model} ({x.bienSo})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Biển số <span className="text-red-500">*</span></label>
                      <input readOnly required type="text" value={formData.bienSo || ''} className="w-full bg-[var(--bg-hover)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-secondary)] font-mono uppercase cursor-not-allowed" title="Thay đổi biển số bằng cách chọn lại Xe thuê ở trên" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Giá thuê</label>
                      <MoneyInput value={formData.giaThue || ''} onChange={e => setFormData({ ...formData, giaThue: e.target.value })} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Tiền cọc</label>
                      <MoneyInput value={formData.tienCoc || ''} onChange={e => setFormData({ ...formData, tienCoc: e.target.value })} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Ngày bắt đầu</label>
                      <CustomDatePicker value={formData.ngayBatDau || ''} onChange={e => setFormData({ ...formData, ngayBatDau: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Ngày kết thúc</label>
                      <CustomDatePicker value={formData.ngayKetThuc || ''} onChange={e => setFormData({ ...formData, ngayKetThuc: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Chi nhánh</label>
                      <input type="text" value={formData.chiNhanh || ''} onChange={e => setFormData({ ...formData, chiNhanh: e.target.value })} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Cộng tác viên</label>
                      <input type="text" value={formData.congTacVien || ''} onChange={e => setFormData({ ...formData, congTacVien: e.target.value })} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Ghi chú gốc</label>
                    <textarea value={formData.ghiChu || ''} onChange={e => setFormData({ ...formData, ghiChu: e.target.value })} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)]" rows="2" />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">Hủy</button>
                    <button type="submit" disabled={saving} className="px-4 py-2 rounded bg-blue-900 text-white font-medium hover:bg-blue-950 disabled:opacity-50 transition-colors">
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
                    <p className="font-medium text-blue-500">{new Intl.NumberFormat('vi-VN').format(customer.giaThue || 0)} đ</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-1">Tiền cọc</p>
                    <p className="font-medium text-blue-500">{new Intl.NumberFormat('vi-VN').format(customer.tienCoc || 0)} đ</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-1">Thời gian thuê</p>
                    <p className="font-medium text-blue-500 bg-blue-900/10 px-3 py-1.5 rounded inline-flex items-center gap-2">
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
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">Lịch sử thu / chi</h3>
                {canWrite(user) && (
                  <button onClick={() => {
                    setTcForm(prev => {
                      let batDauTemp = prev.batDau;
                      if (!addTcOpen && customer && customer.ngayKetThuc) {
                         let d;
                         const parts = String(customer.ngayKetThuc).split('/');
                         if (parts.length === 3) {
                            d = new Date(parts[2], parseInt(parts[1], 10) - 1, parts[0]);
                         } else {
                            d = new Date(customer.ngayKetThuc);
                         }
                         if (d && !isNaN(d)) {
                            const dd = String(d.getDate()).padStart(2, '0');
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            batDauTemp = `${dd}/${mm}/${d.getFullYear()}`;
                         }
                      }
                      return { ...prev, batDau: batDauTemp };
                    });
                    setAddTcOpen(!addTcOpen);
                  }} className="text-xs bg-blue-900 hover:bg-blue-950 text-white px-3 py-1.5 rounded transition-colors">
                    {addTcOpen ? 'Hủy' : '+ Thêm Giao Dịch'}
                  </button>
                )}
              </div>

              {addTcOpen && (
                <form onSubmit={handleAddThuChi} className="bg-[var(--bg-hover)] p-4 rounded-xl border border-[var(--border)] mb-4 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">Loại</label>
                      <select value={tcForm.loai} onChange={e => setTcForm({ ...tcForm, loai: e.target.value, danhMuc: e.target.value === 'Thu' ? DANH_MUC_THU[0] : DANH_MUC_CHI[0] })} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-2 py-1.5 text-sm">
                        <option value="Thu">Thu</option>
                        <option value="Chi">Chi</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">Danh mục</label>
                      <select required value={tcForm.danhMuc} onChange={e => setTcForm({ ...tcForm, danhMuc: e.target.value })} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-2 py-1.5 text-sm">
                        {(tcForm.loai === 'Thu' ? DANH_MUC_THU : DANH_MUC_CHI).map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">Số tiền *</label>
                      <MoneyInput required value={tcForm.soTien} onChange={e => {
                        const val = e.target.value;
                        setTcForm(prev => {
                          const updates = { soTien: val };
                          if (prev.danhMuc === 'Tiền thuê tháng' && customer?.giaThue) {
                            const newKetThuc = autoCalcKetThuc(val, customer.giaThue, prev.batDau);
                            if (newKetThuc) updates.ketThuc = newKetThuc;
                          }
                          return { ...prev, ...updates };
                        });
                      }} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-2 py-1.5 text-sm" placeholder="100000" />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">Từ ngày</label>
                      <CustomDatePicker value={tcForm.batDau} onChange={e => {
                        const val = e.target.value;
                        setTcForm(prev => {
                          const updates = { batDau: val };
                          if (prev.danhMuc === 'Tiền thuê tháng' && customer?.giaThue && prev.soTien) {
                            const newKetThuc = autoCalcKetThuc(prev.soTien, customer.giaThue, val);
                            if (newKetThuc) updates.ketThuc = newKetThuc;
                          }
                          return { ...prev, ...updates };
                        });
                      }} />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">Đến ngày</label>
                      <CustomDatePicker value={tcForm.ketThuc} onChange={e => setTcForm({ ...tcForm, ketThuc: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">Ghi chú</label>
                      <input type="text" value={tcForm.ghiChu} onChange={e => setTcForm({ ...tcForm, ghiChu: e.target.value })} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-2 py-1.5 text-sm" placeholder="..." />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button type="submit" disabled={addingTc} className="text-xs bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded disabled:opacity-50 transition-colors">
                      {addingTc ? 'Đang lưu...' : 'Lưu giao dịch'}
                    </button>
                  </div>
                </form>
              )}

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
                  className="flex-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-900"
                  onKeyDown={e => { if (e.key === 'Enter') handleAddNote(); }}
                />
                <button
                  onClick={handleAddNote}
                  disabled={addingNote || !newNote.trim()}
                  className="bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-950 transition-colors"
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
                        <span className="font-semibold text-blue-500 text-xs">{n.nguoiTao}</span>
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
              
              {(() => {
                const urls = localUrls;
                if (urls.length > 0) {
                  return (
                    <div className="space-y-2 mb-4">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Tài liệu đã lưu ({urls.length}):</p>
                      {urls.map((u, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[200px]">{u.name || 'Tài liệu'}</span>
                            <span className="text-xs text-[var(--text-secondary)]">{formatDate(u.date)}</span>
                          </div>
                          <a href={u.url} target="_blank" rel="noreferrer" className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-md text-xs font-semibold hover:bg-blue-500/20 transition-colors">
                            Xem / Tải
                          </a>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              })()}

              <div className="border-2 border-dashed border-[var(--border)] hover:border-blue-900 rounded-xl p-8 text-center transition-colors">
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
                <div className="text-center p-3 bg-blue-900/10 text-blue-500 rounded-lg text-sm font-medium animate-pulse">
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
                  <li>Web đang gọi hàm API <code className="text-blue-500 bg-[var(--bg-card)] px-1 rounded">uploadFileToDrive</code> trên Apps Script của bạn.</li>
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