import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBlockIdToReferralTables1745500423630 implements MigrationInterface {
    name = 'AddBlockIdToReferralTables1745500423630'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add block_id column to referral_codes
        await queryRunner.query(`ALTER TABLE "referral_codes" ADD COLUMN "block_id" integer`);
        await queryRunner.query(`CREATE INDEX "IDX_referral_codes_block_id" ON "referral_codes" ("block_id")`);
        await queryRunner.query(`UPDATE "referral_codes" SET "block_id" = (SELECT id FROM blocks WHERE blocks."blockchainType" = 'berachain' AND blocks.id = referral_codes.block_number)`);
        
        // Add block_id column to set_referrer_discount_share_events
        await queryRunner.query(`ALTER TABLE "set_referrer_discount_share_events" ADD COLUMN "block_id" integer`);
        await queryRunner.query(`CREATE INDEX "IDX_set_referrer_discount_share_events_block_id" ON "set_referrer_discount_share_events" ("block_id")`);
        await queryRunner.query(`UPDATE "set_referrer_discount_share_events" SET "block_id" = (SELECT id FROM blocks WHERE blocks."blockchainType" = 'berachain' AND blocks.id = set_referrer_discount_share_events.block_number)`);
        
        // Add block_id column to set_trader_referral_code_events
        await queryRunner.query(`ALTER TABLE "set_trader_referral_code_events" ADD COLUMN "block_id" integer`);
        await queryRunner.query(`CREATE INDEX "IDX_set_trader_referral_code_events_block_id" ON "set_trader_referral_code_events" ("block_id")`);
        await queryRunner.query(`UPDATE "set_trader_referral_code_events" SET "block_id" = (SELECT id FROM blocks WHERE blocks."blockchainType" = 'berachain' AND blocks.id = set_trader_referral_code_events.block_number)`);
        
        // Add block_id column to set_tier_events
        await queryRunner.query(`ALTER TABLE "set_tier_events" ADD COLUMN "block_id" integer`);
        await queryRunner.query(`CREATE INDEX "IDX_set_tier_events_block_id" ON "set_tier_events" ("block_id")`);
        await queryRunner.query(`UPDATE "set_tier_events" SET "block_id" = (SELECT id FROM blocks WHERE blocks."blockchainType" = 'berachain' AND blocks.id = set_tier_events.block_number)`);
        
        // Add block_id column to set_code_owner_events
        await queryRunner.query(`ALTER TABLE "set_code_owner_events" ADD COLUMN "block_id" integer`);
        await queryRunner.query(`CREATE INDEX "IDX_set_code_owner_events_block_id" ON "set_code_owner_events" ("block_id")`);
        await queryRunner.query(`UPDATE "set_code_owner_events" SET "block_id" = (SELECT id FROM blocks WHERE blocks."blockchainType" = 'berachain' AND blocks.id = set_code_owner_events.block_number)`);
        
        // Add block_id column to gov_set_code_owner_events
        await queryRunner.query(`ALTER TABLE "gov_set_code_owner_events" ADD COLUMN "block_id" integer`);
        await queryRunner.query(`CREATE INDEX "IDX_gov_set_code_owner_events_block_id" ON "gov_set_code_owner_events" ("block_id")`);
        await queryRunner.query(`UPDATE "gov_set_code_owner_events" SET "block_id" = (SELECT id FROM blocks WHERE blocks."blockchainType" = 'berachain' AND blocks.id = gov_set_code_owner_events.block_number)`);
        
        // Add block_id column to set_referrer_tier_events
        await queryRunner.query(`ALTER TABLE "set_referrer_tier_events" ADD COLUMN "block_id" integer`);
        await queryRunner.query(`CREATE INDEX "IDX_set_referrer_tier_events_block_id" ON "set_referrer_tier_events" ("block_id")`);
        await queryRunner.query(`UPDATE "set_referrer_tier_events" SET "block_id" = (SELECT id FROM blocks WHERE blocks."blockchainType" = 'berachain' AND blocks.id = set_referrer_tier_events.block_number)`);
        
        // Add block_id column to set_handler_events
        await queryRunner.query(`ALTER TABLE "set_handler_events" ADD COLUMN "block_id" integer`);
        await queryRunner.query(`CREATE INDEX "IDX_set_handler_events_block_id" ON "set_handler_events" ("block_id")`);
        await queryRunner.query(`UPDATE "set_handler_events" SET "block_id" = (SELECT id FROM blocks WHERE blocks."blockchainType" = 'berachain' AND blocks.id = set_handler_events.block_number)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove block_id from referral_codes
        await queryRunner.query(`DROP INDEX "IDX_referral_codes_block_id"`);
        await queryRunner.query(`ALTER TABLE "referral_codes" DROP COLUMN "block_id"`);
        
        // Remove block_id from set_referrer_discount_share_events
        await queryRunner.query(`DROP INDEX "IDX_set_referrer_discount_share_events_block_id"`);
        await queryRunner.query(`ALTER TABLE "set_referrer_discount_share_events" DROP COLUMN "block_id"`);
        
        // Remove block_id from set_trader_referral_code_events
        await queryRunner.query(`DROP INDEX "IDX_set_trader_referral_code_events_block_id"`);
        await queryRunner.query(`ALTER TABLE "set_trader_referral_code_events" DROP COLUMN "block_id"`);
        
        // Remove block_id from set_tier_events
        await queryRunner.query(`DROP INDEX "IDX_set_tier_events_block_id"`);
        await queryRunner.query(`ALTER TABLE "set_tier_events" DROP COLUMN "block_id"`);
        
        // Remove block_id from set_code_owner_events
        await queryRunner.query(`DROP INDEX "IDX_set_code_owner_events_block_id"`);
        await queryRunner.query(`ALTER TABLE "set_code_owner_events" DROP COLUMN "block_id"`);
        
        // Remove block_id from gov_set_code_owner_events
        await queryRunner.query(`DROP INDEX "IDX_gov_set_code_owner_events_block_id"`);
        await queryRunner.query(`ALTER TABLE "gov_set_code_owner_events" DROP COLUMN "block_id"`);
        
        // Remove block_id from set_referrer_tier_events
        await queryRunner.query(`DROP INDEX "IDX_set_referrer_tier_events_block_id"`);
        await queryRunner.query(`ALTER TABLE "set_referrer_tier_events" DROP COLUMN "block_id"`);
        
        // Remove block_id from set_handler_events
        await queryRunner.query(`DROP INDEX "IDX_set_handler_events_block_id"`);
        await queryRunner.query(`ALTER TABLE "set_handler_events" DROP COLUMN "block_id"`);
    }
} 