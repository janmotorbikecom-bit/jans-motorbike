export async function callAPI(fn, ...args) {
  const res = await fetch('/api/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fn, args }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}