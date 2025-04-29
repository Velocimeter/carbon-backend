import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameReferrerToAccount1745891835698 implements MigrationInterface {
    name = 'RenameReferrerToAccount1745891835698'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_d8c9d812c42bb2578a11e3dbce"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_52b3d41684454668d3ff4983f3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f4282b3cba35716691834a131a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ad05d8c01781784b245c2b8ac7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bb402e760401db84fb6cb4613f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b070301b78a0ef1f65427a1425"`);
        await queryRunner.query(`ALTER TABLE "register_code_events" RENAME COLUMN "referrer" TO "account"`);
        await queryRunner.query(`CREATE INDEX "IDX_f4282b3cba35716691834a131a" ON "set_trader_referral_code_events" ("account") `);
        await queryRunner.query(`CREATE INDEX "IDX_ad05d8c01781784b245c2b8ac7" ON "set_trader_referral_code_events" ("code") `);
        await queryRunner.query(`CREATE INDEX "IDX_bb402e760401db84fb6cb4613f" ON "set_trader_referral_code_events" ("account", "blockchainType", "exchangeId") `);
        await queryRunner.query(`CREATE INDEX "IDX_b070301b78a0ef1f65427a1425" ON "set_trader_referral_code_events" ("code", "blockchainType", "exchangeId") `);
        await queryRunner.query(`CREATE INDEX "IDX_32195768e7fa24744474f1c118" ON "register_code_events" ("account") `);
        await queryRunner.query(`CREATE INDEX "IDX_315b1775b7475b5c4b5f03c6eb" ON "register_code_events" ("account", "blockchainType", "exchangeId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_315b1775b7475b5c4b5f03c6eb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_32195768e7fa24744474f1c118"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b070301b78a0ef1f65427a1425"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bb402e760401db84fb6cb4613f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ad05d8c01781784b245c2b8ac7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f4282b3cba35716691834a131a"`);
        await queryRunner.query(`ALTER TABLE "register_code_events" RENAME COLUMN "account" TO "referrer"`);
        await queryRunner.query(`CREATE INDEX "IDX_b070301b78a0ef1f65427a1425" ON "set_trader_referral_code_events" ("blockchainType", "code", "exchangeId") `);
        await queryRunner.query(`CREATE INDEX "IDX_bb402e760401db84fb6cb4613f" ON "set_trader_referral_code_events" ("account", "blockchainType", "exchangeId") `);
        await queryRunner.query(`CREATE INDEX "IDX_ad05d8c01781784b245c2b8ac7" ON "set_trader_referral_code_events" ("code") `);
        await queryRunner.query(`CREATE INDEX "IDX_f4282b3cba35716691834a131a" ON "set_trader_referral_code_events" ("account") `);
        await queryRunner.query(`CREATE INDEX "IDX_52b3d41684454668d3ff4983f3" ON "register_code_events" ("blockchainType", "exchangeId", "referrer") `);
        await queryRunner.query(`CREATE INDEX "IDX_d8c9d812c42bb2578a11e3dbce" ON "register_code_events" ("referrer") `);
    }

}
