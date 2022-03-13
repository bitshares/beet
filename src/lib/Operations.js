import getBlockchainAPI from "../lib/blockchains/blockchainFactory";

export default class operations {

    static async generate(data, account_id) {
        const blockchain = getBlockchainAPI();
        let operation = await blockchain.getOperation(data, account_id);
        return {
            type: operation.type,
            data: operation.data
        };
    }
}