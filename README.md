# 🚀 MegaETH Auto Bot
An automated bot for interacting with the MegaETH Protocol on the MegaETH testnet. This bot helps users participate in MegaETH by automating various interactions and maintaining consistent wallet activity.

## 🔍 Features
- Automatically interacts with MegaETH Protocol (Swap on GTE and Deploy Token)
- Automatic reporting/logging of transactions
- 24-hour loop cycle for regular farming activities

## 🛠️ Prerequisites
- Node.js (v14 or higher)
- Wallets with ETH on MegaETH chain
- Private keys for your wallet(s)

## ⚙️ Installation

1. Clone the repository:
```bash
git clone https://github.com/linndend/MegaETH.git
cd MegaETH
```
2. Install dependencies:
```bash
npm install
```
3. Create a `wallets.txt` file in the root directory with your wallet private keys:
```
nano wallets.txt
```
format one per line :
```
0x
0x
```
## 🚀 Usage

Start the bot by running:
```bash
node main.js
```
