

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
    tenKH: 'BUG_TEST_USER',
    bienSo: 'BUG-123',
    xeThue: 'Xe Test',
    giaThue: 100000,
    taiKhoan: 'admin',
    vaiTro: 'Admin'
  }]);
  console.log(JSON.stringify(res));

  console.log('--- READ ---');
  res = await callGas('getKhachHangData', []);
  let row = res.data.data.find(r => r.tenKH === 'BUG_TEST_USER');
  console.log('Found:', !!row, row);

  console.log('--- UPDATE ---');
  // Attempt to update only price
  let updatedData = { ...row, giaThue: 200000, taiKhoan: 'admin', vaiTro: 'Admin' };
  res = await callGas('updateKhachHang', ['BUG_TEST_USER', 'BUG-123', updatedData, {taiKhoan: 'admin', vaiTro: 'Admin'}]);
  console.log(JSON.stringify(res));

  console.log('--- READ 2 ---');
  res = await callGas('getKhachHangData', []);
  row = res.data.data.find(r => r.tenKH === 'BUG_TEST_USER');
  console.log('Found after update:', !!row, row);

  console.log('--- CLEANUP ---');
  res = await callGas('deleteKhachHang', ['BUG_TEST_USER', 'BUG-123', {taiKhoan: 'admin', vaiTro: 'Admin'}]);
  console.log(JSON.stringify(res));
}
run();
