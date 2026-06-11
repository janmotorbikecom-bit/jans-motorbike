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
    tenKH: 'DELETE_BUG_TEST',
    bienSo: 'SIG-123',
    xeThue: 'Xe Test',
    giaThue: 100000
  }]);
  console.log(JSON.stringify(res));

  console.log('--- READ ---');
  res = await callGas('getKhachHangData', []);
  let row = res.data.data.find(r => r.tenKH === 'DELETE_BUG_TEST');
  console.log('Found row:', !!row);

  console.log('--- UPDATE WITH FULL OBJECT ---');
  // Pass the exact row we got from read, just change giaThue
  // This row contains 'chuKy' and 'docs' which are arrays/objects
  let updatedData = { ...row, giaThue: 999999 };
  res = await callGas('updateKhachHang', ['DELETE_BUG_TEST', 'SIG-123', updatedData, {taiKhoan: 'admin', vaiTro: 'Admin'}]);
  console.log('Update result:', JSON.stringify(res));

  // Wait 3 seconds
  await new Promise(r => setTimeout(r, 3000));

  console.log('--- READ 2 ---');
  res = await callGas('getKhachHangData', []);
  row = res.data.data.find(r => r.tenKH === 'DELETE_BUG_TEST');
  console.log('Found after update:', !!row, row ? 'Price: ' + row.giaThue : 'DELETED!!');
}
run();
