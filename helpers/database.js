const Pool = require('pg').Pool;

const config = require("../config");


const pool = new Pool({
  user: config.db.user,
  host: config.db.host,
  database: config.db.database,
  password: config.db.password,
  port: 5433,
})

pool.on('connect', () => {
  console.log('DB connected success!');
});


module.exports = {
  query: (text, params) => pool.query(text, params),
};
