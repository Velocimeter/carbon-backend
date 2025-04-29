import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBlockchainTypeAndExchangeIdToReferralTables1745500423631 implements MigrationInterface {
    name = 'AddBlockchainTypeAndExchangeIdToReferralTables1745500423631'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add columns to referral_codes
        await queryRunner.query(`ALTER TABLE "referral_codes" ADD COLUMN "blockchain_type" varchar`);
        await queryRunner.query(`ALTER TABLE "referral_codes" ADD COLUMN "exchange_id" varchar`);
        await queryRunner.query(`ALTER TABLE "referral_codes" ADD COLUMN "transaction_index" integer`);
        await queryRunner.query(`ALTER TABLE "referral_codes" ADD COLUMN "log_index" integer`);
        await queryRunner.query(`UPDATE "referral_codes" SET "blockchain_type" = 'berachain', "exchange_id" = 'berachain' WHERE "chain_id" = 80085`);
        await queryRunner.query(`UPDATE "referral_codes" SET "blockchain_type" = 'sonic', "exchange_id" = 'sonic' WHERE "chain_id" = 80088`);
        
        // Add columns to set_referrer_discount_share_events
        await queryRunner.query(`ALTER TABLE "set_referrer_discount_share_events" ADD COLUMN "blockchain_type" varchar`);
        await queryRunner.query(`ALTER TABLE "set_referrer_discount_share_events" ADD COLUMN "exchange_id" varchar`);
        await queryRunner.query(`ALTER TABLE "set_referrer_discount_share_events" ADD COLUMN "transaction_index" integer`);
        await queryRunner.query(`ALTER TABLE "set_referrer_discount_share_events" ADD COLUMN "log_index" integer`);
        await queryRunner.query(`UPDATE "set_referrer_discount_share_events" SET "blockchain_type" = 'berachain', "exchange_id" = 'berachain' WHERE "chain_id" = 80085`);
        await queryRunner.query(`UPDATE "set_referrer_discount_share_events" SET "blockchain_type" = 'sonic', "exchange_id" = 'sonic' WHERE "chain_id" = 80088`);
        
        // Add columns to set_trader_referral_code_events
        await queryRunner.query(`ALTER TABLE "set_trader_referral_code_events" ADD COLUMN "blockchain_type" varchar`);
        await queryRunner.query(`ALTER TABLE "set_trader_referral_code_events" ADD COLUMN "exchange_id" varchar`);
        await queryRunner.query(`ALTER TABLE "set_trader_referral_code_events" ADD COLUMN "transaction_index" integer`);
        await queryRunner.query(`ALTER TABLE "set_trader_referral_code_events" ADD COLUMN "log_index" integer`);
        await queryRunner.query(`UPDATE "set_trader_referral_code_events" SET "blockchain_type" = 'berachain', "exchange_id" = 'berachain' WHERE "chain_id" = 80085`);
        await queryRunner.query(`UPDATE "set_trader_referral_code_events" SET "blockchain_type" = 'sonic', "exchange_id" = 'sonic' WHERE "chain_id" = 80088`);
        
        // Add columns to set_tier_events
        await queryRunner.query(`ALTER TABLE "set_tier_events" ADD COLUMN "blockchain_type" varchar`);
        await queryRunner.query(`ALTER TABLE "set_tier_events" ADD COLUMN "exchange_id" varchar`);
        await queryRunner.query(`ALTER TABLE "set_tier_events" ADD COLUMN "transaction_index" integer`);
        await queryRunner.query(`ALTER TABLE "set_tier_events" ADD COLUMN "log_index" integer`);
        await queryRunner.query(`UPDATE "set_tier_events" SET "blockchain_type" = 'berachain', "exchange_id" = 'berachain' WHERE "chain_id" = 80085`);
        await queryRunner.query(`UPDATE "set_tier_events" SET "blockchain_type" = 'sonic', "exchange_id" = 'sonic' WHERE "chain_id" = 80088`);
        
        // Add columns to set_code_owner_events
        await queryRunner.query(`ALTER TABLE "set_code_owner_events" ADD COLUMN "blockchain_type" varchar`);
        await queryRunner.query(`ALTER TABLE "set_code_owner_events" ADD COLUMN "exchange_id" varchar`);
        await queryRunner.query(`ALTER TABLE "set_code_owner_events" ADD COLUMN "transaction_index" integer`);
        await queryRunner.query(`ALTER TABLE "set_code_owner_events" ADD COLUMN "log_index" integer`);
        await queryRunner.query(`UPDATE "set_code_owner_events" SET "blockchain_type" = 'berachain', "exchange_id" = 'berachain' WHERE "chain_id" = 80085`);
        await queryRunner.query(`UPDATE "set_code_owner_events" SET "blockchain_type" = 'sonic', "exchange_id" = 'sonic' WHERE "chain_id" = 80088`);
        
        // Add columns to gov_set_code_owner_events
        await queryRunner.query(`ALTER TABLE "gov_set_code_owner_events" ADD COLUMN "blockchain_type" varchar`);
        await queryRunner.query(`ALTER TABLE "gov_set_code_owner_events" ADD COLUMN "exchange_id" varchar`);
        await queryRunner.query(`ALTER TABLE "gov_set_code_owner_events" ADD COLUMN "transaction_index" integer`);
        await queryRunner.query(`ALTER TABLE "gov_set_code_owner_events" ADD COLUMN "log_index" integer`);
        await queryRunner.query(`UPDATE "gov_set_code_owner_events" SET "blockchain_type" = 'berachain', "exchange_id" = 'berachain' WHERE "chain_id" = 80085`);
        await queryRunner.query(`UPDATE "gov_set_code_owner_events" SET "blockchain_type" = 'sonic', "exchange_id" = 'sonic' WHERE "chain_id" = 80088`);
        
        // Add columns to set_referrer_tier_events
        await queryRunner.query(`ALTER TABLE "set_referrer_tier_events" ADD COLUMN "blockchain_type" varchar`);
        await queryRunner.query(`ALTER TABLE "set_referrer_tier_events" ADD COLUMN "exchange_id" varchar`);
        await queryRunner.query(`ALTER TABLE "set_referrer_tier_events" ADD COLUMN "transaction_index" integer`);
        await queryRunner.query(`ALTER TABLE "set_referrer_tier_events" ADD COLUMN "log_index" integer`);
        await queryRunner.query(`UPDATE "set_referrer_tier_events" SET "blockchain_type" = 'berachain', "exchange_id" = 'berachain' WHERE "chain_id" = 80085`);
        await queryRunner.query(`UPDATE "set_referrer_tier_events" SET "blockchain_type" = 'sonic', "exchange_id" = 'sonic' WHERE "chain_id" = 80088`);
        
        // Add columns to set_handler_events
        await queryRunner.query(`ALTER TABLE "set_handler_events" ADD COLUMN "blockchain_type" varchar`);
        await queryRunner.query(`ALTER TABLE "set_handler_events" ADD COLUMN "exchange_id" varchar`);
        await queryRunner.query(`ALTER TABLE "set_handler_events" ADD COLUMN "transaction_index" integer`);
        await queryRunner.query(`ALTER TABLE "set_handler_events" ADD COLUMN "log_index" integer`);
        await queryRunner.query(`UPDATE "set_handler_events" SET "blockchain_type" = 'berachain', "exchange_id" = 'berachain' WHERE "chain_id" = 80085`);
        await queryRunner.query(`UPDATE "set_handler_events" SET "blockchain_type" = 'sonic', "exchange_id" = 'sonic' WHERE "chain_id" = 80088`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove columns from referral_codes
        await queryRunner.query(`ALTER TABLE "referral_codes" DROP COLUMN "blockchain_type"`);
        await queryRunner.query(`ALTER TABLE "referral_codes" DROP COLUMN "exchange_id"`);
        await queryRunner.query(`ALTER TABLE "referral_codes" DROP COLUMN "transaction_index"`);
        await queryRunner.query(`ALTER TABLE "referral_codes" DROP COLUMN "log_index"`);
        
        // Remove columns from set_referrer_discount_share_events
        await queryRunner.query(`ALTER TABLE "set_referrer_discount_share_events" DROP COLUMN "blockchain_type"`);
        await queryRunner.query(`ALTER TABLE "set_referrer_discount_share_events" DROP COLUMN "exchange_id"`);
        await queryRunner.query(`ALTER TABLE "set_referrer_discount_share_events" DROP COLUMN "transaction_index"`);
        await queryRunner.query(`ALTER TABLE "set_referrer_discount_share_events" DROP COLUMN "log_index"`);
        
        // Remove columns from set_trader_referral_code_events
        await queryRunner.query(`ALTER TABLE "set_trader_referral_code_events" DROP COLUMN "blockchain_type"`);
        await queryRunner.query(`ALTER TABLE "set_trader_referral_code_events" DROP COLUMN "exchange_id"`);
        await queryRunner.query(`ALTER TABLE "set_trader_referral_code_events" DROP COLUMN "transaction_index"`);
        await queryRunner.query(`ALTER TABLE "set_trader_referral_code_events" DROP COLUMN "log_index"`);
        
        // Remove columns from set_tier_events
        await queryRunner.query(`ALTER TABLE "set_tier_events" DROP COLUMN "blockchain_type"`);
        await queryRunner.query(`ALTER TABLE "set_tier_events" DROP COLUMN "exchange_id"`);
        await queryRunner.query(`ALTER TABLE "set_tier_events" DROP COLUMN "transaction_index"`);
        await queryRunner.query(`ALTER TABLE "set_tier_events" DROP COLUMN "log_index"`);
        
        // Remove columns from set_code_owner_events
        await queryRunner.query(`ALTER TABLE "set_code_owner_events" DROP COLUMN "blockchain_type"`);
        await queryRunner.query(`ALTER TABLE "set_code_owner_events" DROP COLUMN "exchange_id"`);
        await queryRunner.query(`ALTER TABLE "set_code_owner_events" DROP COLUMN "transaction_index"`);
        await queryRunner.query(`ALTER TABLE "set_code_owner_events" DROP COLUMN "log_index"`);
        
        // Remove columns from gov_set_code_owner_events
        await queryRunner.query(`ALTER TABLE "gov_set_code_owner_events" DROP COLUMN "blockchain_type"`);
        await queryRunner.query(`ALTER TABLE "gov_set_code_owner_events" DROP COLUMN "exchange_id"`);
        await queryRunner.query(`ALTER TABLE "gov_set_code_owner_events" DROP COLUMN "transaction_index"`);
        await queryRunner.query(`ALTER TABLE "gov_set_code_owner_events" DROP COLUMN "log_index"`);
        
        // Remove columns from set_referrer_tier_events
        await queryRunner.query(`ALTER TABLE "set_referrer_tier_events" DROP COLUMN "blockchain_type"`);
        await queryRunner.query(`ALTER TABLE "set_referrer_tier_events" DROP COLUMN "exchange_id"`);
        await queryRunner.query(`ALTER TABLE "set_referrer_tier_events" DROP COLUMN "transaction_index"`);
        await queryRunner.query(`ALTER TABLE "set_referrer_tier_events" DROP COLUMN "log_index"`);
        
        // Remove columns from set_handler_events
        await queryRunner.query(`ALTER TABLE "set_handler_events" DROP COLUMN "blockchain_type"`);
        await queryRunner.query(`ALTER TABLE "set_handler_events" DROP COLUMN "exchange_id"`);
        await queryRunner.query(`ALTER TABLE "set_handler_events" DROP COLUMN "transaction_index"`);
        await queryRunner.query(`ALTER TABLE "set_handler_events" DROP COLUMN "log_index"`);
    }
} 