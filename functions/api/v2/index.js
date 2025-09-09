import { onRequest as v2Handler } from './[[path]].js';

export async function onRequest(context) {
  // Handle CORS preflight
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // Delegate to the [[path]] handler with empty path
  const newContext = {
    ...context,
    params: { path: '' }
  };
  
  return await v2Handler(newContext);
}
