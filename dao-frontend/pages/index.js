import { useEffect, useRef, useState } from 'react'
import styles from '../styles/Home.module.css'
import { formatEther } from '@ethersproject/units'
import Head from "next/head"
import {
  CRYPTODEVS_DAO_ABI,
  CRYPTODEVS_DAO_CONTRACT_ADDRESS,
  CRYPTODEVS_NFT_ABI,
  CRYPTODEVS_NFT_CONTRACT_ADDRESS
} from '../constants'
import Web3Modal from 'web3modal'
import {Contract, providers} from "ethers"

export default function Home() {

  const [treasuryBalance, setTreasuryBalance] = useState("0");
  const [nftBalance, setNftBalance] = useState(0);
  const [numProposals, setNumProposals] = useState("0");
  const [selectedTab, setSelectedTab] = useState("");
  const [proposals, setProposals] = useState([]);
  const [walletConnected, setWalletConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fakenNftTokenId, setFakeNftTokenId] = useState("")
  const web3ModalRef = useRef();

  const getProviderOrSigner = async(needSigner= false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const {chainId} = await web3Provider.getNetwork();
    if (chainId !== 4) {
      window.alert("Please switch to rinkeby network");
      throw new Error("Please switch to rinkeby network");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  }

  const connectWallet = async () => {
    try{
      await getProviderOrSigner();
      setWalletConnected(true);
    }catch(err) {
      console.error(err);
    }
  }

  const getDAOTreasuryBalance = async() => {
    try{
      const provider = await getProviderOrSigner();
      const balance = await  provider.getBalance(
        CRYPTODEVS_DAO_CONTRACT_ADDRESS
      )
      setTreasuryBalance(balance.toString())
    }catch(err){
      console.error(err);
    }
  }

  const getCryptoDevsNFTContractInstance = (providerOrSigner) => {
    return new Contract(
      CRYPTODEVS_NFT_CONTRACT_ADDRESS,
      CRYPTODEVS_NFT_ABI,
      providerOrSigner,
    )
  }

  const getUserNFTBalance = async() => {
    try {
      const signer = await getProviderOrSigner(true);
      const nftContract = getCryptoDevsNFTContractInstance(signer);
      const balance = await nftContract.balanceOf(signer.getAddress());

      setNftBalance(parseInt(balance.toString()));
    }catch(err) {
      console.error(err)
    }
  }

  const getDAOContractInstance = async(providerOrSigner) => {
    return new Contract(
      CRYPTODEVS_DAO_CONTRACT_ADDRESS,
      CRYPTODEVS_DAO_ABI,
      providerOrSigner
    )
  }

  const getNumProposalInDAO = async() => {
    try{
      const provider = await getProviderOrSigner(true);
      const contract = getDAOContractInstance(provider);
      const daoNumProposals = await contract.numProposals();

      setNumProposals(daoNumProposals.toString());
    }catch(err) {
      console.error(err);
    }
  }

  const fetchProposalById = async(id) => {
    try{
      const provider = await getProviderOrSigner(true);
      const daoContract = getDAOContractInstance(provider);
      const proposal = await daoContract.proposals(id);
      const parsedProposal = {
        proposalId: id,
        nftTokenId: proposal.nftTokenId.toString(),
        deadline: new Date(parseInt(proposal.deadline.toString())*1000),
        upVotes: proposal.upVotes.toString(),
        downVotes: proposal.downVotes.toString(),
        executed: proposal.executed,
      }
      return parsedProposal;
    }catch(err) {
      console.error(err);
    }
  }

  const fetchAllProposals = async() => {
    try{
      const proposals = [];
      setLoading(true);
      for (let i =0 ; i<numProposals; i++) {
        const proposal = await fetchProposalById(i);
        proposals.push(proposal);
      }
      setProposals(proposals);
      setLoading(false);
      return proposals;
    }catch(err){
      console.error(err);
    }
  }

  const createProposal = async() => {
    try{
      const signer = await getProviderOrSigner(true);
      const daoContract = getDAOContractInstance(signer);
      const txn = await daoContract.createProposal(fakenNftTokenId);
      setLoading(true);
      await txn.wait();
      setLoading(false);
    }catch(err){
      console.error(err);
    }
  }

  useEffect(()=> {
    if(!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });

      connectWallet().then(()=> {
        getDAOTreasuryBalance();
        getUserNFTBalance();
        getNumProposalInDAO();
      })
    }
  },[walletConnected])

  useEffect(()=> {
    if(selectedTab === "View Proposals"){
      fetchAllProposals();
    }
  }, [selectedTab])

  function renderCreateProposalsTab() {
    if (loading) {
      return(
        <div className={styles.description}>
          Loading... Waiting for transation...
        </div>
      )
    } else if (nftBalance === 0) {
      return(
        <div className={styles.description}>
          You do not own enough CryptoDevs NFTs. <br/>
          <b>You cannot create or vote on proposals</b>
        </div>
      );
    } else {
      return(
        <div className={styles.container}>
          <label>Fake NFT Token ID to Purchase: </label>
          <input 
            placeholder='0'
            type={"number"}
            onChange={(e)=> setFakeNftTokenId(e.target.value)}/>
            <button className={styles.button2} onClick={createProposal}>
              Create
            </button>
        </div>
      )
    }
  }

  function renderViewProposalsTab() {
    if (loading) {
      return(
        <div className={styles.description}>
          Loading... Waiting for transation...
        </div>
      )
    } else if (proposals.length === 0) {
      return(
        <div className={styles.description}>
          No proposals have been created
        </div>
      )
    } else {
      return(
        <div>
          {proposals.map((p, index)=> {
            <div key={index} className={styles.proposalCard}>
              <p>Proposal ID: {p.proposalId}</p>
              <p>Fake NFT to Purchase: {p.nftTokenId}</p>
              <p>Deadline: {p.deadline.toLocaleString()}</p>
              <p>Up votes: {p.upVotes}</p>
              <p>Down votes: {p.downVotes}</p>
              <p>Executed: {p.executed.toString()}</p>
              {p.deadline.getTime() > Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button className={styles.button2}
                    onClick={() => console.log("clicked button")}
                    >
                    Up vote
                  </button>
                  <button className={styles.button2}
                    onClick={() => console.log("clicked button")}
                    >
                    Down vote
                  </button>
                  </div>
              ): p.deadline.getTime() < Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button className={styles.button2}
                    onClick={() => console.log("clicked button")}
                    >
                    Execute Proposal{" "}
                    {p.upVotes > p.downVotes ? "(Yessss)": "(Nooo)"}
                  </button>
                  </div>
              ): (
                <div className={styles.description}>Proposal executed</div>
              )}
              </div>
          })}
        </div>
      )
    }
  }

  function renderTabs() {
    if (selectedTab === "Create Proposal") {
      return renderCreateProposalsTab();
    } else if (selectedTab === "View Proposals"){
      return renderViewProposalsTab()
    }
    return null;
  }

  return (
    <div>
      <Head>
        <title>CryptoDevs DAO</title>
        <meta name="description" content="CryptoDevs DAO" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs!</h1>
          <div className={styles.description}>Welcome to the DAO!</div>
          <div className={styles.description}>
            Your CryptoDevs NFT Balance: {nftBalance}
            <br/>
            Treasury Balance: {formatEther(treasuryBalance)} ETH
            <br/>
            Total Number of Proposals: {numProposals}
          </div>
          <div className={styles.flex}>
            <button 
              className={styles.button}
              onClick={()=> setSelectedTab("Create Proposal")}
              >
                Create Proposal
              </button>
              <button 
                className={styles.button}
                onClick={()=> setSelectedTab("View Proposals")}
                >
                  View Proposals
                </button>
          </div>
          {renderTabs()}
        </div>
        <div>
          <img className={styles.image} src="/cryptodevs/0.svg"/>
        </div>
      </div>
      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs
      </footer>
    </div>
  )
}
