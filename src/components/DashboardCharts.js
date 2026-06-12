import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

function parseNgayMonthKey(ngay) {
  if (!ngay) return '';
  const parts = String(ngay).split('/');
  if (parts.length >= 3) return `${parts[1].padStart(2, '0')}/${parts[2]}`;
  return '';
}

const COLORS = ['#1e3a8a', '#3b82f6', '#a78bfa', '#eab308', '#0ea5e9', '#ec4899', '#1e3a8a', '#6366f1'];

const getCategoryColor = (name, index) => {
  const lower = String(name).toLowerCase();
  if (lower.includes('tiền thuê tháng') || lower.includes('doanh thu tháng')) return '#22c55e';
  if (lower.includes('thuê mới')) return '#ef4444';
  return COLORS[index % COLORS.length];
};

export default function DashboardCharts({ thuChi }) {
  const isRevenue = (r) => r.loai === 'Thu' && !(r.danhMuc || '').toLowerCase().includes('cọc');
  
  // 1. Dữ liệu Doanh thu 6 tháng gần nhất
  const barData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`,
        label: `T${d.getMonth() + 1}`,
        revenue: 0
      });
    }

    const revenues = thuChi.filter(isRevenue);
    
    revenues.forEach(r => {
      const mKey = parseNgayMonthKey(r.ngay);
      const mObj = months.find(m => m.key === mKey);
      if (mObj) {
        mObj.revenue += parseFloat(r.soTien) || 0;
      }
    });

    return months;
  }, [thuChi]);

  // 2. Dữ liệu Tỷ trọng danh mục Doanh thu toàn thời gian
  const pieData = useMemo(() => {
    const revenues = thuChi.filter(isRevenue);
    const categoryMap = {};
    revenues.forEach(r => {
      const cat = r.danhMuc || 'Khác';
      if (!categoryMap[cat]) categoryMap[cat] = 0;
      categoryMap[cat] += parseFloat(r.soTien) || 0;
    });

    return Object.keys(categoryMap).map(k => ({
      name: k,
      value: categoryMap[k]
    })).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  }, [thuChi]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] p-3 rounded-lg shadow-lg">
          <p className="font-semibold text-[var(--text-primary)] mb-1">{label}</p>
          <p className="text-blue-500 font-bold">
            {new Intl.NumberFormat('vi-VN').format(payload[0].value)} đ
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] p-3 rounded-lg shadow-lg">
          <p className="font-semibold text-[var(--text-primary)] mb-1">{payload[0].name}</p>
          <p className="font-bold" style={{ color: payload[0].payload.fill || '#1e3a8a' }}>
            {new Intl.NumberFormat('vi-VN').format(payload[0].value)} đ
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
      {/* Bar Chart */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 hover:border-blue-900/50 transition-colors">
        <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">📈 Doanh thu 6 tháng gần nhất</h2>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} dy={10} />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} 
                tickFormatter={(val) => {
                  if (val >= 1000000) return (val / 1000000) + 'Tr';
                  return val;
                }} 
                width={45}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-hover)' }} />
              <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 hover:border-blue-900/50 transition-colors">
        <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">🥧 Cơ cấu doanh thu</h2>
        <div className="h-[250px] w-full flex items-center justify-center">
          {pieData.length === 0 ? (
            <p className="text-[var(--text-secondary)] text-sm">Chưa có dữ liệu</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="40%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name, index)} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend verticalAlign="middle" align="right" layout="vertical" 
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
