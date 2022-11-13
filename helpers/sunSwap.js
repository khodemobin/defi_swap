const TronWeb = require("tronweb");

const {TRX_RPC, TRX_PRIVATE_KEY, TRX_WALLET_ADDRESS} = process.env;

// const contract_address = 'TU6R6yPunDPayS8Awf63Xs3QUggfx7Ppd2'; // (S-TUSD-TRX Token)
const contract_address = 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE'; // (S-USDT-TRX Token)
const tokenAddressHex = 'TRz7J6dD2QWxBoumfYt4b3FaiRG23pXfop';
//*-*-*-*-*-*-


const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider(TRX_RPC);
const solidityNode = new HttpProvider(TRX_RPC);
const eventServer = new HttpProvider(TRX_RPC);

const tronWeb = new TronWeb(fullNode, solidityNode, eventServer, TRX_PRIVATE_KEY);

const waitAllowance = async (contract, account, to, allowanceNeeded, timesLeft) => {
    if (timesLeft > 1) {
        const currentAllowance = await contract.allowance(account, to).call();
        // console.log(`${allowanceNeeded} current is ${currentAllowance} `)
        const needed = BigInt(allowanceNeeded);
        const current = BigInt(currentAllowance.toString());
        if (current >= needed) {
            return true;
        }
        await new Promise((res) => setTimeout(res, 1000));
        await waitAllowance(contract, account, to, allowanceNeeded, timesLeft - 1);
    }
    throw new Error('wait allowance failed for many times.');
};

/**
 * Sell token to buy TRX (token is in a fixed amount)
 * @param tokenAmount
 * @param min_trx min trx for sale
 */
const tokenToTrxSwapInput = async (tokenAmount = 1, min_trx = 1) => {
    try {
        const tokenContractInstance = await tronWeb.contract().at(tronWeb.address.toHex(tokenAddressHex));
        const allowanceNeeded = "115792089237316195423570985008687907853269984665640564039457584007913129639935"
        const decimals = await tokenContractInstance.decimals().call();
        const tokens_sold = BigInt(tokenAmount * Math.pow(10, decimals));
        min_trx = BigInt(min_trx * Math.pow(10, 5));


        //check allowance
        const allowance = await tokenContractInstance.allowance(TRX_WALLET_ADDRESS, contract_address).call();
        if (BigInt(allowance) === BigInt(0)) {
            const txApprove = await tokenContractInstance.approve(contract_address, allowanceNeeded).send();
            console.log(txApprove)
            if (!txApprove)
                throw new Error('Failed to approve transaction')
            const allowanceTx = await waitAllowance(tokenContractInstance, TRX_WALLET_ADDRESS, contract_address, allowanceNeeded, 80)
            console.log(allowanceTx)
        }


        const functionSelector = 'tokenToTrxSwapInput(uint256,uint256,uint256)';
        const args = {
            callValue: 0, shouldPollResponse: true, feeLimit: 1_000_000_000
        };

        let parameters = [
            {type: 'uint256', value: tokens_sold}, //tokens_sold
            {type: 'uint256', value: min_trx}, //min_trx
            {type: 'uint256', value: new Date().getTime() + 30 * 60000}
        ];


        const tx = await tronWeb.transactionBuilder.triggerSmartContract(contract_address, functionSelector, args, parameters)


        if (!tx.result || !tx.result.result) return console.error('Unknown error:', tx.result);


        const signedTransaction = await tronWeb.trx.sign(tx.transaction);
        if (!signedTransaction.signature) {
            return console.error('Transaction was not signed properly');
        }
        const broadcast = await tronWeb.trx.sendRawTransaction(signedTransaction);

        console.log(broadcast);


        const {message} = broadcast;
        if (message) {
            console.log("Error:", Buffer.from(message, 'hex').toString());
        }
        return broadcast.txid
    } catch (e) {
        console.error(e);
        return e;
    }
}

/**
 * Sell Token to get Trx then transfer to recipient address.
 * @param tokenAmount
 * @param min_trx vs min trx
 * @param recipient recipient address
 */
const tokenToTrxTransfer = async (tokenAmount = 1, recipient, min_trx) => {
    try {
        const args = {
            callValue: 0, shouldPollResponse: true
        };
        const swapContractInstance = await tronWeb.contract().at(contract_address);
        const tokenContractInstance = await tronWeb.contract().at(tokenAddressHex);
        const decimals = await tokenContractInstance.decimals().call();
        const tokens_sold = tokenAmount * Math.pow(10, decimals);
        min_trx = min_trx * Math.pow(10, 5);
        const date = new Date();
        const swapTokenToTrx = await swapContractInstance.tokenToTrxTransferInput(tokens_sold, min_trx, new Date(date.getMinutes() + 30).getTime(), recipient).send(args);
        console.log({swapTokenToTrx});
        return swapTokenToTrx.success;
    } catch (e) {
        console.error(e);
        return e;
    }
}


