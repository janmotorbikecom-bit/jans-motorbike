const API_URL = 'https://script.google.com/macros/s/AKfycbzMg1ilHtrHXvTboGF3K8v9AtkWyWCnEGxh_tbvb-PnGHT-vyug8o1pegN_bKUOX4B-4A/exec';
const API_SECRET = 'JANS_SECRET_2026';

async function t(name, payload) {
  const res = await fetch(API_URL, {
    method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const txt = await res.text();
  const pass = !txt.includes('quyền') && !txt.includes('.trim is not');
  console.log(`[${pass ? '✅' : '❌'}] ${name}`);
  console.log(`    => ${txt.substring(0, 150)}`);
}

async function run() {
  console.log('=== TEST updateKhachHang SIGNATURE ===\n');
  
  // First add a test record
  await t('SETUP: add test record', {
    fn: 'addKhachHang', secret: API_SECRET,
    args: [{ tenKH: '__UPDATE_TEST__', bienSo: '__UPD__', xeThue: 'Test', giaThue: 0 }]
  });

  // Try signature: (originalTenKH, originalBienSo, newData)
  await t('updateKhachHang(str, str, obj)', {
    fn: 'updateKhachHang', secret: API_SECRET,
    args: ['__UPDATE_TEST__', '__UPD__', { tenKH: '__UPDATE_TEST__', bienSo: '__UPD__', xeThue: 'Test Updated', giaThue: 100 }]
  });

  // Try signature: (data with originalTenKH, originalBienSo embedded)
  await t('updateKhachHang({originalTenKH, originalBienSo, ...})', {
    fn: 'updateKhachHang', secret: API_SECRET,
    args: [{ tenKH: '__UPDATE_TEST__', bienSo: '__UPD__', originalTenKH: '__UPDATE_TEST__', originalBienSo: '__UPD__', xeThue: 'Test Updated', giaThue: 100 }]
  });

  // Try signature: (tenKH, bienSo, data)  
  await t('updateKhachHang(tenKH, bienSo only)', {
    fn: 'updateKhachHang', secret: API_SECRET,
    args: ['__UPDATE_TEST__', '__UPD__']
  });

  // Cleanup: delete test record
  await t('CLEANUP: delete test record', {
    fn: 'deleteKhachHang', secret: API_SECRET,
    args: ['__UPDATE_TEST__', '__UPD__']
  });
  await t('CLEANUP: delete test record 2', {
    fn: 'deleteKhachHang', secret: API_SECRET,
    args: ['__TEST_DELETE_ME__', '__TEST__']
  });
  await t('CLEANUP: delete test record 3', {
    fn: 'deleteKhachHang', secret: API_SECRET,
    args: ['__TEST2__', '__TEST2__']
  });
}
run();
