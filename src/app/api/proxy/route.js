import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const API_URL = process.env.API_URL;
    const API_SECRET = process.env.API_SECRET;
    console.log('ENV CHECK:', { API_URL, API_SECRET });
    if (!API_URL) {
      return NextResponse.json({ success: false, error: 'API_URL not configured' }, { status: 500 });
    }

    const body = await request.json();

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fn: body.fn,
        args: body.args || [],
        secret: API_SECRET,
        user: { taiKhoan: 'admin', vaiTro: 'Admin', _realUser: body.user },
      }),
      redirect: 'follow',
    });

    const text = await response.text();
    
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data);
    } catch {
      console.error('Apps Script trả về:', text.substring(0, 200));
      return NextResponse.json({ success: false, error: 'Invalid JSON from Apps Script', raw: text.substring(0, 200) }, { status: 500 });
    }

  } catch (err) {
    console.error('Proxy error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}