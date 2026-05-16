import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: NextRequest) {
  try {
    const { url, data, headers, method } = await req.json();

    const response = await axios({
      url,
      method: method || 'POST',
      data,
      headers: {
        ...headers,
        'User-Agent': 'okhttp/4.9.1',
      },
      // Appx API sometimes returns text that contains JSON
      responseType: 'text',
    });

    return new NextResponse(response.data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('Proxy error:', error.message);
    return NextResponse.json(
      { error: error.message, data: error.response?.data },
      { status: error.response?.status || 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    // Extract everything except 'url' to forward as headers or query params?
    // Actually, it's easier to pass headers in a POST request or as a JSON object.
    // Let's stick to POST for everything for simplicity in the proxy.
    return NextResponse.json({ error: 'Use POST to proxy requests' }, { status: 405 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
