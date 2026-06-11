import { getUser } from './auth';

export async function callAPI(fn, ...args) {
  const user = getUser();

  const res = await fetch('/api/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fn, args, user }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  if (data.data && typeof data.data === 'object' && data.data.success === false) {
    throw new Error(data.data.error || 'Lỗi từ máy chủ');
  }
  return data.data;
}