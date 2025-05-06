const Web3 = require('web3');
const fs = require('fs');
const web3 = new Web3('https://carrot.megaeth.com/rpc');

async function runGTE() {

// Configuration
const RETRY_CONFIG = {
    maxRetries: 3,
    initialDelay: 30000,
    backoffFactor: 2
};

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CYCLE_INTERVAL = 24 * 60 * 60 * 1000;
const GTE_ROUTER = '0xa6b579684e943f7d00d616a48cf99b5147fc57a5';
const WETH_ADDRESS = '0x776401b9BC8aAe31A685731B7147D4445fD9FB19';
const CHAIN_ID = 6342;

const TokenListGTE = [
    '0x9629684df53db9e4484697d0a50c442b2bfa80a8',
	'0x10a6be7d23989d00d528e68cf8051d095f741145',
	'0xe49e35b7165cc171587df3247233f4302ca319a1',
	'0xfaf334e157175ff676911adcf0964d7f54f2c424',
	'0x176735870dc6c22b4ebfbf519de2ce758de78d94',
	'0xeb867d9460f0114c0c17e074480eb6210407b84d',
];

const TokenTestTeko = [
    {
        address: '0x176735870dc6c22b4ebfbf519de2ce758de78d94',
        amount: '1',
        decimals: 18,
        name: 'tkETH'
    },
    {
        address: '0xfaf334e157175ff676911adcf0964d7f54f2c424',
        amount: '2000',
        decimals: 6,
        name: 'tkUSDC'
    },
    {
        address: '0xe9b6e75c243b6100ffcb1c06e8f78f96feea727f',
        amount: '1000',
        decimals: 18,
        name: 'cUSD'
    },
    {
        address: '0xf82ff0799448630eb56ce747db840a2e02cde4d8',
        amount: '0.02',
        decimals: 8,
        name: 'tkWBTC'
    }
];

const erc20ABI = [
    {
        "constant": true,
        "inputs": [
            {"name": "_owner", "type": "address"},
            {"name": "_spender", "type": "address"}
        ],
        "name": "allowance",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {"name": "_spender", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "approve",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function"
    }
];

// Simplified Print Functions
function printTitle(title) {
    console.log(`\n>> ${title.toUpperCase()}`);
}

function printStep(emoji, message) {
    console.log(`${emoji}  ${message}`);
}

function printSuccess(message) {
    console.log(`✅  ${message}`);
}

function printError(message) {
    console.log(`❌  ${message}`);
}

// Utility Functions
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function randomDelay(min = 60, max = 180) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    printStep('⏳', `Pausing for ${delay}s`);
    return new Promise(resolve => setTimeout(resolve, delay * 1000));
}

async function retryOperation(operation, operationName) {
    let attempt = 1;
    let delay = RETRY_CONFIG.initialDelay;
    
    while (attempt <= RETRY_CONFIG.maxRetries) {
        try {
            return { success: true, data: await operation() };
        } catch (error) {
            // Handle skip requests immediately
            if (error.message.startsWith('SKIP:')) {
                printStep('⏭️', error.message);
                return { success: false, error };
            }
            
            printError(`${operationName} failed (attempt ${attempt}/${RETRY_CONFIG.maxRetries}): ${error.message}`);
            
            if (attempt === RETRY_CONFIG.maxRetries) {
                printError(`Max retries reached for ${operationName}`);
                return { success: false, error };
            }

            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= RETRY_CONFIG.backoffFactor;
            attempt++;
        }
    }
    return { success: false };
}

// Core Operations
async function SwapGTE(privateKey) {
    return retryOperation(async () => {
        printTitle('Initiating GTE Swaps');

        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        const walletAddress = account.address;

        const validTokens = TokenTestTeko.filter(testToken =>
            TokenListGTE.some(gteAddress => gteAddress.toLowerCase() === testToken.address.toLowerCase())
        );

        if (validTokens.length === 0) {
            throw new Error('No overlapping tokens found between TokenListGTE and TokenTestTeko');
        }

        for (const selectedToken of validTokens) {
            const tokenAddress = selectedToken.address;
            const tokenName = selectedToken.name;

            const value = web3.utils.toWei(
                (Math.random() * (0.00001 - 0.0000001) + 0.0000001).toFixed(6),
                'ether'
            );

            const deadline = Math.floor(Date.now() / 1000) + 60; // swap cepat

            const transactionData = web3.eth.abi.encodeFunctionCall({
                name: 'swapExactETHForTokens',
                type: 'function',
                inputs: [
                    { type: 'uint256', name: 'amountOutMin' },
                    { type: 'address[]', name: 'path' },
                    { type: 'address', name: 'to' },
                    { type: 'uint256', name: 'deadline' }
                ]
            }, ['0', [WETH_ADDRESS, tokenAddress], walletAddress, deadline.toString()]);

            const txParams = {
                from: walletAddress,
                to: GTE_ROUTER,
                value: value,
                data: transactionData,
                chainId: CHAIN_ID,
                nonce: await web3.eth.getTransactionCount(walletAddress, 'pending'),
                gasPrice: await web3.eth.getGasPrice()
            };

            txParams.gas = await web3.eth.estimateGas(txParams);

            printStep('💸', `Swapping ${web3.utils.fromWei(value)} ETH → ${tokenName}`);

            const signedTx = await web3.eth.accounts.signTransaction(txParams, privateKey);
            const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

            printSuccess(`Swap to ${tokenName} completed: ${receipt.transactionHash}`);
            await randomDelay(3, 6);
        }

        return true;
    }, 'GTE Multi-Token Swap');
}

async function mintTekoTest(privateKey) {
    printTitle('Minting Test Tokens');
    
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const walletAddress = account.address;
    let successCount = 0;
    let failCount = 0;
	
	const shuffledTokens = shuffleArray([...TokenTestTeko]);

    for (const token of shuffledTokens) {
        const result = await retryOperation(async () => {
            printStep('🛠️', `Attempting ${token.name} mint`);
            
            const amountInUnits = web3.utils.toBN(
                (Number(token.amount) * 10 ** token.decimals).toLocaleString('fullwide', { useGrouping: false })
            );
            
            const transactionData = web3.eth.abi.encodeFunctionCall({
                name: 'mint',
                type: 'function',
                inputs: [
                    { type: 'address', name: 'to' },
                    { type: 'uint256', name: 'amount' }
                ]
            }, [walletAddress, amountInUnits.toString()]);

            const txParams = {
                from: walletAddress,
                to: token.address,
                data: transactionData,
                chainId: CHAIN_ID,
                nonce: await web3.eth.getTransactionCount(walletAddress, 'pending'),
                gasPrice: await web3.eth.getGasPrice()
            };

            txParams.gas = await web3.eth.estimateGas(txParams);
            
            const signedTx = await web3.eth.accounts.signTransaction(txParams, privateKey);
            const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
            return receipt;
        }, `${token.name} Mint`);

        if (result.success) {
            printSuccess(`${token.name} minted (TX: ${result.data.transactionHash})`);
            successCount++;
        } else {
            failCount++;
        }
        
        await randomDelay(10, 30);
    }

    printTitle('Minting Summary');
    console.log(`✅ Success: ${successCount} tokens`);
    console.log(`❌ Failed: ${failCount} tokens`);
    
    return successCount > 0;
}

async function depositTeko(privateKey) {
    return retryOperation(async () => {
        printTitle('Initiating Deposit');
        
        const TEKO_ROUTER = '0x13c051431753fce53eaec02af64a38a273e198d0';
        const tkUSDC_ADDRESS = '0xfaf334e157175ff676911adcf0964d7f54f2c424';
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        const walletAddress = account.address;
        const tkUSDC = new web3.eth.Contract(erc20ABI, tkUSDC_ADDRESS);
        const maxApproval = web3.utils.toBN(2).pow(web3.utils.toBN(256)).subn(1);

        // Check balance first
        const balance = await tkUSDC.methods.balanceOf(walletAddress).call();
        if (web3.utils.toBN(balance).isZero()) {
            throw new Error('SKIP: No tkUSDC balance');
        }

        // Proceed with approval check
        const allowance = await tkUSDC.methods.allowance(walletAddress, TEKO_ROUTER).call();
        if (web3.utils.toBN(allowance).lt(maxApproval)) {
            printStep('🔒', 'Approving tokens');
            const approveTx = tkUSDC.methods.approve(TEKO_ROUTER, maxApproval);
            
            const txParams = {
                from: walletAddress,
                to: tkUSDC_ADDRESS,
                data: approveTx.encodeABI(),
                chainId: CHAIN_ID,
                nonce: await web3.eth.getTransactionCount(walletAddress, 'pending'),
                gasPrice: await web3.eth.getGasPrice()
            };

            txParams.gas = await approveTx.estimateGas({ from: walletAddress });
            const signedTx = await web3.eth.accounts.signTransaction(txParams, privateKey);
            await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        }

        // Calculate deposit amount (3% of balance)
        const depositAmount = web3.utils.toBN(balance).muln(3).divn(100);
        
        const transactionData = web3.eth.abi.encodeFunctionCall({
            name: 'deposit',
            type: 'function',
            inputs: [
                { type: 'uint256', name: 'id' },
                { type: 'uint256', name: 'amount' },
                { type: 'address', name: 'to' }
            ]
        }, [FIXED_ID, depositAmount.toString(), walletAddress]);

        const txParams = {
            from: walletAddress,
            to: TEKO_ROUTER,
            data: transactionData,
            chainId: CHAIN_ID,
            nonce: await web3.eth.getTransactionCount(walletAddress, 'pending'),
            gasPrice: await web3.eth.getGasPrice()
        };

        txParams.gas = await web3.eth.estimateGas(txParams);
        
        const signedTx = await web3.eth.accounts.signTransaction(txParams, privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        
        printSuccess(`Deposit completed: ${receipt.transactionHash}`);
        await randomDelay();
        return receipt;
    }, 'Teko Deposit');
}

async function mintCapUSD(privateKey) {
    return retryOperation(async () => {
        printTitle('Minting cUSD');
        
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        const walletAddress = account.address;
        const cUSD = TokenTestTeko.find(t => t.name === 'cUSD');
        
        const amountInUnits = web3.utils.toBN(cUSD.amount)
            .mul(web3.utils.toBN(10).pow(web3.utils.toBN(cUSD.decimals)));

        const transactionData = web3.eth.abi.encodeFunctionCall({
            name: 'mint',
            type: 'function',
            inputs: [
                { type: 'address', name: 'to' },
                { type: 'uint256', name: 'amount' }
            ]
        }, [walletAddress, amountInUnits.toString()]);

        const txParams = {
            from: walletAddress,
            to: cUSD.address,
            data: transactionData,
            chainId: CHAIN_ID,
            nonce: await web3.eth.getTransactionCount(walletAddress, 'pending'),
            gasPrice: await web3.eth.getGasPrice()
        };

        txParams.gas = await web3.eth.estimateGas(txParams);
        
        const signedTx = await web3.eth.accounts.signTransaction(txParams, privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        
        printSuccess(`cUSD minted: ${receipt.transactionHash}`);
        await randomDelay();
        return receipt;
    }, 'cUSD Mint');
}

// Wallet Processing
async function processWallet(privateKey) {
    const operations = shuffleArray([
        { name: 'GTE Swap', fn: SwapGTE },
        { name: 'Deposit', fn: depositTeko },
		{ name: 'Mint Teko Token', fn: mintTekoTest },
        { name: 'cUSD Mint', fn: mintCapUSD }
    ]);

    printTitle('Execution Order');
    operations.forEach((op, i) => printStep(`${i + 1}.`, op.name));

    for (const op of operations) {
        const result = await retryOperation(() => op.fn(privateKey), op.name);
        if (!result.success) printStep('⏭️', `Skipped ${op.name}`);
    }
}

async function processWallets() {
    try {
        const privateKey = process.env.PRIVATE_KEY;

        if (!web3.utils.isHexStrict(privateKey)) {
            throw new Error('Invalid private key');
        }

        printTitle(`Processing Wallet`);
        await processWallet(privateKey);
    } catch (error) {
        printError(`Fatal error: ${error.message}`);
    }
}


// Main Execution
async function main() {
    while (true) {
        
        await processWallets();
        
        printStep('⏳', `Next cycle in ${CYCLE_INTERVAL/(1000*60*60)} hours`);
        await new Promise(resolve => setTimeout(resolve, CYCLE_INTERVAL));
    }
}

// Start
main().catch(error => {
    printError(`Fatal error: ${error}`);
    process.exit(1);
 });
}
module.exports = { runGTE };
