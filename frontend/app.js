let provider;
let signer;
let royaltyContract;
let walletAddress = null;
 
// Data lagu yang sudah dimuat dan lagu yang sedang dipilih
let tracks = [];
let selectedId = null;
 
const HARDHAT_CHAIN_ID = 31337n;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const MAX_TRACK_SCAN = 200;
 
// Urutan label mengikuti enum Status di smart contract.
// Sesuaikan jika enum RoyaltyHakCipta.Status kamu berbeda.
const STATUS_LABELS = [
    "Terdaftar",
    "Streaming aktif",
    "Royalti terkumpul",
    "Terdistribusi"
];
 
// ---------- Elemen halaman ----------
const $ = (id) => document.getElementById(id);
 
const connectWalletButton = $("connectWallet");
const walletLabel = $("walletLabel");
const statusBlockchain = $("statusBlockchain");
const formRegistrasi = $("formRegistrasi");
 
// ---------- Helper ----------
function esc(text) {
    const div = document.createElement("div");
    div.textContent = String(text ?? "");
    return div.innerHTML;
}
 
function shortAddr(addr) {
    return addr.substring(0, 6) + "..." + addr.substring(addr.length - 4);
}
 
function fmtEth(wei) {
    const value = ethers.formatEther(wei);
    const [whole, frac = ""] = value.split(".");
    const trimmed = frac.replace(/0+$/, "").substring(0, 6);
    return (trimmed ? whole + "." + trimmed : whole) + " ETH";
}
 
function fmtDate(seconds) {
    return new Date(Number(seconds) * 1000).toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}
 
function errMsg(error) {
    return error.shortMessage || error.reason || error.message || "Terjadi kesalahan.";
}
 
function toast(message, type = "info") {
    const el = document.createElement("div");
    el.className = "toast " + type;
    el.textContent = message;
    $("toasts").appendChild(el);
    setTimeout(() => el.remove(), 4500);
}
 
function statusInfo(status) {
    const index = Number(status);
    const label = STATUS_LABELS[index] || "Status " + index;
    const cls = index === 1 ? "is-active" : index >= 2 ? "is-done" : "";
    return { index, label, cls };
}
 
// Menjalankan transaksi dengan status tombol dan notifikasi
async function runTx(button, pendingText, successText, action) {
    if (!royaltyContract || !signer) {
        toast("Hubungkan wallet terlebih dahulu.", "error");
        return false;
    }
 
    const original = button ? button.textContent : "";
    if (button) {
        button.disabled = true;
        button.textContent = pendingText;
    }
 
    try {
        const tx = await action();
        toast("Transaksi dikirim. Menunggu konfirmasi.");
        const receipt = await tx.wait();
        console.log("Transaksi berhasil:", receipt.hash);
        toast(successText, "success");
        return receipt;
    } catch (error) {
        console.error(error);
        toast(errMsg(error), "error");
        return false;
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = original;
        }
    }
}
 
// Memastikan wallet terhubung dan jaringan benar
async function ensureReady() {
    if (!royaltyContract || !signer) {
        toast("Hubungkan wallet terlebih dahulu.", "error");
        return false;
    }
    const network = await provider.getNetwork();
    if (network.chainId !== HARDHAT_CHAIN_ID) {
        toast("Pindah ke jaringan Hardhat Local (chain 31337).", "error");
        return false;
    }
    return true;
}
 
// ============================================================
// Wallet
// ============================================================
 
