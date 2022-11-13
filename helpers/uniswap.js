const IUniswapV3Factory = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json')
const IUniswapV3Pool = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json')
const QuoterABI = require('@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json')

const ethers = require('ethers');
const ERC20_abi = require("./abis/ERC20_abi.json");

const config = require("../config");
const {Pool} = require("@uniswap/v3-sdk");
const {CurrencyAmount, TradeType, Token, Percent} = require("@uniswap/sdk-core");
const {AlphaRouter} = require('@uniswap/smart-order-router')

const {BigNumber} = require('@ethersproject/bignumber');


const chainId = parseInt(config.chainId);  // chainId must be integer
const {API_URL, PRIVATE_KEY, WALLET_ADDRESS} = process.env;
const UNISWAP_FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
const UNISWAP_QUOTER_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'
// const V3_SWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // address of a swap router
const V3_SWAP_ROUTER_ADDRESS = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'; // address of a swap router


const getToken = async function (contractAddress) {
    const signer = await getSigner();
    const contract = new ethers.Contract(contractAddress, ERC20_abi, signer);


    const [dec, symbol, name] = await Promise.all([
        contract.decimals(),
        contract.symbol(),
        contract.name(),
    ]);
    return new Token(chainId, contract.address, dec, symbol, name);
};

const getTokenBalance = async function (contractAddress) {
    const signer = await getSigner();
    const contract = new ethers.Contract(contractAddress, ERC20_abi, signer);

    return await contract.balanceOf(WALLET_ADDRESS);
};

async function getProvider() {
    // const chainId = await ethers.utils.fetchJson(API_URL, '{ "id": 42, "jsonrpc": "2.0", "method": "eth_chainId", "params": [ ] }')
    // console.log(chainId);

    const provider = new ethers.providers.JsonRpcProvider(API_URL, chainId);
    await provider.ready
    return provider
}

async function getSigner() {
    const provider = await getProvider();
    return new ethers.Wallet(PRIVATE_KEY, provider);
}

async function approving(contract, routerAddress, provider, signer) {
    const allowance = await contract.allowance(WALLET_ADDRESS, routerAddress);

    if (!BigNumber.from(allowance).isZero())
        return true

    console.log("Approving amount to spend...");
    const allowanceNeeded = "115792089237316195423570985008687907853269984665640564039457584007913129639935"

    const approveTxUnsigned = await contract.populateTransaction.approve(routerAddress, allowanceNeeded);
    approveTxUnsigned.chainId = chainId;
    approveTxUnsigned.gasLimit = await contract.estimateGas.approve(routerAddress, allowanceNeeded);
    approveTxUnsigned.gasPrice = await provider.getGasPrice();
    approveTxUnsigned.nonce = await provider.getTransactionCount(WALLET_ADDRESS);
    const approveTxSigned = await signer.signTransaction(approveTxUnsigned);
    const submittedTx = await provider.sendTransaction(approveTxSigned);
    const approveReceipt = await submittedTx.wait();
    if (approveReceipt.status === 0)
        throw new Error("Approve transaction failed");
    return routerAddress;
}

async function loadingSwapRoute(tokenIn, provider, inAmount, tokenOut) {
    const router = new AlphaRouter({chainId: tokenIn.chainId, provider: provider});
    const route = await router.route(
        inAmount,
        tokenOut,
        TradeType.EXACT_INPUT,
        // swapOptions
        {
            recipient: WALLET_ADDRESS,
            slippageTolerance: new Percent(5, 100),          // Big slippage – for a test
            deadline: Math.floor(Date.now() / 1000 + 1800)    // add 1800 seconds – 30 mins deadline
        },
        // router config
        {
            // only one direct swap for a reason – 2 swaps thru DAI (USDT->DAI->WETH) didn't work on Rinkeby
            // There was an overflow problem https://rinkeby.etherscan.io/tx/0xaed297f2f51f17b329ce755b11635980268f3fc88aae10e78cf59f2c6e65ca7f
            // The was DAI balance for UniswapV2Pair was greater than 2^112-1 (https://github.com/Uniswap/v2-core/blob/master/contracts/UniswapV2Pair.sol)
            // UniswapV2Pair – https://rinkeby.etherscan.io/address/0x8b22f85d0c844cf793690f6d9dfe9f11ddb35449
            // WETH – https://rinkeby.etherscan.io/address/0xc778417e063141139fce010982780140aa0cd5ab#readContract
            // DAI – https://rinkeby.etherscan.io/address/0xc7ad46e0b8a400bb3c915120d284aafba8fc4735#readContract (balance of UniswapV2Pair more than 2^112-1)

            maxSwapsPerPath: 1 // remove this if you want multi-hop swaps as well.
        }
    );

    if (route == null || route.methodParameters === undefined)
        throw "No route loaded";

    console.log(`   You'll get ${route.quote.toFixed()} of ${tokenOut.symbol}`);
    return route;
}

