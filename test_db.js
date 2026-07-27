const p = require("postgres");
const sql = p("postgres://postgres:wtodatabase2027@db.repqjgqeoyleesonbrjx.supabase.co:5432/postgres?sslmode=require", { prepare: false });
sql.unsafe("SELECT 1").then(r => { console.log("OK:", JSON.stringify(r)); process.exit(0); }).catch(e => { console.log("ERROR:", e.message); process.exit(1); });
