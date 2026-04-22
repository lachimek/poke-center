import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { CenteringSessionConfiguration } from "@/lib/centering/sessionConfiguration";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const images = pgTable(
  "images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    objectKey: text("object_key").notNull().unique(),
    publicUrl: text("public_url").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    etag: text("etag"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("images_user_id_idx").on(t.userId),
    index("images_created_at_idx").on(t.createdAt),
  ],
);

export const savedCards = pgTable(
  "saved_cards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    frontRawImageId: uuid("front_raw_image_id").references(() => images.id, {
      onDelete: "set null",
    }),
    frontImageId: uuid("front_image_id").references(() => images.id, {
      onDelete: "set null",
    }),
    backRawImageId: uuid("back_raw_image_id").references(() => images.id, {
      onDelete: "set null",
    }),
    backImageId: uuid("back_image_id").references(() => images.id, {
      onDelete: "set null",
    }),
    configuration: jsonb("configuration")
      .$type<CenteringSessionConfiguration>()
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("saved_cards_user_id_idx").on(t.userId)],
);

export const wipCards = pgTable(
  "wip_cards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    frontRawImageId: uuid("front_raw_image_id").references(() => images.id, {
      onDelete: "set null",
    }),
    backRawImageId: uuid("back_raw_image_id").references(() => images.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("wip_cards_user_id_idx").on(t.userId)],
);
