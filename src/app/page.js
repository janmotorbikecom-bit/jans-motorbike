'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import CustomerProfileModal from '@/components/CustomerProfileModal';
import DashboardCharts from '@/components/DashboardCharts';
import InvoiceModal from '@/components/InvoiceModal';

function fmtMoney(n) {
  if (!n && n !== 0) return '0 đ';
  const num = parseFloat(n);
  if (isNaN(num) || num === 0) return '0 đ';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace('.0', '') + ' tr';
  return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
}

function fmtMoneyFull(n) {
  if (!n || isNaN(n) || n === 0) return '0 đ';
  return new Intl.NumberFormat('vi-VN').format(n) + ' đ';
}

function getThisMonthKey() {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
}

function parseNgayMonthKey(ngay) {
  if (!ngay) return '';
  const parts = String(ngay).split('/');
  // dd/mm/yyyy → "mm/yyyy"
  if (parts.length >= 3) return `${parts[1].padStart(2, '0')}/${parts[2]}`;
  return '';
}

function parseDate(str) {
  if (!str) return null;
  const parts = String(str).split('/');
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    const date = new Date(y, m, d);
    if (!isNaN(date.getTime())) return date;
  }
  const date = new Date(str);
  if (!isNaN(date.getTime())) return date;
  return null;
}

function getDaysDiff(ngayKetThuc) {
  const d = parseDate(ngayKetThuc);
  if (!d) return 0;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const diffTime = d.getTime() - t.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon, href }) {
  const content = (
    <div className="group relative bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 overflow-hidden transition-all duration-200 hover:border-slate-400 dark:hover:border-slate-700 hover:bg-[var(--bg-hover)]">
      {/* Glow */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 blur-xl" style={{ background: color }} />
      <div className="flex items-start justify-between mb-3">
        <div className="text-2xl">{icon}</div>
        {href && (
          <svg className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
      <p className="text-[var(--text-secondary)] text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-[var(--text-secondary)] text-xs mt-1">{sub}</p>}
    </div>
  );
  return href ? <Link href={href} className="block no-underline">{content}</Link> : content;
}

// ── Loading skeleton ───────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 animate-pulse">
      <div className="w-8 h-8 bg-[var(--bg-hover)] rounded-lg mb-3" />
      <div className="w-24 h-3 bg-[var(--bg-hover)] rounded mb-2" />
      <div className="w-32 h-7 bg-[var(--bg-hover)] rounded" />
    </div>
  );
}



