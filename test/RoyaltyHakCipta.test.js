
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RoyaltyHakCipta", function () {

    let royalty;
    let owner;
    let pencipta;
    let artis;
    let label;
    let platform;
    let orangLain;

    beforeEach(async function () {

        [
            owner,
            pencipta,
            artis,
            label,
            platform,
            orangLain
        ] = await ethers.getSigners();

        const RoyaltyHakCipta =
            await ethers.getContractFactory("RoyaltyHakCipta");

        royalty = await RoyaltyHakCipta.deploy();

        await royalty.waitForDeployment();

    });

    it("Harus berhasil mendaftarkan lagu dan membuat NFT", async function () {

        await royalty.registerTrack(
            "MUS-2026-001",
            "Lagu Pertamaku",
            "Ananda",
            pencipta.address
        );

        const track = await royalty.getTrackInfo(1);

        expect(track[0]).to.equal(1n);
        expect(track[1]).to.equal("MUS-2026-001");
        expect(track[2]).to.equal("Lagu Pertamaku");

        expect(await royalty.getOwner(1))
            .to.equal(owner.address);

        expect(track[5]).to.equal(0n);

    });

    it("Harus berhasil mengatur data pihak yang terlibat", async function () {

        await royalty.registerTrack(
            "MUS-2026-001",
            "Lagu Pertamaku",
            "Ananda",
            pencipta.address
        );

        await royalty.setArtist(
            1,
            "Penyanyi Pertama",
            artis.address
        );

        await royalty.setLabel(
            1,
            "Label Musik",
            label.address
        );

        await royalty.setPlatform(
            1,
            "Platform Musik",
            platform.address
        );

        const dataPencipta = await royalty.getCreatorInfo(1);
        const dataArtis = await royalty.getArtistInfo(1);
        const dataLabel = await royalty.getLabelInfo(1);
        const dataPlatform = await royalty.getPlatformInfo(1);

        expect(dataPencipta[0]).to.equal("Ananda");
        expect(dataArtis[0]).to.equal("Penyanyi Pertama");
        expect(dataLabel[0]).to.equal("Label Musik");
        expect(dataPlatform[0]).to.equal("Platform Musik");

    });

    it("Harus berhasil mengaktifkan streaming", async function () {

        await royalty.registerTrack(
            "MUS-2026-001",
            "Lagu Pertamaku",
            "Ananda",
            pencipta.address
        );

        await royalty.activateStreaming(1);

        const track = await royalty.getTrackInfo(1);

        expect(track[5]).to.equal(1n);

    });

    it("Hanya platform yang boleh menambahkan royalty", async function () {

        await royalty.registerTrack(
            "MUS-2026-001",
            "Lagu Pertamaku",
            "Ananda",
            pencipta.address
        );

        await royalty.setPlatform(
            1,
            "Platform Musik",
            platform.address
        );

        const jumlahRoyalty = ethers.parseEther("1");

        await expect(
            royalty.connect(orangLain).addRoyalty(1, {
                value: jumlahRoyalty
            })
        ).to.be.revertedWith(
            "Hanya platform yang dapat menambahkan royalty"
        );

        await royalty.connect(platform).addRoyalty(1, {
            value: jumlahRoyalty
        });

        const track = await royalty.getTrackInfo(1);

        expect(track[4]).to.equal(jumlahRoyalty);
        expect(track[5]).to.equal(2n);

    });

    it("Harus berhasil mendistribusikan royalty 50:30:20", async function () {

        await royalty.registerTrack(
            "MUS-2026-001",
            "Lagu Pertamaku",
            "Ananda",
            pencipta.address
        );

        await royalty.setArtist(
            1,
            "Penyanyi Pertama",
            artis.address
        );

        await royalty.setLabel(
            1,
            "Label Musik",
            label.address
        );

        await royalty.setPlatform(
            1,
            "Platform Musik",
            platform.address
        );

        const jumlahRoyalty = ethers.parseEther("1");

        await royalty.connect(platform).addRoyalty(1, {
            value: jumlahRoyalty
        });

        await royalty.connect(label).distributeFunds(1);

        const hasil = await royalty.getDistributedRoyalty(1);

        expect(hasil[0]).to.equal(ethers.parseEther("0.5"));
        expect(hasil[1]).to.equal(ethers.parseEther("0.3"));
        expect(hasil[2]).to.equal(ethers.parseEther("0.2"));

        const track = await royalty.getTrackInfo(1);

        expect(track[4]).to.equal(0n);
        expect(track[5]).to.equal(3n);

    });

});