// Fungsi menghubungkan MetaMask
async function connectWallet() {
    try {
        // Memeriksa apakah MetaMask tersedia
        if (!window.ethereum) {
            toast("MetaMask belum terpasang.", "error");
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
        walletAddress = await signer.getAddress();
 
        // Mengubah tampilan tombol dan status
        walletLabel.innerText = shortAddr(walletAddress);
        connectWalletButton.classList.add("is-connected");
 
        const network = await provider.getNetwork();
        $("networkName").innerText =
            network.chainId === HARDHAT_CHAIN_ID
                ? "Hardhat Local"
                : "Chain " + network.chainId.toString();
 
        statusBlockchain.innerText = "Terhubung";
        statusBlockchain.className = "is-on";
 
        console.log("Wallet:", walletAddress);
 
        if (network.chainId !== HARDHAT_CHAIN_ID) {
            toast("Jaringan belum sesuai. Gunakan Hardhat Local (chain 31337).", "error");
            return;
        }
 
        toast("Wallet terhubung.", "success");
        await loadTracks();
 
    } catch (error) {
        console.error("Gagal menghubungkan wallet:", error);
        toast("Gagal menghubungkan wallet. " + errMsg(error), "error");
    }
}
 
// Menjalankan fungsi saat tombol diklik
connectWalletButton.addEventListener("click", connectWallet);
 
// Muat ulang jika akun atau jaringan berubah
if (window.ethereum) {
    window.ethereum.on("accountsChanged", () => window.location.reload());
    window.ethereum.on("chainChanged", () => window.location.reload());
}
 
$("useMyWallet").addEventListener("click", () => {
    if (!walletAddress) {
        toast("Hubungkan wallet terlebih dahulu.", "error");
        return;
    }
    $("alamatPencipta").value = walletAddress;
});
 
// ============================================================
// Registrasi lagu
// ============================================================
 
// Menjalankan transaksi saat form dikirim
formRegistrasi.addEventListener("submit", async function (event) {
    event.preventDefault();
 
    try {
        // Memastikan wallet sudah terhubung
        if (!(await ensureReady())) return;
 
        // Mengambil data dari form
        const songId = $("songId").value.trim();
        const judulLagu = $("judulLagu").value.trim();
        const namaPencipta = $("namaPencipta").value.trim();
        const alamatPencipta = $("alamatPencipta").value.trim();
 
        if (!songId || !judulLagu || !namaPencipta || !alamatPencipta) {
            toast("Lengkapi semua kolom registrasi.", "error");
            return;
        }
 
        // Memeriksa validitas alamat wallet
        if (!ethers.isAddress(alamatPencipta)) {
            toast("Alamat wallet pencipta tidak valid.", "error");
            return;
        }
 
        const receipt = await runTx(
            $("btnRegistrasi"),
            "Mendaftarkan...",
            "Lagu berhasil didaftarkan.",
            () => royaltyContract.registerTrack(
                songId,
                judulLagu,
                namaPencipta,
                alamatPencipta
            )
        );
        if (!receipt) return;
 
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
 
        if (tokenId !== null) {
            toast("Token ID lagu: " + tokenId, "success");
        } else {
            toast("Transaksi berhasil, tetapi Token ID belum terbaca.");
        }
 
        // Mengosongkan form
        formRegistrasi.reset();
 
        // Memuat ulang daftar lagu dan membuka lagu baru
        await loadTracks(tokenId);
        if (tokenId !== null) {
            document.getElementById("royalti").scrollIntoView({ behavior: "smooth" });
        }
 
    } catch (error) {
        console.error("Registrasi gagal:", error);
        toast("Registrasi gagal: " + errMsg(error), "error");
    }
});
 
// ============================================================
// Memuat daftar lagu
// ============================================================
 
async function trackExists(id) {
    try {
        await royaltyContract.ownerOf(id);
        return true;
    } catch (error) {
        // CALL_EXCEPTION berarti token memang belum ada.
        // Error lain (misalnya node/RPC terputus) harus diteruskan,
        // supaya tidak keliru dianggap sebagai daftar lagu kosong.
        if (error.code === "CALL_EXCEPTION") {
            return false;
        }
        throw error;
    }
}
 
async function fetchTrack(id) {
    const [info, pencipta, artis, label] = await Promise.all([
        royaltyContract.getTrackInfo(id),
        royaltyContract.totalRoyaltyPencipta(id),
        royaltyContract.totalRoyaltyArtis(id),
        royaltyContract.totalRoyaltyLabel(id)
    ]);
 
    return {
        id: BigInt(id),
        trackId: info[0],
        songId: info[1],
        judul: info[2],
        royaltyPerPlay: info[3],
        saldo: info[4],
        status: info[5],
        timestamp: info[6],
        distPencipta: pencipta,
        distArtis: artis,
        distLabel: label
    };
}
 
async function loadTracks(selectAfter) {
    if (!royaltyContract) return;
 
    const list = $("trackList");
    list.innerHTML = '<li class="empty">Memuat lagu dari blockchain...</li>';
 
    try {
        // Token ID dimulai dari 0 atau 1 tergantung kontrak, jadi cek keduanya
        const found = [];
        if (await trackExists(0)) found.push(0);
 
        for (let id = 1; id <= MAX_TRACK_SCAN; id++) {
            if (!(await trackExists(id))) break;
            found.push(id);
        }
 
        tracks = await Promise.all(found.map(fetchTrack));
        updateDashboard();
        renderTrackList();
 
        if (selectAfter !== undefined && selectAfter !== null) {
            await selectTrack(selectAfter);
        } else if (selectedId !== null && tracks.some((t) => t.id === selectedId)) {
            await selectTrack(selectedId);
        } else if (tracks.length > 0) {
            await selectTrack(tracks[0].id);
        } else {
            selectedId = null;
            renderEmptyDetail();
        }
    } catch (error) {
        console.error("Gagal memuat lagu:", error);
        list.innerHTML = '<li class="empty">Lagu gagal dimuat. Pastikan node Hardhat berjalan dan alamat kontrak benar.</li>';
        toast("Gagal memuat lagu: " + errMsg(error), "error");
    }
}
 
function updateDashboard() {
    $("totalLagu").innerText = tracks.length;
 
    let total = 0n;
    for (const t of tracks) {
        total += t.saldo + t.distPencipta + t.distArtis + t.distLabel;
    }
    $("totalRoyalti").innerText = fmtEth(total);
}
 
function renderTrackList() {
    const list = $("trackList");
 
    if (tracks.length === 0) {
        list.innerHTML = '<li class="empty">Belum ada lagu. Daftarkan lagu pertama di bagian Registrasi.</li>';
        return;
    }
 
    list.innerHTML = tracks.map((t) => {
        const st = statusInfo(t.status);
        const current = selectedId !== null && t.id === selectedId;
        return `
            <li class="track-item">
                <button type="button" data-id="${t.id}" aria-current="${current}">
                    <span class="t-title">${esc(t.judul)}</span>
                    <span class="t-meta">
                        <span class="mono">${esc(t.songId)}</span>
                        <span class="chip ${st.cls}">${esc(st.label)}</span>
                    </span>
                    <span class="t-meta"><span>Saldo</span><span>${fmtEth(t.saldo)}</span></span>
                </button>
            </li>`;
    }).join("");
 
    list.querySelectorAll("button[data-id]").forEach((btn) => {
        btn.addEventListener("click", () => selectTrack(BigInt(btn.dataset.id)));
    });
}
 
$("btnRefresh").addEventListener("click", () => {
    if (!royaltyContract) {
        toast("Hubungkan wallet terlebih dahulu.", "error");
        return;
    }
    loadTracks();
});
 
// ============================================================
// Detail lagu
// ============================================================
 
function renderEmptyDetail() {
    $("trackDetail").innerHTML =
        '<div class="empty">Pilih satu lagu dari daftar untuk mengelola royaltinya.</div>';
    $("historyList").innerHTML =
        '<li class="empty">Pilih lagu untuk melihat riwayat transaksinya.</li>';
    $("historySubtitle").innerText = "Semua aktivitas tercatat permanen di blockchain.";
    renderRecord(null, null);
}
 
async function selectTrack(id) {
    selectedId = BigInt(id);
    renderTrackList();
 
    const detail = $("trackDetail");
    detail.innerHTML = '<div class="empty">Memuat detail lagu...</div>';
 
    try {
        const t = await fetchTrack(selectedId);
 
        // Perbarui data lagu di cache supaya daftar tetap sinkron
        const idx = tracks.findIndex((x) => x.id === selectedId);
        if (idx >= 0) tracks[idx] = t;
 
        const [creator, artist, label, platform, dist, history] = await Promise.all([
            royaltyContract.getCreatorInfo(selectedId),
            royaltyContract.getArtistInfo(selectedId),
            royaltyContract.getLabelInfo(selectedId),
            royaltyContract.getPlatformInfo(selectedId),
            royaltyContract.getDistributedRoyalty(selectedId),
            royaltyContract.getHistory(selectedId)
        ]);
 
        // Pengguna sudah memilih lagu lain saat data dimuat
        if (selectedId !== BigInt(t.id)) return;
 
        renderDetail(t, { creator, artist, label, platform }, dist);
        renderHistory(t, history);
        renderRecord(t, dist);
        updateDashboard();
        renderTrackList();
    } catch (error) {
        console.error("Gagal memuat detail:", error);
        detail.innerHTML = '<div class="empty">Detail lagu gagal dimuat.</div>';
        toast("Gagal memuat detail: " + errMsg(error), "error");
    }
}
 
function personRow(roleName, swatch, info) {
    const name = info[0];
    const addr = info[1];
    const isSet = addr && addr !== ZERO_ADDRESS;
    const isYou = isSet && walletAddress && addr.toLowerCase() === walletAddress.toLowerCase();
 
    return `
        <li>
            <span class="role"><i class="sw ${swatch}"></i>${roleName}</span>
            <span class="who">
                ${isSet
                    ? `<b>${esc(name)}</b><span class="addr">${esc(addr)}</span>`
                    : '<span class="unset">Belum ditetapkan</span>'}
            </span>
            ${isYou ? '<span class="you">Anda</span>' : "<span></span>"}
        </li>`;
}
 
function renderDetail(t, people, dist) {
    const st = statusInfo(t.status);
 
    $("trackDetail").innerHTML = `
        <div class="detail-head">
            <div>
                <h3>${esc(t.judul)}</h3>
                <p class="sub">${esc(t.songId)} · Token #${t.id} · Terdaftar ${fmtDate(t.timestamp)}</p>
                <p style="margin-top:10px"><span class="chip ${st.cls}">${esc(st.label)}</span></p>
            </div>
            <div class="balance">
                <small>Saldo royalti</small>
                <strong>${fmtEth(t.saldo)}</strong>
            </div>
        </div>
 
        <div class="detail-section">
            <h4>Pihak terkait</h4>
            <ul class="people">
                ${personRow("Pencipta", "sw-pencipta", people.creator)}
                ${personRow("Artis", "sw-artis", people.artist)}
                ${personRow("Label", "sw-label", people.label)}
                ${personRow("Platform", "", people.platform)}
            </ul>
        </div>
 
        <div class="detail-section">
            <h4>Tetapkan atau ubah pihak</h4>
            <form id="formParty" class="row-form" novalidate>
                <div>
                    <label for="partyRole">Peran</label>
                    <select id="partyRole">
                        <option value="artist">Artis</option>
                        <option value="label">Label</option>
                        <option value="platform">Platform</option>
                    </select>
                </div>
                <div>
                    <label for="partyName">Nama</label>
                    <input id="partyName" type="text" placeholder="Nama pihak" autocomplete="off">
                </div>
                <div>
                    <label for="partyAddr">Alamat wallet</label>
                    <input id="partyAddr" class="mono" type="text" placeholder="0x..." autocomplete="off" spellcheck="false">
                </div>
                <button type="submit" class="btn btn-ghost" id="btnParty">Simpan pihak</button>
            </form>
        </div>
 
        <div class="detail-section">
            <h4>Alur royalti</h4>
            <div class="actions">
                <div class="action-card">
                    <b>Aktifkan streaming</b>
                    <p>Membuka lagu agar dapat menerima royalti.</p>
                    <button type="button" class="btn btn-ghost btn-sm" id="btnActivate">Aktifkan</button>
                </div>
                <div class="action-card">
                    <b>Masukkan royalti</b>
                    <p>Setor ETH ke saldo royalti lagu ini.</p>
                    <form class="inline" id="formRoyalty" novalidate>
                        <input id="royaltyAmount" type="text" inputmode="decimal" placeholder="0.5" aria-label="Jumlah ETH">
                        <button type="submit" class="btn btn-ghost btn-sm" id="btnRoyalty">Setor</button>
                    </form>
                </div>
                <div class="action-card">
                    <b>Distribusikan dana</b>
                    <p>Bagi saldo ke pencipta, artis, dan label.</p>
                    <button type="button" class="btn btn-primary btn-sm" id="btnDistribute">Distribusikan</button>
                </div>
            </div>
        </div>
 
        <div class="detail-section">
            <h4>Royalti yang sudah dibagikan</h4>
            <div class="distributed">
                <div class="d-pencipta"><small>Pencipta</small><strong>${fmtEth(dist[0])}</strong></div>
                <div class="d-artis"><small>Artis</small><strong>${fmtEth(dist[1])}</strong></div>
                <div class="d-label"><small>Label</small><strong>${fmtEth(dist[2])}</strong></div>
            </div>
        </div>
    `;
 
    bindDetailActions(t);
}
 
function bindDetailActions(t) {
    // Menetapkan artis, label, atau platform
    $("formParty").addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!(await ensureReady())) return;
 
        const role = $("partyRole").value;
        const name = $("partyName").value.trim();
        const addr = $("partyAddr").value.trim();
 
        if (!name || !addr) {
            toast("Isi nama dan alamat wallet.", "error");
            return;
        }
        if (!ethers.isAddress(addr)) {
            toast("Alamat wallet tidak valid.", "error");
            return;
        }
 
        const call = {
            artist: () => royaltyContract.setArtist(t.id, name, addr),
            label: () => royaltyContract.setLabel(t.id, name, addr),
            platform: () => royaltyContract.setPlatform(t.id, name, addr)
        }[role];
 
        const receipt = await runTx($("btnParty"), "Menyimpan...", "Pihak berhasil disimpan.", call);
        if (receipt) await selectTrack(t.id);
    });
 
    // Mengaktifkan streaming
    $("btnActivate").addEventListener("click", async () => {
        if (!(await ensureReady())) return;
        const receipt = await runTx(
            $("btnActivate"),
            "Mengaktifkan...",
            "Streaming diaktifkan.",
            () => royaltyContract.activateStreaming(t.id)
        );
        if (receipt) await selectTrack(t.id);
    });
 
    // Menambah royalti (payable)
    $("formRoyalty").addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!(await ensureReady())) return;
 
        let value;
        try {
            value = ethers.parseEther($("royaltyAmount").value.trim());
        } catch (error) {
            toast("Jumlah ETH tidak valid.", "error");
            return;
        }
        if (value <= 0n) {
            toast("Jumlah harus lebih dari 0.", "error");
            return;
        }
 
        const receipt = await runTx(
            $("btnRoyalty"),
            "Menyetor...",
            "Royalti berhasil disetor.",
            () => royaltyContract.addRoyalty(t.id, { value })
        );
        if (receipt) await selectTrack(t.id);
    });
 
    // Distribusi dana
    $("btnDistribute").addEventListener("click", async () => {
        if (!(await ensureReady())) return;
        const receipt = await runTx(
            $("btnDistribute"),
            "Mendistribusikan...",
            "Dana berhasil didistribusikan.",
            () => royaltyContract.distributeFunds(t.id)
        );
        if (receipt) await selectTrack(t.id);
    });
}
 
