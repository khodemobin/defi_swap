const {trxToTokenSwapInput, tokenToTrxSwapInput} = require("../helpers/sunSwap");


exports.swap = async (req, res) => {
    res.json({msg: 'Not implement'})
}


exports.balance = async (req, res) => {
    try {
        trxToTokenSwapInput(10).then(tx => res.json({txId: tx})).catch(e => res.json({error: e}));
    } catch (e) {
        console.log(e)
        res.json({error: e})
    }
};

exports.buy = async (req, res) => {
    try {
        tokenToTrxSwapInput(1, 1).then(tx => res.json({txId: tx})).catch(e => res.json({error: e}));
    } catch (e) {
        console.log(e)
        res.json({error: e})
    }
};
