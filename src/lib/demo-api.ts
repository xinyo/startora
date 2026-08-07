import { Temporal } from "@js-temporal/polyfill";
import demoSeed from "@/demo.json";
import { ApiClientError } from "@/lib/data-client";
import type { DataClient } from "@/lib/data-client";
import { PASSWORD_LENGTH } from "@/shared/auth-policy";
import type {
  AppItem,
  AppItemInput,
  AppReorderInput,
  CategoryItem,
  CategoryItemInput,
  User,
} from "@/types/contracts";

const DATABASE_VERSION = 1;
const DEFAULT_STORAGE_KEY = "startora.demo.database.v1";
const SESSION_HOURS = 7 * 24;
const PASSWORD_ITERATIONS = 100_000;
const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,50}$/;
const ICON_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:svg|png|webp|jpe?g|avif)$/i;

interface DemoUser extends User {
  usernameKey: string;
  passwordSalt: string;
  passwordVerifier: string;
}

interface DemoApp extends AppItem {
  userId: number;
}

interface DemoCategory extends CategoryItem {
  userId: number;
}

interface DemoSession {
  userId: number;
  expiresAt: string;
}

interface DemoDatabase {
  version: typeof DATABASE_VERSION;
  nextUserId: number;
  nextAppId: number;
  nextCategoryId: number;
  usersById: Record<number, DemoUser>;
  userIds: number[];
  appsById: Record<number, DemoApp>;
  categoriesById: Record<number, DemoCategory>;
  session: DemoSession | null;
}

export interface DemoApiDependencies {
  storage?: Storage;
  storageKey?: string;
  crypto?: Crypto;
  now?: () => Temporal.Instant;
}

