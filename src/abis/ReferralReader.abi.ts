export const ReferralReader = [
  {
    inputs: [
      {
        internalType: 'contract IReferralStorage',
        name: '_referralStorage',
        type: 'address',
      },
      {
        internalType: 'bytes32[]',
        name: '_codes',
        type: 'bytes32[]',
      },
    ],
    name: 'getCodeOwners',
    outputs: [
      {
        internalType: 'address[]',
        name: '',
        type: 'address[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'trader',
        type: 'address',
      },
    ],
    name: 'getTraderStats',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'volume',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'rebates',
            type: 'uint256',
          },
          {
            internalType: 'uint32',
            name: 'trades',
            type: 'uint32',
          },
        ],
        internalType: 'struct ReferralReader.TraderStats',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'referrer',
        type: 'address',
      },
    ],
    name: 'getReferrerStats',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'volume',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'rebates',
            type: 'uint256',
          },
          {
            internalType: 'uint32',
            name: 'referrals',
            type: 'uint32',
          },
        ],
        internalType: 'struct ReferralReader.ReferrerStats',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];
