// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract RoyaltyHakCipta is ERC721 {

    constructor() ERC721("Royalty Hak Cipta", "RHC") {}

    // =========================
    // STATUS
    // =========================

    enum Status {
        REGISTERED,
        STREAMING_ACTIVE,
        ROYALTY_COLLECTED,
        DISTRIBUTED
    }

    // =========================
    // DATA LAGU
    // =========================

    struct Track {
        uint256 trackId;
        string songId;
        string judulLagu;
        uint256 royaltyPerPlay;
        uint256 saldoRoyalty;
        Status status;
        uint256 timestamp;
    }

    mapping(uint256 => Track) public tracks;
    uint256 private nextTokenId = 1;

    // =========================
    // DATA PIHAK TERLIBAT
    // =========================

    struct Participants {
        string namaPencipta;
        address pencipta;
        string namaArtis;
        address artis;
        string namaLabel;
        address label;
        string namaPlatform;
        address platform;
    }

    mapping(uint256 => Participants) public participants;

    mapping(uint256 => uint256) public totalRoyaltyPencipta;
    mapping(uint256 => uint256) public totalRoyaltyArtis;
    mapping(uint256 => uint256) public totalRoyaltyLabel;

    // =========================
    // HISTORY
    // =========================

    struct History {
        string aktivitas;
        uint256 timestamp;
        address pelaku;
    }

    mapping(uint256 => History[]) public histories;

    // =========================
    // REGISTER LAGU
    // =========================

    // =========================
    // TOKENISASI NFT (ERC-721)
    // =========================

    function getOwner(uint256 tokenId) public view returns (address) {
        return ownerOf(tokenId);
    }

    function registerTrack(
        string memory _songId,
        string memory _judulLagu,
        string memory _namaPencipta,
        address _pencipta

    ) external {

        require(
            bytes(_songId).length > 0,
            "Song ID tidak boleh kosong"
        );

        require(
            bytes(_judulLagu).length > 0,
            "Judul lagu tidak boleh kosong"
        );

        require(
            bytes(_namaPencipta).length > 0,
            "Nama pencipta tidak boleh kosong"
        );

        require(
            _pencipta != address(0),
            "Alamat pencipta tidak valid"
        );

        // Mint NFT langsung saat lagu didaftarkan.
        uint256 id = nextTokenId;
        nextTokenId++;

        _safeMint(msg.sender, id);

        Track storage track = tracks[id];
        track.trackId = id;
        track.songId = _songId;
        track.judulLagu = _judulLagu;
        track.royaltyPerPlay = 1000;
        track.saldoRoyalty = 0;
        track.status = Status.REGISTERED;
        track.timestamp = block.timestamp;
        participants[id].namaPencipta = _namaPencipta;
        participants[id].pencipta = _pencipta;
        histories[id].push(

            History(
                "Lagu didaftarkan",
                block.timestamp,
                msg.sender
            )

        );

    }

    // =========================
    // SET ARTIS
    // =========================

    function setArtist(
        uint256 _trackId,
        string memory _namaArtis,
        address _artis
    ) 
    
    external {
        require(
            tracks[_trackId].trackId != 0,
            "Track tidak ditemukan"
        );

        require(
            bytes(_namaArtis).length > 0,
            "Nama artis tidak boleh kosong"
        );

        require(
            _artis != address(0),
            "Alamat artis tidak valid"
        );

        participants[_trackId].namaArtis = _namaArtis;
        participants[_trackId].artis = _artis;
        histories[_trackId].push(

            History(
                "Data artis ditambahkan",
                block.timestamp,
                msg.sender
            )

        );

    }

    // =========================
    // SET LABEL
    // =========================

    function setLabel(
        uint256 _trackId,
        string memory _namaLabel,
        address _label

    ) 
    
    external {
        require(
            tracks[_trackId].trackId != 0,
            "Track tidak ditemukan"
        );

        require(
            bytes(_namaLabel).length > 0,
            "Nama label tidak boleh kosong"
        );

        require(
            _label != address(0),
            "Alamat label tidak valid"
        );

        participants[_trackId].namaLabel = _namaLabel;
        participants[_trackId].label = _label;
        histories[_trackId].push(

            History(
                "Data label ditambahkan",
                block.timestamp,
                msg.sender
            )

        );

    }

    // =========================
    // SET PLATFORM
    // =========================

    function setPlatform(
        uint256 _trackId,
        string memory _namaPlatform,
        address _platform

    ) 
    
    external {
        require(
            tracks[_trackId].trackId != 0,
            "Track tidak ditemukan"
        );

        require(
            bytes(_namaPlatform).length > 0,
            "Nama platform tidak boleh kosong"
        );

        require(
            _platform != address(0),
            "Alamat platform tidak valid"
        );

        participants[_trackId].namaPlatform = _namaPlatform;
        participants[_trackId].platform = _platform;
        histories[_trackId].push(
            
            History(
                "Data platform ditambahkan",
                block.timestamp,
                msg.sender
            )

        );

    }

    // =========================
    // AKTIFKAN STREAMING
    // =========================

    function activateStreaming(
        uint256 _trackId
    ) 
    
    external {
        require(
            tracks[_trackId].trackId != 0,
            "Track tidak ditemukan"
        );

        tracks[_trackId].status = Status.STREAMING_ACTIVE;

        histories[_trackId].push(

            History(
                "Streaming diaktifkan",
                block.timestamp,
                msg.sender
            )

        );

    }

    // =========================
    // TAMBAH ROYALTY
    // =========================

    function addRoyalty(
        uint256 _trackId

    ) 
    
    external payable {

        require(
            tracks[_trackId].trackId != 0,
            "Track tidak ditemukan"
        );

        require(
            participants[_trackId].platform != address(0),
            "Platform belum diatur"
        );

        require(
            msg.sender == participants[_trackId].platform,
            "Hanya platform yang dapat menambahkan royalty"
        );

        require(
            msg.value > 0,
            "Jumlah royalty harus lebih dari 0"
        );

        tracks[_trackId].saldoRoyalty += msg.value;

        tracks[_trackId].status =

            Status.ROYALTY_COLLECTED;

        histories[_trackId].push(

            History(
                "Royalty ditambahkan",
                block.timestamp,
                msg.sender
            )

        );

    }

    // =========================
    // DISTRIBUSI ROYALTY
    // =========================

    function distributeFunds(
        uint256 _trackId

    ) 
    
    external {
        require(
            tracks[_trackId].trackId != 0,
            "Track tidak ditemukan"
        );

        address label =
            participants[_trackId].label;

        address pencipta =
            participants[_trackId].pencipta;

        address artis =
            participants[_trackId].artis;

        require(
            label != address(0),
            "Label belum diatur"
        );

        require(
            pencipta != address(0),
            "Pencipta belum diatur"
        );

        require(
            artis != address(0),
            "Artis belum diatur"
        );

        require(
            msg.sender == label,
            "Hanya label yang dapat mendistribusikan royalty"
        );

        uint256 totalRoyalty =
            tracks[_trackId].saldoRoyalty;

        require(
            totalRoyalty > 0,
            "Saldo royalty tidak tersedia"
        );

        uint256 bagianPencipta =
            totalRoyalty * 50 / 100;

        uint256 bagianArtis =
            totalRoyalty * 30 / 100;

        uint256 bagianLabel =
            totalRoyalty -
            bagianPencipta -
            bagianArtis;

        // Catat total royalty yang pernah dialokasikan untuk setiap pihak.
        totalRoyaltyPencipta[_trackId] += bagianPencipta;
        totalRoyaltyArtis[_trackId] += bagianArtis;
        totalRoyaltyLabel[_trackId] += bagianLabel;

        // Update state sebelum transfer

        tracks[_trackId].saldoRoyalty = 0;

        tracks[_trackId].status =

            Status.DISTRIBUTED;

        (bool success1, ) =

            payable(pencipta).call{

                value: bagianPencipta

            }("");

        require(
            success1,
            "Gagal mengirim ke pencipta"
        );

        (bool success2, ) =

            payable(artis).call{

                value: bagianArtis

            }("");

        require(
            success2,
            "Gagal mengirim ke artis"
        );

        (bool success3, ) =

            payable(label).call{

                value: bagianLabel

            }("");

        require(
            success3,
            "Gagal mengirim ke label"
        );

        histories[_trackId].push(

            History(
                "Royalty didistribusikan",
                block.timestamp,
                msg.sender
            )

        );

    }

    // =========================
    // INFO LAGU
    // =========================

    function getTrackInfo(
        uint256 _trackId

    )

        external
        view
        returns (
            uint256,
            string memory,
            string memory,
            uint256,
            uint256,
            Status,
            uint256
        )

    {

        Track storage track = tracks[_trackId];
        require(
            track.trackId != 0,
            "Track tidak ditemukan"
        );

        return (
            track.trackId,
            track.songId,
            track.judulLagu,
            track.royaltyPerPlay,
            track.saldoRoyalty,
            track.status,
            track.timestamp
        );

    }

    // =========================
    // INFO PENCIPTA
    // =========================

    function getCreatorInfo(
        uint256 _trackId
    )

        external
        view
        returns (
            string memory,
            address
        )

    {

        require(
            tracks[_trackId].trackId != 0,
            "Track tidak ditemukan"
        );

        return (
            participants[_trackId].namaPencipta,
            participants[_trackId].pencipta
        );

    }

    // =========================
    // INFO ARTIS
    // =========================

    function getArtistInfo(
        uint256 _trackId
    )

        external
        view
        returns (
            string memory,
            address
        )

    {

        require(
            tracks[_trackId].trackId != 0,
            "Track tidak ditemukan"
        );

        return (
            participants[_trackId].namaArtis,
            participants[_trackId].artis
        );

    }

    // =========================
    // INFO LABEL
    // =========================

    function getLabelInfo(
        uint256 _trackId
    )

        external
        view
        returns (
            string memory,
            address
        )

    {

        require(
            tracks[_trackId].trackId != 0,
            "Track tidak ditemukan"
        );

        return (
            participants[_trackId].namaLabel,
            participants[_trackId].label
        );

    }

    // =========================
    // INFO PLATFORM
    // =========================

    function getPlatformInfo(
        uint256 _trackId
    )

        external
        view
        returns (
            string memory,
            address
        )

    {

        require(
            tracks[_trackId].trackId != 0,
            "Track tidak ditemukan"
        );

        return (
            participants[_trackId].namaPlatform,
            participants[_trackId].platform
        );

    }

    // =========================
    // TOTAL ROYALTY YANG SUDAH DIDISTRIBUSIKAN
    // =========================

    function getDistributedRoyalty(
        uint256 _trackId
    )
        external
        view
        returns (
            uint256 royaltyPencipta,
            uint256 royaltyArtis,
            uint256 royaltyLabel
        )
    {
        require(
            tracks[_trackId].trackId != 0,
            "Track tidak ditemukan"
        );

        return (
            totalRoyaltyPencipta[_trackId],
            totalRoyaltyArtis[_trackId],
            totalRoyaltyLabel[_trackId]
        );
    }

    // =========================
    // HISTORY
    // =========================

    function getHistory(
        uint256 _trackId
    )

        external
        view
        returns (History[] memory)

    {

        require(
            tracks[_trackId].trackId != 0,
            "Track tidak ditemukan"
        );

        return histories[_trackId];
    }

}