import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Bill } from "../domain/bill/types";
import type { SavedGroup } from "../domain/groups/types";

export type BillStatus = "draft" | "active" | "settled";

export type StoredBill = Bill & {
  id: string;
  title?: string;
  status: BillStatus;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
};

interface SplitLebDb extends DBSchema {
  bills: {
    key: string;
    value: StoredBill;
    indexes: {
      "by-updatedAt": string;
      "by-createdAt": string;
      "by-status": BillStatus;
    };
  };
  savedGroups: {
    key: string;
    value: SavedGroup;
    indexes: {
      "by-updatedAt": string;
      "by-createdAt": string;
      "by-archivedAt": string;
    };
  };
}

const DB_NAME = "splitleb-local-db";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<SplitLebDb>> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<SplitLebDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("bills")) {
          const billsStore = db.createObjectStore("bills", {
            keyPath: "id",
          });

          billsStore.createIndex("by-updatedAt", "updatedAt");
          billsStore.createIndex("by-createdAt", "createdAt");
          billsStore.createIndex("by-status", "status");
        }

        if (!db.objectStoreNames.contains("savedGroups")) {
          const savedGroupsStore = db.createObjectStore("savedGroups", {
            keyPath: "id",
          });

          savedGroupsStore.createIndex("by-updatedAt", "updatedAt");
          savedGroupsStore.createIndex("by-createdAt", "createdAt");
          savedGroupsStore.createIndex("by-archivedAt", "archivedAt");
        }
      },
    });
  }

  return dbPromise;
}