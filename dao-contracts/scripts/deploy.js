const {ethers} = require('hardhat');
const {CRYPTODEVS_NFT_CONTRACT_ADDRESS} = require("../constants/constants");

async function main() {
    const FakeNFTMarketplace = await ethers.getContractFactory(
        "FakeNFTMarketplace"
    )
    const fakeNFTMarketplace = await FakeNFTMarketplace.deploy();
    await fakeNFTMarketplace.deployed();

    console.log("FakeNFTMarketplace deployed at contract: ", fakeNFTMarketplace.address);

    const CryptoDevsDAO = await ethers.getContractFactory("CryptoDevsDAO");
    const cryptoDevsDAO = await CryptoDevsDAO.deploy(
        fakeNFTMarketplace.address,
        CRYPTODEVS_NFT_CONTRACT_ADDRESS,
        {
            value: ethers.utils.parseEther("0.2"),
        }
    );
    await cryptoDevsDAO.deployed();

    console.log("CryptoDevsDAO deployed at: ", cryptoDevsDAO.address);
}

main()
.then(()=> {
    process.exit(0)
})
.catch((error)=> {
    console.error(error);
    process.exit(1);
})