const API_URL = 'https://script.google.com/macros/s/AKfycbzMg1ilHtrHXvTboGF3K8v9AtkWyWCnEGxh_tbvb-PnGHT-vyug8o1pegN_bKUOX4B-4A/exec';
const API_SECRET = 'JANS_SECRET_2026';

async function fetchThuChi() {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fn: 'getThuChiData',
      args: ['', '', ''],
      secret: API_SECRET
    }),
    redirect: 'follow'
  });
  const data = await res.json();
  const list = Array.isArray(data.data) ? data.data : [];
  console.log('Total thu chi rows:', list.length);
  
  if (list.length > 0) {
    const row849 = list.filter(r => 
      JSON.stringify(r).includes('849') || 
      JSON.stringify(r).includes('84.9') ||
      JSON.stringify(r).includes('giao') ||
      JSON.stringify(r).includes('tổng')
    );
    console.log('Found rows:', JSON.stringify(row849.slice(0, 3), null, 2));
    console.log('First row keys:', Object.keys(list[0]));
  }
}
fetchThuChi();
