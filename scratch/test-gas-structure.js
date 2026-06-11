const API_URL = 'https://script.google.com/macros/s/AKfycbzMg1ilHtrHXvTboGF3K8v9AtkWyWCnEGxh_tbvb-PnGHT-vyug8o1pegN_bKUOX4B-4A/exec';
const API_SECRET = 'JANS_SECRET_2026';

async function testPayload(name, payload) {
  const res = await fetch(API_URL, {
    method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.log(`[${name}] => ${await res.text()}`);
}

async function run() {
  // Thử kiểm tra xem GAS function list có gì - đặc biệt là listFunctions hoặc similar
  await testPayload('getKhachHangData READ', {
    fn: 'getKhachHangData', secret: API_SECRET, args: []
  });
  
  // Thử gọi thẳng addKhachHang (thêm mới) để xem error message khác không
  await testPayload('addKhachHang', {
    fn: 'addKhachHang', secret: API_SECRET,
    args: [{ tenKH: 'TestDELETEME', bienSo: '__TEST__', xeThue: 'Test', giaThue: 0 }]
  });
}
run();
