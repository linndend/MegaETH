const { deployToken } = require("./src/deploy");
const { runGTE } = require("./src/GTE");
const { wrapETH } = require("./src/rubic");
const prompts = require("prompts");

async function main() {
  const response = await prompts({
    type: "select",
    name: "action",
    message: "Select the script you want to run:",
    choices: [
      { title: "Deploy Token", value: "deploy" },
      { title: "Run GTE", value: "GTE" },
      { title: "Rubic", value: "Rubic" },
      { title: "Running All", value: "all" }
    ]
  });

  if (response.action === "deploy" || response.action === "all") {
  try {
    await deployToken();
  } catch (err) {
    console.error("❌ Fail deploy token:", err);
  }
 }

  if (response.action === "GTE" || response.action === "all") {
  try {
    await runGTE();
  } catch (err) {
    console.error("❌ Fail running GTE:", err);
  }
 }
  if (response.action === "Rubic" || response.action === "all") {
  try {
    await wrapETH();
  } catch (err) {
    console.error("❌ Fail running Rubic:", err);
   }
  }
}
main();
