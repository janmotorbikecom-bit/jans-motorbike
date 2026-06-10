const API_URL = 'https://script.google.com/macros/s/AKfycbzMg1ilHtrHXvTboGF3K8v9AtkWyWCnEGxh_tbvb-PnGHT-vyug8o1pegN_bKUOX4B-4A/exec';
const API_SECRET = 'JANS_SECRET_2026';

async function testPayload(name, payload) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log(`[${name}] => ${await res.text()}`);
  } catch(e) {}
}

async function run() {
  await testPayload('data.user', {
    fn: 'updateKhachHang', secret: API_SECRET,
    args: [{ tenKH: 'Test', bienSo: '9999', user: { taiKhoan: 'admin', vaiTro: 'Admin' } }]
  });
  await testPayload('data._user', {
    fn: 'updateKhachHang', secret: API_SECRET,
    args: [{ tenKH: 'Test', bienSo: '9999', _user: { taiKhoan: 'admin', vaiTro: 'Admin' } }]
  });
  await testPayload('data.updater', {
    fn: 'updateKhachHang', secret: API_SECRET,
    args: [{ tenKH: 'Test', bienSo: '9999', updater: 'admin' }]
  });
  await testPayload('data.nguoiSua', {
    fn: 'updateKhachHang', secret: API_SECRET,
    args: [{ tenKH: 'Test', bienSo: '9999', nguoiSua: 'admin' }]
  });
  await testPayload('args[1] is admin string', {
    fn: 'updateKhachHang', secret: API_SECRET,
    args: [{ tenKH: 'Test', bienSo: '9999' }, 'admin']
  });
}
run();
