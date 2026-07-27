const postgres = require('postgres');
const sql = postgres({
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  username: 'postgres.repqjgqeoyleesonbrjx',
  password: 'wtodatabase2027',
  ssl: 'require',
  prepare: false
});
sql.unsafe('SELECT 1').then(r => { console.log('OK:', JSON.stringify(r)); process.exit(0); }).catch(e => { console.log('ERROR:', e.message, e.code); process.exit(1); });
