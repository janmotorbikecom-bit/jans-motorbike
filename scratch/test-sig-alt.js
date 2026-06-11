const API_URL = 'https://script.google.com/macros/s/AKfycbzMg1ilHtrHXvTboGF3K8v9AtkWyWCnEGxh_tbvb-PnGHT-vyug8o1pegN_bKUOX4B-4A/exec';
const API_SECRET = 'JANS_SECRET_2026';

async function callGas(fn, args, user) {
  const res = await fetch(API_URL, {
    method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fn, args, secret: API_SECRET, user })
  });
  return await res.json();
}

async function run() {
  console.log('--- ADD ---');
  let res = await callGas('addKhachHang', [{
    tenKH: 'SIGNATURE_TEST',
    bienSo: 'SIG-123',
    xeThue: 'Xe Test',
    giaThue: 100000
  }]);
  console.log(JSON.stringify(res));

  console.log('--- UPDATE WITH (data, originalTen, originalBienSo) ---');
  let updatedData = { tenKH: 'SIGNATURE_TEST', bienSo: 'SIG-123', xeThue: 'Xe Test', giaThue: 300000 };
  res = await callGas('updateKhachHang', [updatedData, 'SIGNATURE_TEST', 'SIG-123', {taiKhoan: 'admin', vaiTro: 'Admin'}]);
  console.log(JSON.stringify(res));

  console.log('--- READ ---');
  res = await callGas('getKhachHangData', []);
  let row = res.data.find ? res.data.find(r => r.tenKH === 'SIGNATURE_TEST') : res.data.data.find(r => r.tenKH === 'SIGNATURE_TEST');
  console.log('Found after update:', !!row, row);

  console.log('--- CLEANUP ---');
  res = await callGas('deleteKhachHang', ['SIGNATURE_TEST', 'SIG-123', {taiKhoan: 'admin', vaiTro: 'Admin'}]);
  console.log(JSON.stringify(res));
}
run();
