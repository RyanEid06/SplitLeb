import { useUnsavedChanges } from "./unsavedChanges";
import { useEffect, useRef, useState } from "react";
import { getBill, getBillTitle } from "../../storage/billStorage";
import { saveBillEdits } from "../../storage/billEdits";
import type { BillStatus, StoredBill } from "../../storage/db";

type EditorState = {
  bill: StoredBill | null;
  saved: StoredBill | null;
  loading: boolean;
  error: string;
};
export function useBillEditor(billId: string | undefined) {
  const [state, setState] = useState<EditorState>({
    bill: null,
    saved: null,
    loading: true,
    error: "",
  });
  const [saving, setSaving] = useState(false);
  const saveInProgress = useRef(false);
  const editVersion = useRef(0);
  const loadedId = useRef<string | undefined>(undefined);
  const dirty = Boolean(
    state.bill &&
    state.saved &&
    JSON.stringify(state.bill) !== JSON.stringify(state.saved),
  );
  const clearUnsaved = useUnsavedChanges(dirty);

  useEffect(() => {
    let cancelled = false;
    if (billId) {
      getBill(billId)
        .then((bill) => {
          if (cancelled) return;
          loadedId.current = billId;
          const editable = bill ? { ...bill, title: getBillTitle(bill) } : null;
          setState({
            bill: editable,
            saved: editable,
            loading: false,
            error: bill ? "" : "This bill could not be found.",
          });
        })
        .catch(() => {
          if (!cancelled) {
            loadedId.current = billId;
            setState({
              bill: null,
              saved: null,
              loading: false,
              error:
                "Could not open this bill. Try reloading; your saved data has not been cleared.",
            });
          }
        });
    }
    return () => {
      cancelled = true;
    };
  }, [billId]);

  function change(patch: Partial<StoredBill>) {
    editVersion.current += 1;
    setState((current) => ({
      ...current,
      error: "",
      bill: current.bill ? { ...current.bill, ...patch } : null,
    }));
  }

  async function save(status?: BillStatus) {
    if (!state.bill || !state.saved || saveInProgress.current) return null;
    const snapshot = state.bill;
    const version = editVersion.current;
    saveInProgress.current = true;
    setSaving(true);
    try {
      const saved = await saveBillEdits(
        snapshot,
        state.saved.updatedAt,
        status,
      );
      // Navigation happens immediately after this promise resolves, before React
      // necessarily renders the persisted snapshot.
      if (editVersion.current === version) clearUnsaved();
      setState((current) => {
        if (current.bill?.id !== snapshot.id) return current;
        const bill =
          current.bill === snapshot
            ? saved
            : {
                ...current.bill,
                status: saved.status,
                updatedAt: saved.updatedAt,
              };
        return { bill, saved, loading: false, error: "" };
      });
      return saved;
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : "Could not save. Your edits are still here; please try again.",
      }));
      return null;
    } finally {
      saveInProgress.current = false;
      setSaving(false);
    }
  }
  return {
    bill: loadedId.current === billId ? state.bill : null,
    loading: Boolean(billId) && (state.loading || loadedId.current !== billId),
    error: billId ? state.error : "This bill could not be found.",
    dirty,
    saving,
    change,
    save,
  };
}
