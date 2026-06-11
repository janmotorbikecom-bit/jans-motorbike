const API_URL = 'https://script.google.com/macros/s/AKfycbzMg1ilHtrHXvTboGF3K8v9AtkWyWCnEGxh_tbvb-PnGHT-vyug8o1pegN_bKUOX4B-4A/exec';
const API_SECRET = 'JANS_SECRET_2026';

async function t(name, payload) {
  const res = await fetch(API_URL, {
    method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const txt = await res.text();
  const pass = !txt.includes('quyền xem') && !txt.includes('quyền ');
  console.log(`[${pass ? '✅ OK' : '❌ FAIL'}] ${name} => ${txt.substring(0, 120)}`);
}

async function run() {
  console.log('=== TEST GAS PERMISSIONS AFTER FIX ===\n');

  // Test 1: addKhachHang với user Admin inline
  await t('addKhachHang - Admin trong data', {
    fn: 'addKhachHang', secret: API_SECRET,
    args: [{ tenKH: '__TEST_DELETE_ME__', bienSo: '__TEST__', xeThue: 'Test', giaThue: 0, vaiTro: 'Admin', taiKhoan: 'admin' }]
  });

  // Test 2: updateKhachHang với user Admin inline
  await t('updateKhachHang - Admin trong data', {
    fn: 'updateKhachHang', secret: API_SECRET,
    args: [{ tenKH: '__TEST_DELETE_ME__', bienSo: '__TEST__', vaiTro: 'Admin', taiKhoan: 'admin' }]
  });

  // Test 3: deleteKhachHang với user Admin
  await t('deleteKhachHang - Admin strings', {
    fn: 'deleteKhachHang', secret: API_SECRET,
    args: ['__TEST_DELETE_ME__', '__TEST__', { vaiTro: 'Admin', taiKhoan: 'admin' }]
  });

  // Test 4: addKhachHang với Nhan Vien
  await t('addKhachHang - Nhan Vien trong data', {
    fn: 'addKhachHang', secret: API_SECRET,
    args: [{ tenKH: '__TEST2__', bienSo: '__TEST2__', xeThue: 'Test', giaThue: 0, vaiTro: 'Nhân viên', taiKhoan: 'nhanvien' }]
  });
}
run();
