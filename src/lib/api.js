import { getUser } from './auth';

export async function callAPI(fn, ...args) {
  const user = getUser();

  // Đẩy thông tin user vào cuối danh sách tham số để GAS có thể lấy thông tin ghi log "Người Dùng"
  const modifiedArgs = [...args];
  if (user) {
    modifiedArgs.push(user);
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