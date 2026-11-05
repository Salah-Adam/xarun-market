import worker from '../../dist/server/index.js';
import {postgresDatabase} from '../../scripts/postgres.mjs';
let db;
export default async function handler(request){
 if(!process.env.DATABASE_URL)return new Response('Configure DATABASE_URL in Netlify.',{status:503});
 db ||= postgresDatabase(process.env.DATABASE_URL);
 return worker.fetch(request,{...process.env,DB:db});
}
