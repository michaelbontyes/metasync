import { NextRequest, NextResponse } from 'next/server';

// This route uses dynamic features and cannot be statically generated
export const dynamic = 'force-dynamic';

/**
 * API proxy to handle CORS issues when making requests to external APIs
 */
export async function GET(request: NextRequest) {
  try {
    // Get the target URL from the query parameter
    const url = request.nextUrl.searchParams.get('url');
    const requiresAuth = request.nextUrl.searchParams.get('auth') === 'true';

    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    console.log(`Proxying request to: ${url}${requiresAuth ? ' with authentication' : ''}`);

    // Set up headers
    const headers: HeadersInit = {
      'Accept': 'application/json'
    };

    // Add authentication if required (for OpenMRS)
    if (requiresAuth) {
      // Basic auth for OpenMRS: admin / Admin123+
      const credentials = btoa('admin:Admin123+');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    // Forward the request to the target URL
    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    // Check if the response is OK
    if (!response.ok) {
      console.error(`Error from target API: ${response.status} ${response.statusText}`);
      return NextResponse.json({
        error: `Target API returned ${response.status} ${response.statusText}`
      }, { status: response.status });
    }

    // Get the response data
    const data = await response.json();

    // Return the response
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error in proxy:', error);
    return NextResponse.json({ error: 'Failed to proxy request' }, { status: 500 });
  }
}
