const { MsgSend, MsgBroadcasterWithPk } = require('@injectivelabs/sdk-ts');
const { getNetworkInfo, Network } = require('@injectivelabs/networks')
const {
    TxClient,
    PrivateKey,
    TxGrpcClient,
    ChainRestAuthApi,
    createTransaction,
    InjectiveStargate,
    InjectiveDirectEthSecp256k1Wallet,
} = require('@injectivelabs/sdk-ts');
const { BigNumberInBase, DEFAULT_STD_FEE } = require('@injectivelabs/utils')
const { OfflineDirectSigner } = require("@cosmjs/proto-signing");
const { getStdFee } = require("@injectivelabs/utils");
const {StargateClient, SigningStargateClient} = require("@cosmjs/stargate")

require('dotenv').config();


// ------------------需要配置的参数------------------
// 助记词，从.env文件中获取
const mnemonic = process.env.MNEMONIC;

//  network配置 , 上面的是默认的, 根据实际修改
//   const network = getNetworkInfo(Network.Mainnet)
const network = {
    feeDenom: 'inj',
    chainId: 'injective-1',
    ethereumChainId: 1,
    env: 'mainnet',
    grpc: 'https://grpc.injective.network',
    rpc: 'https://tm.injective.network',
}

// gas配置，根据实际修改
const gasFee = {
    amount: [ { amount: '200000000000000', denom: 'inj' } ],
    gas: '400000'
  }

// 转账数量，根据实际修改
const amount = {
    amount: new BigNumberInBase(0.03).toWei().toFixed(),
    denom: 'inj',
}
//   接受地址和memo这里填项目方的地址和memo信息，根据实际的修改
const dstInjectiveAddress = 'inj19t6fllwyet0d8t6693kwmw37juaduh5gnncwd7'
const memo = 'ZGF0YToseyJwIjoiaW5qcmMtMjAiLCJvcCI6Im1pbnQiLCJ0aWNrIjoiSU5KUyIsImFtdCI6IjIwMDAifQ=='

const mintAmount = 1
// ------------------需要配置的参数------------------


/** MsgSend Example */
; (async () => {

    

    const privateKey = PrivateKey.fromMnemonic(mnemonic)
    const injectiveAddress = privateKey.toBech32()
    const publicKey = privateKey.toPublicKey().toBase64()
    const privateKeyHash = privateKey.wallet._signingKey().privateKey.slice(2)
    const wallet = (await InjectiveDirectEthSecp256k1Wallet.fromKey(
        Buffer.from(privateKeyHash, "hex")
    ));

    // 循环mint
    for (let i = 0; i < mintAmount; i++) {

    /** 获取账户信息 */
    const client = await InjectiveStargate.InjectiveSigningStargateClient.connectWithSigner(
        network.rpc,
        wallet
    );
    const accountDetails = await client.getAccount(injectiveAddress)
    /** 设置数量和地址 */
    const msg = MsgSend.fromJSON({
        amount,
        srcInjectiveAddress: injectiveAddress,
        dstInjectiveAddress: dstInjectiveAddress,
    })
    /** 准备交易 */
    const { signBytes, txRaw } = createTransaction({
        message: msg,
        memo: memo,
        fee: gasFee,
        pubKey: publicKey,
        sequence: parseInt(accountDetails.sequence, 10),
        accountNumber: parseInt(accountDetails.accountNumber, 10 ),
        chainId: network.chainId,
    })
    /** 签署交易 */
    const signature = await privateKey.sign(Buffer.from(signBytes))

    /** 附加签名 */
    txRaw.signatures = [signature]

    /** 计算交易的哈希值  */
    console.log(`Transaction Hash: ${TxClient.hash(txRaw)}`)

    const txService = new TxGrpcClient(network.grpc)

    /** 广播交易 */
    const txResponse = await txService.broadcast(txRaw)

    if (txResponse.code !== 0) {
        console.log(`Transaction failed: ${txResponse.rawLog}`)
    } else {
        console.log(
            `Broadcasted transaction hash: ${JSON.stringify(txResponse.txHash)}`,
        )
    }
}
})()
