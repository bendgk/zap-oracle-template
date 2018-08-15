"use strict";
//==============================================================================================================
// Dependencies
//==============================================================================================================
Object.defineProperty(exports, "__esModule", { value: true });
const Web3 = require('web3');
const request = require('request');
const provider_1 = require("@zapjs/provider");
const oracle_1 = require("./oracle");
const path_1 = require("path");
//==============================================================================================================
// Setup Functions
//==============================================================================================================
/**
 * Initializes the oracle. Creates the provider if it does not exist already. Starts listening
 * for queries if it does.
 */
async function initialize() {
    const web3 = new Web3(await oracle_1.getWeb3Provider());
    // Get the provider and contracts
    const provider = await initProvider(web3);
    const title = await provider.getTitle();
    if (title.length == 0) {
        console.log("Initializing provider");
        const res = await provider.initiateProvider(oracle_1.ProviderData);
        console.log(res);
        console.log("Successfully created oracle", oracle_1.ProviderData.title);
        for (const spec in oracle_1.Responders) {
            const r = await provider.initiateProviderCurve({
                endpoint: spec,
                term: oracle_1.Responders[spec].curve
            });
            console.log(r);
            console.log("Successfully initialized endpoint", spec);
        }
    }
    console.log("Oracle exists. Listening for queries");
    provider.listenQueries({}, (err, event) => {
        if (err) {
            throw err;
        }
        handleQuery(provider, event, web3);
    });
}
exports.initialize = initialize;
/**
 * Loads a ZapProvider from a given Web3 instance
 * @param web3 - WebSocket Web3 instance to load from
 * @returns ZapProvider instantiated
 */
async function initProvider(web3) {
    // loads the first account for this web3 provider
    const accounts = await web3.eth.getAccounts();
    if (accounts.length == 0)
        throw ('Unable to find an account in the current web3 provider');
    const owner = accounts[0];
    console.log("Loaded account:", owner);
    // TODO: Add Zap balance
    console.log("Wallet contains:", await web3.eth.getBalance(owner) / 1e18, "ETH");
    return new provider_1.ZapProvider(owner, {
        artifactsDir: path_1.join(__dirname, '../', 'node_modules/@zapjs/artifacts/contracts/'),
        networkId: (await web3.eth.net.getId()).toString(),
        networkProvider: web3.currentProvider,
    });
}
exports.initProvider = initProvider;
//==============================================================================================================
// Query Handler
//==============================================================================================================
/**
 * Handles a query
 * @param writer - HTTP Web3 instance to respond to query with
 * @param queryEvent - Web3 incoming query event
 * @returns ZapProvider instantiated
 */
async function handleQuery(provider, queryEvent, web3) {
    const results = queryEvent.returnValues;
    // Parse the event into a usable JS object
    const event = {
        queryId: results.id,
        query: results.query,
        endpoint: web3.utils.hexToUtf8(results.endpoint),
        subscriber: results.subscriber,
        endpointParams: results.endpointParams.map(web3.utils.hexToUtf8),
        onchainSub: results.onchainSubscriber
    };
    if (!(event.endpoint in oracle_1.Responders)) {
        console.log('Unable to find the responder for', event.endpoint);
        return;
    }
    console.log(`Received query to ${event.endpoint} from ${event.onchainSub ? 'contract' : 'offchain subscriber'} at address ${event.subscriber}`);
    console.log(`Query ID ${event.queryId.substring(0, 8)}...: "${event.query}". Parameters: ${event.endpointParams}`);
    // Call the responder callback
    const response = await oracle_1.Responders[event.endpoint].responder(web3, event);
    // Send the response
    provider.respond({
        queryId: event.queryId,
        responseParams: response,
        dynamic: true
    }).then((txid) => {
        console.log('Responsed to', event.subscriber, "in transaction", txid.transactionHash);
    });
}
exports.handleQuery = handleQuery;
//==============================================================================================================
// Additional Helper Functions
//==============================================================================================================
/**
 * Performs a GET request on an API url and eventually returns the JSON response
 *
 * @param url - HTTP/HTTPS url to query from
 * @param method - the HTTP(s) request type to send (defaults to GET)
 * @param headers - the HTTP(s) headers to send (defaults to none)
 * @param data - the JSON body of this request
 * @returns A Promise that eventually resolves into JSON data returned from the server
 */
function requestPromise(url, method = "GET", headers = -1, data = -1) {
    var trans = {
        method: method,
        url: url,
    };
    if (headers != -1)
        trans.headers = headers;
    if (data != -1) {
        trans.data = data;
        trans.json = true;
    }
    return new Promise((resolve, reject) => {
        request(trans, (err, response, data) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(data);
        });
    });
}
exports.requestPromise = requestPromise;
