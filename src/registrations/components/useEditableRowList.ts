import { useEffect, useState } from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type ApiListType } from "@churchapps/helpers";
import { useConfirmDelete } from "../../hooks";

export const toNum = (v: any) => (v === null || v === undefined || v === "" ? null : Number(v));

interface EditableRowListOptions<T> {
  loadUrl: string;
  saveUrl: string;
  deleteUrlPrefix: string;
  api: ApiListType;
  newRow: (current: T[]) => T;
  enabled?: boolean;
  sortBy?: keyof T;
  filter?: (row: T) => boolean;
  coerce?: (row: T) => any;
}

export function useEditableRowList<T extends { id?: string }>(options: EditableRowListOptions<T>) {
  const { loadUrl, saveUrl, deleteUrlPrefix, api, newRow, enabled = true, sortBy, filter, coerce } = options;
  const [rows, setRows] = useState<T[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const load = () => {
    ApiHelper.get(loadUrl, api).then((data: T[]) => {
      const list = data || [];
      setRows(sortBy ? [...list].sort((a, b) => (Number(a[sortBy]) || 0) - (Number(b[sortBy]) || 0)) : list);
    });
  };

  useEffect(() => { if (enabled) load(); }, [loadUrl, enabled]);

  const update = (i: number, field: keyof T, value: any) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, newRow(prev)]);

  const removeRow = async (i: number) => {
    const row = rows[i];
    if (row.id) {
      if (!(await confirm(Locale.label("registrations.commerce.removeConfirm")))) return;
      await ApiHelper.delete(`${deleteUrlPrefix}${row.id}`, api);
    }
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  };

  const save = async (): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const kept = filter ? rows.filter(filter) : rows;
      const payload = coerce ? kept.map(coerce) : kept;
      if (payload.length > 0) await ApiHelper.post(saveUrl, payload, api);
      load();
      return true;
    } catch (e: any) {
      setError(e?.message || Locale.label("common.saveError"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { rows, saving, error, update, addRow, removeRow, save, ConfirmDialogElement };
}
