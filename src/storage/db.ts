import { openDB, unwrap, type DBSchema, type IDBPDatabase } from "idb";
import type { Bill } from "../domain/bill/types";
import type { SavedGroup } from "../domain/groups/types";
import {
  DatabaseOpenTimeoutError,
  DatabaseUpgradeBlockedError,
} from "./storageLoadError";

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
const DB_VERSION = 3;

const indexes = {
  bills: {
    "by-updatedAt": "updatedAt",
    "by-createdAt": "createdAt",
    "by-status": "status",
  },
  savedGroups: {
    "by-updatedAt": "updatedAt",
    "by-createdAt": "createdAt",
    "by-archivedAt": "archivedAt",
  },
} as const;

let dbPromise: Promise<IDBPDatabase<SplitLebDb>> | null = null;

export async function getDb() {
  if (!dbPromise) {
    // Defer opening so synchronous access failures also reject and can retry.
    dbPromise = Promise.resolve()
      .then(
        () =>
          new Promise<IDBPDatabase<SplitLebDb>>((resolve, reject) => {
            let abandoned = false;
            const opening = openDB<SplitLebDb>(DB_NAME, DB_VERSION, {
              blocked() {
                clearTimeout(openTimer);
                abandoned = true;
                reject(new DatabaseUpgradeBlockedError());
              },
              upgrade(db, _oldVersion, _newVersion, transaction) {
                void transaction.done.catch(() => {});
                const nativeDb = unwrap(db);
                const tx = unwrap(transaction);
                for (const [name, definitions] of Object.entries(indexes)) {
                  const store = nativeDb.objectStoreNames.contains(name)
                    ? tx.objectStore(name)
                    : nativeDb.createObjectStore(name, { keyPath: "id" });
                  // An unexpected primary key cannot be repaired by destroying records.
                  if (store.keyPath !== "id" || store.autoIncrement) {
                    transaction.abort();
                    return;
                  }
                  for (const [indexName, keyPath] of Object.entries(
                    definitions,
                  )) {
                    if (store.indexNames.contains(indexName)) {
                      const index = store.index(indexName);
                      if (
                        index.keyPath === keyPath &&
                        !index.unique &&
                        !index.multiEntry
                      )
                        continue;
                      store.deleteIndex(indexName);
                    }
                    store.createIndex(indexName, keyPath);
                  }
                }
              },
            });
            // Another abandoned/queued open may prevent even the blocked event
            // from firing. Bound that wait too; never leave the page loading forever.
            const openTimer = setTimeout(() => {
              abandoned = true;
              reject(new DatabaseOpenTimeoutError());
            }, 5000);
            void opening.then(
              (db) => {
                clearTimeout(openTimer);
                // IndexedDB open requests cannot be canceled. If the user has already
                // seen the blocked error, close the late connection rather than leak it.
                if (abandoned) db.close();
                else resolve(db);
              },
              (cause: unknown) => {
                clearTimeout(openTimer);
                reject(cause);
              },
            );
          }),
      )
      .then((db) => {
        db.addEventListener("versionchange", () => {
          db.close();
          dbPromise = null;
        });
        db.addEventListener("close", () => {
          dbPromise = null;
        });
        return db;
      })
      .catch((error: unknown) => {
        dbPromise = null;
        throw error;
      });
  }

  return dbPromise;
}
