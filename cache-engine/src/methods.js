const db = require("./queries");
const {WsProvider, ApiPromise} = require("@polkadot/api");
const types = require("../assets/types.json");
const rpc = require("../assets/rpc.json");
const { hexToString, hexToNumber} = require('@polkadot/util');

require('dotenv').config()

async function initApi() {
    // Initialise the provider to connect to the local node
    const provider = new WsProvider(process.env.RPC_PROVIDER);

    // Create the API and wait until ready
    const api = await ApiPromise.create({
        provider: provider,
        types: types,
        rpc: rpc
    });
    await api.isReady;

    return api
}

async function processBlock(api, block_number, analyze_only = false) {
    const block_hash = await api.rpc.chain.getBlockHash(block_number);

    console.log(`Chain is at block: #${block_number}`);
    console.log('Block Hash: ' + block_hash.toHex());

    let [signed_block, block_events] = await Promise.all([
        api.rpc.chain.getBlock(block_hash),
        api.query.system.events.at(block_hash)
    ]);

    let current_time

    // parse block
    signed_block.block.extrinsics.map((ex, index) => {
        const method = ex.method.method.toString()
        const section = ex.method.section.toString()
        const isSigned = ex.isSigned
        const txHash = ex.hash.toHex()
        let recipient, amount, extrinsic_success = false, new_asset_id = undefined

        let signedByAddress = null
        if (isSigned) {
            signedByAddress = ex.signer.toString()
        }

        if (section === 'timestamp' && method === 'set') {
            ex.args.map((arg, d) => {
                current_time = arg.toString();
            });
        }

        // console.log(`${section}:${method}`);

        // (await api.rpc.eth.getTransactionReceipt(txHash)).toJSON()

        // Check if extrinsic was a success first
        block_events
            .filter(({phase}) =>
                phase.isApplyExtrinsic &&
                phase.asApplyExtrinsic.eq(index)
            )
            .map(({event}) => {
                extrinsic_success = !!api.events.system.ExtrinsicSuccess.is(event);

				// extract asset_id and assign it to a project
				if(section === 'vcu' && method === 'mint' && event.section === 'assets' && event.method === 'ForceCreated') {
					event.data.map((arg, d) => {
						if (d === 0) {
							new_asset_id = arg.toString()
						}
					});
				}
            });

        // Start processing extrinsic and it's data
        block_events
            .filter(({phase}) =>
                phase.isApplyExtrinsic &&
                phase.asApplyExtrinsic.eq(index)
            )
            .map(({event}) => {
                if (extrinsic_success) {
					let event_section = event.section;
					let event_method = event.method;
					// console.log('Transaction Hash: ' + txHash);
					// console.log(event.section + ': ' + event.method)

                    if (!analyze_only) {
                        if (event_section === 'vcu') {
                            if(event_method === 'ProjectCreated') {
                                let project_id, details

								event.data.map((arg, d) => {
									if (d === 0) {
										project_id = arg.toString()
									} else if (d === 1) {
										details = arg.toJSON();
									}
								});

								details['batches'].map((batch, d) => {
									// console.log(batch)
									// TODO: Save to db
								})

								// console.log(hexToString(details['registryDetails']['name']))
								db.storeVcuProject({
									block_number: block_number,
									hash: txHash,
									project_id: project_id,
									originator: signedByAddress,
									name: hexToString(details['name']),
									description: hexToString(details['description']),
									registry_name: hexToString(details['registryDetails']['name']),
									registry_id: hexToString(details['registryDetails']['id']),
									registry_summary: hexToString(details['registryDetails']['summary']),
									signer: signedByAddress,

									total_supply: details['totalSupply'],
									minted: details['minted'],
									retired: details['retired'],

									unit_price: details['unitPrice'],

									created_at: current_time
								})
                            }

							if(event_method === 'ProjectApproved') {
								let project_id, is_approved;

								ex.args.map((arg, d) => {
									// console.log(arg.toHuman())
									if (d === 0) {
										project_id = arg.toString()
									} else if (d === 1) {
										is_approved = arg.toString() === 'true';
									}
								});

								db.approveVcuProject({
									project_id: project_id,
									is_approved: is_approved,
									updated_at: current_time
								});
							}

							if(event_method === 'VCUMinted') {
								// console.log(api.events.vcu.VCUMinted.is(event))
								let project_id, account, amount;

								event.data.map((arg, d) => {
									if (d === 0) {
										project_id = arg.toString()
									} else if (d === 1) {
										account = arg.toString();
									} else if (d === 2) {
										amount = arg.toString();
									}
								});

								if(new_asset_id) {
									// connect asset id with vcu project
									db.connectAssetAndProject({
										project_id: project_id,
										asset_id: new_asset_id,
										updated_at: current_time
									});
								}
							}
                        }
                        if (section === 'balances' && (method === 'transferKeepAlive' || method === 'transfer')) {
                            if(event_section === 'balances' && event_method === 'Transfer') {
                                // TODO: check why api.rpc.eth is empty
                                // console.log(api.rpc.eth.getTransactionReceipt(txHash));

                                ex.args.map((arg, d) => {
                                    if (d === 0) {
                                        recipient = arg.toHuman()['Id'];
                                    } else if (d === 1) {
                                        amount = arg.toString();
                                    }
                                });

                                db.storeTransaction({
                                    block_number: block_number,
                                    hash: txHash,
                                    sender: signedByAddress,
                                    recipient: recipient,
                                    amount: amount,
                                    gas_fees: 0, // TODO: Calculate gas fee
                                    date: current_time
                                })
                            }
                        }

                        if (section === 'sudo' && method === 'sudo') {
                            // console.log(event.toHuman());
                            let sudo_section = event.section;
                            let sudo_method = event.method;
                            let sudo_data = event.data;
                            let sudo_data_json;

                            if (sudo_section === 'vcu') {
                                if (sudo_method === 'AuthorizedAccountAdded') {
                                    ex.args.map((arg, d) => {
                                        sudo_data = arg.toHuman();
                                    });

                                    db.storeVcuAuthorizedAccount({
                                        block_number: block_number,
                                        hash: txHash,
                                        account: sudo_data.args['account_id'],
                                        description: sudo_data.args['description'],
                                        signer: signedByAddress,
                                        date: current_time
                                    });
                                }

                                if (sudo_method === 'AuthorizedAccountsAGVDestroyed') {
                                    ex.args.map((arg, d) => {
                                        sudo_data = arg.toHuman();
                                    });

                                    db.destroyVcuAuthorizedAccount({
                                        block_number: block_number,
                                        hash: txHash,
                                        account: sudo_data.args['account_id'],
                                        signer: signedByAddress,
                                        date: current_time
                                    });
                                }

                                // content:
                                // {"description":"Description", "proofOwnership":"ipfslink", "numberOfShares":"1000"}
                                if (sudo_method === 'AssetsGeneratingVCUCreated') {
                                    ex.args.map((arg, d) => {
                                        sudo_data = arg.toHuman();
                                        sudo_data_json = arg.toJSON();
                                    });

                                    db.storeVcuAssetsGenerating({
                                        block_number: block_number,
                                        hash: txHash,
                                        agv_account: sudo_data_json.args['agv_account_id'],
                                        agv_id: sudo_data_json.args['agv_id'],
                                        content: sudo_data.args['content'],
                                        signer: signedByAddress,
                                        date: current_time
                                    });
                                }

                                if (sudo_method === 'AssetGeneratingVCUDestroyed') {
                                    ex.args.map((arg, d) => {
                                        sudo_data = arg.toHuman();
                                        sudo_data_json = arg.toJSON();
                                    });

                                    db.destroyVcuAssetsGenerating({
                                        block_number: block_number,
                                        hash: txHash,
                                        agv_account: sudo_data_json.args['agv_account_id'],
                                        agv_id: sudo_data_json.args['agv_id'],
                                        signer: signedByAddress,
                                        date: current_time
                                    });
                                }

                                if (sudo_method === 'AssetsGeneratingVCUScheduleAdded') {
                                    ex.args.map((arg, d) => {
                                        sudo_data = arg.toHuman();
                                        sudo_data_json = arg.toJSON();
                                    });

                                    db.storeVcuAssetsGeneratingSchedule({
                                        block_number: block_number,
                                        hash: txHash,
                                        agv_account: sudo_data_json.args['agv_account_id'],
                                        agv_id: sudo_data_json.args['agv_id'],
                                        period_days: sudo_data_json.args['period_days'],
                                        amount_vcu: sudo_data.args['amount_vcu'],
                                        token_id: sudo_data_json.args['token_id'],
                                        signer: signedByAddress,
                                        date: current_time
                                    });
                                }

                                if (sudo_method === 'AssetsGeneratingVCUScheduleDestroyed') {
                                    ex.args.map((arg, d) => {
                                        sudo_data = arg.toHuman();
                                        sudo_data_json = arg.toJSON();
                                    });

                                    db.destroyVcuAssetsGeneratingSchedule({
                                        block_number: block_number,
                                        hash: txHash,
                                        agv_account: sudo_data_json.args['agv_account_id'],
                                        agv_id: sudo_data_json.args['agv_id'],
                                        signer: signedByAddress,
                                        date: current_time
                                    });
                                }

                                if (sudo_method === 'OraclesAccountMintingVCUAdded') {
                                    ex.args.map((arg, d) => {
                                        sudo_data = arg.toHuman();
                                        sudo_data_json = arg.toJSON();
                                    });

                                    db.storeVcuOracleAccountMinting({
                                        block_number: block_number,
                                        hash: txHash,
                                        agv_account: sudo_data_json.args['agv_account_id'],
                                        agv_id: sudo_data_json.args['agv_id'],
                                        oracle_account: sudo_data_json.args['oracle_account_id'],
                                        token_id: sudo_data_json.args['token_id'],
                                        signer: signedByAddress,
                                        date: current_time
                                    });
                                }

                                if (sudo_method === 'OraclesAccountMintingVCUDestroyed') {
                                    ex.args.map((arg, d) => {
                                        sudo_data = arg.toHuman();
                                        sudo_data_json = arg.toJSON();
                                    });

                                    db.destroyVcuOracleAccountMinting({
                                        block_number: block_number,
                                        hash: txHash,
                                        agv_account: sudo_data_json.args['agv_account_id'],
                                        agv_id: sudo_data_json.args['agv_id'],
                                        signer: signedByAddress,
                                        date: current_time
                                    });
                                }

                                // createBundleAgv Example
                                // {"description":"test","agvs":[{"accountid","5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty","id":1}],assetId:100005}

                                if (sudo_method === 'SettingsCreated') {
                                    ex.args.map((arg, d) => {
                                        sudo_data = arg.toHuman();
                                    });

                                    db.storeVcuProxySettings({
                                        block_number: block_number,
                                        hash: txHash,
                                        accounts: sudo_data.args['accounts'],
                                        signer: signedByAddress,
                                        date: current_time
                                    });
                                }
                            }
                        }
                    } else {
                        // console.log(`${section}:${method}`);

                        db.storeAnalyzeData({
                            block_number: block_number,
                            block_hash: block_hash.toHex(),
                            tx_hash: txHash,
                            section: section,
                            method: method
                        })
                    }
                }
            })
    });

    // store block in db
    db.storeBlock({
        number: block_number,
        hash: block_hash.toHex(),
        date: current_time,
    })

    console.log('-----------------------------------------------------');
}

const getBlock = async(request, response) => {
    let block_number = request.query.block_number

    const api = await initApi()

    const block_hash = await api.rpc.chain.getBlockHash(block_number)

    let [signed_block, block_events] = await Promise.all([
        api.rpc.chain.getBlock(block_hash),
        api.query.system.events.at(block_hash)
    ]);

    response.json({
        signed_block: signed_block.toHuman(),
        block_events: block_events.toHuman(),
    })
}

module.exports = {
    initApi,
    processBlock,
    getBlock
}
