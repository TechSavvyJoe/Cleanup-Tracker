// Jobs management endpoint for Cloudflare Workers with D1
export async function onRequestGet(context) {
  try {
    const { env, request } = context;
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const status = url.searchParams.get('status');

    let query = 'SELECT * FROM jobs ORDER BY createdAt DESC';
    let params = [];

    if (userId) {
      query = 'SELECT * FROM jobs WHERE technicianId = ? ORDER BY createdAt DESC';
      params = [userId];
    } else if (status) {
      query = 'SELECT * FROM jobs WHERE status = ? ORDER BY createdAt DESC';
      params = [status];
    }

    const stmt = env.DB.prepare(query);
    const { results } = await stmt.bind(...params).all();

    return new Response(JSON.stringify({
      success: true,
      jobs: results || []
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Error fetching jobs',
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

export async function onRequestPost(context) {
  try {
    const { env, request } = context;
    const jobData = await request.json();

    const {
      vin,
      stockNumber,
      vehicleDescription,
      serviceType,
      priority = 'Normal',
      technicianId,
      technicianName,
      assignedBy,
      expectedDuration = 60
    } = jobData;

    if (!vin || !serviceType) {
      return new Response(JSON.stringify({
        success: false,
        message: 'VIN and service type are required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const stmt = env.DB.prepare(`
      INSERT INTO jobs (
        vin, stockNumber, vehicleDescription, serviceType, priority,
        technicianId, technicianName, assignedBy, expectedDuration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = await stmt.bind(
      vin, stockNumber, vehicleDescription, serviceType, priority,
      technicianId, technicianName, assignedBy, expectedDuration
    ).run();

    return new Response(JSON.stringify({
      success: true,
      jobId: result.meta.last_row_id,
      message: 'Job created successfully'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Error creating job',
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

export async function onRequestPut(context) {
  try {
    const { env, request } = context;
    const updateData = await request.json();
    const { id, status, duration, notes, issues } = updateData;

    if (!id) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Job ID is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    let updateFields = [];
    let params = [];

    if (status) {
      updateFields.push('status = ?');
      params.push(status);

      if (status === 'In Progress') {
        updateFields.push('startedAt = ?');
        params.push(new Date().toISOString());
      } else if (status === 'Completed') {
        updateFields.push('completedAt = ?');
        params.push(new Date().toISOString());
      }
    }

    if (duration !== undefined) {
      updateFields.push('duration = ?');
      params.push(duration);
    }

    if (notes !== undefined) {
      updateFields.push('notes = ?');
      params.push(notes);
    }

    if (issues !== undefined) {
      updateFields.push('issues = ?');
      params.push(issues);
    }

    updateFields.push('updatedAt = ?');
    params.push(new Date().toISOString());
    params.push(id);

    const stmt = env.DB.prepare(`
      UPDATE jobs SET ${updateFields.join(', ')} WHERE id = ?
    `);

    await stmt.bind(...params).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Job updated successfully'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Error updating job',
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