/**
 * sell token1 and buy token2 (token1 is in a fixed amount)
 * @param token1Amount
 * @param min_trx_bought number of trx converts in the interim, suggest 1 trx
 * @param min_tokens_bought  Minimum number of tokens to buy
 * @param token_addr And token address
 */
const tokenToTokenSwapInput = async (token1Amount, min_tokens_bought, price, token_addr) => {
    try {
        const args = {
            callValue: 0, shouldPollResponse: true
        };
        token_addr = tronWeb.address.toHex(token_addr)
        const allowanceNeeded = "115792089237316195423570985008687907853269984665640564039457584007913129639935"

        price = BigInt(price)
        //check allowance
        const allowance = await tokenContractInstance.allowance(TRX_WALLET_ADDRESS, contract_address).call();
        if (BigInt(allowance) === BigInt(0)) {
            const txApprove = await tokenContractInstance.approve(contract_address, allowanceNeeded).send();
            console.log(txApprove)
            if (!txApprove)
                throw new Error('Failed to approve transaction')
            const allowanceTx = await waitAllowance(tokenContractInstance, TRX_WALLET_ADDRESS, contract_address, allowanceNeeded, 60)
            console.log(allowanceTx)
        }


        const tokenContractInstance = await tronWeb.contract().at(tokenAddressHex);
        const decimals = await tokenContractInstance.decimals().call();
        const quantity = BigInt(token1Amount * Math.pow(10, decimals));
        const value = BigInt(quantity * price)


        const functionSelector = 'tokenToTokenSwapInput(uint256,uint256,uint256,uint256,address)';
        // const functionSelector = 'tokenToTokenTransferInput(uint256,uint256,uint256,uint256,address,address)';

        // is_buy
        let parameters = [
            {type: 'uint256', value: value}, // Amount of token1 sold (fixed amount)
            {type: 'uint256', value: quantity}, //Minimum amount of token2 needed, which is calculated from the slippage
            {type: 'uint256', value: 1}, // Amount of TRX converted in the interim(suggested value: 1)
            {type: 'uint256', value: new Date().getTime() + 30 * 60000},
            {type: 'address', value: token_addr} //Token2 contract address
        ];
        //else
        // let parameters = [
        //     {type: 'uint256', value: quantity}, // Amount of token1 sold (fixed amount)
        //     {type: 'uint256', value: value}, //Minimum amount of token2 needed, which is calculated from the slippage
        //     {type: 'uint256', value: 1}, // Amount of TRX converted in the interim(suggested value: 1)
        //     {type: 'uint256', value: new Date().getTime() + 30 * 60000},
        //     {type: 'address', value: token_addr} //Token2 contract address
        // ];

        const tx = await tronWeb.transactionBuilder.triggerSmartContract(contract_address, functionSelector, args, parameters)


        if (!tx.result || !tx.result.result) return console.error('Unknown error:', tx.result);

        const signedTransaction = await tronWeb.trx.sign(tx.transaction);
        if (!signedTransaction.signature) {
            return console.error('Transaction was not signed properly');
        }
        const broadcast = await tronWeb.trx.sendRawTransaction(signedTransaction);

        const {message} = broadcast;
        if (message) {
            console.log("Error:", Buffer.from(message, 'hex').toString());
        }
        return broadcast.txid

    } catch (e) {
        console.error(e);
        return e;
    }
}


/**
 * Sell Token 1
 * @param trxValue
 */
const trxToTokenSwapInput = async (trxValue) => {
    try {
        let args = {feeLimit: 1000000000, callValue: trxValue * Math.pow(10, 6)};
        let parameters = [{
            type: 'uint256',
            value: 310223 //min_tokens
        }, {
            type: 'uint256',
            value: new Date().getTime() + 30 * 60000
        }];


        const tx = await tronWeb.transactionBuilder.triggerSmartContract(contract_address, 'trxToTokenSwapInput(uint256,uint256)', args, parameters)


        if (!tx.result || !tx.result.result) return console.error('Unknown error:', tx.result);


        const signedTransaction = await tronWeb.trx.sign(tx.transaction);
        if (!signedTransaction.signature) {
            return console.error('Transaction was not signed properly');
        }
        const broadcast = await tronWeb.trx.sendRawTransaction(signedTransaction);

        const {message} = broadcast;
        if (message) {
            console.log("Error:", Buffer.from(message, 'hex').toString());
        }
        return broadcast.txid
    } catch (e) {
        console.error(e);
        return e;
    }
}


module.exports = {tokenToTrxSwapInput, trxToTokenSwapInput,tokenToTokenSwapInput, tokenToTrxTransfer};
