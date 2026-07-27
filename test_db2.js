const postgres = require('postgres');
const sql = postgres({
  host: '2406:da14:1772:ea00:a9b:e628:64c3:5ed3',
  port: 5432,
  database: 'postgres',
  username: 'postgres',
  password: 'wtodatabase2027',
  ssl: 'require',
  prepare: false
});
sql.unsafe('SELECT 1').then(r => { console.log('OK:', JSON.stringify(r)); process.exit(0); }).catch(e => { console.log('ERROR:', e.message, e.code); process.exit(1); });
