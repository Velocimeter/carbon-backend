import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFeeFieldsToActivityV21738588978926 implements MigrationInterface {
  name = 'AddFeeFieldsToActivityV21738588978926';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "activities-v2" ADD "fee" character varying`);
    await queryRunner.query(`ALTER TABLE "activities-v2" ADD "feeToken" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "activities-v2" DROP COLUMN "feeToken"`);
    await queryRunner.query(`ALTER TABLE "activities-v2" DROP COLUMN "fee"`);
  }
} 