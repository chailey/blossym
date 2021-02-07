import React, { Component } from "react";
import { BrowserRouter, Switch, Route } from "react-router-dom";
import {Container} from "react-bootstrap";
import Web3 from "web3";
import Web3Modal from "web3modal";
import Fortmatic from "fortmatic";
import NavHeader from "./NavHeader";
import Home from "./Home";
import Creator from "./Creator";
import Fan from "./Fan";

const initialState = {
  web3: null,
  provider: null,
  connectedWallet: "",
};

const providerOptions = {
  fortmatic: {
    package: Fortmatic, // required
    options: {
      key: process.env.FORTMATIC_KEY, // required
    },
  },
};

class App extends Component {
  web3Modal;

  constructor(props) {
    super(props);
    this.state = { ...initialState };
    this.web3Modal = new Web3Modal({
      cacheProvider: true, // optional
      providerOptions, // required
    });
    this.openWalletConnectModal = this.openWalletConnectModal.bind(this);
  }

  async openWalletConnectModal() {
    let web3 = this.state.web3;
    if (!web3) {
      const provider = await this.web3Modal.connect();
      web3 = new Web3(provider);
      this.setState({
        provider: provider,
        web3: web3,
      });
    }

    if (!this.state.connectedWallet) {
      const accounts = await web3.eth.getAccounts();
      this.setState({
        connectedWallet: accounts[0],
      });
      const fetchURL =
        "https://api.etherscan.io/api?module=account&action=txlist&address=" +
        this.state.connectedWallet +
        "&startblock=0&endblock=99999999&sort=desc&apikey=" +
        process.env.ETHERSCAN_KEY;
      fetch(fetchURL)
        .then((response) => response.json())
        .then((ethTx) => {
          ethTx = ethTx.result.slice(0, 5);
          this.setState({ ethTransactions: ethTx });
        });
    }
  }

  async disconnectWallet() {
    const { web3 } = this.state;
    if (web3 && web3.currentProvider && web3.currentProvider.close) {
      await web3.currentProvider.close();
    }
    await this.web3Modal.clearCachedProvider();
    this.setState({ ...initialState });
  }

  render() {
    return (
      <BrowserRouter>
        <NavHeader
          connectedWallet={this.state.connectedWallet}
          onWalletConnectClick={() => this.openWalletConnectModal()}
          onDisconnectWallet={() => this.disconnectWallet()}
        />
        <Container>
          <Switch>
            <Route exact path="/" component={Home} />
            <Route
              path="/fan"
              render={(routeProps) => (
                <Fan
                  {...routeProps}
                  provider={this.state.provider}
                  connectedWallet={this.state.connectedWallet}
                  onWalletConnectClick={this.openWalletConnectModal}
                />
              )}
            />
            <Route
              path="/creator"
              render={(routeProps) => (
                <Creator
                  {...routeProps}
                  provider={this.state.provider}
                  connectedWallet={this.state.connectedWallet}
                  ethTransactions={this.state.ethTransactions}
                  onWalletConnectClick={this.openWalletConnectModal}
                />
              )}
            />
          </Switch>
        </Container>
      </BrowserRouter>
    );
  }
}

export default App;
