// Vehicle search endpoint
export async function onRequestGet(context) {
  try {
    const { env, request } = context;
    
    // Get search query from URL parameters
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get('q');
    
    if (!searchQuery || searchQuery.trim() === '') {
      return new Response(JSON.stringify([]), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const term = searchQuery.trim();
    
    // Search by VIN or Stock Number (case-insensitive, partial match)
    const stmt = env.DB.prepare(`
      SELECT 
        vin,
        stockNumber,
        year,
        make,
        model,
        trim,
        color,
        mileage,
        vehicleDescription,
        status,
        createdAt,
        updatedAt
      FROM vehicles
      WHERE 
        LOWER(vin) LIKE LOWER(?) OR
        LOWER(stockNumber) LIKE LOWER(?) OR
        LOWER(make) LIKE LOWER(?) OR
        LOWER(model) LIKE LOWER(?)
      ORDER BY 
        CASE 
          WHEN LOWER(vin) = LOWER(?) THEN 1
          WHEN LOWER(stockNumber) = LOWER(?) THEN 2
          ELSE 3
        END,
        year DESC,
        make,
        model
      LIMIT 20
    `);
    
    const searchPattern = `%${term}%`;
    const { results } = await stmt.bind(
      searchPattern, // vin LIKE
      searchPattern, // stockNumber LIKE
      searchPattern, // make LIKE
      searchPattern, // model LIKE
      term,          // exact vin match for sorting
      term           // exact stock match for sorting
    ).all();

    return new Response(JSON.stringify(results || []), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Vehicle search error:', error);
    return new Response(JSON.stringify({
      error: 'Error searching vehicles',
      message: error.message
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
