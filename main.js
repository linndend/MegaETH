const { deployToken } = require("./src/deploy");
const { runGTE } = require("./src/GTE");
const prompts = require("prompts");

async function main() {
  const response = await prompts({
    type: "select",
    name: "action",
    message: "Pilih script yang ingin dijalankan:",
    choices: [
      { title: "Deploy Token", value: "deploy" },
      { title: "Jalankan GTE", value: "GTE" },
      { title: "Jalankan Semua", value: "all" }
    ]
  });

  if (response.action === "deploy" || response.action === "all") {
  try {
    await deployToken();
  } catch (err) {
    console.error("? Gagal deploy token:", err);
  }
 }

  if (response.action === "GTE" || response.action === "all") {
  try {
    await runGTE();
  } catch (err) {
    console.error("? Gagal jalankan GTE:", err);
  }
 }
}
main();
