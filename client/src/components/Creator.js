import React, { Component } from "react";
import { Row, Col, ButtonGroup, Button, Card, Table } from "react-bootstrap";
import { ImCopy, ImTwitter, ImTelegram } from "react-icons/im";
import CreatorCashout from "../contracts/CreatorCashout.json";
import { TwitterShareButton, TelegramShareButton } from "react-share";
import CashoutModal, { CashoutModalState } from "./CashoutModal";
import {CopyToClipboard} from 'react-copy-to-clipboard';
import { addresses } from "../addresses";
import Web3 from "web3";

class Creator extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ETHinUSD: "0",
      aUSDCBalance: "0",
      sentTransactionHash: "",
      cashoutModalState: CashoutModalState.HIDDEN,
      aaveRate: "0", 
      estimatedFuture: "0", 
      copied: false, 
      ethTransactions: [],
    };
    this.cashOut = this.cashOut.bind(this);
    this.calculateInterest = this.calculateInterest.bind(this);
  }

  getLink(hash) {
    return "https://kovan.etherscan.io/tx/" + hash;
  }

  async initContract() {
    const { provider } = this.props;
    if (!provider || this.state.contract) {
      return;
    }

    try {
      const web3 = new Web3(provider);
      const networkId = await web3.eth.net.getId();
      const creatorAddress = addresses[networkId]
        ? addresses[networkId].fanProxy
        : CreatorCashout.networks[networkId].address;
      const instance = new web3.eth.Contract(
        CreatorCashout.abi,
        creatorAddress
      );

      this.setState({ contract: instance });
    } catch (error) {
      // Catch any errors for any of the above operations.
      console.error(error);
    }
  }

  cashOut() {
    if (this.state.aUSDCBalance === "0") {
      alert("You don't have any funds to cash out");
    } else {
      try {
        this.state.contract.methods
          .cashout(parseFloat(this.state.aUSDCBalance), this.props.connectedWallet)
          .send({ from: this.props.connectedWallet })
          .once("transactionHash", (hash) => {
            this.setState({
              sentTransactionHash: hash,
              cashoutModalState: CashoutModalState.AWAITING_CONFIRMATION,
            });
          })
          .once("receipt", () => {
            this.setState({
              cashoutModalState: CashoutModalState.CONFIRMED,
            });
          })
          .on("error", () => {
            this.setState({
              cashoutModalState: CashoutModalState.ERROR,
            });
          });
      } catch (error) {
        console.log(`Error: ${error}`);
      }
    }
  }

  calculateInterest(time) {
    const principle = parseFloat(this.state.aUSDCBalance); 
    const rate = parseFloat(this.state.aaveRate); 
    const timeYears = parseInt(time)/12;

    const A = principle * (1 + rate * timeYears); 
    return A

  }

  async getBalance() {
    const tokenAddress = "0xe12afec5aa12cf614678f9bfeeb98ca9bb95b5b0";
    const walletAddress = this.props.connectedWallet;
    const fetchURLEtherscan =
      "https://api-kovan.etherscan.io/api?module=account&action=tokenbalance" +
      "&contractaddress=" +
      tokenAddress +
      "&address=" +
      walletAddress +
      "&tag=latest&apikey=" +
      process.env.ETHERSCAN_KEY;

    fetch(fetchURLEtherscan)
      .then((response) => response.json())
      .then((balance) => {
        // This gives the correct number of decimal places for the exact dollar value
        console.log(balance); 
        balance = (balance.result * Math.pow(10, -6)).toFixed(2);
        this.setState({ aUSDCBalance: balance });
      });

    const fetchURLAaveRates = "https://api.aleth.io/v0/defi/snapshot"; 
    fetch(fetchURLAaveRates)
        .then((response) => response.json())
        .then((aaveRate) => { 
          console.log(aaveRate); 
          aaveRate = aaveRate.data[95].value; 
          this.setState({aaveRate: aaveRate});
        });
    const futureRate = this.calculateInterest(1); 
    this.setState({estimatedFuture:  futureRate.toFixed(2)});
    /*
    if (this.props.provider) {
      const web3 = new Web3(this.props.provider);

      // The minimum ABI to get ERC20 Token balance
      const minABI = [
        // balanceOf
        {
          constant: true,
          inputs: [{ name: "_owner", type: "address" }],
          name: "balanceOf",
          outputs: [{ name: "balance", type: "uint256" }],
          type: "function",
        },
        // decimals
        {
          constant: true,
          inputs: [],
          name: "decimals",
          outputs: [{ name: "", type: "uint8" }],
          type: "function",
        },
      ];

      // Get ERC20 Token contract instance
      const contract = new web3.eth.Contract(minABI, tokenAddress);
      // Call balanceOf function
      const balance = await contract.methods.balanceOf(walletAddress).call();
      this.setState({ aUSDCBalance: balance });
    
    }
    */
  }

  async componentDidMount() {
    this.getBalance();
    fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=ethereum"
    )
      .then((response) => response.json())
      .then((priceUSD) => {
        this.setState({ ETHinUSD: priceUSD[0].current_price });
      });
    if (this.props.ethTransactions) {
      this.setState({ ethTransactions: this.props.ethTransactions });
    }
    await this.initContract();
  }

  getValue(weiVal) {
    const val = Web3.utils.fromWei(weiVal, "ether");

    var USD = parseFloat(val) * parseFloat(this.state.ETHinUSD);
    USD = USD.toFixed(2);
    return val + " ETH ($" + USD + " USD)";
  }

  getRealTime(timestamp) {
    const utcSeconds = parseInt(timestamp);
    var d = new Date(0); // The 0 there is the key, which sets the date to the epoch
    d.setUTCSeconds(utcSeconds);
    return d.toLocaleString();
  }

  changeEstValue(e) {
    var futureRate = this.calculateInterest(e); 
    futureRate = futureRate.toFixed(2); 
    this.setState({estimatedFuture: futureRate});
  }

  render() {
    const balance = this.state.aUSDCBalance + " aUSDC";
    const rate = this.state.aaveRate + "%"; 
    const fanLink =
      "https://blossym.org/fan?creatorAddress=" + this.props.connectedWallet;

    let page;
    if (!this.props.connectedWallet) {
      page = (
        <div>
          <div className="d-flex justify-content-center mt-5 col-md-12">
            <h3>
              {" "}
              You need to connect your wallet before viewing your balance.{" "}
            </h3>
          </div>
        </div>
      );
    } else {
      page = (
        <Container>
          <div class="d-flex justify-content-center mt-5 col-md-12">
            <Button onClick={this.cashOut} variant="success" size="lg">Cash Out</Button>
          </div>

          <div className="d-flex justify-content-sm-center mt-5">
            <Card className="mr-4" style={{ width: "17rem" }}>
              <Card.Body>
                <Card.Title>Your balance</Card.Title>
                <Card.Subtitle className="mt-2">
                  <p className="lead">{balance}</p>
                </Card.Subtitle>
              </Card.Body>
            </Card>
            <Card style={{ width: "17rem" }}>
              <Card.Body>
                <Card.Title>Share your fan link!</Card.Title>
                <Row>
                  <Col sm>
                    <CopyToClipboard text={fanLink}
                        onCopy={() => this.setState({copied: true})}>
                      <Button variant="outline-secondary">
                        <ImCopy />
                      </Button>
                    </CopyToClipboard>
                  </Col>
                  <Col sm>
                    <TwitterShareButton
                      url={fanLink}
                      title={
                        "Support your favorite influencers with ETH on Blossym."
                      }
                    >
                      <Button variant="outline-primary">
                        <ImTwitter />
                      </Button>
                    </TwitterShareButton>
                  </Col>
                  <Col sm>
                    <TelegramShareButton
                      url={fanLink}
                      title={
                        "Support your favorite influencers with ETH on Blossym."
                      }
                    >
                      <Button variant="outline-primary">
                        <ImTelegram />
                      </Button>
                    </TelegramShareButton>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </div>
          <div class="d-flex justify-content-around mt-5 col-md-12">
            <Card style={{ width: "17rem" }}>
              <Card.Body>
                <Card.Title>Interest Rate</Card.Title>
                <Card.Text>{rate}</Card.Text>
              </Card.Body>
            </Card>
            <Card style={{ width: "17rem" }}>
              <Card.Body>
                <Card.Title>Est. future earnings</Card.Title>
                <Card.Text>{this.state.estimatedFuture}</Card.Text>
                <ButtonGroup size="sm" onClick={this.changeEstValue}>
                  <Button value="1">1mo</Button>
                  <Button value="6">6mo</Button>
                  <Button value="12">1yr</Button>
                </ButtonGroup>
              </Card.Body>
            </Card>
          </div>
          <div class="d-flex justify-content-around mt-5 col-md-12">
            <h3> Recent Transactions </h3>
          </div>
          <div className="d-flex justify-content-around mt-5 col-md-12">
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>From</th>
                  <th>Value</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {this.state.ethTransactions.map((tx) => (
                  <tr>
                    <td>
                      <a
                        href={this.getLink(tx.hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {tx.from}
                      </a>
                    </td>
                    <td>{this.getValue(tx.value)}</td>
                    <td>{this.getRealTime(tx.timeStamp)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Container>
      );
    }

    return <div>{page}</div>;
  }
}

export default Creator;
