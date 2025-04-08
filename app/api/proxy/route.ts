import { NextRequest, NextResponse } from 'next/server';

/**
 * API proxy to handle CORS issues when making requests to external APIs
 */
export async function GET(request: NextRequest) {
  try {
    // Get the target URL from the query parameter
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }
    
    console.log(`Proxying request to: ${url}`);
    
    // Forward the request to the target URL
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    // Get the response data
    const data = await response.json();
    
    // Return the response
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error in proxy:', error);
    return NextResponse.json({ error: 'Failed to proxy request' }, { status: 500 });
  }
}
