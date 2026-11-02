
// Menyimpan koneksi wallet dan smart contract
let provider;
let signer;
let royaltyContract;

// Mengambil elemen tombol dan status
const connectWalletButton = document.getElementById("connectWallet");
const statusBlockchain = document.getElementById("statusBlockchain");

// Fungsi menghubungkan MetaMask
async function connectWallet() {
    try {
        // Memeriksa apakah MetaMask tersedia
        if (!window.ethereum) {
            alert("MetaMask belum terpasang!");
            return;
        }

        // Meminta pengguna memilih akun
        await window.ethereum.request({
            method: "eth_requestAccounts"
        });

        // Membuat provider Ethers.js
        provider = new ethers.BrowserProvider(window.ethereum);

        // Mengambil akun yang sedang aktif
        signer = await provider.getSigner();

        // Menghubungkan smart contract
        royaltyContract = new ethers.Contract(
            contractAddress,
            contractABI,
            signer
        );

        // Mengambil alamat wallet
        const walletAddress = await signer.getAddress();

        // Mengubah tampilan tombol
        connectWalletButton.innerText =
            walletAddress.substring(0, 6) + "..." +
            walletAddress.substring(walletAddress.length - 4);

        statusBlockchain.innerText = "Terhubung";

        alert("Wallet berhasil dihubungkan!");

        console.log("Wallet:", walletAddress);

    } catch (error) {
        console.error("Gagal menghubungkan wallet:", error);
        alert("Gagal menghubungkan wallet!");
    }
}

// Menjalankan fungsi saat tombol diklik
connectWalletButton.addEventListener("click", connectWallet);


// Mengambil form registrasi lagu
const formRegistrasi = document.getElementById("formRegistrasi");

// Menjalankan transaksi saat form dikirim
formRegistrasi.addEventListener("submit", async function(event) {
    event.preventDefault();

    try {
        // Memastikan wallet sudah terhubung
        if (!royaltyContract || !signer) {
            alert("Hubungkan wallet terlebih dahulu!");
            return;
        }

        // Mengambil data dari form
        const songId = document.getElementById("songId").value;
        const judulLagu = document.getElementById("judulLagu").value;
        const namaPencipta = document.getElementById("namaPencipta").value;
        const alamatPencipta = document.getElementById("alamatPencipta").value;

        // Memeriksa validitas alamat wallet
        if (!ethers.isAddress(alamatPencipta)) {
            alert("Alamat wallet pencipta tidak valid!");
            return;
        }

        // Memastikan jaringan yang digunakan adalah Hardhat
        const network = await provider.getNetwork();

        if (network.chainId !== 31337n) {
            alert("Silakan gunakan jaringan Hardhat Local!");
            return;
        }

        // Mengirim transaksi registrasi ke blockchain
        console.log("Mengirim transaksi registrasi lagu...");

        const tx = await royaltyContract.registerTrack(
            songId,
            judulLagu,
            namaPencipta,
            alamatPencipta
        );

        alert("Transaksi dikirim! Silakan tunggu konfirmasi.");

        // Menunggu transaksi selesai
        const receipt = await tx.wait();

        // Mencari token ID dari event Transfer NFT
        let tokenId = null;

        for (const log of receipt.logs) {
            if (log.address.toLowerCase() !== contractAddress.toLowerCase()) {
                continue;
            }

            try {
                const parsed = royaltyContract.interface.parseLog(log);

                if (
                    parsed &&
                    parsed.name === "Transfer" &&
                    parsed.args.from === ethers.ZeroAddress
                ) {
                    tokenId = parsed.args.tokenId.toString();
                    break;
                }
            } catch (error) {
                // Mengabaikan log yang bukan event dalam ABI
            }
        }

        console.log("Transaksi berhasil:", receipt.hash);

        if (tokenId !== null) {
            alert("Lagu berhasil didaftarkan! Token ID: " + tokenId);

            document.getElementById("totalLagu").innerText = tokenId;
        } else {
            alert("Transaksi berhasil, tetapi Token ID belum terbaca.");
        }

        // Mengosongkan form
        formRegistrasi.reset();

    } catch (error) {
        console.error("Registrasi gagal:", error);

        alert(
            "Registrasi gagal: " +
            (error.shortMessage || error.reason || error.message)
        );
    }
});
