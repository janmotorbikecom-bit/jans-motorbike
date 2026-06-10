// using native fetch
const API_URL = 'https://script.google.com/macros/s/AKfycbzMg1ilHtrHXvTboGF3K8v9AtkWyWCnEGxh_tbvb-PnGHT-vyug8o1pegN_bKUOX4B-4A/exec';
const API_SECRET = 'JANS_SECRET_2026';

async function testCase(name, payload) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log(`[${name}] => ${text}`);
  } catch(e) {
    console.error(`[${name}] error:`, e);
  }
}

async function run() {
  // Case 1: user object at root
  await testCase('Root User Object', {
    fn: 'deleteKhachHang', secret: API_SECRET,
    args: [{ tenKH: 'TestUserDummy', bienSo: '9999' }],
    user: { taiKhoan: 'admin', vaiTro: 'Admin' }
  });

  // Case 2: taiKhoan inside args[0]
  await testCase('taiKhoan in args[0]', {
    fn: 'deleteKhachHang', secret: API_SECRET,
    args: [{ tenKH: 'TestUserDummy', bienSo: '9999', taiKhoan: 'admin', vaiTro: 'Admin' }]
  });

  // Case 3: user object as args[1]
  await testCase('User in args[1]', {
    fn: 'deleteKhachHang', secret: API_SECRET,
    args: [{ tenKH: 'TestUserDummy', bienSo: '9999' }, { taiKhoan: 'admin', vaiTro: 'Admin' }]
  });

  // Case 4: taiKhoan as string args[1], vaiTro as args[2]
  await testCase('taiKhoan as args[1]', {
    fn: 'deleteKhachHang', secret: API_SECRET,
    args: [{ tenKH: 'TestUserDummy', bienSo: '9999' }, 'admin', 'Admin']
  });

  // Case 5: taiKhoan inside payload (root level string)
  await testCase('Root taiKhoan', {
    fn: 'deleteKhachHang', secret: API_SECRET,
    args: [{ tenKH: 'TestUserDummy', bienSo: '9999' }],
    taiKhoan: 'admin', vaiTro: 'Admin'
  });
}
run();
