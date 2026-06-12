// src/lib/auth.js — Quản lý authentication phía client

const TOKEN_KEY = 'jans_token';
const USER_KEY = 'jans_user';

// Lưu token + user sau khi login
export function saveAuth(user) {
  try {
    const payload = { ...user, savedAt: Date.now(), expiresAt: Date.now() + 30*24*60*60*1000 };
    localStorage.setItem(TOKEN_KEY, 'logged_in');
    localStorage.setItem(USER_KEY, JSON.stringify(payload));
  } catch(e) {}
}

// Lấy user hiện tại
export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (user.expiresAt < Date.now()) { clearAuth(); return null; }
    return user;
  } catch(e) { return null; }
}

// Xóa auth (logout)
export function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch(e) {}
}

// Kiểm tra đã đăng nhập chưa
export function isLoggedIn() {
  return !!getUser();
}

// Kiểm tra role
export function isAdmin(user) {
  const role = String(user?.vaiTro || '').toLowerCase();
  return role === 'admin' || role.includes('quản trị');
}

export function canWrite(user) {
  const role = String(user?.vaiTro || '').toLowerCase();
  return isAdmin(user) || role.includes('nhân viên') || role.includes('nhan vien');
}

export function canDelete(user) {
  return isAdmin(user);
}