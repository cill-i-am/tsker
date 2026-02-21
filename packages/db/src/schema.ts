import { pgTable, text, timestamp, boolean, uniqueIndex, index } from "drizzle-orm/pg-core";

const createdAt = timestamp("created_at", { mode: "date", withTimezone: true })
  .notNull()
  .defaultNow();
const updatedAt = timestamp("updated_at", { mode: "date", withTimezone: true })
  .notNull()
  .defaultNow();

export const user = pgTable(
  "user",
  {
    createdAt,
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    id: text("id").primaryKey(),
    image: text("image"),
    name: text("name").notNull(),
    updatedAt,
  },
  (table) => [uniqueIndex("user_email_unique").on(table.email)],
);

export const session = pgTable(
  "session",
  {
    createdAt,
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }).notNull(),
    id: text("id").primaryKey(),
    ipAddress: text("ip_address"),
    token: text("token").notNull(),
    updatedAt,
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("session_token_unique").on(table.token),
    index("session_user_id_idx").on(table.userId),
  ],
);

export const account = pgTable(
  "account",
  {
    accessToken: text("access_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      mode: "date",
      withTimezone: true,
    }),
    accountId: text("account_id").notNull(),
    createdAt,
    id: text("id").primaryKey(),
    idToken: text("id_token"),
    password: text("password"),
    providerId: text("provider_id").notNull(),
    refreshToken: text("refresh_token"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      mode: "date",
      withTimezone: true,
    }),
    scope: text("scope"),
    updatedAt,
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("account_provider_account_unique").on(table.providerId, table.accountId),
    index("account_user_id_idx").on(table.userId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    createdAt,
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }).notNull(),
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    updatedAt,
    value: text("value").notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const authSchema = {
  account,
  session,
  user,
  verification,
};
