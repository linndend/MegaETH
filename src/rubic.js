require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");

const PRIVATE_KEYS = fs.readFileSync('./wallets.txt', 'utf-8')
  .split('\n')
  .map(line => line.trim())
  .filter(Boolean);

  if (PRIVATE_KEYS.length === 0) throw new Error("No private keys found in wallets.txt");

const provider = new ethers.JsonRpcProvider('https://carrot.megaeth.com/rpc');
const CONTRACT_ADDRESS = "0x4eb2bd7bee16f38b1f4a0a5796fffd028b6040e9";
const GAS_LIMIT = 500_000;

const abi = [
  "function deposit() public payable",
  "function withdraw(uint256 wad) public"
];

async function wrapETH() {
  for (const key of PRIVATE_KEYS) {
    const wallet = new ethers.Wallet(key, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    const amount = ethers.parseEther("0.001"); 

    try {
      console.log(`\n=> [${wallet.address}] Wrap ${ethers.formatEther(amount)} ETH to WETH...`);
      const tx = await contract.deposit({
        value: amount,
        gasLimit: GAS_LIMIT
      });
      console.log(`⏳ Processing Tx: ${tx.hash}`);
      await tx.wait();
      console.log(`✅ Wrap success! Explorer: https://megaexplorer.xyz/tx/${tx.hash}`);
    } catch (err) {
      console.error(`❌ Wrap error [${wallet.address}]:`, err.message);
      continue;
    }

    console.log("⏳ Waiting 20 seconds before unwrap...");
    await new Promise(resolve => setTimeout(resolve, 20000)); 

    try {
      console.log(`⏭️ [${wallet.address}] Unwrap ${ethers.formatEther(amount)} WETH to ETH...`);
      const tx2 = await contract.withdraw(amount, { gasLimit: GAS_LIMIT });
      console.log(`⏳ Processing Tx: ${tx2.hash}`);
      await tx2.wait();
      console.log(`✅ Unwrap success! Explorer: https://megaexplorer.xyz/tx/${tx2.hash}`);
    } catch (err) {
      console.error(`❌ Unwrap error [${wallet.address}]:`, err.message);
    }
  }
}

module.exports = { wrapETH };
