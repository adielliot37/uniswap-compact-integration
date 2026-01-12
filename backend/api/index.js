const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
app.use(cors());
app.use(express.json());

const COMPACT_ADDRESS = '0x00000000000000171ede64904551eeDF3C6C9788';

const COMPACT_ABI = [
  'function depositNative(bytes12 lockTag, address recipient) external payable returns (uint256)',
  'function depositERC20(address token, bytes12 lockTag, uint256 amount, address recipient) external returns (uint256)',
  'function allocatedTransfer(tuple(bytes allocatorData, uint256 nonce, uint256 expires, uint256 id, tuple(uint256 claimant, uint256 amount)[] recipients) transfer) external returns (bool)',
  'function claim(tuple(bytes allocatorData, bytes sponsorSignature, address sponsor, uint256 nonce, uint256 expires, bytes32 witness, string witnessTypestring, uint256 id, uint256 allocatedAmount, tuple(uint256 claimant, uint256 amount)[] claimants) claimPayload) external returns (bytes32)',
  'function getLockDetails(uint256 id) external view returns (address token, address allocator, uint256 resetPeriod, uint8 scope, bytes12 lockTag)',
  'function balanceOf(address account, uint256 id) external view returns (uint256)',
  'function DOMAIN_SEPARATOR() external view returns (bytes32)'
];

const RPC_URL = process.env.RPC_URL || 'https://mainnet.base.org';
const provider = new ethers.JsonRpcProvider(RPC_URL);

function constructLockTag(allocatorId, resetPeriod, scope) {
  const allocatorIdHex = ethers.toBeHex(allocatorId || 0);
  return ethers.zeroPadValue(allocatorIdHex, 12);
}

function constructResourceLockId(lockTag, tokenAddress) {
  const token = tokenAddress || ethers.ZeroAddress;
  const lockTagHex = ethers.hexlify(lockTag);
  const tokenHex = ethers.hexlify(token);
  const packed = ethers.concat([lockTagHex, ethers.zeroPadValue(tokenHex, 20)]);
  return BigInt(packed);
}

app.get('/api/contract', (req, res) => {
  res.json({
    address: COMPACT_ADDRESS,
    chainId: process.env.CHAIN_ID || '8453'
  });
});

app.get('/api/lock/:id', async (req, res) => {
  try {
    const contract = new ethers.Contract(COMPACT_ADDRESS, COMPACT_ABI, provider);
    const id = req.params.id;
    const details = await contract.getLockDetails(id);
    res.json({
      token: details.token,
      allocator: details.allocator,
      resetPeriod: details.resetPeriod.toString(),
      scope: details.scope,
      lockTag: details.lockTag
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/balance/:address/:id', async (req, res) => {
  try {
    const contract = new ethers.Contract(COMPACT_ADDRESS, COMPACT_ABI, provider);
    const balance = await contract.balanceOf(req.params.address, req.params.id);
    res.json({ balance: balance.toString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/deposit/native', (req, res) => {
  try {
    const { lockTag, recipient } = req.body;
    const contract = new ethers.Contract(COMPACT_ADDRESS, COMPACT_ABI, provider);
    const data = contract.interface.encodeFunctionData('depositNative', [lockTag, recipient]);
    res.json({ to: COMPACT_ADDRESS, data, value: req.body.amount || '0' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/deposit/erc20', (req, res) => {
  try {
    const { token, lockTag, amount, recipient } = req.body;
    const contract = new ethers.Contract(COMPACT_ADDRESS, COMPACT_ABI, provider);
    const data = contract.interface.encodeFunctionData('depositERC20', [token, lockTag, amount, recipient]);
    res.json({ to: COMPACT_ADDRESS, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/withdraw', (req, res) => {
  try {
    const { allocatorData, nonce, expires, id, amount, recipient, claimant } = req.body;
    
    let finalClaimant;
    if (claimant) {
      finalClaimant = claimant;
    } else if (recipient) {
      const zeroLockTag = '0x000000000000000000000000';
      const recipientAddress = ethers.getAddress(recipient);
      const packed = ethers.concat([zeroLockTag, recipientAddress]);
      finalClaimant = BigInt(packed).toString();
    } else {
      throw new Error('Either recipient address or claimant must be provided');
    }
    
    const component = {
      claimant: finalClaimant,
      amount: amount
    };
    
    const transfer = {
      allocatorData: allocatorData || '0x',
      nonce: nonce || 0,
      expires: expires || (Math.floor(Date.now() / 1000) + 3600),
      id: id,
      recipients: [component]
    };
    
    const contract = new ethers.Contract(COMPACT_ADDRESS, COMPACT_ABI, provider);
    const data = contract.interface.encodeFunctionData('allocatedTransfer', [transfer]);
    res.json({ to: COMPACT_ADDRESS, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/claim', (req, res) => {
  try {
    const {
      allocatorData,
      sponsorSignature,
      sponsor,
      nonce,
      expires,
      witness,
      witnessTypestring,
      id,
      allocatedAmount,
      claimants,
      recipient,
      amount
    } = req.body;
    
    let finalClaimants = claimants;
    if (!finalClaimants || finalClaimants.length === 0) {
      if (!recipient || !amount) {
        throw new Error('Either claimants array or recipient+amount must be provided');
      }
      
      const zeroLockTag = '0x000000000000000000000000';
      const recipientAddress = ethers.getAddress(recipient);
      const packed = ethers.concat([zeroLockTag, recipientAddress]);
      const claimant = BigInt(packed).toString();
      
      finalClaimants = [{
        claimant: claimant,
        amount: amount
      }];
    }
    
    const claimPayload = {
      allocatorData: allocatorData || '0x',
      sponsorSignature: sponsorSignature || '0x',
      sponsor: sponsor,
      nonce: nonce,
      expires: expires,
      witness: witness || ethers.ZeroHash,
      witnessTypestring: witnessTypestring || '',
      id: id,
      allocatedAmount: allocatedAmount,
      claimants: finalClaimants
    };
    
    const contract = new ethers.Contract(COMPACT_ADDRESS, COMPACT_ABI, provider);
    const data = contract.interface.encodeFunctionData('claim', [claimPayload]);
    res.json({ to: COMPACT_ADDRESS, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/helpers/locktag', (req, res) => {
  try {
    const { allocatorId, resetPeriod, scope } = req.body;
    const lockTag = constructLockTag(allocatorId || 0, resetPeriod || 0, scope || 1);
    res.json({ lockTag });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/helpers/resource-id', (req, res) => {
  try {
    const { lockTag, tokenAddress } = req.body;
    const id = constructResourceLockId(lockTag, tokenAddress);
    res.json({ id: id.toString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;



