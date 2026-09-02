import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

export const up = (pgm: MigrationBuilder) => {
  pgm.addColumn("patients", {
    owner_id: { type: "integer", references: "users", onDelete: "SET NULL" },
  });
};

export const down = (pgm: MigrationBuilder) => {
  pgm.dropColumn("patients", "owner_id");
};