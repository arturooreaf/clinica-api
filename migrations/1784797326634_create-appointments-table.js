/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
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


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('appointments')
};
