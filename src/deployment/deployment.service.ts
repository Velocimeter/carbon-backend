// deployment.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventTypes } from '../events/event-types';

export const NATIVE_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

export enum BlockchainType {
  Ethereum = 'ethereum',
  Sei = 'sei-network',
  Celo = 'celo',
  Blast = 'blast',
  Base = 'base',
  Fantom = 'fantom',
  Linea = 'linea',
  Iota = 'iota-evm',
  Mantle = 'mantle',
  Berachain = 'berachain',
  Sonic = 'sonic',
}

export enum ExchangeId {
  OGEthereum = 'ethereum',
  OGSei = 'sei',
  OGCelo = 'celo',
  OGBlast = 'blast',
  OGBase = 'base',
  OGFantom = 'fantom',
  OGLinea = 'linea',
  OGIota = 'iota',
  OGMantle = 'mantle',
  OGBerachain = 'berachain',
  OGSonic = 'sonic',
}

export interface GasToken {
  name: string;
  symbol: string;
  address: string;
}

export interface Deployment {
  exchangeId: ExchangeId;
  blockchainType: BlockchainType;
  rpcEndpoint: string;
  harvestEventsBatchSize: number;
  harvestConcurrency: number;
  harvestSleep?: number;
  multicallAddress: string;
  gasToken: GasToken;
  startBlock: number;
  nativeTokenAlias?: string;
  contracts: {
    [contractName: string]: {
      address: string;
    };
  };
  notifications?: {
    explorerUrl: string;
    carbonWalletUrl: string;
    disabledEvents?: EventTypes[];
    regularGroupEvents?: EventTypes[];
    title: string;
    telegram: {
      botToken: string;
      bancorProtectionToken?: string;
      threads: {
        carbonThreadId: number;
        fastlaneId: number;
        vortexId: number;
        bancorProtectionId?: number;
      };
    };
  };
}

@Injectable()
export class DeploymentService {
  private deployments: Deployment[];
  private activeDeploymentTypes: Set<BlockchainType> = new Set();

  constructor(private configService: ConfigService) {
    this.deployments = this.initializeDeployments();
    // Initialize only specific deployments as active
    this.setActiveDeployments([
       BlockchainType.Base,
         BlockchainType.Berachain,
      //   BlockchainType.Fantom,
       BlockchainType.Mantle,
       BlockchainType.Sonic,
       BlockchainType.Iota,
    ]);
  }

