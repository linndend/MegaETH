const { ethers } = require("ethers");
const solc = require("solc");
const fs = require("fs");
require("dotenv").config();

function randomString(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function randomTokenName() {
  const adjectives = ["Mega", "Kriss", "PakTua", "OM", "Spheron", "Rohit"];
  const nouns = ["Token", "Coin", "Credit", "Cash", "Byte"];
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}`;
}

function randomSupply() {
  return Math.floor(Math.random() * 9000000) + 1000000;
}

function compileContract() {
  const source = fs.readFileSync("contracts/Token.sol", "utf8");

  const input = {
    language: "Solidity",
    sources: {
      "Token.sol": { content: source }
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"]
        }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const contract = output.contracts["Token.sol"]["Token"];

  return {
    abi: contract.abi,
    bytecode: contract.evm.bytecode.object
  };
}

async function deployToken() {
  try {
    const rpc = "https://carrot.megaeth.com/rpc";
    const PRIVATE_KEYS = fs.readFileSync('./wallets.txt', 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
    if (PRIVATE_KEYS.length === 0) throw new Error("No private keys found in wallets.txt");

    const { abi, bytecode } = compileContract();
    const provider = new ethers.JsonRpcProvider(rpc);
      for (let i = 0; i < PRIVATE_KEYS.length; i++) {
    const privateKey = PRIVATE_KEYS[i];
      console.log(`Deploying for wallet ${i + 1} with address: ${new ethers.Wallet(privateKey).address}`);
    const wallet = new ethers.Wallet(privateKey, provider);
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);

    const name   = randomTokenName();
    const symbol = randomString(3);
    const supply = randomSupply();
    const totalSupply = BigInt(supply) * 10n ** 18n;

    console.log(`- Deploying ${name} (${symbol}) with supply ${supply} to MegaETH...`);

    const contract = await factory.deploy(name, symbol, totalSupply, {
      gasLimit: 3_000_000n,
    });

    console.log("⏳ Waiting for deployment confirmation...");
    await contract.waitForDeployment();

    console.log(`✅ Deployed at: ${contract.target}`);
    console.log(`~ Explorer: https://www.megaexplorer.xyz/address/${contract.target}`);

    const token = new ethers.Contract(contract.target, abi, wallet);
    const randomAddresses = Array.from({ length: 10 }, () => ethers.Wallet.createRandom().address);
    const sendAmount = ethers.parseUnits("1000", 18);

    console.log("✅ Sending 1000 tokens each to 10 random addresses...");

    for (const address of randomAddresses) {
      const tx = await token.transfer(address, sendAmount, {
        gasLimit: 100_000n,
      });
      await tx.wait();
      console.log(`✅ Sent 1000 ${symbol} to ${address}`);
      await new Promise(resolve => setTimeout(resolve, 10000));
     }
    }
  } catch (error) {
    console.error("❌ Error saat deploy token:", err);
  }
}

module.exports = { deployToken };
