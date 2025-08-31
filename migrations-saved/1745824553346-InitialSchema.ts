import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1745824553346 implements MigrationInterface {
  name = 'InitialSchema1745824553346';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tvl" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "evt_block_time" TIMESTAMP NOT NULL, "evt_block_number" integer NOT NULL, "strategyId" text NOT NULL, "pairName" text NOT NULL, "pairId" integer NOT NULL, "symbol" text NOT NULL, "address" text NOT NULL, "tvl" text NOT NULL, "reason" text NOT NULL, "transaction_index" text NOT NULL, CONSTRAINT "UQ_837985c1c667096fcb6aba2a437" UNIQUE ("blockchainType", "exchangeId", "strategyId", "pairName", "symbol", "tvl", "address", "evt_block_time", "evt_block_number", "reason", "transaction_index"), CONSTRAINT "PK_8b7a23cbf87dab94680ce91ad20" PRIMARY KEY ("id", "evt_block_time"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_5be44c8aa379657fcef7af663c" ON "tvl" ("blockchainType") `);
    await queryRunner.query(`CREATE INDEX "IDX_2d3ef18dd126f6064fbc6dfa57" ON "tvl" ("exchangeId") `);
    await queryRunner.query(`CREATE INDEX "IDX_5d1a91351a5adac08f8d27d685" ON "tvl" ("evt_block_time") `);
    await queryRunner.query(`CREATE INDEX "IDX_a5bf157ef061f897df67c0dec2" ON "tvl" ("evt_block_number") `);
    await queryRunner.query(`CREATE INDEX "IDX_e6721e8c5cc2ba40e2cd79a671" ON "tvl" ("strategyId") `);
    await queryRunner.query(`CREATE INDEX "IDX_df6c25be54ca428bc5a7301679" ON "tvl" ("pairId") `);
    await queryRunner.query(`CREATE INDEX "IDX_068a4a0ae76b8c4595ef9f1a57" ON "tvl" ("symbol") `);
    await queryRunner.query(`CREATE INDEX "IDX_bebc452955d5e3bb98e10c9432" ON "tvl" ("reason") `);
    await queryRunner.query(`CREATE INDEX "IDX_87d82627b8d99d3888aca0ebaa" ON "tvl" ("transaction_index") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_488c5516e8c72b2686e744bfed" ON "tvl" ("address", "blockchainType", "exchangeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e8b3d16260b7dea43e343e3366" ON "tvl" ("pairId", "blockchainType", "exchangeId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "tokens" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "address" character varying NOT NULL, "symbol" character varying NOT NULL, "name" character varying NOT NULL, "decimals" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3001e89ada36263dabf1fb6210a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_1fc8c9748b497072859bb0cceb" ON "tokens" ("blockchainType") `);
    await queryRunner.query(`CREATE INDEX "IDX_66ddea115f5596805dea0cd676" ON "tokens" ("exchangeId") `);
    await queryRunner.query(
      `CREATE TABLE "blocks" ("id" integer NOT NULL, "blockchainType" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8244fa1495c4e9222a01059244b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_6d88b5ea8a96fc81e3b0d52f42" ON "blocks" ("blockchainType") `);
    await queryRunner.query(
      `CREATE TABLE "tokens-traded-events" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "trader" text NOT NULL, "type" text NOT NULL, "sourceAmount" text NOT NULL, "targetAmount" text NOT NULL, "tradingFeeAmount" text NOT NULL, "byTargetAmount" boolean NOT NULL, "transactionIndex" integer NOT NULL, "transactionHash" text NOT NULL, "callerId" text, "logIndex" integer NOT NULL, "timestamp" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "blockId" integer, "pairId" integer, "sourceTokenId" integer, "targetTokenId" integer, CONSTRAINT "UQ_7a43713f7ecc6bed9db2a945327" UNIQUE ("transactionIndex", "transactionHash", "logIndex", "timestamp"), CONSTRAINT "PK_76de9df9844fedaa60a29e88410" PRIMARY KEY ("id", "timestamp"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c2d17f5848e8253a52408ff189" ON "tokens-traded-events" ("blockchainType") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_25ff1bba41c8559e7094ab3faa" ON "tokens-traded-events" ("exchangeId") `);
    await queryRunner.query(`CREATE INDEX "IDX_bff069546ba7ea84e319446a26" ON "tokens-traded-events" ("blockId") `);
    await queryRunner.query(`CREATE INDEX "IDX_c081dde529d0e03627b56844e4" ON "tokens-traded-events" ("pairId") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_c03a21b4dead9ab3345f3ad490" ON "tokens-traded-events" ("sourceTokenId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4bec19484efcbe1a523521c5fe" ON "tokens-traded-events" ("targetTokenId") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_4b447c4070d7d9f532817c8867" ON "tokens-traded-events" ("trader") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_6d5a448e3ac65b30cc6ebb45b4" ON "tokens-traded-events" ("transactionIndex") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_974b69b8082522efa7f2ba47c1" ON "tokens-traded-events" ("transactionHash") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_94fd1b26cb2dbeeba497fa79ba" ON "tokens-traded-events" ("callerId") `);
    await queryRunner.query(`CREATE INDEX "IDX_a6f4a2c99c4cad6663f94935fc" ON "tokens-traded-events" ("logIndex") `);
    await queryRunner.query(`CREATE INDEX "IDX_5ad4851dae6f841d71d1b631b3" ON "tokens-traded-events" ("timestamp") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_89f2258231d48af5d0d43e3ecd" ON "tokens-traded-events" ("trader", "blockchainType", "exchangeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2342ae203567a867b6fe366929" ON "tokens-traded-events" ("targetTokenId", "blockchainType", "exchangeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1117c3f900aaa2af9d97c39513" ON "tokens-traded-events" ("sourceTokenId", "blockchainType", "exchangeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e84271b4e93070bc7a68cabc9e" ON "tokens-traded-events" ("pairId", "blockchainType", "exchangeId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "pairs" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "name" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "blockId" integer, "token0Id" integer, "token1Id" integer, CONSTRAINT "PK_bfc550b07b52c37db12aa7d8e69" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_2adf8fe1e85377fa39cba7757b" ON "pairs" ("blockchainType") `);
    await queryRunner.query(`CREATE INDEX "IDX_1d894c6215a2a86d1b5bf661be" ON "pairs" ("exchangeId") `);
    await queryRunner.query(
      `CREATE TABLE "strategies" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "strategyId" character varying NOT NULL, "deleted" boolean NOT NULL DEFAULT false, "liquidity0" character varying NOT NULL, "lowestRate0" character varying NOT NULL, "highestRate0" character varying NOT NULL, "marginalRate0" character varying NOT NULL, "liquidity1" character varying NOT NULL, "lowestRate1" character varying NOT NULL, "highestRate1" character varying NOT NULL, "marginalRate1" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "blockId" integer, "pairId" integer, "token0Id" integer, "token1Id" integer, CONSTRAINT "UQ_ca3ef6c54f8acf3f8acd7e14e32" UNIQUE ("blockchainType", "exchangeId", "strategyId"), CONSTRAINT "PK_9a0d363ddf5b40d080147363238" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_2776b53d13ebed1a86d430276f" ON "strategies" ("blockchainType") `);
    await queryRunner.query(`CREATE INDEX "IDX_fa07d821f14ecc71eeae746d69" ON "strategies" ("exchangeId") `);
    await queryRunner.query(`CREATE INDEX "IDX_f2412bf8441578cc42158051ae" ON "strategies" ("strategyId") `);
    await queryRunner.query(
      `CREATE TABLE "total-tvl" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, "tvl" text NOT NULL, CONSTRAINT "UQ_7fe5b00781f6564ec055b4f88ab" UNIQUE ("blockchainType", "exchangeId", "timestamp"), CONSTRAINT "PK_11e6b29ef16c61c5364a9d78c14" PRIMARY KEY ("id", "timestamp"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_77a80f3a926a86c52efa22402a" ON "total-tvl" ("blockchainType") `);
    await queryRunner.query(`CREATE INDEX "IDX_03e591b57b14a9618bcb029583" ON "total-tvl" ("exchangeId") `);
    await queryRunner.query(`CREATE INDEX "IDX_ef67aba5c92802261b541d5288" ON "total-tvl" ("timestamp") `);
    await queryRunner.query(
      `CREATE TABLE "historic-quotes" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, "tokenAddress" character varying NOT NULL, "provider" character varying NOT NULL, "usd" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, CONSTRAINT "PK_e342adbd6f8f907b412ff681929" PRIMARY KEY ("id", "timestamp"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_51502c505f256a69be325a6345" ON "historic-quotes" ("blockchainType") `);
    await queryRunner.query(`CREATE INDEX "IDX_ab617affe46aa00bdd295edce0" ON "historic-quotes" ("timestamp") `);
    await queryRunner.query(`CREATE INDEX "IDX_5ab5c8ab52bc42e68dcbc96558" ON "historic-quotes" ("tokenAddress") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_9e13b1c45c5d2beb1b69711236" ON "historic-quotes" ("blockchainType", "tokenAddress", "timestamp") `,
    );
    await queryRunner.query(
      `CREATE TABLE "last_processed_block" ("id" SERIAL NOT NULL, "param" character varying NOT NULL, "block" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3914bf93d966710965afd83ce55" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "quotes" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "provider" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, "usd" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "tokenId" integer, CONSTRAINT "PK_99a0e8bcbcd8719d3a41f23c263" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_f016f6740e3e54b90a08b478ff" ON "quotes" ("blockchainType") `);
    await queryRunner.query(
      `CREATE TABLE "activities-v2" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "strategyId" character varying NOT NULL, "creationWallet" character varying, "currentOwner" character varying, "oldOwner" character varying, "newOwner" character varying, "action" character varying NOT NULL, "baseQuote" character varying NOT NULL, "baseSellToken" character varying NOT NULL, "baseSellTokenAddress" character varying NOT NULL, "quoteBuyToken" character varying NOT NULL, "quoteBuyTokenAddress" character varying NOT NULL, "buyBudget" character varying NOT NULL, "sellBudget" character varying NOT NULL, "buyBudgetChange" character varying, "sellBudgetChange" character varying, "buyPriceA" character varying NOT NULL, "buyPriceMarg" character varying NOT NULL, "buyPriceB" character varying NOT NULL, "sellPriceA" character varying NOT NULL, "sellPriceMarg" character varying NOT NULL, "sellPriceB" character varying NOT NULL, "buyPriceADelta" character varying, "buyPriceMargDelta" character varying, "buyPriceBDelta" character varying, "sellPriceADelta" character varying, "sellPriceMargDelta" character varying, "sellPriceBDelta" character varying, "strategySold" character varying, "tokenSold" character varying, "strategyBought" character varying, "tokenBought" character varying, "avgPrice" character varying, "timestamp" TIMESTAMP NOT NULL, "txhash" character varying NOT NULL, "blockNumber" integer NOT NULL, "logIndex" integer NOT NULL, "transactionIndex" integer NOT NULL, "order0" jsonb, "order1" jsonb, "token0Id" integer, "token1Id" integer, "fee" character varying, "feeToken" character varying, CONSTRAINT "UQ_809db05b3f4deed88f7dd717498" UNIQUE ("blockchainType", "exchangeId", "strategyId", "action", "baseQuote", "baseSellToken", "baseSellTokenAddress", "quoteBuyToken", "quoteBuyTokenAddress", "buyBudget", "sellBudget", "buyPriceA", "buyPriceMarg", "buyPriceB", "sellPriceA", "sellPriceMarg", "sellPriceB", "timestamp", "txhash", "blockNumber"), CONSTRAINT "PK_2dcd8415c9c9176984a22ec4b4d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_159d1ef9c844ad2bf40c894e3e" ON "activities-v2" ("blockchainType") `);
    await queryRunner.query(`CREATE INDEX "IDX_828401bd1175f97080473e119b" ON "activities-v2" ("exchangeId") `);
    await queryRunner.query(`CREATE INDEX "IDX_39bcc57a01e25d0a70837d1782" ON "activities-v2" ("strategyId") `);
    await queryRunner.query(`CREATE INDEX "IDX_2f85307a9c581907b40899a4cb" ON "activities-v2" ("currentOwner") `);
    await queryRunner.query(`CREATE INDEX "IDX_29c26548428fa789f65cb7242e" ON "activities-v2" ("oldOwner") `);
    await queryRunner.query(`CREATE INDEX "IDX_fface4db28aaa3675565c10c9b" ON "activities-v2" ("action") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_a37307f204a293b6437632a478" ON "activities-v2" ("baseSellTokenAddress") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7ba7181393b295d77c12e34deb" ON "activities-v2" ("quoteBuyTokenAddress") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_388ed5fd0d16645bf567edc3a2" ON "activities-v2" ("timestamp") `);
    await queryRunner.query(`CREATE INDEX "IDX_e4b13cb8b317ced37902d2e4df" ON "activities-v2" ("blockNumber") `);
    await queryRunner.query(`CREATE INDEX "IDX_029a6f27fd8c3acdb7bdf47569" ON "activities-v2" ("logIndex") `);
    await queryRunner.query(`CREATE INDEX "IDX_8e831f05c8e4425ec7cb48dd73" ON "activities-v2" ("transactionIndex") `);
    await queryRunner.query(
      `CREATE TABLE "referral_states" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "trader" character varying(42) NOT NULL, "code" character varying(66) NOT NULL, "code_decoded" character varying(255), "owner" character varying(42) NOT NULL, "tierId" character varying NOT NULL, "totalRebate" character varying NOT NULL, "discountShare" character varying NOT NULL, "chain_id" integer NOT NULL, "timestamp" TIMESTAMP NOT NULL, "last_processed_block" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "block_id" integer, CONSTRAINT "UQ_81746bb77540f627e15ef49921f" UNIQUE ("trader", "chain_id"), CONSTRAINT "PK_2bd9e3007936b73dd1ad894d199" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_08125c16cf193d628bd8504797" ON "referral_states" ("blockchainType") `);
    await queryRunner.query(`CREATE INDEX "IDX_bcef746cc96ca756a56ac0f601" ON "referral_states" ("exchangeId") `);
    await queryRunner.query(`CREATE INDEX "IDX_f8a40386029a7c3c3da93623f2" ON "referral_states" ("trader") `);
    await queryRunner.query(`CREATE INDEX "IDX_03740d4927654612a836d8820c" ON "referral_states" ("code") `);
    await queryRunner.query(`CREATE INDEX "IDX_98338410560478ecda739b6407" ON "referral_states" ("owner") `);
    await queryRunner.query(`CREATE INDEX "IDX_cee4f3b6d2fbaa5bf83cc4259d" ON "referral_states" ("chain_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_c829d7edddb470bd68e614218a" ON "referral_states" ("timestamp") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_144bbf6ec862217c81f0d75b68" ON "referral_states" ("owner", "chain_id") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_ce03cfa3147dcc33fc84674b5d" ON "referral_states" ("code", "chain_id") `);
    await queryRunner.query(
      `CREATE TABLE "referrer_stats" ("id" SERIAL NOT NULL, "address" character varying(42) NOT NULL, "volume" character varying(78) NOT NULL, "rebates" character varying(78) NOT NULL, "referrals" integer NOT NULL, "chain_id" integer NOT NULL, "last_updated" double precision NOT NULL, CONSTRAINT "PK_ae04860857b4fa95b538b897e20" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_5473a51408cbd2334ce34d0429" ON "referrer_stats" ("address") `);
    await queryRunner.query(`CREATE INDEX "IDX_cffda985409952fc5f6e0d067f" ON "referrer_stats" ("chain_id") `);
    await queryRunner.query(
      `CREATE TABLE "trader_stats" ("id" SERIAL NOT NULL, "address" character varying(42) NOT NULL, "volume" character varying(78) NOT NULL, "rebates" character varying(78) NOT NULL, "trades" integer NOT NULL, "chain_id" integer NOT NULL, "last_updated" double precision NOT NULL, CONSTRAINT "PK_8e7f231470ad9c39e25a26fb419" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_f5d0b43b4c4ad2dc249381d80f" ON "trader_stats" ("address") `);
    await queryRunner.query(`CREATE INDEX "IDX_ff075e0aacaba1b49c6e0e0007" ON "trader_stats" ("chain_id") `);
    await queryRunner.query(
      `CREATE TABLE "referral_codes" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "code" character varying(66) NOT NULL, "code_decoded" character varying(255), "owner" character varying(42) NOT NULL, "chain_id" integer NOT NULL, "transaction_hash" character varying(66) NOT NULL, "block_number" double precision NOT NULL, "timestamp" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "transaction_index" integer, "log_index" integer, "block_id" integer, CONSTRAINT "UQ_64a0203e8e39cdcc29ce093917c" UNIQUE ("code", "chain_id"), CONSTRAINT "PK_99f08e2ed9d39d8ce902f5f1f41" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_8f93be3083843052caf98e0193" ON "referral_codes" ("blockchainType") `);
    await queryRunner.query(`CREATE INDEX "IDX_9f7e45c6e3e437dba9a5396f38" ON "referral_codes" ("exchangeId") `);
    await queryRunner.query(`CREATE INDEX "IDX_adda7b9deda346ff710695f496" ON "referral_codes" ("code") `);
    await queryRunner.query(`CREATE INDEX "IDX_84a0673c5ec1baa6a299d57473" ON "referral_codes" ("owner") `);
    await queryRunner.query(`CREATE INDEX "IDX_b04ae3f2462c8658e04c8132a3" ON "referral_codes" ("chain_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_1ecc4fcc7c3b053f9f9421a271" ON "referral_codes" ("timestamp") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_d12cf9ef56af854ce54dc38786" ON "referral_codes" ("code", "chain_id", "owner") `,
    );
    await queryRunner.query(
      `CREATE TABLE "vortex-funds-withdrawn-events" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "caller" character varying NOT NULL, "target" character varying NOT NULL, "tokens" text array NOT NULL, "amounts" text array NOT NULL, "transactionIndex" integer NOT NULL, "transactionHash" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, "logIndex" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "blockId" integer, CONSTRAINT "UQ_c3cc49aba18d188afe58df53191" UNIQUE ("transactionIndex", "transactionHash", "logIndex"), CONSTRAINT "PK_ec5ec6cb6578dbfcb0cf72080ba" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_377408d0c0541389473b3835b6" ON "vortex-funds-withdrawn-events" ("blockchainType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3db3cd5cb695111b75f7b30b6e" ON "vortex-funds-withdrawn-events" ("exchangeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8ba94fcea32aa9ab7e62e64c9f" ON "vortex-funds-withdrawn-events" ("blockId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bbef3e8d43bcd8d72c830de4df" ON "vortex-funds-withdrawn-events" ("caller") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e3e8cca2280e4cbdda57a426b5" ON "vortex-funds-withdrawn-events" ("target") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a79cca94d6ef15daa29e4171a7" ON "vortex-funds-withdrawn-events" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE TABLE "vortex-trading-reset-events" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "token" character varying NOT NULL, "sourceAmount" text NOT NULL, "targetAmount" text NOT NULL, "transactionIndex" integer NOT NULL, "transactionHash" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, "logIndex" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "blockId" integer, CONSTRAINT "UQ_c30a3702f2e28183250e7f96995" UNIQUE ("transactionIndex", "transactionHash", "logIndex"), CONSTRAINT "PK_eb1d46d9d43d913f70f6fdf7e12" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a3a015d6530eec204734606276" ON "vortex-trading-reset-events" ("blockchainType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8c31037872ad8a8a8280d51261" ON "vortex-trading-reset-events" ("exchangeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8e4a2ad08794d7e20df02ab996" ON "vortex-trading-reset-events" ("blockId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_544f5a3e612ff1a949d6f4f951" ON "vortex-trading-reset-events" ("token") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_87d106f1babb36431cdb465729" ON "vortex-trading-reset-events" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE TABLE "voucher-transfer-events" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "strategyId" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, "from" character varying NOT NULL, "to" character varying NOT NULL, "transactionIndex" integer NOT NULL, "transactionHash" character varying NOT NULL, "logIndex" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "blockId" integer, CONSTRAINT "UQ_b302936970b7fd28132928c4e77" UNIQUE ("transactionIndex", "transactionHash", "logIndex"), CONSTRAINT "PK_15f265cac4047455031ec2b4e41" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2e20328d5565ff6b3131ae93b5" ON "voucher-transfer-events" ("blockchainType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3e7da58e7cdefd620d5d780fe8" ON "voucher-transfer-events" ("exchangeId") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_dcceb3e56b344cc9c8c703ae2d" ON "voucher-transfer-events" ("blockId") `);
    await queryRunner.query(
      `CREATE TABLE "strategy-updated-events" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "strategyId" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, "reason" integer NOT NULL, "order0" character varying NOT NULL, "order1" character varying NOT NULL, "transactionIndex" integer NOT NULL, "transactionHash" character varying NOT NULL, "logIndex" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "pairId" integer, "blockId" integer, "token0Id" integer, "token1Id" integer, CONSTRAINT "UQ_b206162147f84fc87256bf03b23" UNIQUE ("transactionIndex", "transactionHash", "logIndex"), CONSTRAINT "PK_03ba1851eb69ff0f541a632279f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0c842871c198090f0467451e9d" ON "strategy-updated-events" ("blockchainType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bc3628a6daaf2e7e169292f4ce" ON "strategy-updated-events" ("exchangeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d8ddb719df9d2a26006b415f98" ON "strategy-updated-events" ("strategyId") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_f6cd36e84afc2fdf1d9cea35ce" ON "strategy-updated-events" ("blockId") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_d2611fb5f6bb25ef81a62b20fb" ON "strategy-updated-events" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE TABLE "vortex-tokens-traded-events" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "caller" character varying NOT NULL, "token" character varying NOT NULL, "sourceAmount" text NOT NULL, "targetAmount" text NOT NULL, "transactionIndex" integer NOT NULL, "transactionHash" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, "logIndex" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "blockId" integer, CONSTRAINT "UQ_d43ac776a60b8c78fb2e8b4b64c" UNIQUE ("transactionIndex", "transactionHash", "logIndex"), CONSTRAINT "PK_a14b40d4c35229dc0f462699fab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fd9d2d0903bc14e8435c634b0f" ON "vortex-tokens-traded-events" ("blockchainType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e4f82c59c17e9787d6bd1364d6" ON "vortex-tokens-traded-events" ("exchangeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_63734fffd99f910f03fadfe3ad" ON "vortex-tokens-traded-events" ("blockId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d647acab90ee2f65a3473acf79" ON "vortex-tokens-traded-events" ("caller") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2d102125a8477e1c79bcb73ad3" ON "vortex-tokens-traded-events" ("token") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a86e718b161bbc2ba208e3b05d" ON "vortex-tokens-traded-events" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE TABLE "trading-fee-ppm-updated-events" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, "prevFeePPM" integer NOT NULL, "newFeePPM" integer NOT NULL, "transactionIndex" integer NOT NULL, "transactionHash" character varying NOT NULL, "logIndex" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "blockId" integer, CONSTRAINT "UQ_059b582e451654f70bebb491e05" UNIQUE ("transactionIndex", "transactionHash", "logIndex"), CONSTRAINT "PK_c3db6da119f4169b7563d1fdc93" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_af9af71f6ad35cf07505151c41" ON "trading-fee-ppm-updated-events" ("blockchainType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ec78d4bb8fa7e46d00ec1d26e2" ON "trading-fee-ppm-updated-events" ("exchangeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aca9132d7db5f0385024667004" ON "trading-fee-ppm-updated-events" ("blockId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "strategy-created-events" ("id" SERIAL NOT NULL, "strategyId" character varying NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, "owner" character varying NOT NULL, "order0" character varying NOT NULL, "order1" character varying NOT NULL, "transactionIndex" integer NOT NULL, "transactionHash" character varying NOT NULL, "logIndex" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "pairId" integer, "blockId" integer, "token0Id" integer, "token1Id" integer, CONSTRAINT "UQ_52086ff805f342661c5b77bc1ae" UNIQUE ("transactionIndex", "transactionHash", "logIndex"), CONSTRAINT "PK_3121f8f9aa9a96e48e103ef09c1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_00faad78686d13fd0c26264ae8" ON "strategy-created-events" ("strategyId") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_9c5a2e9a334403254efb836f04" ON "strategy-created-events" ("blockId") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_7671de629ff77fbfb76d048416" ON "strategy-created-events" ("blockchainType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_32ec6fba5ace9de71aa011bf0a" ON "strategy-created-events" ("exchangeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c239f8c77980389a6ed16872d3" ON "strategy-created-events" ("timestamp") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_92fe5683849f39db695c9b4995" ON "strategy-created-events" ("token0Id") `);
    await queryRunner.query(`CREATE INDEX "IDX_d580d7fd7977675aaf649e0b7f" ON "strategy-created-events" ("token1Id") `);
    await queryRunner.query(
      `CREATE TABLE "strategy-deleted-events" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "strategyId" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, "order0" character varying NOT NULL, "order1" character varying NOT NULL, "transactionIndex" integer NOT NULL, "transactionHash" character varying NOT NULL, "logIndex" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "pairId" integer, "blockId" integer, "token0Id" integer, "token1Id" integer, CONSTRAINT "UQ_9830850139cbddfd88f602fbf50" UNIQUE ("transactionIndex", "transactionHash", "logIndex"), CONSTRAINT "PK_631d016adec08e3c3ae77c267b6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8b93141dbde79a439f8c1bfd46" ON "strategy-deleted-events" ("blockchainType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2019b1709d451d3739d3e93aa9" ON "strategy-deleted-events" ("exchangeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_19b2559796c490b51ad46c6686" ON "strategy-deleted-events" ("strategyId") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_eac564b54c2e686f3bbbdfb7f7" ON "strategy-deleted-events" ("blockId") `);
    await queryRunner.query(
      `CREATE TABLE "protection-removed-events" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "provider" character varying NOT NULL, "poolToken" character varying NOT NULL, "reserveToken" character varying NOT NULL, "poolAmount" character varying NOT NULL, "reserveAmount" character varying NOT NULL, "transactionIndex" integer NOT NULL, "transactionHash" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, "logIndex" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "blockId" integer, CONSTRAINT "UQ_c87b82d1fe5fed8380696892100" UNIQUE ("transactionIndex", "transactionHash", "logIndex"), CONSTRAINT "PK_fe2105de523181c1194dd0833c9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d51e7a593e43512128d7d941f2" ON "protection-removed-events" ("blockchainType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e42e2c560058b9b006a4f5af15" ON "protection-removed-events" ("exchangeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_931a18b62f3a83d583b1990458" ON "protection-removed-events" ("blockId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2efb4ea266c393e1e8bfe51c88" ON "protection-removed-events" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE TABLE "set_handler_events" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "handler" character varying(42) NOT NULL, "isActive" boolean NOT NULL, "chain_id" integer NOT NULL, "transactionIndex" integer NOT NULL, "transactionHash" character varying NOT NULL, "logIndex" integer NOT NULL, "timestamp" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "blockId" integer, CONSTRAINT "UQ_a6ed51b46f6ba9975de5860ed88" UNIQUE ("transactionIndex", "transactionHash", "logIndex"), CONSTRAINT "PK_ba5896238e4765b86d251e0ecfa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aa2501d866cdfc5200df049f45" ON "set_handler_events" ("blockchainType") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_5be05126f6a2f712f15cd4624f" ON "set_handler_events" ("exchangeId") `);
    await queryRunner.query(`CREATE INDEX "IDX_55cf66bbdad2dbbfeb119e4b14" ON "set_handler_events" ("blockId") `);
    await queryRunner.query(`CREATE INDEX "IDX_aa2dff9f9851c51e102c5aac29" ON "set_handler_events" ("chain_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_bfc5f45e85e060765a7b2bf594" ON "set_handler_events" ("timestamp") `);
    await queryRunner.query(
      `CREATE TABLE "set_code_owner_events" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "account" character varying(42) NOT NULL, "newAccount" character varying(42) NOT NULL, "code" character varying(66) NOT NULL, "code_decoded" character varying(255), "chain_id" integer NOT NULL, "transactionIndex" integer NOT NULL, "transactionHash" character varying NOT NULL, "logIndex" integer NOT NULL, "timestamp" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "blockId" integer, CONSTRAINT "UQ_b6facd14ca5dc964cd3818e59ea" UNIQUE ("transactionIndex", "transactionHash", "logIndex"), CONSTRAINT "PK_653e06c96d10bde35204e28c610" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1d1cf9a5c6d7f0b34dedaa0de2" ON "set_code_owner_events" ("blockchainType") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_f5876d50eea2634b6a6b4f21ec" ON "set_code_owner_events" ("exchangeId") `);
    await queryRunner.query(`CREATE INDEX "IDX_dc1111eef55ee1b12091e036b6" ON "set_code_owner_events" ("blockId") `);
    await queryRunner.query(`CREATE INDEX "IDX_c2aec47482398531afc6474ba1" ON "set_code_owner_events" ("chain_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_4495cd3362a387d5cda8300f17" ON "set_code_owner_events" ("timestamp") `);
    await queryRunner.query(
      `CREATE TABLE "set_tier_events" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "tierId" character varying NOT NULL, "totalRebate" character varying NOT NULL, "discountShare" character varying NOT NULL, "chain_id" integer NOT NULL, "transactionIndex" integer NOT NULL, "transactionHash" character varying NOT NULL, "logIndex" integer NOT NULL, "timestamp" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "blockId" integer, CONSTRAINT "UQ_5c1aca476b34b4fd34a0a1c5954" UNIQUE ("transactionIndex", "transactionHash", "logIndex"), CONSTRAINT "PK_57e5bfda77892aef8fe186a45b6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_874884c62fab2be070397987c8" ON "set_tier_events" ("blockchainType") `);
    await queryRunner.query(`CREATE INDEX "IDX_ad9388a359bf713a17b718c901" ON "set_tier_events" ("exchangeId") `);
    await queryRunner.query(`CREATE INDEX "IDX_0cf86248766437fdf8ba387c45" ON "set_tier_events" ("blockId") `);
    await queryRunner.query(`CREATE INDEX "IDX_09017168fded901de8994e5459" ON "set_tier_events" ("chain_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_a360c64fba3a0e71ce4be7b5e7" ON "set_tier_events" ("timestamp") `);
    await queryRunner.query(
      `CREATE TABLE "register_code_events" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "code" character varying(66) NOT NULL, "code_decoded" character varying(255), "referrer" character varying(42) NOT NULL, "chain_id" integer NOT NULL, "transactionIndex" integer NOT NULL, "transactionHash" character varying NOT NULL, "logIndex" integer NOT NULL, "timestamp" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "blockId" integer, CONSTRAINT "UQ_00bef4a43f2f0e671aa44c82f73" UNIQUE ("transactionIndex", "transactionHash", "logIndex"), CONSTRAINT "PK_98a131e25db3d6284c28ca8bd2e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_62060ee477606b92e2ba58c78d" ON "register_code_events" ("blockchainType") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_e2bf2bcc11c98ed592153938ec" ON "register_code_events" ("exchangeId") `);
    await queryRunner.query(`CREATE INDEX "IDX_747cbb2c5c9fd66f886cb6f4b5" ON "register_code_events" ("blockId") `);
    await queryRunner.query(`CREATE INDEX "IDX_cb06ca2e8b8584fb1bea1a472c" ON "register_code_events" ("code") `);
    await queryRunner.query(`CREATE INDEX "IDX_d8c9d812c42bb2578a11e3dbce" ON "register_code_events" ("referrer") `);
    await queryRunner.query(`CREATE INDEX "IDX_57f6dc1904bf77da307819cf8d" ON "register_code_events" ("chain_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_90836401e2dcd5a40af6056e67" ON "register_code_events" ("timestamp") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_52b3d41684454668d3ff4983f3" ON "register_code_events" ("referrer", "blockchainType", "exchangeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_77d8c2b7d27a7ec584a56a7244" ON "register_code_events" ("code", "blockchainType", "exchangeId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "set_trader_referral_code_events" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "account" character varying(42) NOT NULL, "code" character varying(66) NOT NULL, "code_decoded" character varying(255), "chain_id" integer NOT NULL, "transactionIndex" integer NOT NULL, "transactionHash" character varying NOT NULL, "logIndex" integer NOT NULL, "timestamp" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "blockId" integer, CONSTRAINT "UQ_9d2ce81edcb2072e2dc529f5037" UNIQUE ("transactionIndex", "transactionHash", "logIndex"), CONSTRAINT "PK_1c84074249a0a210b2be4f2c98a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1b422f1938468d26ee7bbeb6f1" ON "set_trader_referral_code_events" ("blockchainType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c5320355c9ae51762a5a7b2165" ON "set_trader_referral_code_events" ("exchangeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dcc1860c4507bfd4541579ba12" ON "set_trader_referral_code_events" ("blockId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f4282b3cba35716691834a131a" ON "set_trader_referral_code_events" ("account") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ad05d8c01781784b245c2b8ac7" ON "set_trader_referral_code_events" ("code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_45847906624b535f79687b551b" ON "set_trader_referral_code_events" ("chain_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_73274b9c23f5da11a670ff2348" ON "set_trader_referral_code_events" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bb402e760401db84fb6cb4613f" ON "set_trader_referral_code_events" ("account", "blockchainType", "exchangeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b070301b78a0ef1f65427a1425" ON "set_trader_referral_code_events" ("code", "blockchainType", "exchangeId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "pair-created-events" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "token0" character varying NOT NULL, "token1" character varying NOT NULL, "transactionIndex" integer NOT NULL, "transactionHash" character varying NOT NULL, "logIndex" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "blockId" integer, CONSTRAINT "UQ_dcc1a2cd3b18918ca3a8b47007d" UNIQUE ("transactionIndex", "transactionHash", "logIndex"), CONSTRAINT "PK_2e5b322880060ee74d19b8d4a07" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8b60bbe8a3935e59d07f9e2084" ON "pair-created-events" ("blockchainType") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_a6f2f1d9ba6aa8dec091ccd1d3" ON "pair-created-events" ("exchangeId") `);
    await queryRunner.query(`CREATE INDEX "IDX_9fdb1161b3305a336be4ae4b83" ON "pair-created-events" ("blockId") `);
    await queryRunner.query(
      `CREATE TABLE "set_referrer_discount_share_events" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "referrer" character varying(42) NOT NULL, "discountShare" character varying NOT NULL, "chain_id" integer NOT NULL, "transactionIndex" integer NOT NULL, "transactionHash" character varying NOT NULL, "logIndex" integer NOT NULL, "timestamp" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "blockId" integer, CONSTRAINT "UQ_299678a0e8b764ce095729325ba" UNIQUE ("transactionIndex", "transactionHash", "logIndex"), CONSTRAINT "PK_6b2df1132e36061bb7dac8a1897" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3972f3f71800c394a491a8e8ed" ON "set_referrer_discount_share_events" ("blockchainType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_24fd792b047faee1647097112d" ON "set_referrer_discount_share_events" ("exchangeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6e7359ba2064496b809f1855d4" ON "set_referrer_discount_share_events" ("blockId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f53bb36ee339896fb2b4abd644" ON "set_referrer_discount_share_events" ("chain_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e8f8c0d2bfb45146cd9640e9ac" ON "set_referrer_discount_share_events" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE TABLE "pair-trading-fee-ppm-updated-events" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, "prevFeePPM" integer NOT NULL, "newFeePPM" integer NOT NULL, "transactionIndex" integer NOT NULL, "transactionHash" character varying NOT NULL, "logIndex" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "pairId" integer, "blockId" integer, CONSTRAINT "UQ_9c812bc262cb7467560cf562ad4" UNIQUE ("transactionIndex", "transactionHash", "logIndex"), CONSTRAINT "PK_1020b3004ba5966b027e8a08d54" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3ecc36cb48e31b527dc43f307f" ON "pair-trading-fee-ppm-updated-events" ("blockId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0a2ca9f9e49c70f49970fb9dcf" ON "pair-trading-fee-ppm-updated-events" ("blockchainType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_13877d16eb7f4665c50993f657" ON "pair-trading-fee-ppm-updated-events" ("exchangeId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "set_referrer_tier_events" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "referrer" character varying(42) NOT NULL, "tierId" character varying NOT NULL, "chain_id" integer NOT NULL, "transactionIndex" integer NOT NULL, "transactionHash" character varying NOT NULL, "logIndex" integer NOT NULL, "timestamp" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "blockId" integer, CONSTRAINT "UQ_5dcb7325ba74ec054568004e7e6" UNIQUE ("transactionIndex", "transactionHash", "logIndex"), CONSTRAINT "PK_d7ce0c1c5a1027ef50ee635a2c6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dd0a21ee51227853f4c9d25b7d" ON "set_referrer_tier_events" ("blockchainType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f3847a6fe869814230e03cb70c" ON "set_referrer_tier_events" ("exchangeId") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_47e92137010ec8babd276f5e07" ON "set_referrer_tier_events" ("blockId") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_deee7681ee76c38e3124624a11" ON "set_referrer_tier_events" ("chain_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_502202ce09ffba6751ac748633" ON "set_referrer_tier_events" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE TABLE "gov_set_code_owner_events" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "code" character varying(66) NOT NULL, "code_decoded" character varying(255), "newAccount" character varying(42) NOT NULL, "chain_id" integer NOT NULL, "transactionIndex" integer NOT NULL, "transactionHash" character varying NOT NULL, "logIndex" integer NOT NULL, "timestamp" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "blockId" integer, CONSTRAINT "UQ_8d03d95c9c1277a5b27aaae9c2e" UNIQUE ("transactionIndex", "transactionHash", "logIndex"), CONSTRAINT "PK_04d905adf9bd8f875ebf3649b3c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b6c2c0bebb4948f658fe37ae7e" ON "gov_set_code_owner_events" ("blockchainType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_345e934745ca655c55d55bee67" ON "gov_set_code_owner_events" ("exchangeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ae30231a7cad015ac3c5da1997" ON "gov_set_code_owner_events" ("blockId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4e97fe0fcd63120178f9451cd9" ON "gov_set_code_owner_events" ("chain_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7734f78d66f1f8a31a09f3aca5" ON "gov_set_code_owner_events" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE TABLE "arbitrage-executed-events" ("id" SERIAL NOT NULL, "blockchainType" character varying NOT NULL, "exchangeId" character varying NOT NULL, "caller" character varying NOT NULL, "platformIds" text NOT NULL, "tokenPath" text NOT NULL, "sourceTokens" text NOT NULL, "sourceAmounts" text NOT NULL, "protocolAmounts" text NOT NULL, "rewardAmounts" text NOT NULL, "transactionIndex" integer NOT NULL, "transactionHash" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, "logIndex" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "blockId" integer, CONSTRAINT "UQ_7a4f5bf42cbc40193754d207e00" UNIQUE ("transactionIndex", "transactionHash", "logIndex"), CONSTRAINT "PK_7ba465627bf7c78a392a7714b0a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c498a9178b0c1aa00f91b554b4" ON "arbitrage-executed-events" ("blockchainType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_54cadf5810efa5baacf5514bd3" ON "arbitrage-executed-events" ("exchangeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_031644dee1db0ea853324d7346" ON "arbitrage-executed-events" ("blockId") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_40dcbc10d54c70e82fbfd61429" ON "arbitrage-executed-events" ("caller") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_77de28e463be1f696a516d07a0" ON "arbitrage-executed-events" ("timestamp") `,
    );
    await queryRunner.query(
      `ALTER TABLE "tokens-traded-events" ADD CONSTRAINT "FK_bff069546ba7ea84e319446a267" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tokens-traded-events" ADD CONSTRAINT "FK_c081dde529d0e03627b56844e45" FOREIGN KEY ("pairId") REFERENCES "pairs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tokens-traded-events" ADD CONSTRAINT "FK_c03a21b4dead9ab3345f3ad4902" FOREIGN KEY ("sourceTokenId") REFERENCES "tokens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tokens-traded-events" ADD CONSTRAINT "FK_4bec19484efcbe1a523521c5fe9" FOREIGN KEY ("targetTokenId") REFERENCES "tokens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pairs" ADD CONSTRAINT "FK_c68180ccb7c24531e2795b294ae" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pairs" ADD CONSTRAINT "FK_fc7983e49c0c77fe123cb43b3c9" FOREIGN KEY ("token0Id") REFERENCES "tokens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pairs" ADD CONSTRAINT "FK_e4001a1eedce46eb130d0d7a941" FOREIGN KEY ("token1Id") REFERENCES "tokens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "strategies" ADD CONSTRAINT "FK_0b83ed9a45964f7abc611abf4d7" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "strategies" ADD CONSTRAINT "FK_f7fb6533dfb9a761cedf52cfc91" FOREIGN KEY ("pairId") REFERENCES "pairs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "strategies" ADD CONSTRAINT "FK_7d86dcba41d17e33e08296701b5" FOREIGN KEY ("token0Id") REFERENCES "tokens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "strategies" ADD CONSTRAINT "FK_849fe4369e56efc231535a9b545" FOREIGN KEY ("token1Id") REFERENCES "tokens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotes" ADD CONSTRAINT "FK_50aa379b097f3082da450455f88" FOREIGN KEY ("tokenId") REFERENCES "tokens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities-v2" ADD CONSTRAINT "FK_b00f82c523e04d902a52f96a0c7" FOREIGN KEY ("token0Id") REFERENCES "tokens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities-v2" ADD CONSTRAINT "FK_09c42c10e51e5b43cb051bc3afc" FOREIGN KEY ("token1Id") REFERENCES "tokens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "referral_states" ADD CONSTRAINT "FK_c9061346470df921f32fbf12cfe" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "referral_codes" ADD CONSTRAINT "FK_d846520cb1b945243698aa25b5e" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vortex-funds-withdrawn-events" ADD CONSTRAINT "FK_8ba94fcea32aa9ab7e62e64c9fd" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vortex-trading-reset-events" ADD CONSTRAINT "FK_8e4a2ad08794d7e20df02ab9967" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher-transfer-events" ADD CONSTRAINT "FK_dcceb3e56b344cc9c8c703ae2d4" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "strategy-updated-events" ADD CONSTRAINT "FK_82cb0ebf64bd87a123f7c152d9f" FOREIGN KEY ("pairId") REFERENCES "pairs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "strategy-updated-events" ADD CONSTRAINT "FK_f6cd36e84afc2fdf1d9cea35cec" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "strategy-updated-events" ADD CONSTRAINT "FK_1eb8296ac6180bbc2e05ef7af3a" FOREIGN KEY ("token0Id") REFERENCES "tokens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "strategy-updated-events" ADD CONSTRAINT "FK_f0be62f9a5e4fe9a02b57c4c02f" FOREIGN KEY ("token1Id") REFERENCES "tokens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vortex-tokens-traded-events" ADD CONSTRAINT "FK_63734fffd99f910f03fadfe3ad2" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trading-fee-ppm-updated-events" ADD CONSTRAINT "FK_aca9132d7db5f03850246670044" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "strategy-created-events" ADD CONSTRAINT "FK_f1ee68d9ed410aaba255fe984c3" FOREIGN KEY ("pairId") REFERENCES "pairs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "strategy-created-events" ADD CONSTRAINT "FK_9c5a2e9a334403254efb836f04e" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "strategy-created-events" ADD CONSTRAINT "FK_92fe5683849f39db695c9b4995a" FOREIGN KEY ("token0Id") REFERENCES "tokens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "strategy-created-events" ADD CONSTRAINT "FK_d580d7fd7977675aaf649e0b7f6" FOREIGN KEY ("token1Id") REFERENCES "tokens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "strategy-deleted-events" ADD CONSTRAINT "FK_ddac7ee8a786ed10b4bf750b511" FOREIGN KEY ("pairId") REFERENCES "pairs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "strategy-deleted-events" ADD CONSTRAINT "FK_eac564b54c2e686f3bbbdfb7f74" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "strategy-deleted-events" ADD CONSTRAINT "FK_f7bc0579a75b1d5106c772a3b20" FOREIGN KEY ("token0Id") REFERENCES "tokens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "strategy-deleted-events" ADD CONSTRAINT "FK_0a5bda86b666abda143f8ce0f53" FOREIGN KEY ("token1Id") REFERENCES "tokens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "protection-removed-events" ADD CONSTRAINT "FK_931a18b62f3a83d583b1990458b" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "set_handler_events" ADD CONSTRAINT "FK_55cf66bbdad2dbbfeb119e4b14f" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "set_code_owner_events" ADD CONSTRAINT "FK_dc1111eef55ee1b12091e036b6d" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "set_tier_events" ADD CONSTRAINT "FK_0cf86248766437fdf8ba387c454" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "register_code_events" ADD CONSTRAINT "FK_747cbb2c5c9fd66f886cb6f4b56" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "set_trader_referral_code_events" ADD CONSTRAINT "FK_dcc1860c4507bfd4541579ba122" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pair-created-events" ADD CONSTRAINT "FK_9fdb1161b3305a336be4ae4b83d" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "set_referrer_discount_share_events" ADD CONSTRAINT "FK_6e7359ba2064496b809f1855d4e" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pair-trading-fee-ppm-updated-events" ADD CONSTRAINT "FK_e709c1f59d782d5586b33e9e8a8" FOREIGN KEY ("pairId") REFERENCES "pairs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pair-trading-fee-ppm-updated-events" ADD CONSTRAINT "FK_3ecc36cb48e31b527dc43f307f6" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "set_referrer_tier_events" ADD CONSTRAINT "FK_47e92137010ec8babd276f5e070" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "gov_set_code_owner_events" ADD CONSTRAINT "FK_ae30231a7cad015ac3c5da19975" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "arbitrage-executed-events" ADD CONSTRAINT "FK_031644dee1db0ea853324d73468" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "arbitrage-executed-events" DROP CONSTRAINT "FK_031644dee1db0ea853324d73468"`);
    await queryRunner.query(`ALTER TABLE "gov_set_code_owner_events" DROP CONSTRAINT "FK_ae30231a7cad015ac3c5da19975"`);
    await queryRunner.query(`ALTER TABLE "set_referrer_tier_events" DROP CONSTRAINT "FK_47e92137010ec8babd276f5e070"`);
    await queryRunner.query(
      `ALTER TABLE "pair-trading-fee-ppm-updated-events" DROP CONSTRAINT "FK_3ecc36cb48e31b527dc43f307f6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pair-trading-fee-ppm-updated-events" DROP CONSTRAINT "FK_e709c1f59d782d5586b33e9e8a8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "set_referrer_discount_share_events" DROP CONSTRAINT "FK_6e7359ba2064496b809f1855d4e"`,
    );
    await queryRunner.query(`ALTER TABLE "pair-created-events" DROP CONSTRAINT "FK_9fdb1161b3305a336be4ae4b83d"`);
    await queryRunner.query(
      `ALTER TABLE "set_trader_referral_code_events" DROP CONSTRAINT "FK_dcc1860c4507bfd4541579ba122"`,
    );
    await queryRunner.query(`ALTER TABLE "register_code_events" DROP CONSTRAINT "FK_747cbb2c5c9fd66f886cb6f4b56"`);
    await queryRunner.query(`ALTER TABLE "set_tier_events" DROP CONSTRAINT "FK_0cf86248766437fdf8ba387c454"`);
    await queryRunner.query(`ALTER TABLE "set_code_owner_events" DROP CONSTRAINT "FK_dc1111eef55ee1b12091e036b6d"`);
    await queryRunner.query(`ALTER TABLE "set_handler_events" DROP CONSTRAINT "FK_55cf66bbdad2dbbfeb119e4b14f"`);
    await queryRunner.query(`ALTER TABLE "protection-removed-events" DROP CONSTRAINT "FK_931a18b62f3a83d583b1990458b"`);
    await queryRunner.query(`ALTER TABLE "strategy-deleted-events" DROP CONSTRAINT "FK_0a5bda86b666abda143f8ce0f53"`);
    await queryRunner.query(`ALTER TABLE "strategy-deleted-events" DROP CONSTRAINT "FK_f7bc0579a75b1d5106c772a3b20"`);
    await queryRunner.query(`ALTER TABLE "strategy-deleted-events" DROP CONSTRAINT "FK_eac564b54c2e686f3bbbdfb7f74"`);
    await queryRunner.query(`ALTER TABLE "strategy-deleted-events" DROP CONSTRAINT "FK_ddac7ee8a786ed10b4bf750b511"`);
    await queryRunner.query(`ALTER TABLE "strategy-created-events" DROP CONSTRAINT "FK_d580d7fd7977675aaf649e0b7f6"`);
    await queryRunner.query(`ALTER TABLE "strategy-created-events" DROP CONSTRAINT "FK_92fe5683849f39db695c9b4995a"`);
    await queryRunner.query(`ALTER TABLE "strategy-created-events" DROP CONSTRAINT "FK_9c5a2e9a334403254efb836f04e"`);
    await queryRunner.query(`ALTER TABLE "strategy-created-events" DROP CONSTRAINT "FK_f1ee68d9ed410aaba255fe984c3"`);
    await queryRunner.query(
      `ALTER TABLE "trading-fee-ppm-updated-events" DROP CONSTRAINT "FK_aca9132d7db5f03850246670044"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vortex-tokens-traded-events" DROP CONSTRAINT "FK_63734fffd99f910f03fadfe3ad2"`,
    );
    await queryRunner.query(`ALTER TABLE "strategy-updated-events" DROP CONSTRAINT "FK_f0be62f9a5e4fe9a02b57c4c02f"`);
    await queryRunner.query(`ALTER TABLE "strategy-updated-events" DROP CONSTRAINT "FK_1eb8296ac6180bbc2e05ef7af3a"`);
    await queryRunner.query(`ALTER TABLE "strategy-updated-events" DROP CONSTRAINT "FK_f6cd36e84afc2fdf1d9cea35cec"`);
    await queryRunner.query(`ALTER TABLE "strategy-updated-events" DROP CONSTRAINT "FK_82cb0ebf64bd87a123f7c152d9f"`);
    await queryRunner.query(`ALTER TABLE "voucher-transfer-events" DROP CONSTRAINT "FK_dcceb3e56b344cc9c8c703ae2d4"`);
    await queryRunner.query(
      `ALTER TABLE "vortex-trading-reset-events" DROP CONSTRAINT "FK_8e4a2ad08794d7e20df02ab9967"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vortex-funds-withdrawn-events" DROP CONSTRAINT "FK_8ba94fcea32aa9ab7e62e64c9fd"`,
    );
    await queryRunner.query(`ALTER TABLE "referral_codes" DROP CONSTRAINT "FK_d846520cb1b945243698aa25b5e"`);
    await queryRunner.query(`ALTER TABLE "referral_states" DROP CONSTRAINT "FK_c9061346470df921f32fbf12cfe"`);
    await queryRunner.query(`ALTER TABLE "activities-v2" DROP CONSTRAINT "FK_09c42c10e51e5b43cb051bc3afc"`);
    await queryRunner.query(`ALTER TABLE "activities-v2" DROP CONSTRAINT "FK_b00f82c523e04d902a52f96a0c7"`);
    await queryRunner.query(`ALTER TABLE "quotes" DROP CONSTRAINT "FK_50aa379b097f3082da450455f88"`);
    await queryRunner.query(`ALTER TABLE "strategies" DROP CONSTRAINT "FK_849fe4369e56efc231535a9b545"`);
    await queryRunner.query(`ALTER TABLE "strategies" DROP CONSTRAINT "FK_7d86dcba41d17e33e08296701b5"`);
    await queryRunner.query(`ALTER TABLE "strategies" DROP CONSTRAINT "FK_f7fb6533dfb9a761cedf52cfc91"`);
    await queryRunner.query(`ALTER TABLE "strategies" DROP CONSTRAINT "FK_0b83ed9a45964f7abc611abf4d7"`);
    await queryRunner.query(`ALTER TABLE "pairs" DROP CONSTRAINT "FK_e4001a1eedce46eb130d0d7a941"`);
    await queryRunner.query(`ALTER TABLE "pairs" DROP CONSTRAINT "FK_fc7983e49c0c77fe123cb43b3c9"`);
    await queryRunner.query(`ALTER TABLE "pairs" DROP CONSTRAINT "FK_c68180ccb7c24531e2795b294ae"`);
    await queryRunner.query(`ALTER TABLE "tokens-traded-events" DROP CONSTRAINT "FK_4bec19484efcbe1a523521c5fe9"`);
    await queryRunner.query(`ALTER TABLE "tokens-traded-events" DROP CONSTRAINT "FK_c03a21b4dead9ab3345f3ad4902"`);
    await queryRunner.query(`ALTER TABLE "tokens-traded-events" DROP CONSTRAINT "FK_c081dde529d0e03627b56844e45"`);
    await queryRunner.query(`ALTER TABLE "tokens-traded-events" DROP CONSTRAINT "FK_bff069546ba7ea84e319446a267"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_77de28e463be1f696a516d07a0"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_40dcbc10d54c70e82fbfd61429"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_031644dee1db0ea853324d7346"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_54cadf5810efa5baacf5514bd3"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c498a9178b0c1aa00f91b554b4"`);
    await queryRunner.query(`DROP TABLE "arbitrage-executed-events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7734f78d66f1f8a31a09f3aca5"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4e97fe0fcd63120178f9451cd9"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ae30231a7cad015ac3c5da1997"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_345e934745ca655c55d55bee67"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b6c2c0bebb4948f658fe37ae7e"`);
    await queryRunner.query(`DROP TABLE "gov_set_code_owner_events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_502202ce09ffba6751ac748633"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_deee7681ee76c38e3124624a11"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_47e92137010ec8babd276f5e07"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f3847a6fe869814230e03cb70c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_dd0a21ee51227853f4c9d25b7d"`);
    await queryRunner.query(`DROP TABLE "set_referrer_tier_events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_13877d16eb7f4665c50993f657"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0a2ca9f9e49c70f49970fb9dcf"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3ecc36cb48e31b527dc43f307f"`);
    await queryRunner.query(`DROP TABLE "pair-trading-fee-ppm-updated-events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e8f8c0d2bfb45146cd9640e9ac"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f53bb36ee339896fb2b4abd644"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6e7359ba2064496b809f1855d4"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_24fd792b047faee1647097112d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3972f3f71800c394a491a8e8ed"`);
    await queryRunner.query(`DROP TABLE "set_referrer_discount_share_events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9fdb1161b3305a336be4ae4b83"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a6f2f1d9ba6aa8dec091ccd1d3"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8b60bbe8a3935e59d07f9e2084"`);
    await queryRunner.query(`DROP TABLE "pair-created-events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b070301b78a0ef1f65427a1425"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bb402e760401db84fb6cb4613f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_73274b9c23f5da11a670ff2348"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_45847906624b535f79687b551b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ad05d8c01781784b245c2b8ac7"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f4282b3cba35716691834a131a"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_dcc1860c4507bfd4541579ba12"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c5320355c9ae51762a5a7b2165"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1b422f1938468d26ee7bbeb6f1"`);
    await queryRunner.query(`DROP TABLE "set_trader_referral_code_events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_77d8c2b7d27a7ec584a56a7244"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_52b3d41684454668d3ff4983f3"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_90836401e2dcd5a40af6056e67"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_57f6dc1904bf77da307819cf8d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d8c9d812c42bb2578a11e3dbce"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cb06ca2e8b8584fb1bea1a472c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_747cbb2c5c9fd66f886cb6f4b5"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e2bf2bcc11c98ed592153938ec"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_62060ee477606b92e2ba58c78d"`);
    await queryRunner.query(`DROP TABLE "register_code_events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a360c64fba3a0e71ce4be7b5e7"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_09017168fded901de8994e5459"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0cf86248766437fdf8ba387c45"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ad9388a359bf713a17b718c901"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_874884c62fab2be070397987c8"`);
    await queryRunner.query(`DROP TABLE "set_tier_events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4495cd3362a387d5cda8300f17"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c2aec47482398531afc6474ba1"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_dc1111eef55ee1b12091e036b6"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f5876d50eea2634b6a6b4f21ec"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1d1cf9a5c6d7f0b34dedaa0de2"`);
    await queryRunner.query(`DROP TABLE "set_code_owner_events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bfc5f45e85e060765a7b2bf594"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_aa2dff9f9851c51e102c5aac29"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_55cf66bbdad2dbbfeb119e4b14"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5be05126f6a2f712f15cd4624f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_aa2501d866cdfc5200df049f45"`);
    await queryRunner.query(`DROP TABLE "set_handler_events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2efb4ea266c393e1e8bfe51c88"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_931a18b62f3a83d583b1990458"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e42e2c560058b9b006a4f5af15"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d51e7a593e43512128d7d941f2"`);
    await queryRunner.query(`DROP TABLE "protection-removed-events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_eac564b54c2e686f3bbbdfb7f7"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_19b2559796c490b51ad46c6686"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2019b1709d451d3739d3e93aa9"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8b93141dbde79a439f8c1bfd46"`);
    await queryRunner.query(`DROP TABLE "strategy-deleted-events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d580d7fd7977675aaf649e0b7f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_92fe5683849f39db695c9b4995"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c239f8c77980389a6ed16872d3"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_32ec6fba5ace9de71aa011bf0a"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7671de629ff77fbfb76d048416"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9c5a2e9a334403254efb836f04"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_00faad78686d13fd0c26264ae8"`);
    await queryRunner.query(`DROP TABLE "strategy-created-events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_aca9132d7db5f0385024667004"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ec78d4bb8fa7e46d00ec1d26e2"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_af9af71f6ad35cf07505151c41"`);
    await queryRunner.query(`DROP TABLE "trading-fee-ppm-updated-events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a86e718b161bbc2ba208e3b05d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2d102125a8477e1c79bcb73ad3"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d647acab90ee2f65a3473acf79"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_63734fffd99f910f03fadfe3ad"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e4f82c59c17e9787d6bd1364d6"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fd9d2d0903bc14e8435c634b0f"`);
    await queryRunner.query(`DROP TABLE "vortex-tokens-traded-events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d2611fb5f6bb25ef81a62b20fb"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f6cd36e84afc2fdf1d9cea35ce"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d8ddb719df9d2a26006b415f98"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bc3628a6daaf2e7e169292f4ce"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0c842871c198090f0467451e9d"`);
    await queryRunner.query(`DROP TABLE "strategy-updated-events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_dcceb3e56b344cc9c8c703ae2d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3e7da58e7cdefd620d5d780fe8"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2e20328d5565ff6b3131ae93b5"`);
    await queryRunner.query(`DROP TABLE "voucher-transfer-events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_87d106f1babb36431cdb465729"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_544f5a3e612ff1a949d6f4f951"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8e4a2ad08794d7e20df02ab996"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8c31037872ad8a8a8280d51261"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a3a015d6530eec204734606276"`);
    await queryRunner.query(`DROP TABLE "vortex-trading-reset-events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a79cca94d6ef15daa29e4171a7"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e3e8cca2280e4cbdda57a426b5"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bbef3e8d43bcd8d72c830de4df"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8ba94fcea32aa9ab7e62e64c9f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3db3cd5cb695111b75f7b30b6e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_377408d0c0541389473b3835b6"`);
    await queryRunner.query(`DROP TABLE "vortex-funds-withdrawn-events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d12cf9ef56af854ce54dc38786"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1ecc4fcc7c3b053f9f9421a271"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b04ae3f2462c8658e04c8132a3"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_84a0673c5ec1baa6a299d57473"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_adda7b9deda346ff710695f496"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9f7e45c6e3e437dba9a5396f38"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8f93be3083843052caf98e0193"`);
    await queryRunner.query(`DROP TABLE "referral_codes"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ff075e0aacaba1b49c6e0e0007"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f5d0b43b4c4ad2dc249381d80f"`);
    await queryRunner.query(`DROP TABLE "trader_stats"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cffda985409952fc5f6e0d067f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5473a51408cbd2334ce34d0429"`);
    await queryRunner.query(`DROP TABLE "referrer_stats"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ce03cfa3147dcc33fc84674b5d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_144bbf6ec862217c81f0d75b68"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c829d7edddb470bd68e614218a"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cee4f3b6d2fbaa5bf83cc4259d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_98338410560478ecda739b6407"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_03740d4927654612a836d8820c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f8a40386029a7c3c3da93623f2"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bcef746cc96ca756a56ac0f601"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_08125c16cf193d628bd8504797"`);
    await queryRunner.query(`DROP TABLE "referral_states"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8e831f05c8e4425ec7cb48dd73"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_029a6f27fd8c3acdb7bdf47569"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e4b13cb8b317ced37902d2e4df"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_388ed5fd0d16645bf567edc3a2"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7ba7181393b295d77c12e34deb"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a37307f204a293b6437632a478"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fface4db28aaa3675565c10c9b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_29c26548428fa789f65cb7242e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2f85307a9c581907b40899a4cb"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_39bcc57a01e25d0a70837d1782"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_828401bd1175f97080473e119b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_159d1ef9c844ad2bf40c894e3e"`);
    await queryRunner.query(`DROP TABLE "activities-v2"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f016f6740e3e54b90a08b478ff"`);
    await queryRunner.query(`DROP TABLE "quotes"`);
    await queryRunner.query(`DROP TABLE "last_processed_block"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9e13b1c45c5d2beb1b69711236"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5ab5c8ab52bc42e68dcbc96558"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ab617affe46aa00bdd295edce0"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_51502c505f256a69be325a6345"`);
    await queryRunner.query(`DROP TABLE "historic-quotes"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ef67aba5c92802261b541d5288"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_03e591b57b14a9618bcb029583"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_77a80f3a926a86c52efa22402a"`);
    await queryRunner.query(`DROP TABLE "total-tvl"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f2412bf8441578cc42158051ae"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fa07d821f14ecc71eeae746d69"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2776b53d13ebed1a86d430276f"`);
    await queryRunner.query(`DROP TABLE "strategies"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1d894c6215a2a86d1b5bf661be"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2adf8fe1e85377fa39cba7757b"`);
    await queryRunner.query(`DROP TABLE "pairs"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e84271b4e93070bc7a68cabc9e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1117c3f900aaa2af9d97c39513"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2342ae203567a867b6fe366929"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_89f2258231d48af5d0d43e3ecd"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5ad4851dae6f841d71d1b631b3"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a6f4a2c99c4cad6663f94935fc"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_94fd1b26cb2dbeeba497fa79ba"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_974b69b8082522efa7f2ba47c1"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6d5a448e3ac65b30cc6ebb45b4"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4b447c4070d7d9f532817c8867"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4bec19484efcbe1a523521c5fe"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c03a21b4dead9ab3345f3ad490"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c081dde529d0e03627b56844e4"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bff069546ba7ea84e319446a26"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_25ff1bba41c8559e7094ab3faa"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c2d17f5848e8253a52408ff189"`);
    await queryRunner.query(`DROP TABLE "tokens-traded-events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6d88b5ea8a96fc81e3b0d52f42"`);
    await queryRunner.query(`DROP TABLE "blocks"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_66ddea115f5596805dea0cd676"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1fc8c9748b497072859bb0cceb"`);
    await queryRunner.query(`DROP TABLE "tokens"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e8b3d16260b7dea43e343e3366"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_488c5516e8c72b2686e744bfed"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_87d82627b8d99d3888aca0ebaa"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bebc452955d5e3bb98e10c9432"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_068a4a0ae76b8c4595ef9f1a57"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_df6c25be54ca428bc5a7301679"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e6721e8c5cc2ba40e2cd79a671"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a5bf157ef061f897df67c0dec2"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5d1a91351a5adac08f8d27d685"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2d3ef18dd126f6064fbc6dfa57"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5be44c8aa379657fcef7af663c"`);
    await queryRunner.query(`DROP TABLE "tvl"`);
  }
}
