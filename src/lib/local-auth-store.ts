import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type LocalAuthLanguage = "hi" | "en" | "mr" | "pa" | "te" | "ta";

export interface LocalUser {
  id: string;
  phone: string | null;
  username: string | null;
  passwordHash: string | null;
  name: string;
  state: string;
  language: LocalAuthLanguage;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocalSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface LocalOtp {
  id: number;
  phone: string;
  otp: string;
  expiresAt: string;
  verified: boolean;
  createdAt: string;
}

export interface LocalFarm {
  id: string;
  userId: string;
  name: string;
  sizeAcre: number;
  location: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalSeason {
  id: string;
  farmId: string;
  cropName: string;
  startDate: string;
  endDate?: string | null;
  status: "active" | "completed" | "archived";
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface LocalAuthStore {
  users: LocalUser[];
  sessions: LocalSession[];
  otps: LocalOtp[];
  farms: LocalFarm[];
  seasons: LocalSeason[];
  lastOtpId: number;
}

const storePath = path.join(process.cwd(), ".codex-auth-store.json");
const fallbackStore: LocalAuthStore = {
  users: [],
  sessions: [],
  otps: [],
  farms: [],
  seasons: [],
  lastOtpId: 0,
};

let memoryStore: LocalAuthStore | null = null;

function cloneStore(store: LocalAuthStore): LocalAuthStore {
  return {
    users: [...store.users],
    sessions: [...store.sessions],
    otps: [...store.otps],
    farms: [...store.farms],
    seasons: [...store.seasons],
    lastOtpId: store.lastOtpId,
  };
}

async function readStore(): Promise<LocalAuthStore> {
  if (memoryStore) return cloneStore(memoryStore);

  try {
    const raw = await readFile(storePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<LocalAuthStore>;
    memoryStore = {
      users: Array.isArray(parsed.users) ? parsed.users as LocalUser[] : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions as LocalSession[] : [],
      otps: Array.isArray(parsed.otps) ? parsed.otps as LocalOtp[] : [],
      farms: Array.isArray(parsed.farms) ? parsed.farms as LocalFarm[] : [],
      seasons: Array.isArray(parsed.seasons) ? parsed.seasons as LocalSeason[] : [],
      lastOtpId: typeof parsed.lastOtpId === "number" ? parsed.lastOtpId : 0,
    };
  } catch {
    memoryStore = cloneStore(fallbackStore);
  }

  return cloneStore(memoryStore);
}

async function writeStore(store: LocalAuthStore) {
  memoryStore = cloneStore(store);
  await writeFile(storePath, JSON.stringify(store, null, 2), "utf-8");
}

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function normalizeLanguage(language: string | undefined): LocalAuthLanguage {
  const allowed: LocalAuthLanguage[] = ["hi", "en", "mr", "pa", "te", "ta"];
  return allowed.includes(language as LocalAuthLanguage) ? (language as LocalAuthLanguage) : "hi";
}

export async function localFindUserByUsername(username: string) {
  const store = await readStore();
  return store.users.find((user) => user.username === username.toLowerCase()) || null;
}

export async function localFindUserByPhone(phone: string) {
  const store = await readStore();
  return store.users.find((user) => user.phone === phone) || null;
}

export async function localCreateUser(input: {
  phone?: string | null;
  username?: string | null;
  passwordHash?: string | null;
  name: string;
  state: string;
  language?: string;
  isAdmin?: boolean;
}) {
  const store = await readStore();
  const now = new Date().toISOString();
  const user: LocalUser = {
    id: createId("user"),
    phone: input.phone ?? null,
    username: input.username ? input.username.toLowerCase() : null,
    passwordHash: input.passwordHash ?? null,
    name: input.name,
    state: input.state,
    language: normalizeLanguage(input.language),
    isAdmin: Boolean(input.isAdmin),
    createdAt: now,
    updatedAt: now,
  };

  store.users.push(user);
  await writeStore(store);
  return user;
}

export async function localUpdateUser(userId: string, patch: Partial<Pick<LocalUser, "name" | "state" | "language" | "phone" | "username" | "passwordHash" | "isAdmin">>) {
  const store = await readStore();
  const user = store.users.find((item) => item.id === userId);
  if (!user) return null;

  Object.assign(user, patch, {
    username: patch.username ? patch.username.toLowerCase() : user.username,
    language: patch.language ? normalizeLanguage(patch.language) : user.language,
    updatedAt: new Date().toISOString(),
  });

  await writeStore(store);
  return user;
}

export async function localFindSession(token: string) {
  const store = await readStore();
  return store.sessions.find((session) => session.token === token) || null;
}

export async function localCreateSession(input: { userId: string; token: string; expiresAt: Date }) {
  const store = await readStore();
  const now = new Date().toISOString();
  const session: LocalSession = {
    id: createId("session"),
    userId: input.userId,
    token: input.token,
    expiresAt: input.expiresAt.toISOString(),
    createdAt: now,
  };

  store.sessions.push(session);
  await writeStore(store);
  return session;
}

export async function localFindOrCreateOtp(phone: string) {
  const store = await readStore();
  const existing = store.otps.find(
    (otp) => otp.phone === phone && otp.expiresAt > new Date().toISOString() && !otp.verified
  );
  return existing || null;
}

export async function localCreateOtp(phone: string, otp: string, expiresAt: Date) {
  const store = await readStore();
  const now = new Date().toISOString();
  const record: LocalOtp = {
    id: ++store.lastOtpId,
    phone,
    otp,
    expiresAt: expiresAt.toISOString(),
    verified: false,
    createdAt: now,
  };

  store.otps.push(record);
  await writeStore(store);
  return record;
}

export async function localMarkOtpVerified(id: number) {
  const store = await readStore();
  const record = store.otps.find((otp) => otp.id === id);
  if (!record) return null;
  record.verified = true;
  await writeStore(store);
  return record;
}

export async function localFindValidOtp(phone: string, otp: string) {
  const store = await readStore();
  const now = new Date();
  return (
    store.otps.find(
      (item) =>
        item.phone === phone &&
        item.otp === otp &&
        !item.verified &&
        new Date(item.expiresAt).getTime() > now.getTime()
    ) || null
  );
}

export async function localSweepExpiredSessions() {
  const store = await readStore();
  const now = new Date();
  store.sessions = store.sessions.filter((session) => new Date(session.expiresAt).getTime() > now.getTime());
  store.otps = store.otps.filter((otp) => new Date(otp.expiresAt).getTime() > now.getTime());
  await writeStore(store);
}

export async function localListFarms(userId: string) {
  const store = await readStore();
  return store.farms.filter((farm) => farm.userId === userId);
}

export async function localFindFarmById(id: string, userId?: string) {
  const store = await readStore();
  return store.farms.find((farm) => farm.id === id && (!userId || farm.userId === userId)) || null;
}

export async function localCreateFarm(input: { userId: string; name: string; sizeAcre: number; location: string }) {
  const store = await readStore();
  const now = new Date().toISOString();
  const farm: LocalFarm = {
    id: createId("farm"),
    userId: input.userId,
    name: input.name,
    sizeAcre: input.sizeAcre,
    location: input.location,
    createdAt: now,
    updatedAt: now,
  };
  store.farms.push(farm);
  await writeStore(store);
  return farm;
}

export async function localUpdateFarm(
  id: string,
  userId: string,
  patch: Partial<Pick<LocalFarm, "name" | "sizeAcre" | "location">>
) {
  const store = await readStore();
  const farm = store.farms.find((item) => item.id === id && item.userId === userId);
  if (!farm) return null;

  Object.assign(farm, patch, { updatedAt: new Date().toISOString() });
  await writeStore(store);
  return farm;
}

export async function localDeleteFarm(id: string, userId: string) {
  const store = await readStore();
  const index = store.farms.findIndex((item) => item.id === id && item.userId === userId);
  if (index < 0) return null;
  const [deleted] = store.farms.splice(index, 1);
  store.seasons = store.seasons.filter((season) => season.farmId !== id);
  await writeStore(store);
  return deleted;
}

export async function localFindLatestSeasonByFarmId(farmId: string) {
  const store = await readStore();
  return (
    [...store.seasons]
      .filter((season) => season.farmId === farmId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null
  );
}
