
let contract: any;

async function initializeTrade(request: Request) {
    const data: {
        expected_reward: number;
        user_address: string;
        stake: number;
        trade_duration: number;
    } = await request.json()

    const tx = await contract.startTrade(data.user_address, data.stake);
    await tx.wait()

    // save trade to database


}

async function getAddressTrades(request: Request) {
    const data: {
        user_address: string;
    } = await request.json()

    // fetch all address trade
}

async function repayLoad(request: Request) {
    const data: {
        user_address: string;
        contract_address: string;
    } = await request.json()

    // withdraw user tokens

    const tx = await contract.repayLoan(data.contract_address, data.user_address)
    await tx.wait()


}