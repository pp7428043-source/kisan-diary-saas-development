import {
  pgTable,
  text,
  varchar,
  real,
  integer,
  timestamp,
  boolean,
  serial,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const languageEnum = pgEnum("language", ["hi", "en", "mr", "pa", "te", "ta"]);
export const seasonStatusEnum = pgEnum("season_status", ["active", "completed", "archived"]);
export const activityTypeEnum = pgEnum("activity_type", ["paani", "dawai", "beej", "majdoor", "other"]);
export const expenseCategoryEnum = pgEnum("expense_category", ["beej", "khad", "dawai", "majdoor", "machinary", "other"]);
export const harvestUnitEnum = pgEnum("harvest_unit", ["quintal", "kg", "ton"]);

// Users
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  phone: varchar("phone", { length: 15 }).unique(),
  username: varchar("username", { length: 30 }).unique(),
  passwordHash: text("password_hash"),
  name: varchar("name", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  language: languageEnum("language").default("hi").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// OTP Store
export const otpStore = pgTable("otp_store", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 15 }).notNull(),
  otp: varchar("otp", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sessions
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Farms
export const farms = pgTable("farms", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  sizeAcre: real("size_acre").notNull(),
  location: varchar("location", { length: 200 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Seasons
export const seasons = pgTable("seasons", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  farmId: text("farm_id").notNull().references(() => farms.id, { onDelete: "cascade" }),
  cropName: varchar("crop_name", { length: 100 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  status: seasonStatusEnum("status").default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Activity Logs
export const activityLogs = pgTable("activity_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  seasonId: text("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
  date: timestamp("date").defaultNow().notNull(),
  activityType: activityTypeEnum("activity_type").notNull(),
  note: text("note"),
  photoUrl: text("photo_url"),
  workers: integer("workers"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Expenses
export const expenses = pgTable("expenses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  seasonId: text("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
  date: timestamp("date").defaultNow().notNull(),
  category: expenseCategoryEnum("category").notNull(),
  amount: real("amount").notNull(),
  description: text("description"),
  receiptUrl: text("receipt_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Harvests
export const harvests = pgTable("harvests", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  seasonId: text("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
  date: timestamp("date").defaultNow().notNull(),
  quantity: real("quantity").notNull(),
  unit: harvestUnitEnum("unit").notNull(),
  pricePerUnit: real("price_per_unit").notNull(),
  totalIncome: real("total_income").notNull(),
  buyerName: varchar("buyer_name", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  farms: many(farms),
  sessions: many(sessions),
}));

export const farmsRelations = relations(farms, ({ one, many }) => ({
  user: one(users, { fields: [farms.userId], references: [users.id] }),
  seasons: many(seasons),
}));

export const seasonsRelations = relations(seasons, ({ one, many }) => ({
  farm: one(farms, { fields: [seasons.farmId], references: [farms.id] }),
  activityLogs: many(activityLogs),
  expenses: many(expenses),
  harvests: many(harvests),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  season: one(seasons, { fields: [activityLogs.seasonId], references: [seasons.id] }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  season: one(seasons, { fields: [expenses.seasonId], references: [seasons.id] }),
}));

export const harvestsRelations = relations(harvests, ({ one }) => ({
  season: one(seasons, { fields: [harvests.seasonId], references: [seasons.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Farm = typeof farms.$inferSelect;
export type NewFarm = typeof farms.$inferInsert;
export type Season = typeof seasons.$inferSelect;
export type NewSeason = typeof seasons.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type Harvest = typeof harvests.$inferSelect;
export type NewHarvest = typeof harvests.$inferInsert;
export type Session = typeof sessions.$inferSelect;