function emptyDatabase(): DemoDatabase {
  return {
    version: DATABASE_VERSION,
    nextUserId: 1,
    nextAppId: 1,
    nextCategoryId: 1,
    usersById: {},
    userIds: [],
    appsById: {},
    categoriesById: {},
    session: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isDemoUser(value: unknown): value is DemoUser {
  return (
    isRecord(value) &&
    isPositiveInteger(value.id) &&
    typeof value.username === "string" &&
    typeof value.usernameKey === "string" &&
    typeof value.passwordSalt === "string" &&
    typeof value.passwordVerifier === "string"
  );
}

function isDemoApp(value: unknown): value is DemoApp {
  return (
    isRecord(value) &&
    isPositiveInteger(value.id) &&
    isPositiveInteger(value.userId) &&
    typeof value.name === "string" &&
    typeof value.icon === "string" &&
    typeof value.url === "string" &&
    (value.categoryId === null || isPositiveInteger(value.categoryId)) &&
    typeof value.sortId === "number" &&
    Number.isSafeInteger(value.sortId) &&
    value.sortId >= 0 &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isDemoCategory(value: unknown): value is DemoCategory {
  return (
    isRecord(value) &&
    isPositiveInteger(value.id) &&
    isPositiveInteger(value.userId) &&
    typeof value.name === "string" &&
    typeof value.position === "number" &&
    Number.isSafeInteger(value.position) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isDatabase(value: unknown): value is DemoDatabase {
  if (!isRecord(value)) {
    return false;
  }

  const session = value.session;
  const validSession =
    session === null ||
    (isRecord(session) &&
      isPositiveInteger(session.userId) &&
      typeof session.expiresAt === "string");

  return (
    value.version === DATABASE_VERSION &&
    isPositiveInteger(value.nextUserId) &&
    isPositiveInteger(value.nextAppId) &&
    isPositiveInteger(value.nextCategoryId) &&
    isRecord(value.usersById) &&
    Array.isArray(value.userIds) &&
    value.userIds.every(isPositiveInteger) &&
    Object.values(value.usersById).every(isDemoUser) &&
    isRecord(value.appsById) &&
    Object.values(value.appsById).every(isDemoApp) &&
    isRecord(value.categoriesById) &&
    Object.values(value.categoriesById).every(isDemoCategory) &&
    validSession
  );
}

function requestFailed(message: string): ApiClientError {
  return new ApiClientError(500, "REQUEST_FAILED", message);
}

function validationFailed(
  fields: Record<string, string>,
): ApiClientError {
  return new ApiClientError(
    400,
    "VALIDATION_ERROR",
    "The submitted data is invalid.",
    fields,
  );
}

function unauthorized(): ApiClientError {
  return new ApiClientError(
    401,
    "UNAUTHENTICATED",
    "Authentication is required.",
  );
}

function notFound(): ApiClientError {
  return new ApiClientError(
    404,
    "NOT_FOUND",
    "The requested resource was not found.",
  );
}

function normalizeCredentials(
  usernameInput: string,
  password: string,
): { username: string; usernameKey: string; password: string } {
  const username = usernameInput.trim();
  const fields: Record<string, string> = {};

  if (!USERNAME_PATTERN.test(username)) {
    fields.username = "USERNAME_INVALID";
  }
  if (
    password.length < PASSWORD_LENGTH.min ||
    password.length > PASSWORD_LENGTH.max
  ) {
    fields.password = "PASSWORD_INVALID";
  }
  if (Object.keys(fields).length > 0) {
    throw validationFailed(fields);
  }

  return { username, usernameKey: username.toLowerCase(), password };
}

function normalizeAppInput(input: AppItemInput): AppItemInput {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const icon = typeof input.icon === "string" ? input.icon.trim() : "";
  const url = typeof input.url === "string" ? input.url.trim() : "";
  const rawCategoryId: unknown = input.categoryId;
  const fields: Record<string, string> = {};

  if (name.length < 1 || name.length > 100) {
    fields.name = "APP_NAME_INVALID";
  }
  if (
    !ICON_PATTERN.test(icon) ||
    icon.includes("..") ||
    icon.includes("/") ||
    icon.includes("\\")
  ) {
    fields.icon = "APP_ICON_INVALID";
  }

  let normalizedUrl = url;
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      fields.url = "APP_URL_INVALID";
    } else {
      normalizedUrl = parsedUrl.toString();
    }
  } catch {
    fields.url = "APP_URL_INVALID";
  }

  if (url.length > 2_048) {
    fields.url = "APP_URL_INVALID";
  }

  let categoryId: number | null = null;
  if (rawCategoryId !== undefined && rawCategoryId !== null) {
    const parsedId = Number(rawCategoryId);
    if (!Number.isSafeInteger(parsedId) || parsedId <= 0) {
      fields.categoryId = "APP_CATEGORY_INVALID";
    } else {
      categoryId = parsedId;
    }
  }
  if (Object.keys(fields).length > 0) {
    throw validationFailed(fields);
  }

  return {
    name,
    icon,
    url: normalizedUrl,
    categoryId,
  };
}

function normalizeCategoryInput(input: CategoryItemInput): CategoryItemInput {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length < 1 || name.length > 100) {
    throw validationFailed({ name: "CATEGORY_NAME_INVALID" });
  }
  return { name, position: input.position };
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function hexToBytes(value: string): Uint8Array {
  if (value.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(value)) {
    throw requestFailed("The demo database contains invalid credentials.");
  }
  return Uint8Array.from(
    value.match(/.{2}/g) ?? [],
    (byte) => Number.parseInt(byte, 16),
  );
}

async function derivePassword(
  cryptoProvider: Crypto,
  password: string,
  salt: Uint8Array,
): Promise<string> {
  const passwordBytes = new TextEncoder().encode(password);
  const key = await cryptoProvider.subtle.importKey(
    "raw",
    passwordBytes,
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await cryptoProvider.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt.slice().buffer as ArrayBuffer,
      iterations: PASSWORD_ITERATIONS,
    },
    key,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

function verifiersMatch(actual: string, expected: string): boolean {
  if (actual.length !== expected.length) {
    return false;
  }
  let mismatch = 0;
  for (let index = 0; index < actual.length; index++) {
    mismatch |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

function publicUser(user: DemoUser): User {
  return { id: user.id, username: user.username };
}

function publicApp(app: DemoApp): AppItem {
  const { userId: _userId, ...appItem } = app;
  return appItem;
}

function publicCategory(category: DemoCategory): CategoryItem {
  const { userId: _userId, ...categoryItem } = category;
  return categoryItem;
}

export function createDemoApi(
  dependencies: DemoApiDependencies = {},
): DataClient {
  const storage = dependencies.storage ?? globalThis.localStorage;
  const storageKey = dependencies.storageKey ?? DEFAULT_STORAGE_KEY;
  const cryptoProvider = dependencies.crypto ?? globalThis.crypto;
  const now = dependencies.now ?? (() => Temporal.Now.instant());

  const readDatabase = (): DemoDatabase => {
    let serialized: string | null;
    try {
      serialized = storage.getItem(storageKey);
    } catch {
      throw requestFailed("The demo database could not be read.");
    }
    if (serialized === null) {
      return emptyDatabase();
    }

    try {
      const database: unknown = JSON.parse(serialized);
      if (!isDatabase(database)) {
        throw new Error("Invalid demo database");
      }
      return database;
    } catch {
      throw requestFailed("The demo database is corrupt or unsupported.");
    }
  };

  const writeDatabase = (database: DemoDatabase): void => {
    try {
      storage.setItem(storageKey, JSON.stringify(database));
    } catch {
      throw requestFailed("The demo database could not be saved.");
    }
  };

  const issueSession = (
    database: DemoDatabase,
    userId: number,
  ): DemoUser => {
    const user = database.usersById[userId];
    if (!user) {
      throw unauthorized();
    }
    database.session = {
      userId,
      expiresAt: now().add({ hours: SESSION_HOURS }).toString(),
    };
    return user;
  };

  const requireUser = (database: DemoDatabase): DemoUser => {
    const session = database.session;
    if (!session) {
      throw unauthorized();
    }

    const currentTime = now();
    let expiresAt: Temporal.Instant;
    try {
      expiresAt = Temporal.Instant.from(session.expiresAt);
    } catch {
      throw requestFailed("The demo database contains an invalid session.");
    }
    if (Temporal.Instant.compare(expiresAt, currentTime) <= 0) {
      database.session = null;
      writeDatabase(database);
      throw unauthorized();
    }

    const user = database.usersById[session.userId];
    if (!user) {
      throw requestFailed("The demo database contains an invalid session.");
    }
    database.session = {
      ...session,
      expiresAt: currentTime.add({ hours: SESSION_HOURS }).toString(),
    };
    return user;
  };

  const getAppGroup = (
    database: DemoDatabase,
    userId: number,
    categoryId: number | null,
  ): DemoApp[] =>
    Object.values(database.appsById)
      .filter(
        (app) => app.userId === userId && app.categoryId === categoryId,
      )
      .sort(
        (first, second) => first.sortId - second.sortId || first.id - second.id,
      );

  const writeAppOrder = (
    orderedApps: DemoApp[],
    categoryId: number | null,
    timestamp: string,
  ): void => {
    orderedApps.forEach((app, sortId) => {
      app.categoryId = categoryId;
      app.sortId = sortId;
      app.updatedAt = timestamp;
    });
  };

  const seedAccount = (database: DemoDatabase, userId: number): void => {
    for (
      let categoryIndex = 0;
      categoryIndex < demoSeed.categories.length;
      categoryIndex++
    ) {
      const seedCategory = demoSeed.categories[categoryIndex];
      const categoryInput = normalizeCategoryInput({
        name: seedCategory.name,
        position: categoryIndex,
      });
      const timestamp = now().toString();
      const categoryId = database.nextCategoryId++;
      database.categoriesById[categoryId] = {
        id: categoryId,
        userId,
        name: categoryInput.name,
        position: categoryInput.position ?? categoryIndex,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      for (
        let appIndex = 0;
        appIndex < seedCategory.apps.length;
        appIndex++
      ) {
        const seedApp = seedCategory.apps[appIndex];
        const appInput = normalizeAppInput({
          ...seedApp,
          categoryId,
        });
        const appId = database.nextAppId++;
        database.appsById[appId] = {
          id: appId,
          userId,
          name: appInput.name,
          icon: appInput.icon,
          url: appInput.url,
          categoryId,
          sortId: appIndex,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
      }
    }
  };

  return {
    async register(usernameInput, passwordInput) {
      const { username, usernameKey, password } = normalizeCredentials(
        usernameInput,
        passwordInput,
      );
      const database = readDatabase();
      const usernameExists = database.userIds.some(
        (userId) => database.usersById[userId]?.usernameKey === usernameKey,
      );
      if (usernameExists) {
        throw new ApiClientError(
          409,
          "USERNAME_TAKEN",
          "That username is already in use.",
        );
      }

      const salt = cryptoProvider.getRandomValues(new Uint8Array(16));
      const passwordVerifier = await derivePassword(
        cryptoProvider,
        password,
        salt,
      );
      const userId = database.nextUserId++;
      const user: DemoUser = {
        id: userId,
        username,
        usernameKey,
        passwordSalt: bytesToHex(salt),
        passwordVerifier,
      };
      database.usersById[userId] = user;
      database.userIds.push(userId);
      seedAccount(database, userId);
      issueSession(database, userId);
      writeDatabase(database);
      return publicUser(user);
    },

    async login(usernameInput, passwordInput) {
      const { usernameKey, password } = normalizeCredentials(
        usernameInput,
        passwordInput,
      );
      const database = readDatabase();
      const user = database.userIds
        .map((userId) => database.usersById[userId])
        .find((candidate) => candidate?.usernameKey === usernameKey);
      if (!user) {
        throw new ApiClientError(
          401,
          "INVALID_CREDENTIALS",
          "The username or password is incorrect.",
        );
      }

      const passwordVerifier = await derivePassword(
        cryptoProvider,
        password,
        hexToBytes(user.passwordSalt),
      );
      if (!verifiersMatch(passwordVerifier, user.passwordVerifier)) {
        throw new ApiClientError(
          401,
          "INVALID_CREDENTIALS",
          "The username or password is incorrect.",
        );
      }

      issueSession(database, user.id);
      writeDatabase(database);
      return publicUser(user);
    },

    async session() {
      const database = readDatabase();
      const user = requireUser(database);
      writeDatabase(database);
      return publicUser(user);
    },

    async logout() {
      const database = readDatabase();
      database.session = null;
      writeDatabase(database);
    },

    async listApps() {
      const database = readDatabase();
      const user = requireUser(database);
      const apps = Object.values(database.appsById)
        .filter((app) => app.userId === user.id)
        .sort(
          (first, second) =>
            second.createdAt.localeCompare(first.createdAt) ||
            second.id - first.id,
        )
        .map(publicApp);
      writeDatabase(database);
      return apps;
    },

    async createApp(input) {
      const database = readDatabase();
      const user = requireUser(database);
      const appInput = normalizeAppInput(input);
      const categoryId = appInput.categoryId ?? null;
      if (
        categoryId !== null &&
        database.categoriesById[categoryId]?.userId !== user.id
      ) {
        throw validationFailed({ categoryId: "CATEGORY_NOT_FOUND" });
      }

      const timestamp = now().toString();
      const existing = getAppGroup(database, user.id, categoryId);
      writeAppOrder(existing, categoryId, timestamp);
      for (const app of existing) {
        app.sortId += 1;
      }
      const appId = database.nextAppId++;
      const app: DemoApp = {
        id: appId,
        userId: user.id,
        name: appInput.name,
        icon: appInput.icon,
        url: appInput.url,
        categoryId,
        sortId: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      database.appsById[appId] = app;
      writeDatabase(database);
      return publicApp(app);
    },

    async updateApp(id, input) {
      const database = readDatabase();
      const user = requireUser(database);
      const existing = database.appsById[id];
      if (!existing || existing.userId !== user.id) {
        throw notFound();
      }

      const appInput = normalizeAppInput(input);
      const categoryId = appInput.categoryId ?? null;
      if (
        categoryId !== null &&
        database.categoriesById[categoryId]?.userId !== user.id
      ) {
        throw validationFailed({ categoryId: "CATEGORY_NOT_FOUND" });
      }

      const app: DemoApp = {
        ...existing,
        name: appInput.name,
        icon: appInput.icon,
        url: appInput.url,
        categoryId,
        updatedAt: now().toString(),
      };
      if (existing.categoryId !== categoryId) {
        const timestamp = app.updatedAt;
        const source = getAppGroup(database, user.id, existing.categoryId)
          .filter((candidate) => candidate.id !== id);
        const target = getAppGroup(database, user.id, categoryId);
        writeAppOrder(source, existing.categoryId, timestamp);
        writeAppOrder([app, ...target], categoryId, timestamp);
      }
      database.appsById[id] = app;
      writeDatabase(database);
      return publicApp(app);
    },

    async deleteApp(id) {
      const database = readDatabase();
      const user = requireUser(database);
      const app = database.appsById[id];
      if (!app || app.userId !== user.id) {
        throw notFound();
      }
      delete database.appsById[id];
      writeAppOrder(
        getAppGroup(database, user.id, app.categoryId),
        app.categoryId,
        now().toString(),
      );
      writeDatabase(database);
    },

    async reorderApp(input: AppReorderInput) {
      const fields: Record<string, string> = {};
      if (!Number.isSafeInteger(input.appId) || input.appId <= 0) {
        fields.appId = "APP_ID_INVALID";
      }
      if (!Number.isSafeInteger(input.position) || input.position < 0) {
        fields.position = "APP_POSITION_INVALID";
      }
      if (
        input.categoryId !== null &&
        (!Number.isSafeInteger(input.categoryId) || input.categoryId <= 0)
      ) {
        fields.categoryId = "APP_CATEGORY_INVALID";
      }
      if (Object.keys(fields).length > 0) {
        throw validationFailed(fields);
      }

      const database = readDatabase();
      const user = requireUser(database);
      if (
        input.categoryId !== null &&
        database.categoriesById[input.categoryId]?.userId !== user.id
      ) {
        throw validationFailed({ categoryId: "CATEGORY_NOT_FOUND" });
      }
      const draggedApp = database.appsById[input.appId];
      if (!draggedApp || draggedApp.userId !== user.id) {
        throw notFound();
      }

      const sourceCategoryId = draggedApp.categoryId;
      const source = getAppGroup(database, user.id, sourceCategoryId).filter(
        (app) => app.id !== draggedApp.id,
      );
      const sameCategory = sourceCategoryId === input.categoryId;
      const target = sameCategory
        ? source
        : getAppGroup(database, user.id, input.categoryId);
      if (input.position > target.length) {
        throw validationFailed({ position: "APP_POSITION_INVALID" });
      }

      const nextTarget = [...target];
      nextTarget.splice(input.position, 0, draggedApp);
      const timestamp = now().toString();
      if (!sameCategory) {
        writeAppOrder(source, sourceCategoryId, timestamp);
      }
      writeAppOrder(nextTarget, input.categoryId, timestamp);
      writeDatabase(database);

      return (sameCategory ? nextTarget : [...source, ...nextTarget]).map(
        publicApp,
      );
    },

    async listCategories() {
      const database = readDatabase();
      const user = requireUser(database);
      const categories = Object.values(database.categoriesById)
        .filter((category) => category.userId === user.id)
        .sort(
          (first, second) =>
            first.position - second.position || first.id - second.id,
        )
        .map(publicCategory);
      writeDatabase(database);
      return categories;
    },

    async createCategory(input) {
      const database = readDatabase();
      const user = requireUser(database);
      const categoryInput = normalizeCategoryInput(input);
      const ownedCategories = Object.values(database.categoriesById).filter(
        (category) => category.userId === user.id,
      );
      const nextPosition =
        ownedCategories.length === 0
          ? 0
          : Math.max(...ownedCategories.map((category) => category.position)) +
            1;
      const timestamp = now().toString();
      const categoryId = database.nextCategoryId++;
      const category: DemoCategory = {
        id: categoryId,
        userId: user.id,
        name: categoryInput.name,
        position: categoryInput.position ?? nextPosition,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      database.categoriesById[categoryId] = category;
      writeDatabase(database);
      return publicCategory(category);
    },

    async updateCategory(id, input) {
      const database = readDatabase();
      const user = requireUser(database);
      const existing = database.categoriesById[id];
      if (!existing || existing.userId !== user.id) {
        throw notFound();
      }
      const categoryInput = normalizeCategoryInput(input);
      const category: DemoCategory = {
        ...existing,
        name: categoryInput.name,
        position: categoryInput.position ?? existing.position,
        updatedAt: now().toString(),
      };
      database.categoriesById[id] = category;
      writeDatabase(database);
      return publicCategory(category);
    },

    async deleteCategory(id) {
      const database = readDatabase();
      const user = requireUser(database);
      const category = database.categoriesById[id];
      if (!category || category.userId !== user.id) {
        throw notFound();
      }
      delete database.categoriesById[id];
      for (const app of Object.values(database.appsById)) {
        if (app.userId === user.id && app.categoryId === id) {
          app.categoryId = null;
          app.updatedAt = now().toString();
        }
      }
      writeDatabase(database);
    },

    async reorderCategories(orderedIds) {
      const database = readDatabase();
      const user = requireUser(database);
      for (const categoryId of orderedIds) {
        if (database.categoriesById[categoryId]?.userId !== user.id) {
          throw notFound();
        }
      }
      const timestamp = now().toString();
      orderedIds.forEach((categoryId, position) => {
        const category = database.categoriesById[categoryId];
        category.position = position;
        category.updatedAt = timestamp;
      });
      writeDatabase(database);
    },
  };
}
