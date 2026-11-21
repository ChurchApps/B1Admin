// Normalize legacy phone formats like "(217) 555-2504" or "217-555-2504" into E.164
// so MuiTelInput can render them with country flag and spacing. Anything that isn't a
// US 10/11-digit number or already "+"-prefixed is left as-is — forcing "+" onto a
// 7-digit partial makes the widget misread it as a foreign country code.
// Churches using the "local" phone format keep numbers exactly as stored.
export const normalizePhone = (raw: string | null | undefined, local = false): string => {
  if (!raw) return "";
  if (local) return raw;
  const [base, ext] = raw.split("x");
  const trimmed = (base ?? "").trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return ext ? "x" + ext : "";
  const normalized = trimmed.startsWith("+") ? "+" + digits
    : digits.length === 10 ? "+1" + digits
      : digits.length === 11 && digits.startsWith("1") ? "+" + digits
        : trimmed;
  return ext ? normalized + "x" + ext : normalized;
};

// One display style whatever shape is stored: US numbers as "(217) 555-2502", other
// "+" numbers keep their spacing (a space is added after the country code when there is none).
// Churches using the "local" phone format see numbers exactly as stored.
export function formattedPhoneNumber(value: string, local = false) {
  if (!value) return "";
  if (local) return value;
  value = value.split("x")[0].trim();
  const digits = value.replace(/\D/g, "");
  const plus = value.startsWith("+");
  const us = plus ? digits.length === 11 && digits.startsWith("1") : digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
  if (us) {
    const d = digits.slice(-10);
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  if (plus && !/\D/.test(value.slice(1))) {
    const cc = value.match(/^\+([17]|2[07]|3[0-469]|4[013-9]|5[1-8]|6[0-6]|8[1246]|9[0-58]|\d{3})/);
    if (cc) return cc[0] + " " + value.slice(cc[0].length);
  }
  return value;
}
