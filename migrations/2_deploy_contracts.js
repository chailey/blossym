var FanProxy = artifacts.require("./FanProxy.sol");

module.exports = function (deployer) {
  deployer.deploy(FanProxy);
};
