const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({host:'localhost',port:3306,user:'root',password:'1728f1br'});
  await conn.query('DROP DATABASE IF EXISTS `histórico_alphahall`');
  console.log('Banco histórico_alphahall removido com sucesso');
  await conn.end();
}
run().catch(console.error);
