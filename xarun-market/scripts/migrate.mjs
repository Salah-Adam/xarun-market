import fs from 'node:fs';
import pg from 'pg';
if(!process.env.DATABASE_URL)throw Error('Set DATABASE_URL in .env first.');
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
await client.connect();
try{
 await client.query('BEGIN');
 await client.query("SELECT pg_advisory_xact_lock(791233)");
 await client.query('CREATE TABLE IF NOT EXISTS app_migrations(name TEXT PRIMARY KEY)');
 for(const file of fs.readdirSync('drizzle').filter(name=>name.endsWith('.sql')).sort()){
  if((await client.query('SELECT name FROM app_migrations WHERE name=$1',[file])).rowCount)continue;
  const sql=fs.readFileSync('drizzle/'+file,'utf8');
  for(const statement of sql.split('--> statement-breakpoint'))await client.query(statement);
  await client.query('INSERT INTO app_migrations(name) VALUES($1)',[file]);
 }
 await client.query('COMMIT');
 console.log('Database migrations applied.');
}catch(error){await client.query('ROLLBACK');throw error}
finally{await client.end()}
