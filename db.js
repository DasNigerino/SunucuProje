const mysql = require('mysql2/promise');
require('dotenv/config')


const db = mysql.createPool({
  host: process.env.MYSQL_INSTANCE_NAME || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root',
  database: process.env.MYSQL_DB_NAME || 'proje',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = { db };