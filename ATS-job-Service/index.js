const { Client } = require('pg');

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 5432,
    ssl: { rejectUnauthorized: false }
};

exports.handler = async (event) => {
    const client = new Client(dbConfig);
    await client.connect();

    try {
        const method = event.requestContext.http.method;
        const body = event.body ? JSON.parse(event.body) : {};
        
        // Security: Get User Role
        const claims = event.requestContext.authorizer.jwt.claims;
        const groups = claims['cognito:groups'] || [];
        const isRecruiter = groups.includes("Recruiters");

        // --- POST: Create Job ---
        if (method === 'POST') {
            if (!isRecruiter) return { statusCode: 403, body: "Recruiters only" };
            const { company_id, recruiter_id, title, description } = body;
            const res = await client.query(
                `INSERT INTO jobs (company_id, recruiter_id, title, description, status) 
                 VALUES ($1, $2, $3, $4, 'open') RETURNING *`,
                [company_id, recruiter_id, title, description]
            );
            return { statusCode: 201, body: JSON.stringify(res.rows[0]) };
        }

        // --- GET: List Jobs ---
        if (method === 'GET') {
            const res = await client.query("SELECT * FROM jobs WHERE status = 'open'");
            return { statusCode: 200, body: JSON.stringify(res.rows) };
        }

        // --- DELETE: Remove Job ---
        if (method === 'DELETE') {
            if (!isRecruiter) return { statusCode: 403, body: "Recruiters only" };
            const jobId = event.pathParameters.id; 
            await client.query("DELETE FROM jobs WHERE job_id = $1", [jobId]);
            return { statusCode: 200, body: JSON.stringify({ message: "Job Deleted" }) };
        }

        // --- PUT: Update Job ---
        if (method === 'PUT') {
            if (!isRecruiter) return { statusCode: 403, body: "Recruiters only" };
            const jobId = event.pathParameters.id; 
            const { title, description, status } = body;
            const res = await client.query(
                `UPDATE jobs SET title = COALESCE($1, title), description = COALESCE($2, description), status = COALESCE($3, status) 
                 WHERE job_id = $4 RETURNING *`,
                [title, description, status, jobId]
            );
            return { statusCode: 200, body: JSON.stringify(res.rows[0]) };
        }

        return { statusCode: 400, body: "Method not supported" };

    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    } finally {
        await client.end();
    }
};