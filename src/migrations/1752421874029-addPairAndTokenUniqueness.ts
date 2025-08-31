import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPairAndTokenUniqueness1752421874029 implements MigrationInterface {
  name = 'AddPairAndTokenUniqueness1752421874029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Deduplicate tokens by (blockchainType, exchangeId, address) and re-point all FKs to the canonical row
    // Build mapping of duplicate token ids to their canonical keep_id
    await queryRunner.query(`
      CREATE TEMP TABLE IF NOT EXISTS token_dups_map AS
      WITH groups AS (
        SELECT "blockchainType","exchangeId","address", MIN(id) AS keep_id
        FROM tokens
        GROUP BY 1,2,3
        HAVING COUNT(*) > 1
      ),
      dups AS (
        SELECT t.id AS dup_id, g.keep_id
        FROM tokens t
        JOIN groups g USING ("blockchainType","exchangeId","address")
        WHERE t.id <> g.keep_id
      )
      SELECT dup_id, keep_id FROM dups;
    `);

    // Update all FKs that reference tokens using the mapping
    await queryRunner.query(`UPDATE pairs p SET "token0Id" = m.keep_id FROM token_dups_map m WHERE p."token0Id" = m.dup_id`);
    await queryRunner.query(`UPDATE pairs p SET "token1Id" = m.keep_id FROM token_dups_map m WHERE p."token1Id" = m.dup_id`);
    await queryRunner.query(`UPDATE strategies s SET "token0Id" = m.keep_id FROM token_dups_map m WHERE s."token0Id" = m.dup_id`);
    await queryRunner.query(`UPDATE strategies s SET "token1Id" = m.keep_id FROM token_dups_map m WHERE s."token1Id" = m.dup_id`);
    await queryRunner.query(`UPDATE "activities-v2" a SET "token0Id" = m.keep_id FROM token_dups_map m WHERE a."token0Id" = m.dup_id`);
    await queryRunner.query(`UPDATE "activities-v2" a SET "token1Id" = m.keep_id FROM token_dups_map m WHERE a."token1Id" = m.dup_id`);
    await queryRunner.query(`UPDATE "strategy-created-events" e SET "token0Id" = m.keep_id FROM token_dups_map m WHERE e."token0Id" = m.dup_id`);
    await queryRunner.query(`UPDATE "strategy-created-events" e SET "token1Id" = m.keep_id FROM token_dups_map m WHERE e."token1Id" = m.dup_id`);
    await queryRunner.query(`UPDATE "strategy-updated-events" e SET "token0Id" = m.keep_id FROM token_dups_map m WHERE e."token0Id" = m.dup_id`);
    await queryRunner.query(`UPDATE "strategy-updated-events" e SET "token1Id" = m.keep_id FROM token_dups_map m WHERE e."token1Id" = m.dup_id`);
    await queryRunner.query(`UPDATE "strategy-deleted-events" e SET "token0Id" = m.keep_id FROM token_dups_map m WHERE e."token0Id" = m.dup_id`);
    await queryRunner.query(`UPDATE "strategy-deleted-events" e SET "token1Id" = m.keep_id FROM token_dups_map m WHERE e."token1Id" = m.dup_id`);
    await queryRunner.query(`UPDATE quotes q SET "tokenId" = m.keep_id FROM token_dups_map m WHERE q."tokenId" = m.dup_id`);
    await queryRunner.query(`UPDATE "tokens-traded-events" t SET "sourceTokenId" = m.keep_id FROM token_dups_map m WHERE t."sourceTokenId" = m.dup_id`);
    await queryRunner.query(`UPDATE "tokens-traded-events" t SET "targetTokenId" = m.keep_id FROM token_dups_map m WHERE t."targetTokenId" = m.dup_id`);

    // Delete duplicate token rows now that all FKs point to keep_id
    await queryRunner.query(`DELETE FROM tokens WHERE id IN (SELECT dup_id FROM token_dups_map)`);
    await queryRunner.query(`DROP TABLE IF EXISTS token_dups_map`);

    // 2) Add unique constraint on tokens
    await queryRunner.query(
      `ALTER TABLE "tokens" ADD CONSTRAINT "UQ_e3b5032d4ff52de1697727a61c3" UNIQUE ("blockchainType", "exchangeId", "address")`,
    );

    // 3) Deduplicate pairs by (blockchainType, exchangeId, token0Id, token1Id) and re-point pairId FKs
    // Build mapping of duplicate pair ids to their canonical keep_id
    await queryRunner.query(`
      CREATE TEMP TABLE IF NOT EXISTS pair_dups_map AS
      WITH groups AS (
        SELECT "blockchainType","exchangeId","token0Id","token1Id", MIN(id) AS keep_id
        FROM pairs
        GROUP BY 1,2,3,4
        HAVING COUNT(*) > 1
      ),
      dups AS (
        SELECT p.id AS dup_id, g.keep_id
        FROM pairs p
        JOIN groups g USING ("blockchainType","exchangeId","token0Id","token1Id")
        WHERE p.id <> g.keep_id
      )
      SELECT dup_id, keep_id FROM dups;
    `);

    // Update all FKs that reference pairs using the mapping
    await queryRunner.query(`UPDATE strategies s SET "pairId" = m.keep_id FROM pair_dups_map m WHERE s."pairId" = m.dup_id`);
    await queryRunner.query(`UPDATE "strategy-created-events" e SET "pairId" = m.keep_id FROM pair_dups_map m WHERE e."pairId" = m.dup_id`);
    await queryRunner.query(`UPDATE "strategy-updated-events" e SET "pairId" = m.keep_id FROM pair_dups_map m WHERE e."pairId" = m.dup_id`);
    await queryRunner.query(`UPDATE "strategy-deleted-events" e SET "pairId" = m.keep_id FROM pair_dups_map m WHERE e."pairId" = m.dup_id`);
    await queryRunner.query(`UPDATE "tokens-traded-events" t SET "pairId" = m.keep_id FROM pair_dups_map m WHERE t."pairId" = m.dup_id`);

    // Delete duplicate pair rows now that all FKs point to keep_id
    await queryRunner.query(`DELETE FROM pairs WHERE id IN (SELECT dup_id FROM pair_dups_map)`);
    await queryRunner.query(`DROP TABLE IF EXISTS pair_dups_map`);

    // 4) Add unique constraint on pairs
    await queryRunner.query(
      `ALTER TABLE "pairs" ADD CONSTRAINT "UQ_452146c3a7aa014ae5fc126a5e4" UNIQUE ("blockchainType", "exchangeId", "token0Id", "token1Id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "pairs" DROP CONSTRAINT "UQ_452146c3a7aa014ae5fc126a5e4"`);
    await queryRunner.query(`ALTER TABLE "tokens" DROP CONSTRAINT "UQ_e3b5032d4ff52de1697727a61c3"`);
  }
}
