import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import axios from 'axios'
import './index.css'

const COMPACT_ADDRESS = '0x00000000000000171ede64904551eeDF3C6C9788'
const BASE_CHAIN_ID = '8453'
const BASE_CHAIN_NAME = 'Base Mainnet'
const API_URL = import.meta.env.VITE_API_URL || ''

const BASE_NETWORK = {
  chainId: '0x2105',
  chainName: 'Base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://mainnet.base.org'],
  blockExplorerUrls: ['https://basescan.org']
}

const ALLOCATOR_ABI = [
  'constructor()',
  'function attest(address operator, address from, address to, uint256 id, uint256 amount) external pure returns (bytes4)',
  'function authorizeClaim(bytes32 claimHash, address arbiter, address sponsor, uint256 nonce, uint256 expires, uint256[2][] calldata idsAndAmounts, bytes calldata allocatorData) external pure returns (bytes4)',
  'function isClaimAuthorized(bytes32 claimHash, address arbiter, address sponsor, uint256 nonce, uint256 expires, uint256[2][] calldata idsAndAmounts, bytes calldata allocatorData) external pure returns (bool)'
]

const ALLOCATOR_BYTECODE = '0x6080604052348015600e575f5ffd5b506105068061001c5f395ff3fe608060405234801561000f575f5ffd5b5060043610610055575f3560e01c80630111031d146100595780630e1186fc146100775780631a808f91146100a75780637bb023f7146100d7578063bd3d70b714610107575b5f5ffd5b610061610125565b60405161006e91906101b3565b60405180910390f35b610091600480360381019061008c919061034a565b610130565b60405161009e9190610440565b60405180910390f35b6100c160048036038101906100bc9190610459565b610142565b6040516100ce91906101b3565b60405180910390f35b6100f160048036038101906100ec919061034a565b610156565b6040516100fe91906101b3565b60405180910390f35b61010f61016e565b60405161011c91906101b3565b60405180910390f35b631a808f9160e01b81565b5f600190509998505050505050505050565b5f631a808f9160e01b905095945050505050565b5f637bb023f760e01b90509998505050505050505050565b637bb023f760e01b81565b5f7fffffffff0000000000000000000000000000000000000000000000000000000082169050919050565b6101ad81610179565b82525050565b5f6020820190506101c65f8301846101a4565b92915050565b5f5ffd5b5f5ffd5b5f819050919050565b6101e6816101d4565b81146101f0575f5ffd5b50565b5f81359050610201816101dd565b92915050565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f61023082610207565b9050919050565b61024081610226565b811461024a575f5ffd5b50565b5f8135905061025b81610237565b92915050565b5f819050919050565b61027381610261565b811461027d575f5ffd5b50565b5f8135905061028e8161026a565b92915050565b5f5ffd5b5f5ffd5b5f5ffd5b5f5f83601f8401126102b5576102b4610294565b5b8235905067ffffffffffffffff8111156102d2576102d1610298565b5b6020830191508360408202830111156102ee576102ed61029c565b5b9250929050565b5f5f83601f84011261030a57610309610294565b5b8235905067ffffffffffffffff81111561032757610326610298565b5b6020830191508360018202830111156103435761034261029c565b5b9250929050565b5f5f5f5f5f5f5f5f5f60e08a8c031215610367576103666101cc565b5b5f6103748c828d016101f3565b99505060206103858c828d0161024d565b98505060406103968c828d0161024d565b97505060606103a78c828d01610280565b96505060806103b88c828d01610280565b95505060a08a013567ffffffffffffffff8111156103d9576103d86101d0565b5b6103e58c828d016102a0565b945094505060c08a013567ffffffffffffffff811115610408576104076101d0565b5b6104148c828d016102f5565b92509250509295985092959850929598565b5f8115159050919050565b61043a81610426565b82525050565b5f6020820190506104535f830184610431565b92915050565b5f5f5f5f5f60a08688031215610472576104716101cc565b5b5f61047f8882890161024d565b95505060206104908882890161024d565b94505060406104a18882890161024d565b93505060606104b288828901610280565b92505060806104c388828901610280565b915050929550929590935056fea2646970667358221220de19f4ef9f889e113e740fb7262d8bdd8c03ef70160849c77803b39ecca80d7264736f6c634300081e0033'

