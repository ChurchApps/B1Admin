// RFC 4180-ish: quoted fields, "" escapes, commas/newlines inside quotes, CRLF. Blank lines dropped.
export const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  const endRow = () => {
    row.push(field);
    field = "";
    if (row.some((f) => f.trim() !== "")) rows.push(row);
    row = [];
  };
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === "\"" && src[i + 1] === "\"") {
        field += "\"";
        i++;
      } else if (c === "\"") quoted = false;
      else field += c;
    } else if (c === "\"") quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      endRow();
    } else field += c;
  }
  endRow();
  return rows;
};
