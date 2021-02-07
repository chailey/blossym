const CreatorCashout = artifacts.require("./CreatorCashout.sol");

// 0x88757f2f99175387ab4c6a4b3067c77a695b0349 is the address for LendingPoolAddressesProvider
// on Kovan. (https://docs.aave.com/developers/deployed-contracts)
const LendingPoolAddressesProvider =
  "0x88757f2f99175387ab4c6a4b3067c77a695b0349";

module.exports = function (deployer) {
  deployer.deploy(CreatorCashout, LendingPoolAddressesProvider);
  //deployer.deploy(FanSwap).then(() => {
  //  return deployer.deploy(FanProxy, FanSwap.address, FanDonation.address);
  //});
  deployer.deploy()
};
