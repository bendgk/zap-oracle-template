"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helper_1 = require("./helper");
//==============================================================================================================
// Provider Constants
//==============================================================================================================
exports.ProviderData = {
    title: "wolfram-2",
    public_key: "0x486e7286a85B7147503C52297a6732B938Feb2af",
    endpoint: "wolfram-2",
    endpoint_params: []
};
exports.Responders = {
    "wolfram-2": {
        responder: wolframResponder,
        curve: [1, 1e18, 1000]
    }
    // define more endpoints and their callbacks here
};
//==============================================================================================================
// Web3 instance creator
//==============================================================================================================
const INFURA_WS = "wss://kovan.infura.io/ws/xeb916AFjrcttuQlezyq";
const HDWalletProviderMem = require("truffle-hdwallet-provider");
/* Put your mnemonic here */
const mnemonic = "cart hip muscle describe canyon orange volume drink forum fox lobster more";
async function getWeb3Provider() {
    return new HDWalletProviderMem(mnemonic, INFURA_WS);
}
exports.getWeb3Provider = getWeb3Provider;
//==============================================================================================================
// Responder callback functions
//==============================================================================================================
async function wolframResponder(web3, event) {
    // do stuff with these values
    const { queryId, query, endpoint, subscriber, endpointParams, onchainSub } = event;
    var data = await queryWolfram(query);
    
    // break up data to elements with length of bytes32 to match response format (in case response is too long)
    data = data.match(/.{1,32}/g);

    var response = []
    
    for (let i = 0; i < data.length; i++) {
        response.push(web3.utils.padLeft(web3.utils.toHex(data[i]), 64))  //response is an array of strings of length bytes32
    }

    return response

}
//==============================================================================================================
// HTTP API calls to online data providers
//==============================================================================================================
/* Sample HTTP data provider */

// wolfram alpha config
const WolframAlphaAPI = require('wolfram-alpha-api');
const waApi = WolframAlphaAPI('8H4R52-P25EAE6ER5');

/*  use wolfram alpha short response api to answer user queries
    @param query: string - query to send to wolfram api
    @returns response: string - wolfram api response (can be an error message)
*/
async function queryWolfram(query) {
    console.log(`Querying wolfram: ${query}`)
    var response = waApi.getShort(query).then((data) => {return data}).catch((err) => {return String(err)});
    return response;
}

/* Starts the oracle. Creates it (if it does not exist), and starts listening for queries */
helper_1.initialize().catch(err => console.error('zap-oracle-template error:', err));
