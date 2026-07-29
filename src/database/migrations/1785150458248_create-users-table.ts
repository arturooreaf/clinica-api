import type { ColumnDefinitions,  MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions |  undefined = undefined;

export const up = (pgm: MigrationBuilder) => {
    pgm.createTable('users', {
        id: 'id',
        
        email: {type: 
                'varchar(100)', notNull: true, unique: true 

        },
        password_hash: { type: 
            'varchar(100)', notNull: true,
        },
        name: {type: 
                'varchar(100)', notNull: true 

        }
    });
};

export const down = (pgm: MigrationBuilder) => {
    pgm.dropTable('users')
};