// ============================================================
// Riwayat
// ============================================================
 
function renderHistory(t, history) {
    $("historySubtitle").innerText =
        "Aktivitas untuk \"" + t.judul + "\" tercatat permanen di blockchain.";
 
    const items = Array.from(history).reverse();
 
    if (items.length === 0) {
        $("historyList").innerHTML = '<li class="empty">Belum ada aktivitas untuk lagu ini.</li>';
        return;
    }
 
    $("historyList").innerHTML = items.map((h) => `
        <li>
            <time>${fmtDate(h.timestamp)}</time>
            <div class="what">
                <b>${esc(h.aktivitas)}</b>
                <span class="addr">Oleh ${esc(h.pelaku)}</span>
            </div>
        </li>
    `).join("");
}
 
// ============================================================
// Piringan hitam: visualisasi pembagian royalti
// ============================================================
 
const RING_RADIUS = 134;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
 
function setSegment(el, start, length) {
    el.setAttribute("stroke-dasharray", length.toFixed(2) + " " + (RING_LENGTH - length).toFixed(2));
    el.setAttribute("stroke-dashoffset", (-start).toFixed(2));
}
 
function renderRecord(t, dist) {
    const svg = $("recordSvg");
 
    if (!t) {
        $("recordTrack").innerText = "Belum ada lagu dipilih";
        $("recordStatus").innerText = "Pilih lagu di Manajemen Royalti";
        svg.classList.remove("is-spinning");
        ["segPencipta", "segArtis", "segLabel"].forEach((id) => setSegment($(id), 0, 0));
        ["legPencipta", "legArtis", "legLabel"].forEach((id) => ($(id).innerText = "-"));
        return;
    }
 
    const st = statusInfo(t.status);
    $("recordTrack").innerText = t.judul;
    $("recordStatus").innerText = st.label;
    svg.classList.toggle("is-spinning", st.index === 1);
 
    const parts = [dist[0], dist[1], dist[2]];
    const sum = parts[0] + parts[1] + parts[2];
 
    if (sum === 0n) {
        ["segPencipta", "segArtis", "segLabel"].forEach((id) => setSegment($(id), 0, 0));
        ["legPencipta", "legArtis", "legLabel"].forEach((id) => ($(id).innerText = "-"));
        $("recordStatus").innerText = st.label + " · belum ada distribusi";
        return;
    }
 
    // Menghitung porsi, memakai basis 10000 agar tidak kehilangan presisi
    const pct = parts.map((p) => Number((p * 10000n) / sum) / 10000);
    const gap = 6;
    let start = 0;
 
    ["segPencipta", "segArtis", "segLabel"].forEach((id, i) => {
        const length = Math.max(pct[i] * RING_LENGTH - gap, 0);
        setSegment($(id), start, length);
        start += pct[i] * RING_LENGTH;
    });
 
    $("legPencipta").innerText = (pct[0] * 100).toFixed(0) + "%";
    $("legArtis").innerText = (pct[1] * 100).toFixed(0) + "%";
    $("legLabel").innerText = (pct[2] * 100).toFixed(0) + "%";
}