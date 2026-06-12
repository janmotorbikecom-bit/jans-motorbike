'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUser } from '@/lib/auth';

export default function AuthGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let user = null;
    try {
      user = getUser();
    } catch (e) {}

    // Nếu đang ở trang login, luôn cho phép hiển thị
    if (pathname === '/login') {
      setReady(true);
      return;
    }

    // Nếu chưa đăng nhập -> chuyển sang trang login
    if (!user) {
      window.location.href = '/login';
      return;
    } 
    
    // Đã đăng nhập -> cho phép render
    setReady(true);
  }, [pathname]);

  // Khi đang ở /login, luôn ưu tiên render form đăng nhập ngay lập tức
  if (pathname === '/login') {
    return children;
  }

  // Trang bảo vệ: chờ kiểm tra xong
  if (!ready) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#030712',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #1e3a8a',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px',
          }} />
          <p style={{ color: '#64748b', fontSize: '14px' }}>Đang tải dữ liệu...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return children;
}
