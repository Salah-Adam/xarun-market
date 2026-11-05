import pg from 'pg';
export function adapter(connection){
 return {
  prepare(sql){
   let index=0;
   const query=sql.replace(/\?/g,()=>'$'+(++index));
   let values=[];
   return {
    bind(...args){values=args;return this},
    async first(){return (await connection.query(query,values)).rows[0]},
    async all(){return {results:(await connection.query(query,values)).rows}},
    async run(){return {meta:{changes:(await connection.query(query,values)).rowCount}}}
   };
  }
 };
}
export function postgresDatabase(connectionString){
 const pool=new pg.Pool({connectionString,max:3});
 return {
  ...adapter(pool),
  async transaction(action){
   const client=await pool.connect();
   try{await client.query('BEGIN');const result=await action(adapter(client));await client.query('COMMIT');return result}
   catch(error){await client.query('ROLLBACK');throw error}
   finally{client.release()}
  },
  close:()=>pool.end()
 };
}
