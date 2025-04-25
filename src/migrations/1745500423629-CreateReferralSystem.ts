import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateReferralSystem1745500423629 implements MigrationInterface {
    name = 'CreateReferralSystem1745500423629'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "trader_stats" ("id" SERIAL NOT NULL, "address" character varying(42) NOT NULL, "volume" character varying(78) NOT NULL, "rebates" character varying(78) NOT NULL, "trades" integer NOT NULL, "chain_id" integer NOT NULL, "last_updated" double precision NOT NULL, CONSTRAINT "PK_8e7f231470ad9c39e25a26fb419" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f5d0b43b4c4ad2dc249381d80f" ON "trader_stats" ("address") `);
        await queryRunner.query(`CREATE INDEX "IDX_ff075e0aacaba1b49c6e0e0007" ON "trader_stats" ("chain_id") `);
        await queryRunner.query(`CREATE TABLE "referral_codes" ("id" SERIAL NOT NULL, "code" character varying(66) NOT NULL, "code_decoded" character varying(255), "owner" character varying(42) NOT NULL, "chain_id" integer NOT NULL, "transaction_hash" character varying(66) NOT NULL, "block_number" double precision NOT NULL, "timestamp" double precision NOT NULL, CONSTRAINT "PK_99f08e2ed9d39d8ce902f5f1f41" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_adda7b9deda346ff710695f496" ON "referral_codes" ("code") `);
        await queryRunner.query(`CREATE INDEX "IDX_b04ae3f2462c8658e04c8132a3" ON "referral_codes" ("chain_id") `);
        await queryRunner.query(`CREATE TABLE "referrer_stats" ("id" SERIAL NOT NULL, "address" character varying(42) NOT NULL, "volume" character varying(78) NOT NULL, "rebates" character varying(78) NOT NULL, "referrals" integer NOT NULL, "chain_id" integer NOT NULL, "last_updated" double precision NOT NULL, CONSTRAINT "PK_ae04860857b4fa95b538b897e20" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5473a51408cbd2334ce34d0429" ON "referrer_stats" ("address") `);
        await queryRunner.query(`CREATE INDEX "IDX_cffda985409952fc5f6e0d067f" ON "referrer_stats" ("chain_id") `);
        await queryRunner.query(`CREATE TABLE "set_referrer_discount_share_events" ("id" SERIAL NOT NULL, "referrer" character varying(42) NOT NULL, "discount_share" character varying(78) NOT NULL, "chain_id" integer NOT NULL, "transaction_hash" character varying(66) NOT NULL, "block_number" double precision NOT NULL, "timestamp" double precision NOT NULL, CONSTRAINT "PK_6b2df1132e36061bb7dac8a1897" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f53bb36ee339896fb2b4abd644" ON "set_referrer_discount_share_events" ("chain_id") `);
        await queryRunner.query(`CREATE TABLE "set_trader_referral_code_events" ("id" SERIAL NOT NULL, "account" character varying(42) NOT NULL, "code" character varying(66) NOT NULL, "code_decoded" character varying(255), "chain_id" integer NOT NULL, "transaction_hash" character varying(66) NOT NULL, "block_number" double precision NOT NULL, "timestamp" double precision NOT NULL, CONSTRAINT "PK_1c84074249a0a210b2be4f2c98a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_45847906624b535f79687b551b" ON "set_trader_referral_code_events" ("chain_id") `);
        await queryRunner.query(`CREATE TABLE "set_tier_events" ("id" SERIAL NOT NULL, "tier_id" character varying(78) NOT NULL, "total_rebate" character varying(78) NOT NULL, "discount_share" character varying(78) NOT NULL, "chain_id" integer NOT NULL, "transaction_hash" character varying(66) NOT NULL, "block_number" double precision NOT NULL, "timestamp" double precision NOT NULL, CONSTRAINT "PK_57e5bfda77892aef8fe186a45b6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_09017168fded901de8994e5459" ON "set_tier_events" ("chain_id") `);
        await queryRunner.query(`CREATE TABLE "set_code_owner_events" ("id" SERIAL NOT NULL, "account" character varying(42) NOT NULL, "new_account" character varying(42) NOT NULL, "code" character varying(66) NOT NULL, "code_decoded" character varying(255), "chain_id" integer NOT NULL, "transaction_hash" character varying(66) NOT NULL, "block_number" double precision NOT NULL, "timestamp" double precision NOT NULL, CONSTRAINT "PK_653e06c96d10bde35204e28c610" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c2aec47482398531afc6474ba1" ON "set_code_owner_events" ("chain_id") `);
        await queryRunner.query(`CREATE TABLE "gov_set_code_owner_events" ("id" SERIAL NOT NULL, "code" character varying(66) NOT NULL, "code_decoded" character varying(255), "new_account" character varying(42) NOT NULL, "chain_id" integer NOT NULL, "transaction_hash" character varying(66) NOT NULL, "block_number" double precision NOT NULL, "timestamp" double precision NOT NULL, CONSTRAINT "PK_04d905adf9bd8f875ebf3649b3c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4e97fe0fcd63120178f9451cd9" ON "gov_set_code_owner_events" ("chain_id") `);
        await queryRunner.query(`CREATE TABLE "set_referrer_tier_events" ("id" SERIAL NOT NULL, "referrer" character varying(42) NOT NULL, "tier_id" character varying(78) NOT NULL, "chain_id" integer NOT NULL, "transaction_hash" character varying(66) NOT NULL, "block_number" double precision NOT NULL, "timestamp" double precision NOT NULL, CONSTRAINT "PK_d7ce0c1c5a1027ef50ee635a2c6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_deee7681ee76c38e3124624a11" ON "set_referrer_tier_events" ("chain_id") `);
        await queryRunner.query(`CREATE TABLE "set_handler_events" ("id" SERIAL NOT NULL, "handler" character varying(42) NOT NULL, "is_active" boolean NOT NULL, "chain_id" integer NOT NULL, "transaction_hash" character varying(66) NOT NULL, "block_number" double precision NOT NULL, "timestamp" double precision NOT NULL, CONSTRAINT "PK_ba5896238e4765b86d251e0ecfa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_aa2dff9f9851c51e102c5aac29" ON "set_handler_events" ("chain_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_aa2dff9f9851c51e102c5aac29"`);
        await queryRunner.query(`DROP TABLE "set_handler_events"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_deee7681ee76c38e3124624a11"`);
        await queryRunner.query(`DROP TABLE "set_referrer_tier_events"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4e97fe0fcd63120178f9451cd9"`);
        await queryRunner.query(`DROP TABLE "gov_set_code_owner_events"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c2aec47482398531afc6474ba1"`);
        await queryRunner.query(`DROP TABLE "set_code_owner_events"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_09017168fded901de8994e5459"`);
        await queryRunner.query(`DROP TABLE "set_tier_events"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_45847906624b535f79687b551b"`);
        await queryRunner.query(`DROP TABLE "set_trader_referral_code_events"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f53bb36ee339896fb2b4abd644"`);
        await queryRunner.query(`DROP TABLE "set_referrer_discount_share_events"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cffda985409952fc5f6e0d067f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5473a51408cbd2334ce34d0429"`);
        await queryRunner.query(`DROP TABLE "referrer_stats"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b04ae3f2462c8658e04c8132a3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_adda7b9deda346ff710695f496"`);
        await queryRunner.query(`DROP TABLE "referral_codes"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ff075e0aacaba1b49c6e0e0007"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f5d0b43b4c4ad2dc249381d80f"`);
        await queryRunner.query(`DROP TABLE "trader_stats"`);
    }
}
