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
  constructor(private configService: ConfigService) {
    this.deployments = this.initializeDeployments();
  }

  private initializeDeployments(): Deployment[] {
    return [
      {
        exchangeId: ExchangeId.OGIota,
        blockchainType: BlockchainType.Iota,
        rpcEndpoint: this.configService.get('IOTA_RPC_ENDPOINT'),
        harvestEventsBatchSize: 500,
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
        exchangeId: ExchangeId.OGMantle,
        blockchainType: BlockchainType.Mantle,
        rpcEndpoint: this.configService.get('MANTLE_RPC_ENDPOINT'),
        harvestEventsBatchSize: 500,
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
        harvestEventsBatchSize: 2000,
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
        },
      },
      {
        exchangeId: ExchangeId.OGBerachain,
        blockchainType: BlockchainType.Berachain,
        rpcEndpoint: this.configService.get('BERACHAIN_RPC_ENDPOINT'),
        harvestEventsBatchSize: 2000,
        harvestConcurrency: 10,
        multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
        startBlock: 1375430,
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
          BancorArbitrage: {
            address: '0x0000000000000000000000000000000000000000',  // Replace with actual contract address
          },
          CarbonVortex: {
            address: '0x248594Be9BE605905B8912cf575f03fE42d89054',  // Replace with actual contract address
          },
        },
      },
    ];
  }

  getDeployments(): Deployment[] {
    return this.deployments;
  }

  getDeploymentByExchangeId(exchangeId: ExchangeId): Deployment {
    const deployment = this.deployments.find((d) => d.exchangeId === exchangeId);
    if (!deployment) {
      throw new Error(`Deployment for exchangeId ${exchangeId} not found`);
    }
    return deployment;
  }

  getDeploymentByBlockchainType(blockchainType: BlockchainType): Deployment {
    const deployment = this.deployments.find((d) => d.blockchainType === blockchainType);
    if (!deployment) {
      throw new Error(`Deployment for blockchainType ${blockchainType} not found`);
    }
    return deployment;
  }
}
