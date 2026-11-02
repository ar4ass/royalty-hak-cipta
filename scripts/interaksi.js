
const { ethers } = require("hardhat");

async function main() {
    // Mengambil 5 akun simulasi dari Hardhat
    const [registrar, pencipta, artis, label, platform] =
        await ethers.getSigners();

    // Alamat smart contract yang sudah di-deploy
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

    // Menghubungkan script dengan smart contract
    const royalty = await ethers.getContractAt(
        "RoyaltyHakCipta",
        contractAddress
    );

    console.log("=== AKUN SIMULASI ===");
    console.log("Pendaftar:", registrar.address);
    console.log("Pencipta:", pencipta.address);
    console.log("Artis:", artis.address);
    console.log("Label:", label.address);
    console.log("Platform:", platform.address);

    // 1. Registrasi lagu
    console.log("\n1. REGISTRASI LAGU");

    let tx = await royalty.connect(registrar).registerTrack(
        "MUS-2026-001",
        "Lagu Pertamaku",
        "Ananda",
        pencipta.address
    );

    await tx.wait();

    console.log("Lagu berhasil didaftarkan!");
    console.log("Pemilik NFT:", await royalty.getOwner(1));

    // 2. Mengatur data artis, label, dan platform
    console.log("\n2. MENGATUR DATA PIHAK TERKAIT");

    await (await royalty.connect(registrar).setArtist(
        1, "Penyanyi Pertama", artis.address
    )).wait();

    await (await royalty.connect(registrar).setLabel(
        1, "Label Musik", label.address
    )).wait();

    await (await royalty.connect(registrar).setPlatform(
        1, "Platform Musik", platform.address
    )).wait();

    console.log("Data artis, label, dan platform berhasil diatur!");

    // 3. Mengaktifkan streaming
    console.log("\n3. AKTIVASI STREAMING");

    await (await royalty.connect(registrar).activateStreaming(1)).wait();

    console.log("Streaming berhasil diaktifkan!");

    // 4. Platform menambahkan dana royalti
    console.log("\n4. PENAMBAHAN ROYALTI");

    await (await royalty.connect(platform).addRoyalty(1, {
        value: ethers.parseEther("1")
    })).wait();

    console.log("Platform berhasil menambahkan 1 ETH!");

    const track = await royalty.getTrackInfo(1);

    console.log(
        "Saldo royalti:",
        ethers.formatEther(track[4]),
        "ETH"
    );

    // 5. Label mendistribusikan royalti
    console.log("\n5. DISTRIBUSI ROYALTI");

    await (await royalty.connect(label).distributeFunds(1)).wait();

    const distributed = await royalty.getDistributedRoyalty(1);

    console.log(
        "Bagian pencipta:",
        ethers.formatEther(distributed[0]),
        "ETH"
    );

    console.log(
        "Bagian artis:",
        ethers.formatEther(distributed[1]),
        "ETH"
    );

    console.log(
        "Bagian label:",
        ethers.formatEther(distributed[2]),
        "ETH"
    );

    // 6. Memeriksa hasil akhir
    console.log("\n6. VERIFIKASI AKHIR");

    const finalTrack = await royalty.getTrackInfo(1);

    console.log(
        "Saldo royalti tersisa:",
        ethers.formatEther(finalTrack[4]),
        "ETH"
    );

    console.log("Status akhir:", finalTrack[5].toString());

    // 7. Menampilkan riwayat aktivitas
    console.log("\n7. RIWAYAT AKTIVITAS");

    const history = await royalty.getHistory(1);

    for (let i = 0; i < history.length; i++) {
        console.log(`${i + 1}. ${history[i].aktivitas}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