function App() {
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [account, setAccount] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [isCorrectChain, setIsCorrectChain] = useState(false)
  const [userDisconnected, setUserDisconnected] = useState(false)
  const [activeTab, setActiveTab] = useState('deposit')

  const [depositToken, setDepositToken] = useState('native')
  const [depositTokenAddress, setDepositTokenAddress] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [depositRecipient, setDepositRecipient] = useState('')
  const [allocatorId, setAllocatorId] = useState('0')
  const [resetPeriod, setResetPeriod] = useState('0')
  const [scope, setScope] = useState('1')

  const [withdrawId, setWithdrawId] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawRecipient, setWithdrawRecipient] = useState('')
  const [withdrawNonce, setWithdrawNonce] = useState('0')
  const [withdrawExpires, setWithdrawExpires] = useState('')

  const [claimId, setClaimId] = useState('')
  const [claimAmount, setClaimAmount] = useState('')
  const [claimRecipient, setClaimRecipient] = useState('')
  const [claimSponsor, setClaimSponsor] = useState('')
  const [claimNonce, setClaimNonce] = useState('0')
  const [claimExpires, setClaimExpires] = useState('')
  const [claimAllocatorData, setClaimAllocatorData] = useState('0x')
  const [claimSponsorSignature, setClaimSponsorSignature] = useState('0x')

  const [allocatorAddress, setAllocatorAddress] = useState('')
  const [deployedAllocatorAddress, setDeployedAllocatorAddress] = useState('')
  const [registeredAllocatorId, setRegisteredAllocatorId] = useState('')
  const [isDeploying, setIsDeploying] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  const [status, setStatus] = useState({ type: '', message: '' })

  const checkAndSwitchChain = async (currentChainId) => {
    if (currentChainId === BASE_CHAIN_ID) {
      setIsCorrectChain(true)
      if (account) {
        setStatus({ type: 'success', message: `Connected to ${BASE_CHAIN_NAME}` })
      }
    } else {
      setIsCorrectChain(false)
      if (account) {
        setStatus({ type: 'error', message: `Please switch to ${BASE_CHAIN_NAME}` })
      }
    }
  }

  const refreshConnection = async (ethProvider, showStatus = true) => {
    const browserProvider = new ethers.BrowserProvider(ethProvider, 'any')
    const signerInstance = await browserProvider.getSigner()
    const address = await signerInstance.getAddress()
    const network = await browserProvider.getNetwork()
    const currentChainId = network.chainId.toString()

    setProvider(browserProvider)
    setSigner(signerInstance)
    setAccount(address)
    setChainId(currentChainId)
    await checkAndSwitchChain(currentChainId)
    if (showStatus) {
      setStatus({ type: 'success', message: `Connected to ${BASE_CHAIN_NAME}` })
    }
  }

  useEffect(() => {
    if (userDisconnected) return

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleInjectedAccountsChanged)
      window.ethereum.on('chainChanged', handleInjectedChainChanged)

      const checkInitialChain = async () => {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' })
          if (accounts.length > 0 && !account && !userDisconnected) {
            await refreshConnection(window.ethereum, false)
          }
        } catch (error) {}
      }
      checkInitialChain()
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleInjectedAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleInjectedChainChanged)
      }
    }
  }, [account, userDisconnected])

  const handleInjectedAccountsChanged = (accounts) => {
    if (userDisconnected) return
    if (accounts.length === 0) {
      setAccount(null)
      setSigner(null)
    } else {
      refreshConnection(window.ethereum).catch(() => {})
    }
  }

  const handleInjectedChainChanged = (chainIdHex) => {
    const newChainId = parseInt(chainIdHex, 16).toString()
    setChainId(newChainId)
    checkAndSwitchChain(newChainId)
  }


  const switchToBase = async () => {
    try {
      if (!window.ethereum) {
        setStatus({ type: 'error', message: 'No wallet provider found. Please connect a wallet first.' })
        return false
      }
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_NETWORK.chainId }]
      })
      return true
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [BASE_NETWORK]
          })
          return true
        } catch (addError) {
          setStatus({ type: 'error', message: `Failed to add Base: ${addError.message}` })
          return false
        }
      } else {
        setStatus({ type: 'error', message: `Failed to switch: ${switchError.message}` })
        return false
      }
    }
  }

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setStatus({ type: 'error', message: 'Please install MetaMask or another Web3 wallet extension.' })
        return
      }
      setUserDisconnected(false)
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      await refreshConnection(window.ethereum)
    } catch (error) {
      if (error.code === 4001) {
        setStatus({ type: 'error', message: 'Connection rejected by user' })
      } else {
        setStatus({ type: 'error', message: `Connection failed: ${error.message}` })
      }
    }
  }

  const disconnect = async () => {
    setUserDisconnected(true)
    setAccount(null)
    setSigner(null)
    setProvider(null)
    setChainId(null)
    setIsCorrectChain(false)
    setStatus({ type: 'info', message: 'Disconnected from wallet' })
  }

  const deployAllocator = async () => {
    if (!signer || !account) {
      setStatus({ type: 'error', message: 'Please connect your wallet first' })
      return
    }
    if (!isCorrectChain) {
      setStatus({ type: 'error', message: `Please switch to ${BASE_CHAIN_NAME} first` })
      return
    }

    try {
      setIsDeploying(true)
      setStatus({ type: 'info', message: 'Deploying AlwaysOKAllocator contract... Please confirm in MetaMask' })

      const factory = new ethers.ContractFactory(ALLOCATOR_ABI, ALLOCATOR_BYTECODE, signer)
      const contract = await factory.deploy()
      
      setStatus({ type: 'info', message: 'Waiting for deployment confirmation...' })
      await contract.waitForDeployment()
      
      const address = await contract.getAddress()
      setDeployedAllocatorAddress(address)
      setAllocatorAddress(address)
      setStatus({ type: 'success', message: `Allocator deployed at: ${address}` })
    } catch (error) {
      setStatus({ type: 'error', message: `Deployment failed. Try using Remix IDE instead: ${error.message}` })
    } finally {
      setIsDeploying(false)
    }
  }

  const registerAllocator = async () => {
    if (!signer || !account) {
      setStatus({ type: 'error', message: 'Please connect your wallet first' })
      return
    }
    if (!isCorrectChain) {
      setStatus({ type: 'error', message: `Please switch to ${BASE_CHAIN_NAME} first` })
      return
    }
    if (!allocatorAddress) {
      setStatus({ type: 'error', message: 'Please enter allocator address' })
      return
    }

    try {
      setIsRegistering(true)
      setStatus({ type: 'info', message: 'Registering allocator with The Compact...' })

      const compactAbi = [
        'function __registerAllocator(address allocator, bytes calldata proof) external returns (uint96 allocatorId)',
        'event AllocatorRegistered(uint96 indexed allocatorId, address indexed allocator)'
      ]
      const compact = new ethers.Contract(COMPACT_ADDRESS, compactAbi, signer)
      
      const tx = await compact.__registerAllocator(allocatorAddress, '0x')
      setStatus({ type: 'info', message: 'Waiting for confirmation...' })
      
      const receipt = await tx.wait()
      
      if (receipt && receipt.logs) {
        const allocatorRegisteredTopic = ethers.id('AllocatorRegistered(uint96,address)')
        const log = receipt.logs.find(l => l && l.topics && l.topics[0] === allocatorRegisteredTopic)
        
        if (log && log.topics && log.topics[1]) {
          try {
            const allocatorIdBigInt = BigInt(log.topics[1])
            setRegisteredAllocatorId(allocatorIdBigInt.toString())
            setAllocatorId(allocatorIdBigInt.toString())
            setStatus({ type: 'success', message: `Allocator registered! ID: ${allocatorIdBigInt.toString()}` })
          } catch (parseError) {
            setStatus({ type: 'success', message: 'Allocator registered! Check transaction logs for ID.' })
          }
        } else {
          try {
            const parsedLogs = receipt.logs.map(log => {
              try {
                return compact.interface.parseLog(log)
              } catch {
                return null
              }
            }).filter(Boolean)
            
            const allocatorEvent = parsedLogs.find(log => log && log.name === 'AllocatorRegistered')
            if (allocatorEvent && allocatorEvent.args && allocatorEvent.args[0] !== undefined) {
              const allocatorIdBigInt = BigInt(allocatorEvent.args[0].toString())
              setRegisteredAllocatorId(allocatorIdBigInt.toString())
              setAllocatorId(allocatorIdBigInt.toString())
              setStatus({ type: 'success', message: `Allocator registered! ID: ${allocatorIdBigInt.toString()}` })
            } else {
              setStatus({ type: 'success', message: 'Allocator registered! Check transaction logs for ID.' })
            }
          } catch (parseError) {
            setStatus({ type: 'success', message: 'Allocator registered! Check transaction logs for ID.' })
          }
        }
      } else {
        setStatus({ type: 'success', message: 'Allocator registered! Check transaction logs for ID.' })
      }
    } catch (error) {
      setStatus({ type: 'error', message: `Registration failed: ${error.message}` })
    } finally {
      setIsRegistering(false)
    }
  }

  const constructLockTag = async () => {
    const response = await axios.post(`${API_URL}/api/helpers/locktag`, {
      allocatorId: allocatorId || 0,
      resetPeriod: resetPeriod || 0,
      scope: scope || 1
    })
    return response.data.lockTag
  }

  const deposit = async () => {
    if (!signer || !account) {
      setStatus({ type: 'error', message: 'Please connect your wallet first' })
      return
    }
    if (!isCorrectChain) {
      setStatus({ type: 'error', message: `Please switch to ${BASE_CHAIN_NAME} first` })
      return
    }

    try {
      setStatus({ type: 'info', message: 'Preparing deposit...' })
      const lockTag = await constructLockTag()
      const recipient = depositRecipient || account
      const amount = depositAmount

      let tx
      if (depositToken === 'native') {
        const response = await axios.post(`${API_URL}/api/deposit/native`, { lockTag, recipient, amount })
        tx = await signer.sendTransaction({
          to: response.data.to,
          data: response.data.data,
          value: ethers.parseEther(amount)
        })
      } else {
        if (!depositTokenAddress) {
          setStatus({ type: 'error', message: 'Please enter token address' })
          return
        }
        const erc20Abi = ['function approve(address spender, uint256 amount) external returns (bool)']
        const tokenContract = new ethers.Contract(depositTokenAddress, erc20Abi, signer)
        const approveTx = await tokenContract.approve(COMPACT_ADDRESS, ethers.parseUnits(amount, 18))
        await approveTx.wait()
        setStatus({ type: 'info', message: 'Token approved, depositing...' })

        const response = await axios.post(`${API_URL}/api/deposit/erc20`, {
          token: depositTokenAddress,
          lockTag,
          amount: ethers.parseUnits(amount, 18).toString(),
          recipient
        })
        tx = await signer.sendTransaction({ to: response.data.to, data: response.data.data })
      }

      setStatus({ type: 'info', message: `Transaction sent: ${tx.hash}` })
      const receipt = await tx.wait()
      setStatus({ type: 'success', message: `Deposit successful! TX: ${receipt.hash}` })
      setDepositAmount('')
    } catch (error) {
      setStatus({ type: 'error', message: `Deposit failed: ${error.message}` })
    }
  }

  const withdraw = async () => {
    if (!signer || !account) {
      setStatus({ type: 'error', message: 'Please connect your wallet first' })
      return
    }
    if (!isCorrectChain) {
      setStatus({ type: 'error', message: `Please switch to ${BASE_CHAIN_NAME} first` })
      return
    }

    try {
      setStatus({ type: 'info', message: 'Preparing withdrawal...' })
      const id = withdrawId
      const amount = withdrawAmount
      const recipient = withdrawRecipient || account
      const nonce = withdrawNonce || '0'
      const expires = withdrawExpires || (Math.floor(Date.now() / 1000) + 3600).toString()

      const zeroLockTag = '0x000000000000000000000000'
      const recipientAddress = ethers.getAddress(recipient)
      const packed = ethers.concat([zeroLockTag, recipientAddress])
      const claimant = BigInt(packed).toString()

      const response = await axios.post(`${API_URL}/api/withdraw`, {
        allocatorData: '0x',
        nonce,
        expires,
        id,
        amount: ethers.parseEther(amount).toString(),
        recipient,
        claimant
      })

      const tx = await signer.sendTransaction({ to: response.data.to, data: response.data.data })
      setStatus({ type: 'info', message: `Transaction sent: ${tx.hash}` })
      const receipt = await tx.wait()
      setStatus({ type: 'success', message: `Withdrawal successful! TX: ${receipt.hash}` })
      setWithdrawAmount('')
    } catch (error) {
      setStatus({ type: 'error', message: `Withdrawal failed: ${error.message}` })
    }
  }

  const claim = async () => {
    if (!signer || !account) {
      setStatus({ type: 'error', message: 'Please connect your wallet first' })
      return
    }
    if (!isCorrectChain) {
      setStatus({ type: 'error', message: `Please switch to ${BASE_CHAIN_NAME} first` })
      return
    }

    try {
      setStatus({ type: 'info', message: 'Preparing claim...' })
      const id = claimId
      const amount = claimAmount
      const recipient = claimRecipient || account
      const sponsor = claimSponsor || account
      const nonce = claimNonce || '0'
      const expires = claimExpires || (Math.floor(Date.now() / 1000) + 3600).toString()

      const zeroLockTag = '0x000000000000000000000000'
      const recipientAddress = ethers.getAddress(recipient)
      const packed = ethers.concat([zeroLockTag, recipientAddress])
      const claimant = BigInt(packed).toString()

      const claimants = [{ claimant, amount: ethers.parseEther(amount).toString() }]

      const response = await axios.post(`${API_URL}/api/claim`, {
        allocatorData: claimAllocatorData || '0x',
        sponsorSignature: claimSponsorSignature || '0x',
        sponsor,
        nonce,
        expires,
        witness: ethers.ZeroHash,
        witnessTypestring: '',
        id,
        allocatedAmount: ethers.parseEther(amount).toString(),
        claimants
      })

      const tx = await signer.sendTransaction({ to: response.data.to, data: response.data.data })
      setStatus({ type: 'info', message: `Transaction sent: ${tx.hash}` })
      const receipt = await tx.wait()
      setStatus({ type: 'success', message: `Claim successful! TX: ${receipt.hash}` })
      setClaimAmount('')
    } catch (error) {
      setStatus({ type: 'error', message: `Claim failed: ${error.message}` })
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Uniswap Compact Integration</h1>
        <p className="subtitle">Deposit, withdraw, and claim assets using The Compact protocol on Base</p>
      </header>

      {!account ? (
        <div className="connect-section">
          <div className="info-box">
            <h3>What is The Compact?</h3>
            <p>The Compact is a protocol for creating resource locks - ERC6909 tokens that represent deposited assets. 
            These locks can be used to create conditional claims, allowing secure token transfers with allocator approval.</p>
            <h4>Getting Started:</h4>
            <ol>
              <li>Connect your wallet using the buttons below</li>
              <li>Switch to Base Mainnet if prompted</li>
              <li>Deploy or register an allocator (optional for testing)</li>
              <li>Deposit assets to create a resource lock</li>
              <li>Withdraw or claim your assets</li>
            </ol>
          </div>
          <div className="connect-actions">
            <button className="connect-btn" onClick={connectWallet}>Connect Wallet</button>
          </div>
          {status.message && <div className={`status ${status.type}`}>{status.message}</div>}
        </div>
      ) : (
        <div className="main-content">
          <div className="wallet-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div className="wallet-info">
                  <span className="label">Wallet:</span>
                  <span className="value">{account?.slice(0, 6)}...{account?.slice(-4)}</span>
                </div>
                <div className="wallet-info">
                  <span className="label">Network:</span>
                  <span className={`value ${isCorrectChain ? 'success' : 'error'}`}>
                    {isCorrectChain ? BASE_CHAIN_NAME : `Wrong Network (${chainId})`}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {!isCorrectChain && (
                  <button className="switch-btn" onClick={switchToBase}>Switch to Base</button>
                )}
                <button className="switch-btn" onClick={disconnect} style={{ background: '#7f1d1d' }}>Disconnect</button>
              </div>
            </div>
          </div>

          {status.message && <div className={`status ${status.type}`}>{status.message}</div>}

          <div className="tabs">
            <button className={`tab ${activeTab === 'allocator' ? 'active' : ''}`} onClick={() => setActiveTab('allocator')}>
              Setup Allocator
            </button>
            <button className={`tab ${activeTab === 'deposit' ? 'active' : ''}`} onClick={() => setActiveTab('deposit')}>
              Deposit
            </button>
            <button className={`tab ${activeTab === 'withdraw' ? 'active' : ''}`} onClick={() => setActiveTab('withdraw')}>
              Withdraw
            </button>
            <button className={`tab ${activeTab === 'claim' ? 'active' : ''}`} onClick={() => setActiveTab('claim')}>
              Claim
            </button>
          </div>

          {activeTab === 'allocator' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Allocator Setup</h2>
                <p className="description">
                  An allocator is required to deposit assets. If you don't have one, you can deploy the 
                  <strong> AlwaysOKAllocator</strong> for testing - it approves all transfers automatically.
                </p>
              </div>

              <div className="card">
                <h3>Option 1: Deploy Test Allocator</h3>
                <p className="hint">Deploy an AlwaysOKAllocator contract for testing. This allocator approves all operations automatically.</p>
                <button 
                  onClick={deployAllocator} 
                  disabled={!isCorrectChain || isDeploying}
                  className="action-btn"
                >
                  {isDeploying ? 'Deploying...' : 'Deploy AlwaysOKAllocator'}
                </button>
                {deployedAllocatorAddress && (
                  <div className="result success">
                    <span className="label">Deployed Address:</span>
                    <code>{deployedAllocatorAddress}</code>
                    <p className="hint">Now register this allocator below to get an Allocator ID.</p>
                  </div>
                )}
                <details>
                  <summary>Alternative: Deploy via Remix IDE</summary>
                  <div>
                    <p>If frontend deployment fails, use Remix:</p>
                    <ol>
                      <li>Go to <a href="https://remix.ethereum.org" target="_blank" rel="noopener noreferrer">remix.ethereum.org</a></li>
                      <li>Create AlwaysOKAllocator.sol with the contract code</li>
                      <li>Compile with Solidity 0.8.x</li>
                      <li>Deploy to Base Mainnet</li>
                      <li>Copy the deployed address and paste below</li>
                    </ol>
                  </div>
                </details>
              </div>

              <div className="card">
                <h3>Option 2: Register Existing Allocator</h3>
                <p className="hint">If you already have an allocator contract, enter its address to register it with The Compact.</p>
                <div className="form-group">
                  <label>Allocator Address</label>
                  <input
                    type="text"
                    value={allocatorAddress}
                    onChange={(e) => setAllocatorAddress(e.target.value)}
                    placeholder="0x..."
                  />
                </div>
                <button 
                  onClick={registerAllocator} 
                  disabled={!isCorrectChain || isRegistering || !allocatorAddress}
                  className="action-btn"
                >
                  {isRegistering ? 'Registering...' : 'Register Allocator'}
                </button>
                {registeredAllocatorId && (
                  <div className="result success">
                    <span className="label">Allocator ID:</span>
                    <code>{registeredAllocatorId}</code>
                    <p className="hint">Use this ID when depositing assets.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'deposit' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Deposit Assets</h2>
                <p className="description">
                  Deposit ETH or ERC20 tokens to create a resource lock. The lock ID can be used later to withdraw or claim.
                </p>
              </div>

              <div className="card">
                <div className="form-group">
                  <label>Token Type</label>
                  <select value={depositToken} onChange={(e) => setDepositToken(e.target.value)}>
                    <option value="native">Native ETH</option>
                    <option value="erc20">ERC20 Token</option>
                  </select>
                </div>

                {depositToken === 'erc20' && (
                  <div className="form-group">
                    <label>Token Address</label>
                    <input
                      type="text"
                      value={depositTokenAddress}
                      onChange={(e) => setDepositTokenAddress(e.target.value)}
                      placeholder="0x..."
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Amount</label>
                  <input
                    type="text"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Recipient (optional)</label>
                  <input
                    type="text"
                    value={depositRecipient}
                    onChange={(e) => setDepositRecipient(e.target.value)}
                    placeholder="Defaults to your address"
                  />
                  <span className="hint">Leave empty to deposit to your own address</span>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Allocator ID</label>
                    <input
                      type="text"
                      value={allocatorId}
                      onChange={(e) => setAllocatorId(e.target.value)}
                      placeholder="0"
                    />
                    <span className="hint">From allocator registration</span>
                  </div>

                  <div className="form-group">
                    <label>Reset Period (0-7)</label>
                    <input
                      type="text"
                      value={resetPeriod}
                      onChange={(e) => setResetPeriod(e.target.value)}
                      placeholder="0"
                    />
                    <span className="hint">Lock duration tier</span>
                  </div>

                  <div className="form-group">
                    <label>Scope</label>
                    <select value={scope} onChange={(e) => setScope(e.target.value)}>
                      <option value="1">Single Chain</option>
                      <option value="0">Multichain</option>
                    </select>
                  </div>
                </div>

                <button onClick={deposit} disabled={!isCorrectChain} className="action-btn primary">
                  Deposit
                </button>
              </div>
            </div>
          )}

          {activeTab === 'withdraw' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Withdraw Assets</h2>
                <p className="description">
                  Withdraw your deposited assets back to your wallet. You need the resource lock ID from your deposit.
                </p>
              </div>

              <div className="card">
                <div className="form-group">
                  <label>Resource Lock ID</label>
                  <input
                    type="text"
                    value={withdrawId}
                    onChange={(e) => setWithdrawId(e.target.value)}
                    placeholder="From deposit transaction"
                  />
                  <span className="hint">Find this in your deposit transaction logs</span>
                </div>

                <div className="form-group">
                  <label>Amount</label>
                  <input
                    type="text"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Recipient (optional)</label>
                  <input
                    type="text"
                    value={withdrawRecipient}
                    onChange={(e) => setWithdrawRecipient(e.target.value)}
                    placeholder="Defaults to your address"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Nonce</label>
                    <input
                      type="text"
                      value={withdrawNonce}
                      onChange={(e) => setWithdrawNonce(e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-group">
                    <label>Expires (Unix timestamp)</label>
                    <input
                      type="text"
                      value={withdrawExpires}
                      onChange={(e) => setWithdrawExpires(e.target.value)}
                      placeholder="Auto: 1 hour from now"
                    />
                  </div>
                </div>

                <button onClick={withdraw} disabled={!isCorrectChain} className="action-btn primary">
                  Withdraw
                </button>
              </div>
            </div>
          )}

          {activeTab === 'claim' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Claim Assets</h2>
                <p className="description">
                  Claim assets to a different address. This allows a sponsor to authorize transfers to any recipient.
                </p>
              </div>

              <div className="card">
                <div className="form-group">
                  <label>Resource Lock ID</label>
                  <input
                    type="text"
                    value={claimId}
                    onChange={(e) => setClaimId(e.target.value)}
                    placeholder="Resource lock ID"
                  />
                </div>

                <div className="form-group">
                  <label>Amount</label>
                  <input
                    type="text"
                    value={claimAmount}
                    onChange={(e) => setClaimAmount(e.target.value)}
                    placeholder="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Recipient Address</label>
                  <input
                    type="text"
                    value={claimRecipient}
                    onChange={(e) => setClaimRecipient(e.target.value)}
                    placeholder="Address to receive tokens"
                  />
                  <span className="hint">Can be different from sponsor</span>
                </div>

                <div className="form-group">
                  <label>Sponsor Address</label>
                  <input
                    type="text"
                    value={claimSponsor}
                    onChange={(e) => setClaimSponsor(e.target.value)}
                    placeholder="Token owner address"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Nonce</label>
                    <input
                      type="text"
                      value={claimNonce}
                      onChange={(e) => setClaimNonce(e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-group">
                    <label>Expires</label>
                    <input
                      type="text"
                      value={claimExpires}
                      onChange={(e) => setClaimExpires(e.target.value)}
                      placeholder="Auto: 1 hour"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Allocator Data (hex)</label>
                  <input
                    type="text"
                    value={claimAllocatorData}
                    onChange={(e) => setClaimAllocatorData(e.target.value)}
                    placeholder="0x"
                  />
                </div>

                <div className="form-group">
                  <label>Sponsor Signature (hex)</label>
                  <input
                    type="text"
                    value={claimSponsorSignature}
                    onChange={(e) => setClaimSponsorSignature(e.target.value)}
                    placeholder="0x"
                  />
                </div>

                <button onClick={claim} disabled={!isCorrectChain} className="action-btn primary">
                  Claim
                </button>
              </div>
            </div>
          )}

          <div className="info-footer">
            <p><strong>Compact Contract:</strong> <code>{COMPACT_ADDRESS}</code></p>
            <p><strong>Network:</strong> Base Mainnet (Chain ID: 8453)</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
