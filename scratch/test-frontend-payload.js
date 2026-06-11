const API_URL = 'https://script.google.com/macros/s/AKfycbzMg1ilHtrHXvTboGF3K8v9AtkWyWCnEGxh_tbvb-PnGHT-vyug8o1pegN_bKUOX4B-4A/exec';
const API_SECRET = 'JANS_SECRET_2026';

async function run() {
  
  const payload = {
    fn: 'updateKhachHang',
    args: [
      'Clementt',
      '81G1 073.10',
      {
        tenKH: 'Clementt',
        bienSo: '81G1 073.10',
        giaThue: '1500000', // user edited price to string
        tienCoc: '2500000',
        xeThue: 'Yamaha Nouvo 5 125'
      },
      { taiKhoan: 'admin', vaiTro: 'Admin' }
    ],
    secret: API_SECRET,
    user: { taiKhoan: 'admin', vaiTro: 'Admin' }
  };

  console.log('Sending payload:', JSON.stringify(payload));
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  const data = await res.json();
  console.log('Response:', JSON.stringify(data));
}
run();
