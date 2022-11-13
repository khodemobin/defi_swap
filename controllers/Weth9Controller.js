const wETH9 = require("../helpers/weth9");
const config = require("../config");

exports.balance = async (req, res) => {
    console.log(config.WALLET_ADDRESS);
    try {
        const balance = await wETH9.getBalances(config.WALLET_ADDRESS);
        res.json({'ETH': balance[0], 'wETH': balance[1]})
    } catch (e) {
        console.log(e)
        res.json({error: e})
    }
};

exports.deposit = async (req, res) => {
    try {
        const value = parseFloat(req.query.value)
        if (!value) {
            res.json({error: "Value not valid"})
            return
        }
        const tx = await wETH9.deposit(value);
        res.json({msg: "OK", txId: tx.hash})
    } catch (e) {
        console.log(e)
        res.json({error: e})
    }
};

exports.withdraw = async (req, res) => {
    try {
        const value = req.query.value
        const tx = await wETH9.withdraw(value);
        res.json({msg: "OK", txId: tx.hash})
    } catch (e) {
        console.log(e)
        res.json({error: e})
    }
};
