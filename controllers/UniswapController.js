const uniSwap = require("../helpers/uniswap");
const {getAddress} = require("../helpers/queries");

exports.swap = async (req, res) => {
    try {
        const value = req.query.value;

        const fromAddress = await getAddress(req.query.from, 'ETH');
        const toAddress = await getAddress(req.query.to, 'ETH');


        const swapTx = await uniSwap.swapTokenToToken(fromAddress, toAddress, value);
        res.json(swapTx)
    } catch (e) {
        console.log(e)
        res.json({error: e})
    }

}

exports.balance = async (req, res) => {
    const contractAddress = await getAddress(req.query.symbol, 'ETH');
    const balance = await uniSwap.getBalances(contractAddress);
    res.json(balance)
};