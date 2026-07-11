import { useRef, useState } from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { Box, Button, Checkbox, Divider, FormControlLabel, Grid, Icon, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import { QRCodeSVG } from "qrcode.react";
import { CardWithHeader, LoadingButton } from "../../components/ui";

export interface LabelTemplateInterface {
  id?: string;
  churchId?: string;
  name?: string;
  labelType?: string;
  width?: number;
  height?: number;
  isDefault?: boolean;
  content?: string;
}

export interface LabelBlock {
  id: string;
  type: "text" | "field" | "barcode" | "qrcode" | "box";
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  field?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  symbology?: "code39" | "code128" | "qr";
  value?: string;
  fill?: string;
  border?: boolean;
  condition?: { field: string; operator: string; value?: string };
}

export const newBlockId = () => Math.random().toString(36).slice(2, 9);

// Encoders copied from B1Checkin/src/helpers/barcode.ts so previews match kiosk output.
const QUIET = 10;
const CODE39_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%*";
const CODE39_PATTERNS = ("nnnwwnwnn wnnwnnnnw nnwwnnnnw wnwwnnnnn nnnwwnnnw wnnwwnnnn nnwwwnnnn nnnwnnwnw wnnwnnwnn nnwwnnwnn wnnnnwnnw nnwnnwnnw wnwnnwnnn nnnnwwnnw wnnnwwnnn nnwnwwnnn nnnnnwwnw wnnnnwwnn nnwnnwwnn nnnnwwwnn "
  + "wnnnnnnww nnwnnnnww wnwnnnnwn nnnnwnnww wnnnwnnwn nnwnwnnwn nnnnnnwww wnnnnnwwn nnwnnnwwn nnnnwnwwn wwnnnnnnw nwwnnnnnw wwwnnnnnn nwnnwnnnw wwnnwnnnn nwwnwnnnn nwnnnnwnw wwnnnnwnn nwwnnnwnn nwnwnwnnn "
  + "nwnwnnnwn nwnnnwnwn nnnwnwnwn nwnnwnwnn").split(" ");

const code39Binary = (text: string) => {
  const clean = text.toUpperCase().split("").filter((c) => CODE39_CHARS.indexOf(c) >= 0 && c !== "*").join("");
  const parts: string[] = [];
  for (const c of "*" + clean + "*") {
    let unit = "";
    CODE39_PATTERNS[CODE39_CHARS.indexOf(c)].split("").forEach((width, i) => { unit += (width === "w" ? "111" : "1").replace(/1/g, i % 2 === 0 ? "1" : "0"); });
    parts.push(unit);
  }
  return parts.join("0");
};

const CODE128_WIDTHS = ("212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 "
  + "212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 "
  + "314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 "
  + "214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112").split(" ");

const code128Binary = (text: string) => {
  const values = text.split("").map((c) => c.charCodeAt(0) - 32).filter((v) => v >= 0 && v <= 95);
  let checksum = 104;
  values.forEach((v, i) => { checksum += v * (i + 1); });
  let result = "";
  [104, ...values, checksum % 103, 106].forEach((code) => {
    CODE128_WIDTHS[code].split("").forEach((width, i) => { result += (i % 2 === 0 ? "1" : "0").repeat(Number(width)); });
  });
  return result;
};

const binaryToSvg = (binary: string) => {
  let rects = "";
  let run = 0;
  for (let i = 0; i <= binary.length; i++) {
    if (binary[i] === "1") { run++; } else if (run > 0) {
      rects += `<rect x="${QUIET + i - run}" y="0" width="${run}" height="100" fill="#000"/>`;
      run = 0;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${binary.length + QUIET * 2} 100" width="100%" height="100%" preserveAspectRatio="none">${rects}</svg>`;
};

const SAMPLE: Record<string, string> = {
  "person.displayName": "Emma Johnson",
  "person.firstName": "Emma",
  "person.lastName": "Johnson",
  "person.nickName": "Emma",
  "person.nametagNotes": "Peanut allergy",
  sessions: "9:00 AM: Preschool",
  securityCode: "BXRC",
  date: new Date().toLocaleDateString(),
  churchName: "Grace Community Church",
  children: "Emma Johnson - 9:00 AM: Preschool\nNoah Johnson - 9:00 AM: Elementary",
  childrenAllergies: "Emma Johnson - Peanut allergy"
};

const NAMETAG_FIELDS = "person.displayName person.firstName person.lastName person.nickName person.nametagNotes sessions securityCode date churchName".split(" ");
const PICKUP_FIELDS = ["children", "childrenAllergies", "securityCode", "date", "churchName"];
const CANVAS_W = 560;

const FIELD_LABEL_KEYS: Record<string, string> = {
  "person.displayName": "attendance.labels.fieldDisplayName",
  "person.firstName": "attendance.labels.fieldFirstName",
  "person.lastName": "attendance.labels.fieldLastName",
  "person.nickName": "attendance.labels.fieldNickName",
  "person.nametagNotes": "attendance.labels.fieldNametagNotes",
  sessions: "attendance.labels.fieldSessions",
  securityCode: "attendance.labels.fieldSecurityCode",
  date: "attendance.labels.fieldDate",
  churchName: "attendance.labels.fieldChurchName",
  children: "attendance.labels.fieldChildren",
  childrenAllergies: "attendance.labels.fieldChildrenAllergies"
};
const fieldLabel = (f: string) => (FIELD_LABEL_KEYS[f] ? Locale.label(FIELD_LABEL_KEYS[f]) : f);

type Props = { template: LabelTemplateInterface; updatedCallback: () => void };

export function LabelEditor(props: Props) {
  const [tpl, setTpl] = useState<LabelTemplateInterface>(props.template);
  const [blocks, setBlocks] = useState<LabelBlock[]>(() => {
    try { return JSON.parse(props.template.content || "[]"); } catch { return []; }
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);
  const drag = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const canvasH = Math.round(CANVAS_W * (Number(tpl.height) || 1) / (Number(tpl.width) || 1));
  const fields = tpl.labelType === "pickup" ? PICKUP_FIELDS : NAMETAG_FIELDS;
  const selected = blocks.find((b) => b.id === selectedId) || null;

  const update = (patch: Partial<LabelBlock>) => setBlocks(blocks.map((b) => (b.id === selectedId ? { ...b, ...patch } : b)));

  const addBlock = (kind: string) => {
    const b: LabelBlock = { id: newBlockId(), type: "text", x: 5, y: 5, w: 30, h: 20, fontSize: 10 };
    if (kind === "text") b.text = Locale.label("attendance.labels.text");
    else if (kind === "barcode") { b.type = "barcode"; b.symbology = "code128"; b.value = "securityCode"; b.w = 40; b.h = 30; } else if (kind === "qrcode") { b.type = "qrcode"; b.symbology = "qr"; b.value = "securityCode"; b.w = 15; b.h = 50; } else if (kind === "box") { b.type = "box"; b.border = true; } else { b.type = "field"; b.field = kind; }
    setBlocks([...blocks, b]);
    setSelectedId(b.id);
  };

  const handlePointerDown = (e: React.PointerEvent, b: LabelBlock) => {
    e.stopPropagation();
    setSelectedId(b.id);
    drag.current = { id: b.id, startX: e.clientX, startY: e.clientY, origX: b.x, origY: b.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = ((e.clientX - d.startX) / CANVAS_W) * 100;
    const dy = ((e.clientY - d.startY) / canvasH) * 100;
    setBlocks((prev) => prev.map((b) => (b.id === d.id ? { ...b, x: Math.round(Math.max(0, Math.min(100 - b.w, d.origX + dx))), y: Math.round(Math.max(0, Math.min(100 - b.h, d.origY + dy))) } : b)));
  };

  const handleSave = () => {
    if (!tpl.name?.trim()) { setNameError(true); return; }
    setSaving(true);
    const t = { ...tpl, width: Number(tpl.width), height: Number(tpl.height), content: JSON.stringify(blocks) };
    ApiHelper.post("/labeltemplates", [t], "AttendanceApi").then(() => {
      setSaving(false);
      props.updatedCallback();
    }).catch(() => setSaving(false));
  };

  const setCondition = (field: string) => {
    if (!field) update({ condition: undefined });
    else update({ condition: { field, operator: selected?.condition?.operator || "notEmpty", value: selected?.condition?.value } });
  };

  const blockContent = (b: LabelBlock) => {
    const encoded = SAMPLE[b.value || "securityCode"] || "";
    switch (b.type) {
      case "text": return b.text || "";
      case "field": return SAMPLE[b.field || ""] ?? b.field ?? "";
      case "barcode": return <div style={{ width: "100%", height: "100%" }} dangerouslySetInnerHTML={{ __html: encoded ? binaryToSvg(b.symbology === "code39" ? code39Binary(encoded) : code128Binary(encoded)) : "" }} />;
      case "qrcode": return <QRCodeSVG value={encoded || " "} style={{ width: "100%", height: "100%" }} />;
      case "box": return null;
    }
  };

  const blockStyle = (b: LabelBlock): React.CSSProperties => ({
    position: "absolute",
    left: b.x + "%",
    top: b.y + "%",
    width: b.w + "%",
    height: b.h + "%",
    fontSize: (canvasH * (b.fontSize || 10)) / 100,
    fontWeight: b.bold ? 700 : 400,
    fontStyle: b.italic ? "italic" : "normal",
    textAlign: b.align || "left",
    whiteSpace: "pre-line",
    lineHeight: 1.1,
    cursor: "move",
    touchAction: "none",
    userSelect: "none",
    overflow: "hidden",
    backgroundColor: b.type === "box" ? b.fill || undefined : undefined,
    border: b.id === selectedId ? "1px dashed dodgerblue" : b.type === "box" && b.border ? "1px solid black" : "1px dashed transparent"
  });

  const paletteButton = (key: string, label: string) => (
    <Button key={key} size="small" variant="outlined" onClick={() => addBlock(key)} sx={{ textTransform: "none", justifyContent: "flex-start" }} data-testid={`palette-${key}`}>
      {label}
    </Button>
  );

  const getProperties = () => {
    if (!selected) return <Typography variant="body2" color="text.secondary">{Locale.label("attendance.labels.selectBlock")}</Typography>;
    return (
      <Stack spacing={2}>
        <Stack direction="row" spacing={1}>
          <TextField fullWidth type="number" label="X" value={selected.x} onChange={(e) => update({ x: Number(e.target.value) })} data-testid="prop-x" />
          <TextField fullWidth type="number" label="Y" value={selected.y} onChange={(e) => update({ y: Number(e.target.value) })} data-testid="prop-y" />
        </Stack>
        <Stack direction="row" spacing={1}>
          <TextField fullWidth type="number" label="W" value={selected.w} onChange={(e) => update({ w: Number(e.target.value) })} data-testid="prop-w" />
          <TextField fullWidth type="number" label="H" value={selected.h} onChange={(e) => update({ h: Number(e.target.value) })} data-testid="prop-h" />
        </Stack>
        {selected.type === "text" && <TextField fullWidth label={Locale.label("attendance.labels.text")} value={selected.text || ""} onChange={(e) => update({ text: e.target.value })} data-testid="prop-text" />}
        {selected.type === "field" && (
          <TextField fullWidth select label={Locale.label("attendance.labels.field")} value={selected.field || ""} onChange={(e) => update({ field: e.target.value })} data-testid="prop-field">
            {fields.map((f) => <MenuItem key={f} value={f}>{fieldLabel(f)}</MenuItem>)}
          </TextField>
        )}
        {(selected.type === "text" || selected.type === "field") && (
          <>
            <TextField fullWidth type="number" label={Locale.label("attendance.labels.fontSize")} value={selected.fontSize || 10} onChange={(e) => update({ fontSize: Number(e.target.value) })} data-testid="prop-fontsize" />
            <Stack direction="row" spacing={1}>
              <FormControlLabel control={<Checkbox checked={!!selected.bold} onChange={(e) => update({ bold: e.target.checked })} data-testid="prop-bold" />} label={Locale.label("attendance.labels.bold")} />
              <FormControlLabel control={<Checkbox checked={!!selected.italic} onChange={(e) => update({ italic: e.target.checked })} data-testid="prop-italic" />} label={Locale.label("attendance.labels.italic")} />
            </Stack>
            <TextField fullWidth select label={Locale.label("attendance.labels.align")} value={selected.align || "left"} onChange={(e) => update({ align: e.target.value as LabelBlock["align"] })} data-testid="prop-align">
              <MenuItem value="left">{Locale.label("attendance.labels.left")}</MenuItem>
              <MenuItem value="center">{Locale.label("attendance.labels.center")}</MenuItem>
              <MenuItem value="right">{Locale.label("attendance.labels.right")}</MenuItem>
            </TextField>
          </>
        )}
        {selected.type === "barcode" && (
          <TextField fullWidth select label={Locale.label("attendance.labels.symbology")} value={selected.symbology || "code128"} onChange={(e) => update({ symbology: e.target.value as LabelBlock["symbology"] })} data-testid="prop-symbology">
            <MenuItem value="code128">Code 128</MenuItem>
            <MenuItem value="code39">Code 39</MenuItem>
          </TextField>
        )}
        {(selected.type === "barcode" || selected.type === "qrcode") && (
          <TextField fullWidth select label={Locale.label("attendance.labels.value")} value={selected.value || "securityCode"} onChange={(e) => update({ value: e.target.value })} data-testid="prop-value">
            {fields.map((f) => <MenuItem key={f} value={f}>{fieldLabel(f)}</MenuItem>)}
          </TextField>
        )}
        {selected.type === "box" && (
          <>
            <TextField fullWidth label={Locale.label("attendance.labels.fill")} value={selected.fill || ""} onChange={(e) => update({ fill: e.target.value || undefined })} placeholder="#000000" data-testid="prop-fill" />
            <FormControlLabel control={<Checkbox checked={!!selected.border} onChange={(e) => update({ border: e.target.checked })} data-testid="prop-border" />} label={Locale.label("attendance.labels.border")} />
          </>
        )}
        <Divider />
        <TextField fullWidth select label={Locale.label("attendance.labels.condition")} value={selected.condition?.field || ""} onChange={(e) => setCondition(e.target.value)} data-testid="prop-cond-field">
          <MenuItem value="">{Locale.label("attendance.labels.always")}</MenuItem>
          {fields.map((f) => <MenuItem key={f} value={f}>{fieldLabel(f)}</MenuItem>)}
        </TextField>
        {selected.condition && (
          <TextField fullWidth select label={Locale.label("attendance.labels.operator")} value={selected.condition.operator} onChange={(e) => update({ condition: { ...selected.condition!, operator: e.target.value } })} data-testid="prop-cond-operator">
            <MenuItem value="notEmpty">{Locale.label("attendance.labels.opIsNotBlank")}</MenuItem>
            <MenuItem value="empty">{Locale.label("attendance.labels.opIsBlank")}</MenuItem>
            <MenuItem value="equals">{Locale.label("attendance.labels.opEquals")}</MenuItem>
            <MenuItem value="notEquals">{Locale.label("attendance.labels.opDoesNotEqual")}</MenuItem>
          </TextField>
        )}
        {selected.condition && (selected.condition.operator === "equals" || selected.condition.operator === "notEquals") && (
          <TextField fullWidth label={Locale.label("attendance.labels.value")} value={selected.condition.value || ""} onChange={(e) => update({ condition: { ...selected.condition!, value: e.target.value } })} data-testid="prop-cond-value" />
        )}
        <Button variant="outlined" startIcon={<DeleteIcon />} onClick={() => { setBlocks(blocks.filter((b) => b.id !== selectedId)); setSelectedId(null); }} sx={{ textTransform: "none" }} data-testid="delete-block-button">
          {Locale.label("attendance.labels.removeBlock")}
        </Button>
      </Stack>
    );
  };

  return (
    <Grid container spacing={3} data-testid="label-editor">
      <Grid size={{ xs: 12, md: 2 }}>
        <CardWithHeader title={Locale.label("attendance.labels.palette")} icon={<Icon sx={{ color: "primary.main" }}>widgets</Icon>}>
          <Stack spacing={1}>
            {fields.map((f) => paletteButton(f, fieldLabel(f)))}
            <Divider />
            {paletteButton("text", Locale.label("attendance.labels.text"))}
            {paletteButton("barcode", Locale.label("attendance.labels.barcode"))}
            {paletteButton("qrcode", Locale.label("attendance.labels.qrCode"))}
            {paletteButton("box", Locale.label("attendance.labels.box"))}
          </Stack>
        </CardWithHeader>
      </Grid>
      <Grid size={{ xs: 12, md: 7 }}>
        <CardWithHeader
          title={tpl.name?.trim() || Locale.label("attendance.labels.title")}
          icon={<Icon sx={{ color: "primary.main" }}>label</Icon>}
          actions={
            <Stack direction="row" spacing={1}>
              <Button onClick={props.updatedCallback}>{Locale.label("common.cancel")}</Button>
              <LoadingButton variant="contained" disableElevation loading={saving} onClick={handleSave}>{Locale.label("common.save")}</LoadingButton>
            </Stack>
          }
        >
          <Stack spacing={2}>
            <Stack direction="row" spacing={1}>
              <TextField fullWidth label={Locale.label("attendance.labels.name")} value={tpl.name || ""} onChange={(e) => { setTpl({ ...tpl, name: e.target.value }); setNameError(false); }} error={nameError} data-testid="template-name-input" />
              <TextField select label={Locale.label("attendance.labels.type")} value={tpl.labelType || "nametag"} onChange={(e) => setTpl({ ...tpl, labelType: e.target.value })} sx={{ minWidth: 130 }} data-testid="template-type-select">
                <MenuItem value="nametag">{Locale.label("attendance.labels.nametag")}</MenuItem>
                <MenuItem value="pickup">{Locale.label("attendance.labels.pickup")}</MenuItem>
              </TextField>
              <TextField type="number" label={Locale.label("attendance.labels.width")} value={tpl.width ?? ""} onChange={(e) => setTpl({ ...tpl, width: e.target.value as any })} sx={{ minWidth: 100 }} data-testid="template-width-input" />
              <TextField type="number" label={Locale.label("attendance.labels.height")} value={tpl.height ?? ""} onChange={(e) => setTpl({ ...tpl, height: e.target.value as any })} sx={{ minWidth: 100 }} data-testid="template-height-input" />
            </Stack>
            <Box sx={{ overflowX: "auto" }}>
              <Paper sx={{ position: "relative", width: CANVAS_W, height: canvasH, border: "1px solid", borderColor: "divider", boxSizing: "content-box", overflow: "hidden", bgcolor: "#FFF" }} onPointerDown={() => setSelectedId(null)} data-testid="label-canvas">
                {blocks.map((b) => (
                  <div key={b.id} style={blockStyle(b)} onPointerDown={(e) => handlePointerDown(e, b)} onPointerMove={handlePointerMove} onPointerUp={() => { drag.current = null; }} data-testid={`block-${b.id}`}>
                    {blockContent(b)}
                  </div>
                ))}
              </Paper>
            </Box>
          </Stack>
        </CardWithHeader>
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <CardWithHeader title={Locale.label("attendance.labels.properties")} icon={<Icon sx={{ color: "primary.main" }}>tune</Icon>}>
          {getProperties()}
        </CardWithHeader>
      </Grid>
    </Grid>
  );
}
