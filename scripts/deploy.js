const { ethers } = require("hardhat");

async function main() {

    console.log("Memulai deployment...");

    // Mengambil smart contract
    const RoyaltyHakCipta = await ethers.getContractFactory(
        "RoyaltyHakCipta"
    );

    // Deploy smart contract
    const royalty = await RoyaltyHakCipta.deploy();

    // Menunggu deployment selesai
    await royalty.waitForDeployment();

    // Menampilkan alamat contract
    console.log("RoyaltyHakCipta berhasil di-deploy!");

    console.log(
        "Contract Address:",
        await royalty.getAddress()
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
