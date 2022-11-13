const pdb = require("./database");

exports.getAddress = async (symbol_name, blockchin) => {
  const contract = await pdb.query(
      "select contract from tokens where symbol = $1 and blockchin= $2",
      [symbol_name.toLocaleUpperCase(), blockchin.toUpperCase()]
  );
      if(contract.rows === []) {
        return null
      }
      else {
        console.log(contract)
        return contract.rows[0]["contract"]
      }
}
