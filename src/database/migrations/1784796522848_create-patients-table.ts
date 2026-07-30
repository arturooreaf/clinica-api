import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

export const up = (pgm: MigrationBuilder) => {
  pgm.createTable("patients", {
    id: "id",
    name: { type: "varchar(100)", notNull: true },
    age: { type: "integer", notNull: true },
    diagnosis: { type: "varchar(100)" },
  });
};

export const down = (pgm: MigrationBuilder) => {
  pgm.dropTable("patients");
};
