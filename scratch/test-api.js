const API_URL = 'https://script.google.com/macros/s/AKfycbzMg1ilHtrHXvTboGF3K8v9AtkWyWCnEGxh_tbvb-PnGHT-vyug8o1pegN_bKUOX4B-4A/exec';
const API_SECRET = 'JANS_SECRET_2026';

async function test() {
  console.log('Fetching motorbikes data...');
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fn: 'getXeData',
        args: [],
        secret: API_SECRET
      })
    });
    const data = await res.json();
    console.log('--- MOTORBIKES RAW KEYS & TYPE ---');
    console.log('Type of response:', typeof data);
    console.log('Is array:', Array.isArray(data));
    if (data) {
      console.log('Keys:', Object.keys(data));
      if (data.data) {
        console.log('Type of data.data:', typeof data.data);
        console.log('Is data.data array:', Array.isArray(data.data));
        console.log('Length/Sample:', Array.isArray(data.data) ? data.data.length : JSON.stringify(data.data).substring(0, 300));
      } else {
        console.log('Sample data:', JSON.stringify(data).substring(0, 300));
      }
    }
  } catch (e) {
    console.error('Fetch error:', e);
  }

  console.log('\nFetching customers data...');
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fn: 'getKhachHangData',
        args: [],
        secret: API_SECRET
      })
    });
    const data = await res.json();
    console.log('--- CUSTOMERS RAW KEYS ---');
    console.log('Type of response:', typeof data);
    console.log('Is array:', Array.isArray(data));
    if (data) {
      console.log('Keys:', Object.keys(data));
      if (data.data) {
        console.log('Type of data.data:', typeof data.data);
        console.log('Is data.data array:', Array.isArray(data.data));
        console.log('Length/Sample:', Array.isArray(data.data) ? data.data.length : JSON.stringify(data.data).substring(0, 300));
      } else {
        console.log('Sample data:', JSON.stringify(data).substring(0, 300));
      }
    }
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

test();
