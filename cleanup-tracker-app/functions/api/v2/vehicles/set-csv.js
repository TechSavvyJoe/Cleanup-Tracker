// Vehicle CSV URL configuration endpoint
export async function onRequestPost(context) {
  try {
    const { request } = context;
    const { url } = await request.json();

    if (!url) {
      return new Response(JSON.stringify({
        success: false,
        message: 'CSV URL is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid URL format'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // In a real implementation, this would save to database
    // For now, just return success
    console.log('CSV URL configured:', url);

    return new Response(JSON.stringify({
      success: true,
      message: 'CSV URL configured successfully',
      url: url
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Error configuring CSV URL',
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Handle CORS preflight
export async function onRequestOptions(context) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}