'use client';

import { useMemo, useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { callAPI } from '@/lib/api';
import { getUser, canWrite } from '@/lib/auth';
import CustomerProfileModal from '@/components/CustomerProfileModal';
import InvoiceModal from '@/components/InvoiceModal';

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
  const end = new Date(ngayKetThuc);
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
    <article onClick={onClick} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 transition-colors hover:border-orange-500 hover:bg-[var(--bg-hover)]/30 cursor-pointer">
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
          <dd className="font-medium text-amber-500">{formatPrice(item.giaThue)}</dd>
        </div>
        <div>
          <dt className="text-[var(--text-secondary)]">Tiền cọc</dt>
          <dd className="font-medium text-amber-500">{fmtMoney(item.tienCoc)}</dd>
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

// --- CUSTOMER PROFILE MODAL MOVED TO COMPONENT ---

export default function KhachHangPage() {
  const { khachHang: customers, xe, thuChi, loading, error, reload } = useStore();
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [invoiceCustomer, setInvoiceCustomer] = useState(null);
  const [user, setUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (item) =>
        (item.tenKH || '').toLowerCase().includes(q) ||
        (item.bienSo || '').toLowerCase().includes(q),
    );
  }, [customers, search]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 transition-colors duration-150">
      <div className="w-full">
        <header className="mb-6 sm:mb-8 flex items-center justify-between">
          <div>
            <p className="text-orange-500 text-sm font-semibold mb-1">JAN&apos;S MOTORBIKE</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Quản lý khách hàng</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Danh sách khách hàng đang thuê xe</p>
          </div>
          {canWrite(user) && (
            <button 
              onClick={() => {
                setEditingCustomer({});
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Thêm Khách Hàng
            </button>
          )}
        </header>

        <div className="mb-6">
          <label htmlFor="kh-search" className="sr-only">Tìm kiếm theo tên hoặc biển số</label>
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              id="kh-search"
              type="search"
              placeholder="Tìm theo tên khách hàng hoặc biển số..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-3 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none transition focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
          {!loading && !error && (
            <p className="mt-2 text-xs text-[var(--text-secondary)]">{filtered.length} / {customers.length} khách hàng</p>
          )}
        </div>

        {/* Loading */}
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
                        <td className="px-4 py-3 font-medium text-amber-500 whitespace-nowrap">{formatPrice(item.giaThue)}</td>
                        <td className="px-4 py-3 font-medium text-amber-500 whitespace-nowrap">{fmtMoney(item.tienCoc)}</td>
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

      <CustomerProfileModal 
        open={!!selectedCustomer} 
        onClose={() => setSelectedCustomer(null)} 
        customer={selectedCustomer} 
        thuChiData={thuChi} 
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
