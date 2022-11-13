const ethers = require("ethers");
const WETH9ABI = require("./abis/WETH9.json");
const config = require("../config");
const {API_URL, PRIVATE_KEY} = process.env;
const WETH9_Contract = config.WETH9_Contract
const chainId = parseInt(config.chainId);  // chainId must be integer

async function getProvider() {
    const provider = new ethers.providers.JsonRpcProvider(API_URL, chainId);
    await provider.ready
    return provider
}

async function getSigner() {
    const provider = await getProvider();
    return new ethers.Wallet(PRIVATE_KEY, provider);
}


async function deposit(amountStr) {
    const value = ethers.utils.parseEther(amountStr.toString())
    const signer = await getSigner();
    const contract = new ethers.Contract(WETH9_Contract, WETH9ABI, signer);
    return await contract.deposit({value: value})
}

async function withdraw(amountStr) {
    const value = ethers.utils.parseEther(amountStr.toString())
    const signer = await getSigner();
    const contract = new ethers.Contract(WETH9_Contract, WETH9ABI, signer);

    return await contract.withdraw(value);
}

async function getBalances(address) {
    const signer = await getSigner();
    const contract = new ethers.Contract(WETH9_Contract, WETH9ABI, signer);

    let wBalance = await contract.balanceOf(address);
    wBalance = ethers.utils.formatEther(wBalance)

    let balance = await signer.provider.getBalance(address);
    balance = ethers.utils.formatEther(balance)

    return [balance, wBalance]

}

module.exports = {deposit, withdraw, getBalances};