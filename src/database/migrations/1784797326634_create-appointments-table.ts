import type { ColumnDefinitions,  MigrationBuilder } from 'node-pg-migrate';
export const shorthands: ColumnDefinitions| undefined = undefined

 
export const up = (pgm: MigrationBuilder) => {
  pgm.createTable('appointments', {
    id: 'id',
    patient_id: {
      type: 'integer',
      notNull: true,
      references: 'patients',
      onDelete: 'CASCADE',
    },
    date: {
      type: 'timestamp',
      notNull: true,
    },
    reason: {
      type: 'varchar(255)',
      
    },
  });
};


export const down = (pgm: MigrationBuilder) => {
  pgm.dropTable('appointments')
};
