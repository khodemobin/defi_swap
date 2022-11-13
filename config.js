require('dotenv').config();
const {API_URL, PRIVATE_KEY, WALLET_ADDRESS, DB_HOST, DB_USER, DB_PASSWORD} = process.env;

const config = {
  db: {
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: "db2",
  },
  chainId: 1,
  WETH9_Contract: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  API_URL: API_URL,
  PRIVATE_KEY:  PRIVATE_KEY,
  WALLET_ADDRESS:  WALLET_ADDRESS
};

module.exports = config;