export default function DashboardPage() {
  const { xe, khachHang, thuChi, xeDaBan, loading, error, reload } = useStore();
  const thisMonth = getThisMonthKey();
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [invoiceCustomer, setInvoiceCustomer] = useState(null);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const next7Days = useMemo(() => {
    const n = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    n.setHours(23, 59, 59, 999);
    return n;
  }, [today]);

  // ── Computed stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    // Row 2: Xe stats
    const tongXe = xe.length;
    const xeTrong = xe.filter(x => {
      const tt = (x.trangThai || '').toLowerCase();
      return tt === 'trống' || tt === 'trong' || tt === '' || tt === 'available';
    }).length;
    const xeThue = xe.filter(x => {
      const tt = (x.trangThai || '').toLowerCase();
      return tt.includes('thuê') || tt.includes('thue');
    }).length;

    const soldCount = (xeDaBan && xeDaBan.length > 0)
      ? xeDaBan.length
      : thuChi.filter(r => (r.danhMuc || '').toLowerCase().includes('bán xe')).length;

    // Row 1: Finance stats
    const isRevenue = (r) => r.loai === 'Thu' && !(r.danhMuc || '').toLowerCase().includes('cọc');
    const isExpense = (r) => r.loai === 'Chi' && !(r.danhMuc || '').toLowerCase().includes('cọc');

    const thuThang = thuChi
      .filter(r => isRevenue(r) && parseNgayMonthKey(r.ngay) === thisMonth)
      .reduce((s, r) => s + (parseFloat(r.soTien) || 0), 0);
    const chiThang = thuChi
      .filter(r => isExpense(r) && parseNgayMonthKey(r.ngay) === thisMonth)
      .reduce((s, r) => s + (parseFloat(r.soTien) || 0), 0);
    const loiNhuanThang = thuThang - chiThang;

    const thuToanThoiGian = thuChi
      .filter(isRevenue)
      .reduce((s, r) => s + (parseFloat(r.soTien) || 0), 0);

    return {
      tongXe,
      xeTrong,
      xeThue,
      xeDaBan: soldCount,
      thuThang,
      chiThang,
      loiNhuanThang,
      thuToanThoiGian
    };
  }, [xe, thuChi, xeDaBan, thisMonth]);

  // ── Recent 10 transactions ─────────────────────────────────────────────
  const recent10 = useMemo(() => {
    return [...thuChi]
      .sort((a, b) => {
        const da = parseDate(a.ngay || a.ngayBan);
        const db = parseDate(b.ngay || b.ngayBan);
        if (da && db) {
          if (db.getTime() !== da.getTime()) {
            return db.getTime() - da.getTime();
          }
        }
        return (parseInt(b.rowNum) || 0) - (parseInt(a.rowNum) || 0);
      })
      .slice(0, 10);
  }, [thuChi]);

  // ── Customer status lists ────────────────────────────────────────────────
  const sapHetHan = useMemo(() => {
    return khachHang.filter(k => {
      const d = parseDate(k.ngayKetThuc);
      if (!d) return false;
      return d >= today && d <= next7Days;
    });
  }, [khachHang, today, next7Days]);

  const daQuaHan = useMemo(() => {
    return khachHang.filter(k => {
      const d = parseDate(k.ngayKetThuc);
      if (!d) return false;
      return d < today;
    });
  }, [khachHang, today]);

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-8 text-[var(--text-primary)]">
        <div className="text-center">
          <p className="text-red-500 font-medium mb-2">Không thể tải dữ liệu</p>
          <p className="text-[var(--text-secondary)] text-sm mb-4">{error}</p>
          <button onClick={reload} className="bg-blue-900 hover:bg-blue-950 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[var(--text-primary)] p-6 bg-[var(--bg-primary)] transition-colors duration-150">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-blue-500 text-sm font-semibold mb-1">JAN&apos;S MOTORBIKE</p>
          <h1 className="text-3xl font-bold">Tổng quan</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Tháng {thisMonth} · {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {!loading && (
          <button onClick={reload}
            className="flex items-center gap-2 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-primary)] px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Tải lại
          </button>
        )}
      </div>

      {/* ── Stat cards: Tài chính tháng này (Row 1) ─────────────────────────────────── */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">💰 Tài chính</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <>
              <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
            </>
          ) : (
            <>
              <StatCard
                label="Tổng thu tháng này"
                value={fmtMoney(stats.thuThang)}
                sub={fmtMoneyFull(stats.thuThang)}
                color="#22c55e"
                icon="📈"
                href="/thu-chi"
              />
              <StatCard
                label="Tổng chi tháng này"
                value={fmtMoney(stats.chiThang)}
                sub={fmtMoneyFull(stats.chiThang)}
                color="#ef4444"
                icon="📉"
                href="/thu-chi"
              />
              <StatCard
                label="Lợi nhuận tháng này"
                value={fmtMoney(stats.loiNhuanThang)}
                sub={fmtMoneyFull(stats.loiNhuanThang)}
                color={stats.loiNhuanThang >= 0 ? '#a78bfa' : '#ef4444'}
                icon="💎"
                href="/thu-chi"
              />
              <StatCard
                label="Tổng thu toàn thời gian"
                value={fmtMoney(stats.thuToanThoiGian)}
                sub={fmtMoneyFull(stats.thuToanThoiGian)}
                color="#3b82f6"
                icon="📊"
                href="/thu-chi"
              />
            </>
          )}
        </div>
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────────── */}
      {!loading && thuChi.length > 0 && <DashboardCharts thuChi={thuChi} />}

      {/* ── Customer status section (Elevated) ───────────────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">⚠️ Cảnh báo khách hàng</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Overdue */}
          <div className="bg-[var(--bg-card)] border-2 border-red-500/50 rounded-2xl overflow-hidden shadow-[0_0_15px_rgba(239,68,68,0.1)] transition-colors relative">
            {daQuaHan.length > 0 && <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl rounded-full" />}
            <div className="flex items-center justify-between px-5 py-4 border-b border-red-500/20 bg-red-500/5 relative z-10">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
                <h3 className="text-sm font-bold text-red-500 uppercase">Khách đã quá hạn</h3>
              </div>
              <span className="text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                {loading ? '...' : daQuaHan.length} hợp đồng
              </span>
            </div>
            {loading ? (
              <div className="p-5 space-y-3">
                <div className="h-10 bg-[var(--bg-hover)] rounded animate-pulse" />
              </div>
            ) : daQuaHan.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-secondary)] text-sm">
                Không có khách hàng nào đã quá hạn hợp đồng 🎉
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)] max-h-[320px] overflow-y-auto relative z-10 bg-[var(--bg-card)]">
                {daQuaHan.map((k, i) => {
                  const diff = getDaysDiff(k.ngayKetThuc);
                  return (
                    <div key={i} onClick={() => setSelectedCustomer(k)} className="flex items-center justify-between px-5 py-3 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">{k.tenKH || '—'}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{k.xeThue} · {k.bienSo}</p>
                      </div>
                      <div className="ml-4 flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setInvoiceCustomer(k); }}
                            className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded text-xs font-bold hover:bg-blue-500 hover:text-white transition-colors"
                          >
                            INVOICE
                          </button>
                          <span className="text-xs font-bold px-2 py-1 rounded-md bg-red-500/10 text-red-500 border border-red-500/20">
                            Trễ {Math.abs(diff)} ngày
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-[var(--text-secondary)] mt-1">Hết hạn: {k.ngayKetThuc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Expiring Soon */}
          <div className="bg-[var(--bg-card)] border-2 border-amber-500/50 rounded-2xl overflow-hidden shadow-[0_0_15px_rgba(245,158,11,0.1)] transition-colors relative">
            {sapHetHan.length > 0 && <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full" />}
            <div className="flex items-center justify-between px-5 py-4 border-b border-amber-500/20 bg-amber-500/5 relative z-10">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
                <h3 className="text-sm font-bold text-amber-500 uppercase">Sắp hết hạn (7 ngày tới)</h3>
              </div>
              <span className="text-xs font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                {loading ? '...' : sapHetHan.length} hợp đồng
              </span>
            </div>
            {loading ? (
              <div className="p-5 space-y-3">
                <div className="h-10 bg-[var(--bg-hover)] rounded animate-pulse" />
              </div>
            ) : sapHetHan.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-secondary)] text-sm">
                Không có hợp đồng nào sắp hết hạn trong 7 ngày tới.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)] max-h-[320px] overflow-y-auto relative z-10 bg-[var(--bg-card)]">
                {sapHetHan.map((k, i) => {
                  const diff = getDaysDiff(k.ngayKetThuc);
                  return (
                    <div key={i} onClick={() => setSelectedCustomer(k)} className="flex items-center justify-between px-5 py-3 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">{k.tenKH || '—'}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{k.xeThue} · {k.bienSo}</p>
                      </div>
                      <div className="ml-4 flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setInvoiceCustomer(k); }}
                            className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded text-xs font-bold hover:bg-blue-500 hover:text-white transition-colors"
                          >
                            INVOICE
                          </button>
                          <span className="text-xs font-bold px-2 py-1 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            Còn {diff} ngày
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-[var(--text-secondary)] mt-1">Hết hạn: {k.ngayKetThuc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat cards: Xe (Row 2) ──────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">🏍️ Đội xe</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <>
              <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
            </>
          ) : (
            <>
              <StatCard
                label="Tổng xe"
                value={stats.tongXe}
                sub="xe trong hệ thống"
                color="#60a5fa"
                icon="🏍️"
                href="/quan-ly-xe"
              />
              <StatCard
                label="Xe đang thuê"
                value={stats.xeThue}
                sub="đang hoạt động"
                color="#1e3a8a"
                icon="🔑"
                href="/quan-ly-xe"
              />
              <StatCard
                label="Xe trống"
                value={stats.xeTrong}
                sub="sẵn sàng cho thuê"
                color="#22c55e"
                icon="✅"
                href="/quan-ly-xe"
              />
              <StatCard
                label="Xe đã bán"
                value={stats.xeDaBan}
                sub="đã thanh lý"
                color="#ec4899"
                icon="🏷️"
                href="/xe-da-ban"
              />
            </>
          )}
        </div>
      </div>



      {/* ── Bottom grid: recent 10 transactions ─────────────────────────────── */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden transition-colors">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold">10 Giao dịch mới nhất</h3>
          <Link href="/thu-chi" className="text-xs text-blue-500 hover:text-blue-600 transition-colors font-medium">
            Xem tất cả →
          </Link>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between animate-pulse">
                <div className="space-y-1">
                  <div className="w-32 h-3 bg-[var(--bg-hover)] rounded" />
                  <div className="w-20 h-2.5 bg-[var(--bg-hover)] rounded" />
                </div>
                <div className="w-20 h-5 bg-[var(--bg-hover)] rounded" />
              </div>
            ))}
          </div>
        ) : recent10.length === 0 ? (
          <p className="text-[var(--text-secondary)] text-sm text-center py-8">Chưa có giao dịch nào</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {recent10.map((r, i) => {
              const isThu = r.loai === 'Thu';
              return (
                <div 
                  key={i} 
                  className="flex items-center justify-between px-5 py-3 hover:bg-[var(--bg-hover)]/60 transition-colors cursor-pointer group"
                  onClick={() => {
                    const name = r.khach || r.tenKH || r.tenKhachHang || r.khachHang || r.nguoiMua;
                    if (!name || name === '—') return;
                    
                    let match = khachHang.find(k => {
                      if (r.bienSo && k.bienSo) {
                        return k.bienSo.toLowerCase() === String(r.bienSo).toLowerCase();
                      }
                      return k.tenKH?.toLowerCase() === String(name).toLowerCase();
                    });
                    
                    if (!match) {
                      match = {
                        tenKH: name,
                        bienSo: r.bienSo || '',
                        sdt: '',
                        giaThue: '',
                        tienCoc: '',
                        ngayBatDau: '',
                        ngayKetThuc: '',
                        ghiChu: 'Khách ngoài / Cũ',
                        isGuest: true
                      };
                    }
                    setSelectedCustomer(match);
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-base">{isThu ? '💚' : '🔴'}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-blue-500 transition-colors">
                        {r.khach || r.tenKH || r.tenKhachHang || r.khachHang || r.nguoiMua || r.danhMuc || '—'}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">{r.danhMuc} · {r.ngay}</p>
                    </div>
                  </div>
                  <span className="ml-4 text-sm font-bold whitespace-nowrap" style={{ color: isThu ? '#22c55e' : '#ef4444' }}>
                    {isThu ? '+' : '-'}{fmtMoney(r.soTien)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Customer Details Modal ────────────────────────────────────────────── */}
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
