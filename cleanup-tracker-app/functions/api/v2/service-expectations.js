// Service expectations endpoint for Cloudflare Workers
export async function onRequestGet(context) {
  try {
    // Return default service expectations
    const serviceExpectations = {
      "Interior Detail": { duration: 90, priority: "Normal" },
      "Exterior Detail": { duration: 60, priority: "Normal" },
      "Full Detail": { duration: 150, priority: "High" },
      "Express Wash": { duration: 30, priority: "Low" },
      "Engine Bay Clean": { duration: 45, priority: "Normal" },
      "Headlight Restoration": { duration: 60, priority: "Normal" },
      "Paint Correction": { duration: 240, priority: "High" },
      "Ceramic Coating": { duration: 300, priority: "High" },
      "Oil Change": { duration: 30, priority: "Normal" },
      "Tire Rotation": { duration: 20, priority: "Low" },
      "Basic Inspection": { duration: 15, priority: "Low" },
      "PDI (Pre-Delivery Inspection)": { duration: 45, priority: "High" },
      "Reconditioning": { duration: 120, priority: "Normal" },
      "Touch-up Paint": { duration: 60, priority: "Normal" },
      "Wheel Cleaning": { duration: 30, priority: "Low" }
    };

    return new Response(JSON.stringify(serviceExpectations), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error fetching service expectations',
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}