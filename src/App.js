import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import './App.css';
import abiJson3 from "./utils/WavePortal-v3.json"
import abiJson4 from "./utils/WavePortal-v4.json"

const App = () => {

  const [currentAccount, setCurrentAccount] = useState("")
  const [mining, setMining] = useState(false);
  const [gamesCount, setGamesCount] = useState(0);
  const [allWaves, setAllWaves] = useState([])
  const [gameMsg, setGameMsg] = useState("");

  const contracts = [
    {
      "address":"0x94974Ba08ac4A2D384B465D684AD4bd48674A753",
      "abi":abiJson3.abi
    },
    {
      "address":"0x4d3753F9C3ECA62013D36308e99683606DbD085a",
      "abi":abiJson4.abi
    }
  ]

  const contractAddress = contracts.at(-1).address;
  const contractABI = contracts.at(-1).abi;
  // ABI file is in contracts > something.sol > something.json

  const checkIfWalletIsConnected = async () => {
    /*
    * First make sure we have access to window.ethereum
    */
    try {

      const { ethereum } = window;

      if (!ethereum) {
        console.log("Make sure you have metamask!");
        return;
      } else {
        console.log("We have the ethereum object", ethereum);
      }

      /*
      * Check if we're authorized to access the user's wallet.
      * We get the first just in case user has multiple accounts in their wallet
      * IS that good? 
      */
      const accounts = await ethereum.request({method:"eth_accounts"});

      if (accounts.length !==0){
        const account = accounts[0];
        console.log("Found an authorized account:", account);
        setCurrentAccount(account);
      }else{
        console.log("No authorized account found");
      }

      countGames();
      getAllWaves();
      allWavesListener();

    } catch(error){
      console.log(error)
    }
    
  }

  const connectWallet = async () =>{
    try {
      const { ethereum } = window;

      if (!ethereum){
        alert("Get MetaMask you filthy animal!");
        return;
      }

      const accounts = await ethereum.request({ method: "eth_requestAccounts"});

      console.log("Connected", accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch (error){
      console.log(error);
    }
  }

  const countGames = async() =>{
    try{
      const {ethereum} = window;

      if (ethereum){
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        // ethers helps FE talk to contract. 
        // a provider is what we actually use to talk to Eth nodes. 
        // This uses nodes Metamask provides in the background to send/receive from deployed contract
        // https://docs.ethers.io/v5/api/signer/#signers
        let totalGames = 0;
        // contracts.forEach( async (obj, index, arr)=>{
        //   const wavePortalContract = new ethers.Contract(obj.address, obj.abi, signer);
        //   let count = await wavePortalContract.getTotalWaves();
        //   totalGames += count.toNumber()
        // })
        const wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);
        let count = await wavePortalContract.getTotalWaves();
        console.log("Retrieved total wave count...", count.toNumber()); 
        setGamesCount(count.toNumber()); 
        getAllWaves();
        
      }else{
        console.log("Ethereum object doesn't exist!")
      }
    }catch(error){
      console.log(error)
    }
  }

  const wave = async (message="HI MOMO") =>{
    try{
      const {ethereum} = window;

      if (ethereum){
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        // ethers helps FE talk to contract. 
        // a provider is what we actually use to talk to Eth nodes. 
        // This uses nodes Metamask provides in the background to send/receive from deployed contract
        // https://docs.ethers.io/v5/api/signer/#signers
        const wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);
        let count = await wavePortalContract.getTotalWaves();
        console.log("Retrieved total wave count...", count.toNumber());
        setGamesCount(count.toNumber());

        
        // Now actually do the waving
        // we have a min gas limit because of the randomness, so Metamask has a hard time predicting how much gas to spend
        // excess will be refunded
        const waveTxn = await wavePortalContract.wave(message, { gasLimit: 300000 });
        console.log("Mining.......", waveTxn.hash);
        setMining(true);

        // let event = wavePortalContract.NewWave().watch((error, result) =>{
        //   if (!error) console.log(result);
        //   setMining(false);
        // }) 

        wavePortalContract.on("NewWave", (from, timestamp, message) =>{
          console.log(from, timestamp, message);
          console.log(currentAccount)
          if (from === currentAccount){
            console.log("Same account~")
            setMining(false);
          }
        });

        allWavesListener();

        await waveTxn.wait();
        console.log("Mined -- ", waveTxn.hash);
        setMining(false);

        count = await wavePortalContract.getTotalWaves();
        console.log("Retrieved updated wave count...", count.toNumber());
        setGamesCount(count.toNumber());
        
      }else{
        console.log("Ethereum object doesn't exist!")
      }
    }catch(error){
      console.log(error)
      alert("Error with game submission!")
      setMining(false);
    }
  }

  const allWavesListener = async () => {
      try{
            const {ethereum} = window;
            if (ethereum){
              const provider = new ethers.providers.Web3Provider(ethereum);
              const signer = provider.getSigner();
              const wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);

              // call getAllWaves from smart contract
              // const waves = await wavePortalContract.getAllWaves();

            /**
               * Listen in for emitter events!
               */
            wavePortalContract.on("NewWave", (from, timestamp, message) => {
              console.log("NewWave", from, timestamp, message);

              setAllWaves(prevState => [...prevState, {
                address: from,
                timestamp: new Date(timestamp * 1000),
                message: message
              }]);

            });
              
            }else{
              console.log("Can't find ethereum!")
            }
          } catch (error){
            console.log(error);
          }
    }
  

  const getAllWaves = async () =>{
    try{
      const {ethereum} = window;
      if (ethereum){
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);

        // call getAllWaves from smart contract
        const waves = await wavePortalContract.getAllWaves();

        // we only need address, timestamp, msg in UI, so get those
        let wavesCleaned = [];
        waves.forEach( wave => {
          wavesCleaned.push({
            address: wave.waver,
            timestamp: new Date(wave.timestamp * 1000),
            message: wave.message
          });
        });

        setAllWaves(wavesCleaned);
      }else{
        console.log("Can't find ethereum!")
      }
    } catch (error){
      console.log(error);
    }
  }

  const handleChange = (event) =>  {    
    setGameMsg(event.target.value);  
  }
  const handleSubmit = (event) => {
    wave(gameMsg);
    setGameMsg("");
    event.preventDefault();
  }

  /*
  * This runs our function when the page loads.
  */
  useEffect(() => {
    checkIfWalletIsConnected();
  }, [])
  
  return (
    <div  className="mainContainer"  style={{ backgroundImage: `linear-gradient(to right, rgba(0, 224, ${gamesCount}, 1), rgba(0, ${gamesCount}, 255, 1))` }}>
      <div className="dataContainer">
        <div className="header">
        👋 WELCOME TO THE JUNGLE! 🐒
        </div>

        <div className="bio">
          This is a list of fun and games that fellow Etherians/Etherites love to play when not hacking away at the next generation of the internet.
        </div>

    
        <button className="waveButton" onClick={countGames}>
          How many games do we have?
        </button>

        <div>
          Fun and games count: {gamesCount}
        </div>

        <form className="gameForm" onSubmit={handleSubmit}>
          <label>
            Type in your favorite Ethereum game name: 
            <input className="formField" type="text" value={gameMsg} onChange={handleChange} />
          </label>
          <input  className="waveButton" type="submit" value="Play a game"/>
        </form>

        

        {/* If no currentAccount, render this button */}
        {!currentAccount && (
          <button className="waveButton" onClick={connectWallet}>
          Connect Wallet
          </button>
        )}

        {mining && (
          <div className="miningGif">
            <div>MINING THE GOOD STUFF</div>
            <iframe src="https://giphy.com/embed/2Kh8x26EsvgmA" width="480" height="480" frameBorder="0" className="giphy-embed" allowFullScreen></iframe><p><a href="https://giphy.com/gifs/play-mini-digger-2Kh8x26EsvgmA">via GIPHY</a></p>
          </div>
        )}

        {allWaves.map((wave, index)=>{
          return(
            <div key={index} style={{ backgroundColor: "OldLace", marginTop: "16px", padding: "8px" }}>
              <div> Address: {wave.address}</div>
              <div> Time: {wave.timestamp.toString()}</div>
              <div>Message: {wave.message}</div>
            </div>
          )
        })}

      </div>
    </div>
  );
}

export default App