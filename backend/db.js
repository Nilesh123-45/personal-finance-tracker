const mysql = require('mysql2');
require('dotenv').config(); 

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '12345',  
    database: 'finance_tracker',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


module.exports = pool.promise();