  private initializeDeployments(): Deployment[] {
    return [
      {
        exchangeId: ExchangeId.OGIota,
        blockchainType: BlockchainType.Iota,
        rpcEndpoint: this.configService.get('IOTA_RPC_ENDPOINT'),
        harvestEventsBatchSize: 2000,
        harvestConcurrency: 10, 
        multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
        startBlock: 1936731,
        gasToken: {
          name: 'IOTA',
          symbol: 'IOTA',
          address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        },
        nativeTokenAlias: '0x6e47f8d48a01b44df3fff35d258a10a3aedc114c',
        contracts: {
          CarbonController: {
            address: '0xC537e898CD774e2dCBa3B14Ea6f34C93d5eA45e1',
          },
          CarbonVortex: {
            address: '0xD053Dcd7037AF7204cecE544Ea9F227824d79801',
          },
          CarbonPOL: {
            address: '0xD06146D292F9651C1D7cf54A3162791DFc2bEf46',
          },
          CarbonVoucher: {
            address: '0x3660F04B79751e31128f6378eAC70807e38f554E',
          },
          BancorArbitrage: {
            address: '0x41Eeba3355d7D6FF628B7982F3F9D055c39488cB',
          },
          LiquidityProtectionStore: {
            address: '0xf5FAB5DBD2f3bf675dE4cB76517d4767013cfB55',
          },
        },
        notifications: {
          explorerUrl: this.configService.get('ETHEREUM_EXPLORER_URL'),
          carbonWalletUrl: this.configService.get('ETHEREUM_CARBON_WALLET_URL'),
          title: 'Ethereum',
          regularGroupEvents: [EventTypes.ProtectionRemovedEvent],
          telegram: {
            botToken: this.configService.get('ETHEREUM_TELEGRAM_BOT_TOKEN'),
            bancorProtectionToken: this.configService.get('ETHEREUM_BANCOR_PROTECTION_TOKEN'),
            threads: {
              carbonThreadId: this.configService.get('ETHEREUM_CARBON_THREAD_ID'),
              fastlaneId: this.configService.get('ETHEREUM_FASTLANE_THREAD_ID'),
              vortexId: this.configService.get('ETHEREUM_VORTEX_THREAD_ID'),
              bancorProtectionId: this.configService.get('ETHEREUM_BANCOR_PROTECTION_THREAD_ID'),
            },
          },
        },
      },
      { 
        exchangeId: ExchangeId.OGBase,
        blockchainType: BlockchainType.Base,
        rpcEndpoint: this.configService.get('BASE_RPC_ENDPOINT'),
        harvestEventsBatchSize: 1000,
        harvestConcurrency: 5,
        multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
        startBlock: 5314581,
        gasToken: {
          name: 'BASE',
          symbol: 'BASE',
          address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        },  
        nativeTokenAlias: '0x4200000000000000000000000000000000000006',
        contracts: {
          CarbonController: {
            address: '0xfbF069Dbbf453C1ab23042083CFa980B3a672BbA',
          },
          CarbonVoucher: {
            address: '0x907F03ae649581EBFF369a21C587cb8F154A0B84',  // Replace with actual contract address
          },
          BancorArbitrage: {
            address: '0x0000000000000000000000000000000000000000',  // Replace with actual contract address
          },
          ReferralStorage: {
            address: '0x09D3EBd3B1Edf0c5AACE694796CB446E8F594a29',
          },
          ReferralReader: {
            address: '0x264978bE88bd4b209Cb18DBDe66eE43472559463',
          },
        },
        notifications: {
          explorerUrl: this.configService.get('BASE_EXPLORER_URL'),
          carbonWalletUrl: this.configService.get('BASE_CARBON_WALLET_URL'),
          title: 'Base',
          telegram: {
            botToken: this.configService.get('BASE_TELEGRAM_BOT_TOKEN'),
            threads: {
              carbonThreadId: this.configService.get('BASE_CARBON_THREAD_ID'),
              fastlaneId: this.configService.get('BASE_FASTLANE_THREAD_ID'),
              vortexId: this.configService.get('BASE_VORTEX_THREAD_ID'),
            },
          },
        },
      },
      {
        exchangeId: ExchangeId.OGMantle,
        blockchainType: BlockchainType.Mantle,
        rpcEndpoint: this.configService.get('MANTLE_RPC_ENDPOINT'),
        harvestEventsBatchSize: 5000,
        harvestConcurrency: 10,
        multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
        startBlock: 69829239,
        gasToken: {
          name: 'MNT',
          symbol: 'MNT',
          address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        },
        nativeTokenAlias: '0x78c1b0c915c4faa5fffa6cabf0219da63d7f4cb8',
        contracts: {
          CarbonController: {
            address: '0xe4816658ad10bF215053C533cceAe3f59e1f1087',
          },
          CarbonVoucher: {
            address: '0xA4682A2A5Fe02feFF8Bd200240A41AD0E6EaF8d5',
          },
          BancorArbitrage: {
            address: '0xC56Eb3d03C5D7720DAf33a3718affb9BcAb03FBc',
          },
          CarbonVortex: {
            address: '0x5715203B16F15d7349Cb1E3537365E9664EAf933',
          },
          ReferralStorage: {
            address: '0x09D3EBd3B1Edf0c5AACE694796CB446E8F594a29',
          },
          ReferralReader: {
            address: '0x264978bE88bd4b209Cb18DBDe66eE43472559463',
          },
        },
        notifications: {
          explorerUrl: this.configService.get('SEI_EXPLORER_URL'),
          carbonWalletUrl: this.configService.get('SEI_CARBON_WALLET_URL'),
          title: 'Sei',
          telegram: {
            botToken: this.configService.get('SEI_TELEGRAM_BOT_TOKEN'),
            threads: {
              carbonThreadId: this.configService.get('SEI_CARBON_THREAD_ID'),
              fastlaneId: this.configService.get('SEI_FASTLANE_THREAD_ID'),
              vortexId: this.configService.get('SEI_VORTEX_THREAD_ID'),
            },
          },
        },
      },
      {
        exchangeId: ExchangeId.OGSonic,
        blockchainType: BlockchainType.Sonic,
        rpcEndpoint: this.configService.get('SONIC_RPC_ENDPOINT'),
        harvestEventsBatchSize: 20000,
        harvestConcurrency: 10,
        multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
        startBlock: 11025601,
        gasToken: {
          name: 'SONIC',
          symbol: 'SONIC',
          address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        },
        nativeTokenAlias: '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38',
        contracts: {
          CarbonController: {
            address: '0x10Fa549E70Ede76C258c0808b289e4Ac3c9ab2e2',
          },
          CarbonVoucher: {
            address: '0x248594Be9BE605905B8912cf575f03fE42d89054',  // Replace with actual contract address
          },
          BancorArbitrage: {
            address: '0x0000000000000000000000000000000000000000',  // Replace with actual contract address
          },
          CarbonVortex: {
            address: '0x248594Be9BE605905B8912cf575f03fE42d89054',  // Replace with actual contract address
          },
        },
      },
      {
        exchangeId: ExchangeId.OGBerachain,
        blockchainType: BlockchainType.Berachain,
        rpcEndpoint: this.configService.get('BERACHAIN_RPC_ENDPOINT'),
        harvestEventsBatchSize: 5000,
        harvestConcurrency: 5,
        multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
        startBlock: 1377587,
        gasToken: {
          name: 'Berachain',
          symbol: 'BERA',
          address: NATIVE_TOKEN,
        },
        nativeTokenAlias: '0x6969696969696969696969696969696969696969',
        contracts: {
          CarbonController: {
            address: '0x10Fa549E70Ede76C258c0808b289e4Ac3c9ab2e2',
          },
          CarbonVoucher: {
            address: '0x248594Be9BE605905B8912cf575f03fE42d89054',  // Replace with actual contract address
          },
          CarbonVortex: {
            address: '0x089c1A38c7616DB8d5f5beb5F311FD3f130E4463',  // updated other one was incorrect
          },
          ReferralStorage: {
            address: '0x09D3EBd3B1Edf0c5AACE694796CB446E8F594a29',
          },
          ReferralReader: {
            address: '0x264978bE88bd4b209Cb18DBDe66eE43472559463',
          },
        },
      },
      {
        exchangeId: ExchangeId.OGFantom,
        blockchainType: BlockchainType.Fantom,
        rpcEndpoint: this.configService.get('FANTOM_RPC_ENDPOINT'),
        harvestEventsBatchSize: 5000,
        harvestConcurrency: 10,
        multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
        startBlock: 1375430,
        gasToken: {
          name: 'Fantom',
          symbol: 'FTM',
          address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        },
        nativeTokenAlias: '0x0000000000000000000000000000000000000000',
        contracts: {
          CarbonController: {
            address: this.configService.get('FANTOM_CARBON_CONTROLLER_ADDRESS', '0x0000000000000000000000000000000000000000'),
          },
          CarbonVoucher: {
            address: this.configService.get('FANTOM_CARBON_VOUCHER_ADDRESS', '0x0000000000000000000000000000000000000000'),
          },
          BancorArbitrage: {
            address: this.configService.get('FANTOM_BANCOR_ARBITRAGE_ADDRESS', '0x0000000000000000000000000000000000000000'),
          },
          ReferralStorage: {
            address: this.configService.get('FANTOM_REFERRAL_STORAGE_ADDRESS', '0x09D3EBd3B1Edf0c5AACE694796CB446E8F594a29'),
          },
          ReferralReader: {
            address: this.configService.get('FANTOM_REFERRAL_READER_ADDRESS', '0x264978bE88bd4b209Cb18DBDe66eE43472559463'),
          },
        },
        notifications: {
          explorerUrl: this.configService.get('FANTOM_EXPLORER_URL'),
          carbonWalletUrl: this.configService.get('FANTOM_CARBON_WALLET_URL'),
          title: 'Fantom',
          telegram: {
            botToken: this.configService.get('FANTOM_TELEGRAM_BOT_TOKEN'),
            threads: {
              carbonThreadId: this.configService.get('FANTOM_CARBON_THREAD_ID'),
              fastlaneId: this.configService.get('FANTOM_FASTLANE_THREAD_ID'),
              vortexId: this.configService.get('FANTOM_VORTEX_THREAD_ID'),
            },
          },
        },
      },
    ];
  }

