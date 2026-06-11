const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:Piyush%403126@db.oqzrtgvzgnlgqoqaaumh.supabase.co:5432/postgres'
});
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error("CONNECTION ERROR:");
    console.error(err);
  } else {
    console.log("SUCCESS:");
    console.log(res.rows);
  }
  pool.end();
});
