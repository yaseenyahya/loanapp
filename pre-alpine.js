const erc20Abi = [
    "function balanceOf(address _owner) external view returns (uint256)",
    "function increaseAllowance(address _spender, uint256 _value) external returns (bool)",
    "function allowance(address _owner, address _spender) external view returns (uint256)",
]
const contractAbi = [
    "function balanceOf(address _owner) public view returns (uint256)",
    "function getBorrowed(address addr) public view returns(uint256)",
    "function borrowLoan(uint256 amount) public",
    "function payBackLoan() public",
    "function convertReward() public",
    "function trade(uint256 amount) public",
    "function tradeWithEth() external payable",
    "function tradeWithUsdt(uint256 amount) public",
    "function getUserStats(address addr) view returns (uint256 balance, uint256 loan, uint256 usdtBalance, uint256 ethBalance, uint256 usdtAllowance)",
    "function rewardTrade(address trader, uint256 amount) public"
]

const platformContractAddress = '0x93cf9f026494F0961Cea94192176C71F80B70d02'
const usdtContractAddress = '0x55d398326f99059fF775485246999027B3197955'

let platformContract;
let usdtContract;
let core;
let dbclient;

async function updateUseData() {
    let data = {}
    const address = await window.getKitCore().signer.getAddress()

    const result = await platformContract.getUserStats(address)
    const keys = [
        "balance",
        "loan",
        "usdtBalance",
        "ethBalance",
        "usdtAllowance",
    ]
    keys.map(k => {
        data[k] = Number(core.ethers.formatUnits(result[k], 18));
    });
    Alpine.store('wallet').data = { ...data, address }
}

async function updateNetwork() {
    let globalSigner;

    let changingNetwork = false;
    while (true) {
        globalSigner = await window.getKitCore();
        const chainId = globalSigner?.ethers.toNumber((await globalSigner.provider.getNetwork()).chainId)
        if (chainId != 56) {
            if (changingNetwork) continue;
            changingNetwork = true;
            await window.changeNetwork(56)
        }
        break
    }
}

async function checkAndConnectWallet() {
    // check if connected
    let globalSigner;
    let isConnecting = false;
    while (true) {
        globalSigner = await window.getKitCore();
        if (!Boolean(globalSigner?.signer)) {
            if (isConnecting) continue;
            isConnecting = true;
            await window.defaultConnector();
        }
        break;
    }

    await updateNetwork()

}

window.callonkitloaded = () => {
    Alpine.store('wallet').loadedKit = true;
}

window.callonconnectedwallet = async (address) => {
    await updateNetwork();
    core = window.getKitCore();
    setTimeout(updateUseData)
    setTimeout(async () => {
        const { data: loanData, error: loanError } = await dbclient.from('loans').select('*').ilike('address', address)
        const { data: tradeData, error: tradeError } = await dbclient.from('trades').select('*').ilike('address', address)
        Alpine.store('wallet').loans = loanData
        Alpine.store('wallet').trades = tradeData
    })
    usdtContract = new core.ethers.Contract(usdtContractAddress, erc20Abi, core.signer)
    platformContract = new core.ethers.Contract(platformContractAddress, contractAbi, core.signer)
}