import type { PersonFieldInterface } from "../helpers/Interfaces";

// Custom person field values by fieldId, then personId.
export type PersonFieldValueMap = Record<string, Record<string, string>>;

export interface CustomFieldExportOptions {
  // Display text for a stored value; the People page passes PersonFieldHelper.formatFieldValue.
  formatValue: (field: PersonFieldInterface, value: string) => string;
  // Header for a field whose name is already a column, given the field's name.
  collisionHeader: (name: string) => string;
}

// ExportLink rewrites these two keys as ISO dates on every row, so a custom column must not use them.
const RESERVED_HEADERS = ["birthDate", "anniversary"];

const headerKey = (header: string) => header.trim().toLowerCase();

// react-csv wraps each cell in quotes but does not double the quotes inside it.
const csvText = (text: string) => text.replace(/"/g, "\"\"");

// Adds one column per custom field to the People export rows; rows[i] belongs to personIds[i].
// A field missing from `values` (its values could not be loaded) gets no column. Everyone gets a cell,
// blank when unset, so a field nobody has filled in still shows up as a column.
export const addCustomFieldColumns = (
  rows: Record<string, unknown>[],
  personIds: (string | undefined)[],
  fields: PersonFieldInterface[],
  values: PersonFieldValueMap,
  options: CustomFieldExportOptions
): Record<string, unknown>[] => {
  const used = new Set(RESERVED_HEADERS.map(headerKey));
  rows.forEach((row) => Object.keys(row).forEach((key) => used.add(headerKey(key))));

  const columns: { field: PersonFieldInterface; header: string; byPerson: Record<string, string> }[] = [];
  fields.forEach((field) => {
    const byPerson = field.id ? values[field.id] : undefined;
    if (!field.id || !byPerson) return;
    const name = field.name?.trim() || field.id;
    let header = csvText(name);
    if (used.has(headerKey(header))) header = csvText(options.collisionHeader(name));
    // Two custom fields can share a name, or one can already be named like the suffixed header.
    for (let n = 2; used.has(headerKey(header)); n++) header = csvText(options.collisionHeader(name) + " " + n);
    used.add(headerKey(header));
    columns.push({ field, header, byPerson });
  });
  if (columns.length === 0) return rows;

  return rows.map((row, i) => {
    const result = { ...row };
    const personId = personIds[i];
    columns.forEach((c) => {
      const value = personId ? c.byPerson[personId] : undefined;
      result[c.header] = value ? csvText(options.formatValue(c.field, value)) : "";
    });
    return result;
  });
};
