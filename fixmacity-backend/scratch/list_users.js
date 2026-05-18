const { Client } = require('pg');
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'fixmacity',
  user: 'postgres',
  password: '98452169.PApa'
});

async function main() {
  await client.connect();
  const res = await client.query("SELECT email, role, first_name, last_name FROM users;");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
