export async function onRequestPut(context) {
  try {
    const { env, request } = context;
    const { vin, jobId } = await request.json();
    const vehicleStmt = env.DB.prepare('SELECT * FROM vehicles WHERE vin = ?');
    const vehicle = await vehicleStmt.bind(vin).first();
    if (!vehicle) {
      return new Response(JSON.stringify({ success: false, message: 'Vehicle not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    const description = `${vehicle.year} ${vehicle.make} ${vehicle.model}`.trim();
    const jobStmt = env.DB.prepare('UPDATE jobs SET vin = ?, stockNumber = ?, vehicleDescription = ?, updatedAt = ? WHERE id = ?');
    await jobStmt.bind(vehicle.vin, vehicle.stockNumber, vehicle.vehicleDescription || description, new Date().toISOString(), jobId).run();
    return new Response(JSON.stringify({ success: true, vehicle }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to link vehicle to job', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
