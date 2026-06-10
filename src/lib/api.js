import { getUser } from './auth';

export async function callAPI(fn, ...args) {
  const user = getUser();
  
  // Merge user info into the first argument if it's an object (for backward compatibility)
  const modifiedArgs = [...args];
  if (user && modifiedArgs.length > 0 && typeof modifiedArgs[0] === 'object' && modifiedArgs[0] !== null) {
    modifiedArgs[0] = { ...modifiedArgs[0], _user: user, taiKhoan: user.taiKhoan || user.ten, vaiTro: user.vaiTro };
  }
  
  // Also ALWAYS append user as the last argument, as GAS might check the last argument for authorization.
  if (user) {
    modifiedArgs.push({ taiKhoan: user.taiKhoan || user.ten, vaiTro: user.vaiTro, _user: user });
  }

  const res = await fetch('/api/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fn, args: modifiedArgs, user }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  if (data.data && typeof data.data === 'object' && data.data.success === false) {
    throw new Error(data.data.error || 'Lỗi từ máy chủ');
  }
  return data.data;
}