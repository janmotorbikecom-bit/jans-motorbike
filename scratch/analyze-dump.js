const fs = require('fs');
const API_URL = 'https://script.google.com/macros/s/AKfycbzMg1ilHtrHXvTboGF3K8v9AtkWyWCnEGxh_tbvb-PnGHT-vyug8o1pegN_bKUOX4B-4A/exec';
const API_SECRET = 'JANS_SECRET_2026';

async function fetchAPI(fn) {
  const res = await fetch(API_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fn, args: [], secret: API_SECRET })
  });
  return res.json();
}

async function analyze() {
  const khRes = await fetchAPI('getKhachHangData');
  const xeRes = await fetchAPI('getXeData');
  
  const khachHang = khRes.data || [];
  const xe = xeRes.data.xe || xeRes.data || [];
  
  const names = ['Nadz', 'Kyle', 'Yuliya', 'Abdou', 'Chris'];
  
  for (const name of names) {
    const kh = khachHang.find(k => k.tenKH && k.tenKH.includes(name));
    if (kh) {
      console.log(`Found Khach Hang: ${kh.tenKH}, Bien So: ${kh.bienSo}, Ngay Ket Thuc: ${kh.ngayKetThuc}`);
      if (kh.bienSo) {
        const v = xe.find(x => x.bienSo === kh.bienSo);
        if (v) {
          console.log(`  -> Vehicle found: ${v.bienSo}, Trang Thai: ${v.trangThai}`);
        } else {
          console.log(`  -> Vehicle ${kh.bienSo} NOT FOUND in Xe sheet.`);
        }
      }
    } else {
      console.log(`Khach Hang ${name} not found!`);
    }
  }
}

analyze();
