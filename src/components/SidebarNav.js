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
    href: '/quan-ly-xe',
    label: 'Quản lý xe',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>,
  },
  {
    href: '/khach-hang',
    label: 'Khách hàng',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
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
  const [theme, setTheme] = useState('dark');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setUser(getUser());
    const savedTheme = localStorage.getItem('jans_theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.className = savedTheme;
    
    const savedCollapsed = localStorage.getItem('jans_sidebar_collapsed') === 'true';
    setIsCollapsed(savedCollapsed);

    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const main = document.getElementById('main-content');
    if (main) {
      if (isMobile) {
        main.style.marginLeft = '0px';
      } else {
        main.style.marginLeft = isCollapsed ? '64px' : '224px';
      }
    }
  }, [isCollapsed, isMobile]);

  const toggleSidebar = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('jans_sidebar_collapsed', String(next));
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('jans_theme', next);
    document.documentElement.className = next;
  };

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
    <>
      {/* Mobile Floating Menu Button */}
      {isMobile && !isMobileOpen && (
        <button 
          onClick={() => setIsMobileOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-orange-500 text-white p-4 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:bg-orange-600 transition-transform active:scale-95"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobile && isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={`
        fixed h-screen top-0 left-0 z-50 flex flex-col bg-[var(--bg-card)] border-r border-[var(--border)]
        transition-all duration-300 ease-in-out
        ${isMobile ? (isMobileOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full w-[260px]') : (isCollapsed ? 'w-[64px]' : 'w-[224px]')}
      `}>
      {/* Logo */}
      <div style={{ 
        padding: (!isMobile && isCollapsed) ? '10px 0' : '24px 16px', 
        borderBottom: '1px solid var(--border)', 
        display: 'flex', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #051630 0%, #0d215c 30%, #3a155c 65%, #7e1654 100%)',
        transition: 'padding 0.15s'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', overflow: 'hidden' }}>
          <img 
            src="/logo.png" 
            alt="Jan's Motorbike Logo" 
            style={{ 
              height: (!isMobile && isCollapsed) ? '44px' : '120px',
              width: 'auto',
              objectFit: 'contain',
              borderRadius: (!isMobile && isCollapsed) ? '8px' : '20px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
              transition: 'height 0.15s, border-radius 0.15s'
            }} 
            onError={(e) => {
              // Fallback to text if logo.png is not found
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div style={{ display: 'none', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div style={{
              width: '36px', height: '36px',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              borderRadius: '10px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '18px', flexShrink: 0,
            }}>🏍️</div>
            {(isMobile || !isCollapsed) && (
              <div style={{ whiteSpace: 'nowrap' }}>
                <div style={{ fontSize: '10px', color: '#f97316', fontWeight: 600, letterSpacing: '0.1em' }}>JAN&apos;S</div>
                <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 700, lineHeight: 1.2 }}>MOTORBIKE</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} 
              onClick={() => isMobile && setIsMobileOpen(false)}
              title={(!isMobile && isCollapsed) ? item.label : ''} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '12px 14px', borderRadius: '12px',
              textDecoration: 'none', 
              background: isActive ? 'var(--bg-active)' : 'transparent',
              color: isActive ? '#ea580c' : 'var(--text-secondary)',
              fontWeight: isActive ? 600 : 500,
              transition: 'all 0.2s',
              justifyContent: (!isMobile && isCollapsed) ? 'center' : 'flex-start'
            }}
            onMouseEnter={(e) => {
              if(!isActive) {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if(!isActive) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}>
              <div style={{ 
                flexShrink: 0,
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.2s'
              }}>
                {item.icon}
              </div>
              {(!isMobile && isCollapsed) ? null : <span style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

        <div style={{ 
          display: 'flex', flexDirection: 'column', gap: '8px', 
          justifyContent: (!isMobile && isCollapsed) ? 'center' : 'flex-start',
          alignItems: (!isMobile && isCollapsed) ? 'center' : 'flex-start'
        }}>
          {!isMobile && (
            <button 
              onClick={toggleSidebar}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
                padding: '12px 14px', borderRadius: '12px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--text-secondary)', fontWeight: 500,
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: isCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
              {!isCollapsed && <span style={{ fontSize: '14px' }}>Thu gọn</span>}
            </button>
          )}
      </div>

      <div style={{ padding: isCollapsed ? '12px 6px' : '12px', borderTop: '1px solid var(--border)' }}>
        <button onClick={toggleTheme} title={isCollapsed ? (theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối') : ''} style={{
          width: '100%', padding: isCollapsed ? '9px 0' : '9px 12px',
          background: 'transparent', border: '1px solid var(--border)',
          borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '8px',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-primary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          {theme === 'dark' ? (
            <>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m12.728 6.364A9 9 0 115.636 5.636a9 9 0 0112.728 12.728z" />
              </svg>
              {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Giao diện sáng</span>}
            </>
          ) : (
            <>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Giao diện tối</span>}
            </>
          )}
        </button>
      </div>

      <div style={{ padding: isCollapsed ? '12px 6px' : '12px', borderTop: '1px solid var(--border)' }}>
        <button onClick={handleLogout} title={isCollapsed ? 'Đăng xuất' : ''} style={{
          width: '100%', padding: isCollapsed ? '9px 0' : '9px 12px',
          background: 'transparent', border: '1px solid var(--border)',
          borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '8px',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.color = '#dc2626'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Đăng xuất</span>}
        </button>
      </div>
    </aside>
    </>
  );
}