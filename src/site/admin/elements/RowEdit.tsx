import { FormControl, InputLabel, MenuItem, Select, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import React from "react";
import { RowMobileSizes } from "./RowMobileSizes";
import { RowMobileOrder } from "./RowMobileOrder";
import { Locale } from "@churchapps/apphelper";

type Props = {
  parsedData: any;
  onRealtimeChange: (parsedData: any) => void;
  setErrors: (errors: string[]) => void
};

export function RowEdit(props: Props) {
  const cols: number[] = [];
  props.parsedData.columns?.split(",").forEach((c: string) => cols.push(parseInt(c)));
  const [showMobileSizes, setShowMobileSizes] = React.useState(false);
  const [showMobileOrder, setShowMobileOrder] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    e.preventDefault();
    const data = { ...props.parsedData };
    if (e.target.name === "columns") data.columns = (e.target.value === "custom") ? "6,3,3" : e.target.value;
    props.onRealtimeChange(data);
    props.setErrors([]);
  };

  const getPreviewTable = () => {
    const colors = [
      "#FBF8CC", "#FDE4CF", "#FFCFD2", "#F1C0E8", "#CFBAF0", "#A3C4F3", "#90DBF4", "#8EECF5", "#98F5E1", "B9FBC0", "#FBF8CC", "#FDE4CF"
    ];
    const result: React.ReactElement[] = [];
    let idx = 0;
    cols.forEach(c => {
      result.push(<TableCell key={idx} style={{ backgroundColor: colors[idx], width: Math.round(c / 12 * 100).toString() + "%" }} colSpan={c}>{c}</TableCell>);
      idx++;
    });
    return (<Table size="small">
      <TableBody>
        <TableRow>
          {result}
        </TableRow>
      </TableBody>
    </Table>);
  };

  const updateColumns = () => {
    const data = { ...props.parsedData };
    data.columns = cols.toString();
    props.onRealtimeChange(data);
    let total = 0;
    cols.forEach(c => total += c);
    if (total === 12) props.setErrors([]); else props.setErrors([Locale.label("site.row.columnsError")]);
  };

  const handleRemove = (idx: number) => {
    cols.splice(idx, 1);
    updateColumns();
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    let total = 0;
    cols.forEach(c => total += c);
    const newVal = (total >= 12) ? 1 : 12 - total;
    cols.push(newVal);
    updateColumns();
  };

  const handleColumnChange = (e: SelectChangeEvent<number>, idx: number) => {
    const val = parseInt(e.target.value.toString());
    cols[idx] = val;
    updateColumns();
  };

  const getCustomSizes = () => {
    const result: React.ReactElement[] = [];
    let idx = 0;
    let total = 0;
    cols.forEach(c => {
      total += c;
      const index = idx;
      result.push(<TableRow>
        <TableCell key={idx}>
          <Select name="width" fullWidth size="small" value={c} onChange={(e) => handleColumnChange(e, index)}>
            <MenuItem value="1">{Locale.label("site.row.size1")}</MenuItem>
            <MenuItem value="2">{Locale.label("site.row.size2")}</MenuItem>
            <MenuItem value="3">{Locale.label("site.row.size3")}</MenuItem>
            <MenuItem value="4">{Locale.label("site.row.size4")}</MenuItem>
            <MenuItem value="5">{Locale.label("site.row.size5")}</MenuItem>
            <MenuItem value="6">{Locale.label("site.row.size6")}</MenuItem>
            <MenuItem value="7">{Locale.label("site.row.size7")}</MenuItem>
            <MenuItem value="8">{Locale.label("site.row.size8")}</MenuItem>
            <MenuItem value="9">{Locale.label("site.row.size9")}</MenuItem>
            <MenuItem value="10">{Locale.label("site.row.size10")}</MenuItem>
            <MenuItem value="11">{Locale.label("site.row.size11")}</MenuItem>
            <MenuItem value="12">{Locale.label("site.row.size12")}</MenuItem>
          </Select>
        </TableCell>
        <TableCell><a href="about:blank" onClick={(e) => { e.preventDefault(); handleRemove(index); }}>{Locale.label("site.row.remove")}</a></TableCell>
      </TableRow>);
      idx++;
    });

    if (total === 12) result.push(<TableRow><TableCell colSpan={2}><div className="text-success">{Locale.label("site.row.totalValid")}</div></TableCell></TableRow>);
    else result.push(<TableRow><TableCell colSpan={2}><div className="text-danger">{Locale.label("site.row.totalInvalid").replace("{total}", total.toString())}</div></TableCell></TableRow>);


    return (<>
      <div><b>{Locale.label("common.custom")}</b> - <small>{Locale.label("site.row.columnsHelper")}</small></div>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{Locale.label("site.row.width")}</TableCell>
            <TableCell><a href="about:blank" onClick={handleAdd}>{Locale.label("site.row.addColumn")}</a></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {result}
        </TableBody>
      </Table><br /></>);
  };

  const getMobileSize = () => {
    if (!showMobileSizes) return <a href="about:blank" style={{ marginTop: 10, display: "block" }} onClick={(e) => { e.preventDefault(); setShowMobileSizes(true); }}>{Locale.label("site.row.showMobileSizes")}</a>;
    else {
      return <>
        <a href="about:blank" style={{ marginTop: 10, display: "block" }} onClick={(e) => { e.preventDefault(); setShowMobileSizes(false); }}>{Locale.label("site.row.hideMobileSizes")}</a>
        <RowMobileSizes cols={cols} parsedData={props.parsedData} onRealtimeChange={props.onRealtimeChange} />
      </>;
    }
  };

  const getMobileOrder = () => {
    if (!showMobileOrder) return <a href="about:blank" style={{ marginTop: 10, display: "block" }} onClick={(e) => { e.preventDefault(); setShowMobileOrder(true); }}>{Locale.label("site.row.showMobileOrder")}</a>;
    else {
      return <>
        <a href="about:blank" style={{ marginTop: 10, display: "block" }} onClick={(e) => { e.preventDefault(); setShowMobileOrder(false); }}>{Locale.label("site.row.hideMobileOrder")}</a>
        <RowMobileOrder cols={cols} parsedData={props.parsedData} onRealtimeChange={props.onRealtimeChange} />
      </>;
    }
  };

  let commonValue = props.parsedData?.columns || "custom";
  if (["6,6", "4,4,4", "3,3,3,3"].indexOf(commonValue) === -1) commonValue = "custom";
  return (
    <>
      <FormControl fullWidth>
        <InputLabel>{Locale.label("site.row.commonOptions")}</InputLabel>
        <Select name="columns" fullWidth label={Locale.label("site.row.commonOptions")} size="small" value={commonValue} onChange={handleChange}>
          <MenuItem value="6,6">{Locale.label("site.row.halves")}</MenuItem>
          <MenuItem value="4,4,4">{Locale.label("site.row.thirds")}</MenuItem>
          <MenuItem value="3,3,3,3">{Locale.label("site.row.quarters")}</MenuItem>
          <MenuItem value="custom">{Locale.label("common.custom")}</MenuItem>
        </Select>
      </FormControl>
      {(commonValue === "custom") && getCustomSizes()}
      <div><b>{Locale.label("site.row.preview")}</b> - <small>{Locale.label("site.row.previewHelper")}</small></div>
      {getPreviewTable()}
      {getMobileSize()}
      {getMobileOrder()}

    </>
  );


}
