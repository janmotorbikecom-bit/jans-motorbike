'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    if (!loginId.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ thông tin.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fn: 'loginUser', args: [loginId.trim(), password.trim()] }),
      });
      const result = await res.json();
      const userData = result.data?.data || result.data;
      if (result.success && userData && (userData.ten || userData.taiKhoan || userData.vaiTro)) {
  saveAuth(userData);
        router.push('/');
        router.refresh();
      } else {
        setError(result.error || result.data?.error || 'Đăng nhập thất bại.');
      }
    } catch (err) {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#030712',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '120px', height: '120px',
            background: 'linear-gradient(135deg, #051630 0%, #0d215c 30%, #3a155c 65%, #7e1654 100%)',
            borderRadius: '24px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden',
            padding: '8px'
          }}>
            <img 
              src="/logo.png" 
              alt="Jan's Motorbike Logo" 
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '16px' }}
            />
          </div>
          <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, margin: 0 }}>
            JAN&apos;S MOTORBIKE
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
            Hệ thống quản lý cho thuê xe máy
          </p>
        </div>

        {/* Form */}
        <div style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          padding: '32px',
        }}>
          <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 600, margin: '0 0 24px' }}>
            Đăng nhập
          </h2>

          <form onSubmit={handleLogin}>
            {/* ID */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>
                Tên đăng nhập
              </label>
              <input
                type="text"
                value={loginId}
                onChange={e => setLoginId(e.target.value)}
                placeholder="Nhập tên hiển thị hoặc email"
                autoComplete="username"
                style={{
                  width: '100%', padding: '10px 14px',
                  background: '#1e293b', border: '1px solid #334155',
                  borderRadius: '8px', color: '#fff', fontSize: '14px',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>
                Mật khẩu / PIN
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                style={{
                  width: '100%', padding: '10px 14px',
                  background: '#1e293b', border: '1px solid #334155',
                  borderRadius: '8px', color: '#fff', fontSize: '14px',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: '#450a0a', border: '1px solid #991b1b',
                borderRadius: '8px', padding: '10px 14px',
                color: '#fca5a5', fontSize: '13px', marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px',
                background: loading ? '#7c3aed80' : 'linear-gradient(135deg, #1e3a8a, #172554)',
                border: 'none', borderRadius: '8px',
                color: '#fff', fontSize: '15px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.15s',
              }}
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: '#334155', fontSize: '12px', marginTop: '24px' }}>
          Jan&apos;s Motorbike v2.0 — Vercel
        </p>
      </div>
    </div>
  );
}