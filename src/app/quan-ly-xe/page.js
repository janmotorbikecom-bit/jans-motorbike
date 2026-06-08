'use client';

import { useState, useEffect, useMemo } from 'react';
import { callAPI } from '@/lib/api';

export default function QuanLyXe() {
  const [xe, setXe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const result = await callAPI('getXeData');
      console.log('Xe result:', JSON.stringify(result).substring(0, 300));
      let list = [];
      if (Array.isArray(result)) list = result;
      else if (result && Array.isArray(result.data)) list = result.data;
      else if (result && Array.isArray(result.xe)) list = result.xe;
      setXe(list);
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return xe;
    return xe.filter(x =>
      (x.tenXe || '').toLowerCase().includes(q) ||
      (x.bienSo || '').toLowerCase().includes(q) ||
      (x.hangXe || '').toLowerCase().includes(q) ||
      (x.model || '').toLowerCase().includes(q)
    );
  }, [xe, search]);

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

  function fmtMoney(n) {
    if (!n || isNaN(n)) return '—';
    return new Intl.NumberFormat('vi-VN').format(n) + ' đ';
  }

  function getTrangThaiStyle(tt) {
    const s = (tt || '').toLowerCase();
    if (s.includes('thuê') || s.includes('thue')) {
      return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'Đang thuê' };
    }
    return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: 'Trống' };
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <p className="text-orange-400 text-sm font-medium mb-1">Jan&apos;s Motorbike</p>
        <h1 className="text-3xl font-bold text-white">Quản lý xe</h1>
        <p className="text-gray-400 mt-1">Danh sách toàn bộ xe trong hệ thống</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Tổng số xe</p>
          <p className="text-2xl font-bold text-white mt-1">{tongXe}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Đang trống</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{dangTrong}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Đang cho thuê</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{dangThue}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Tổng giá vốn</p>
          <p className="text-xl font-bold text-orange-400 mt-1">{fmtMoney(tongVon)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Tìm theo tên xe, biển số, hãng..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
        />
      </div>

      {/* Count */}
      {!loading && !error && (
        <p className="text-gray-500 text-sm mb-3">{filtered.length} / {tongXe} xe</p>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-16 text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-400">Đang tải dữ liệu...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-12 text-center">
          <p className="text-red-400 font-medium mb-2">Không thể tải dữ liệu</p>
          <p className="text-red-500/70 text-sm mb-4">{error}</p>
          <button onClick={loadData} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
            Thử lại
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-400 text-sm font-medium px-4 py-3">Tên xe</th>
                  <th className="text-left text-gray-400 text-sm font-medium px-4 py-3">Hãng</th>
                  <th className="text-left text-gray-400 text-sm font-medium px-4 py-3">Biển số</th>
                  <th className="text-left text-gray-400 text-sm font-medium px-4 py-3">Màu sơn</th>
                  <th className="text-left text-gray-400 text-sm font-medium px-4 py-3">Năm</th>
                  <th className="text-right text-gray-400 text-sm font-medium px-4 py-3">Giá vốn</th>
                  <th className="text-center text-gray-400 text-sm font-medium px-4 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-500 py-12">
                      {search ? 'Không tìm thấy xe phù hợp' : 'Chưa có xe nào'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((x, i) => {
                    const tt = getTrangThaiStyle(x.trangThai);
                    return (
                      <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{x.tenXe || x.model || '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-300">{x.hangXe || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm bg-gray-800 px-2 py-1 rounded text-gray-300">
                            {x.bienSo || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-300">{x.mauSon || '—'}</td>
                        <td className="px-4 py-3 text-gray-300">{x.nam || '—'}</td>
                        <td className="px-4 py-3 text-right text-orange-400 font-medium">{fmtMoney(x.giaVon)}</td>
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
    </div>
  );
}