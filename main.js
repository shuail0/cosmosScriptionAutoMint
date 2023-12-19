const { MsgSend, MsgBroadcasterWithPk } = require('@injectivelabs/sdk-ts');
require('dotenv').config();
const { getNetworkInfo, Network } = require('@injectivelabs/networks')
const {
    TxClient,
    PrivateKey,
    TxGrpcClient,
    ChainRestAuthApi,
    createTransaction,
} = require('@injectivelabs/sdk-ts');
const { BigNumberInBase, DEFAULT_STD_FEE } = require('@injectivelabs/utils')


const mnemonic = process.env.MNEMONIC;


//  network配置 , 上面的是默认的
//   const network = getNetworkInfo(Network.Mainnet)
const network = {
    feeDenom: 'inj',
    chainId: 'injective-1',
    ethereumChainId: 1,
    env: 'mainnet',
    indexer: 'https://api.injective.network',
    grpc: 'https://grpc.injective.network',
    rpc: 'https://tm.injective.network',
    rest: 'https://sentry.lcd.injective.network:443',
    chronos: 'https://api.injective.network',
    explorer: 'https://api.injective.network'
  }


// 转账配置
const amount = {
amount: new BigNumberInBase(0.03).toWei().toFixed(),
denom: 'inj',
}
//   接受地址  这里填项目方的地址
const dstInjectiveAddress = 'inj15jy9vzmyy63ql9y6dvned2kdat2994x5f4ldu4'
const memo = 'ZGF0YToseyJwIjoiaW5qcmMtMjAiLCJvcCI6ImRlcGxveSIsInRpY2siOiJJTkpTIiwibWF4IjoiMTAwMDAwMDAwMCIsImxpbSI6IjIwMDAifQ=='
    

/** MsgSend Example */
;(async () => {

const privateKey = PrivateKey.fromMnemonic(mnemonic)
  const injectiveAddress = privateKey.toBech32()
  const publicKey = privateKey.toPublicKey().toBase64()

    // 获取账户信息
  const accountDetails = await new ChainRestAuthApi(network.rest).fetchAccount(
    injectiveAddress,
  )

  const msg = MsgSend.fromJSON({
    amount,
    srcInjectiveAddress: injectiveAddress,
    dstInjectiveAddress: dstInjectiveAddress,
  })
  /** Prepare the Transaction **/
  const { signBytes, txRaw } = createTransaction({
    message: msg,
    memo: memo,
    fee: DEFAULT_STD_FEE,
    pubKey: publicKey,
    sequence: parseInt(accountDetails.account.base_account.sequence, 10),
    accountNumber: parseInt(
      accountDetails.account.base_account.account_number,
      10,
    ),
    chainId: network.chainId,
  })

  /** Sign transaction */
  const signature = await privateKey.sign(Buffer.from(signBytes))

  /** Append Signatures */
  txRaw.signatures = [signature]

  /** Calculate hash of the transaction */
  console.log(`Transaction Hash: ${TxClient.hash(txRaw)}`)

  const txService = new TxGrpcClient(network.grpc)

  /** Simulate transaction */
  const simulationResponse = await txService.simulate(txRaw)
  console.log(
    `Transaction simulation response: ${JSON.stringify(
      simulationResponse.gasInfo,
    )}`,
  )

  /** Broadcast transaction */
  const txResponse = await txService.broadcast(txRaw)

  if (txResponse.code !== 0) {
    console.log(`Transaction failed: ${txResponse.rawLog}`)
  } else {
    console.log(
      `Broadcasted transaction hash: ${JSON.stringify(txResponse.txHash)}`,
    )
  }
})()