const swapTokenToToken = async function (tokenInContractAddress, tokenOutContractAddress, inAmountStr) {
    const provider = await getProvider();

    const tokenIn = await getToken(tokenInContractAddress);
    const tokenOut = await getToken(tokenOutContractAddress);

    const signer = await getSigner();

    const contractIn = new ethers.Contract(tokenInContractAddress, ERC20_abi, signer);

    console.log("Loading pool information...");
    // this is Uniswap factory, same address on all chains
    const factoryContract = new ethers.Contract(UNISWAP_FACTORY_ADDRESS, IUniswapV3Factory.abi, provider);

    // loading pool smart contract address
    //for 1% pools the fee tier is 10000
    // for 0.3% pools the fee tier is 3000
    // for 0.05% pools the fee tier is 500
    // for 0.01% pools the fee tier is 100

    const poolAddress = await factoryContract.getPool(
        tokenIn.address,
        tokenOut.address,
        3000);  // commission - 3%

    if (Number(poolAddress).toString() === "0") // there is no such pool for provided In-Out tokens.
        throw `Error: No pool ${tokenIn.symbol}-${tokenOut.symbol}`;
    else
        console.log(poolAddress)

    const poolContract = new ethers.Contract(poolAddress, IUniswapV3Pool.abi, provider);
    const getPoolState = async function () {
        const [liquidity, slot] = await Promise.all([poolContract.liquidity(), poolContract.slot0()]);

        return {
            liquidity: liquidity,
            sqrtPriceX96: slot[0],
            tick: slot[1],
            observationIndex: slot[2],
            observationCardinality: slot[3],
            observationCardinalityNext: slot[4],
            feeProtocol: slot[5],
            unlocked: slot[6],
        }
    }
    const getPoolImmutables = async function () {
        const [factory, token0, token1, fee, tickSpacing, maxLiquidityPerTick] = await Promise.all([
            poolContract.factory(),
            poolContract.token0(),
            poolContract.token1(),
            poolContract.fee(),
            poolContract.tickSpacing(),
            poolContract.maxLiquidityPerTick(),
        ]);

        return {
            factory: factory,
            token0: token0,
            token1: token1,
            fee: fee,
            tickSpacing: tickSpacing,
            maxLiquidityPerTick: maxLiquidityPerTick,
        }
    }

    // loading immutable pool parameters and its current state (variable parameters)
    const [immutables, state] = await Promise.all([getPoolImmutables(), getPoolState()]);

    const pool = new Pool(
        tokenIn,
        tokenOut,
        immutables.fee,
        state.sqrtPriceX96.toString(),
        state.liquidity.toString(),
        state.tick
    );

    // token prices in the pool
    console.log("Token prices in pool:");
    console.log(`   1 ${pool.token0.symbol} = ${pool.token0Price.toSignificant()} ${pool.token1.symbol}`);
    console.log(`   1 ${pool.token1.symbol} = ${pool.token1Price.toSignificant()} ${pool.token0.symbol}`);
    console.log('');

    console.log("Loading up quote for a swap...");

    const amountIn = ethers.utils.parseUnits(inAmountStr, tokenIn.decimals);

    const quoterContract = new ethers.Contract(UNISWAP_QUOTER_ADDRESS, QuoterABI.abi, provider);

    const quotedAmountOut = await quoterContract.callStatic.quoteExactInputSingle(
        tokenIn.address,
        tokenOut.address,
        pool.fee,
        amountIn,
        0
    );

    console.log(`   You'll get approximately ${ethers.utils.formatUnits(quotedAmountOut, tokenOut.decimals)} ${tokenOut.symbol} for ${inAmountStr} ${tokenIn.symbol}`);
    console.log('');


    console.log('');
    console.log("Loading a swap route...");

    const inAmount = CurrencyAmount.fromRawAmount(tokenIn, amountIn.toString());
    const route = await loadingSwapRoute(tokenIn, provider, inAmount, tokenOut);

    // Making actual swap
    await approving(contractIn, V3_SWAP_ROUTER_ADDRESS, provider, signer);


    console.log("Making a swap...");
    const value = BigNumber.from(route.methodParameters.value);


    const transaction = {
        data: route.methodParameters.calldata,
        to: V3_SWAP_ROUTER_ADDRESS,
        value: value,
        from: WALLET_ADDRESS,
        gasPrice: route.gasPriceWei,

        // route.estimatedGasUsed might be too low!
        // most of swaps I tested fit into 300,000 but for some complex swaps this gas is not enough.
        // Loot at etherscan/polygonscan past results.
        gasLimit: BigNumber.from("800000")
    };

    const tx = await signer.sendTransaction(transaction);
    const receipt = await tx.wait();
    if (receipt.status === 0) {
        throw new Error("Swap transaction failed");
    }

    return tx;

}

async function getBalances(contractAddress) {

    const token = await getToken(contractAddress);

    const balanceToken = await getTokenBalance(contractAddress);

    return {
        symbol: token.symbol,
        balance: ethers.utils.formatUnits(balanceToken, token.decimals),
        name: token.name,
        address: token.address,
    }
}


module.exports = {getBalances, swapTokenToToken};