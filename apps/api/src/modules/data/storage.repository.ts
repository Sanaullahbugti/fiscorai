import { env } from "../../config/env.js";
import { LocalFsStorageRepository } from "./storage.local.js";
import { R2StorageRepository } from "./storage.r2.js";
import type { StorageRepository } from "./storage.types.js";

export type { PeriodInput } from "./storage.types.js";

function createStorageRepository(): StorageRepository {
  if (env.STORAGE_BACKEND === "r2") {
    return new R2StorageRepository();
  }
  return new LocalFsStorageRepository();
}

export const storageRepository = createStorageRepository();
