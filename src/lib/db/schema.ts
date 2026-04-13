import {
  index,
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

export const savedCards = pgTable(
  "saved_cards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    frontRawImageSrc: text("front_raw_image_src").notNull(),
    frontImageSrc: text("front_image_src").notNull(),
    backRawImageSrc: text("back_raw_image_src").notNull(),
    backImageSrc: text("back_image_src").notNull(),
    configuration: jsonb("configuration")
      .$type<CenteringSessionConfiguration>()
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("saved_cards_user_id_idx").on(t.userId)],
);