  getDeployments(): Deployment[] {
    return this.deployments.filter(d => this.activeDeploymentTypes.has(d.blockchainType));
  }

  setActiveDeployments(blockchainTypes: BlockchainType[]) {
    this.activeDeploymentTypes = new Set(blockchainTypes);
  }

  enableDeployment(blockchainType: BlockchainType) {
    this.activeDeploymentTypes.add(blockchainType);
  }

  disableDeployment(blockchainType: BlockchainType) {
    this.activeDeploymentTypes.delete(blockchainType);
  }

  getDeploymentByExchangeId(exchangeId: ExchangeId): Deployment {
    const deployment = this.deployments.find((d) => d.exchangeId === exchangeId);
    if (!deployment) {
      throw new Error(`Deployment for exchangeId ${exchangeId} not found`);
    }
    if (!this.activeDeploymentTypes.has(deployment.blockchainType)) {
      throw new Error(`Deployment for exchangeId ${exchangeId} is not active`);
    }
    return deployment;
  }

  getDeploymentByBlockchainType(blockchainType: BlockchainType): Deployment {
    if (!this.activeDeploymentTypes.has(blockchainType)) {
      throw new Error(`Deployment for blockchainType ${blockchainType} is not active`);
    }
    const deployment = this.deployments.find((d) => d.blockchainType === blockchainType);
    if (!deployment) {
      throw new Error(`Deployment for blockchainType ${blockchainType} not found`);
    }
    return deployment;
  }
}
