'use client';

import { useEffect, useMemo, useState } from 'react';
import { callAPI } from '@/lib/api';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
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
    active: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
    expired: 'bg-red-500/15 text-red-400 ring-red-500/30',
    unknown: 'bg-zinc-500/15 text-zinc-400 ring-zinc-500/30',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${styles[type]}`}
    >
      {label}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      <p className="text-sm text-zinc-400">Đang tải danh sách khách hàng...</p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      </div>
      <div>
        <p className="font-medium text-red-300">Không thể tải dữ liệu</p>
        <p className="mt-1 text-sm text-zinc-400">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-400"
      >
        Thử lại
      </button>
    </div>
  );
}

function CustomerCard({ item }) {
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-zinc-100">{item.tenKH || '—'}</h3>
          <p className="mt-0.5 text-sm text-zinc-400">
            {item.xeThue || '—'}
            {item.bienSo ? ` · ${item.bienSo}` : ''}
          </p>
        </div>
        <StatusBadge ngayKetThuc={item.ngayKetThuc} />
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-zinc-500">Thời gian thuê</dt>
          <dd className="text-zinc-300">
            {formatDate(item.ngayBatDau)} → {formatDate(item.ngayKetThuc)}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Giá thuê</dt>
          <dd className="font-medium text-amber-400">{formatPrice(item.giaThue)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Chi nhánh</dt>
          <dd className="text-zinc-300">{item.chiNhanh || '—'}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">CTV</dt>
          <dd className="text-zinc-300">{item.congTacVien || '—'}</dd>
        </div>
      </dl>
    </article>
  );
}

export default function KhachHangPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const result = await callAPI('getKhachHangData');
console.log('KH result:', JSON.stringify(result).substring(0, 300));

// getKhachHangData trả về {success, data: [...]} hoặc trực tiếp array
let list = [];
if (Array.isArray(result)) {
  list = result;
} else if (result && Array.isArray(result.data)) {
  list = result.data;
} else if (result && Array.isArray(result.khachHang)) {
  list = result.khachHang;
}
setCustomers(list);
    } catch (err) {
      setError(err.message || 'Đã xảy ra lỗi không xác định');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
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
    <div className="min-h-full bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <header className="mb-6 sm:mb-8">
          <p className="text-sm font-medium text-amber-500">Jan&apos;s Motorbike</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Quản lý khách hàng
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Danh sách khách hàng đang thuê xe
          </p>
        </header>

        <div className="mb-6">
          <label htmlFor="search" className="sr-only">
            Tìm kiếm theo tên hoặc biển số
          </label>
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              id="search"
              type="search"
              placeholder="Tìm theo tên khách hàng hoặc biển số..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
          {!loading && !error && (
            <p className="mt-2 text-xs text-zinc-500">
              {filtered.length} / {customers.length} khách hàng
            </p>
          )}
        </div>

        {loading && <LoadingState />}

        {!loading && error && <ErrorState message={error} onRetry={loadData} />}

        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-6 py-16 text-center">
            <p className="text-zinc-300">
              {search ? 'Không tìm thấy khách hàng phù hợp' : 'Chưa có khách hàng nào'}
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            <div className="space-y-3 md:hidden">
              {filtered.map((item, index) => (
                <CustomerCard key={`${item.bienSo}-${item.tenKH}-${index}`} item={item} />
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900">
                      <th className="px-4 py-3 font-medium text-zinc-400">Tên khách hàng</th>
                      <th className="px-4 py-3 font-medium text-zinc-400">Xe thuê + Biển số</th>
                      <th className="px-4 py-3 font-medium text-zinc-400">Thời gian thuê</th>
                      <th className="px-4 py-3 font-medium text-zinc-400">Giá thuê</th>
                      <th className="px-4 py-3 font-medium text-zinc-400">Trạng thái</th>
                      <th className="px-4 py-3 font-medium text-zinc-400">Chi nhánh</th>
                      <th className="px-4 py-3 font-medium text-zinc-400">CTV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {filtered.map((item, index) => (
                      <tr
                        key={`${item.bienSo}-${item.tenKH}-${index}`}
                        className="transition-colors hover:bg-zinc-800/40"
                      >
                        <td className="px-4 py-3 font-medium text-zinc-100">
                          {item.tenKH || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-zinc-200">{item.xeThue || '—'}</div>
                          <div className="text-xs text-zinc-500">{item.bienSo || '—'}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-zinc-300">
                          {formatDate(item.ngayBatDau)} → {formatDate(item.ngayKetThuc)}
                        </td>
                        <td className="px-4 py-3 font-medium text-amber-400 whitespace-nowrap">
                          {formatPrice(item.giaThue)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge ngayKetThuc={item.ngayKetThuc} />
                        </td>
                        <td className="px-4 py-3 text-zinc-300">{item.chiNhanh || '—'}</td>
                        <td className="px-4 py-3 text-zinc-300">{item.congTacVien || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
