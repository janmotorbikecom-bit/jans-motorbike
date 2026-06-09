'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getUser, clearAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';

const navItems = [
  {
    href: '/',
    label: 'Tổng quan',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },
  {
    href: '/khach-hang',
    label: 'Khách hàng',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    href: '/quan-ly-xe',
    label: 'Quản lý xe',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>,
  },
  {
    href: '/thu-chi',
    label: 'Thu - Chi',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  {
    href: '/xe-da-ban',
    label: 'Xe đã bán',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>,
  },
];

function getRoleBadge(vaiTro) {
  const r = (vaiTro||'').toLowerCase();
  if (r === 'admin' || r.includes('quản trị')) return { label: 'Admin', color: '#f97316' };
  if (r.includes('nhân viên') || r.includes('nhan vien')) return { label: 'Nhân viên', color: '#22c55e' };
  return { label: 'Chỉ xem', color: '#64748b' };
}

export default function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  function handleLogout() {
    if (confirm('Bạn có muốn đăng xuất không?')) {
      clearAuth();
      router.push('/login');
    }
  }

  // Không hiện sidebar trên trang login
  if (pathname === '/login') return null;

  const role = getRoleBadge(user?.vaiTro);

  return (
    <aside style={{
      width: '224px', background: '#0f172a',
      borderRight: '1px solid #1e293b',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', height: '100vh', top: 0, left: 0, zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            borderRadius: '10px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '18px', flexShrink: 0,
          }}>🏍️</div>
          <div>
            <div style={{ fontSize: '10px', color: '#f97316', fontWeight: 600, letterSpacing: '0.1em' }}>JAN&apos;S</div>
            <div style={{ fontSize: '14px', color: '#fff', fontWeight: 700, lineHeight: 1.2 }}>MOTORBIKE</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', borderRadius: '8px', textDecoration: 'none',
              fontSize: '14px', fontWeight: isActive ? 600 : 400,
              color: isActive ? '#fff' : '#94a3b8',
              background: isActive ? '#1e293b' : 'transparent',
              borderLeft: isActive ? '3px solid #f97316' : '3px solid transparent',
              transition: 'all 0.15s',
            }}>
              <span style={{ color: isActive ? '#f97316' : '#64748b', flexShrink: 0 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info + Logout */}
      <div style={{ padding: '12px', borderTop: '1px solid #1e293b' }}>
        {user && (
          <div style={{ marginBottom: '8px', padding: '10px 12px', background: '#1e293b', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{user.ten}</span>
              <span style={{ fontSize: '10px', color: role.color, background: role.color+'20', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                {role.label}
              </span>
            </div>
            {user.email && <div style={{ color: '#64748b', fontSize: '11px' }}>{user.email}</div>}
          </div>
        )}
        <button onClick={handleLogout} style={{
          width: '100%', padding: '9px 12px',
          background: 'transparent', border: '1px solid #1e293b',
          borderRadius: '8px', color: '#64748b', fontSize: '13px',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.color = '#dc2626'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.color = '#64748b'; }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}