import { MenuItem, Select, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import React from "react";
import { Locale } from "@churchapps/apphelper";

type Props = {
  cols: number[]
  parsedData: any;
  onRealtimeChange: (parsedData: any) => void;
};

export function RowMobileSizes(props: Props) {
  const mobileSizes: number[] = [];
  props.parsedData.columns?.split(",").forEach((c: string) => mobileSizes.push(parseInt(c)));
  props.parsedData.mobileSizes?.split(",").forEach((c: string, idx:number) => mobileSizes[idx] = parseInt(c));

  const updateMobileSizes = () => {
    const data = { ...props.parsedData };
    data.mobileSizes = mobileSizes.toString();
    props.onRealtimeChange(data);
  };

  const handleColumnChange = (e: SelectChangeEvent<number>, idx: number) => {
    const val = parseInt(e.target.value.toString());
    mobileSizes[idx] = val;
    updateMobileSizes();
  };

  const getCustomSizes = () => {
    const result: React.ReactElement[] = [];
    props.cols.forEach((c:number, idx:number) => {
      const index = idx;
      const mobileSize = (mobileSizes.length > idx) ? mobileSizes[idx] || c : c;
      result.push(<TableRow key={idx}>
        <TableCell>{c}</TableCell>
        <TableCell>
          <Select name="width" fullWidth size="small" value={mobileSize} onChange={(e) => handleColumnChange(e, index)} data-testid={`mobile-width-select-${index}`} aria-label={`Select mobile width for column ${index + 1}`}>
            <MenuItem value="1" data-testid="mobile-width-1" aria-label="1/12th width">{Locale.label("site.rowMobileSizes.size1")}</MenuItem>
            <MenuItem value="2" data-testid="mobile-width-2" aria-label="1/6th width">{Locale.label("site.rowMobileSizes.size2")}</MenuItem>
            <MenuItem value="3" data-testid="mobile-width-3" aria-label="1/4th width">{Locale.label("site.rowMobileSizes.size3")}</MenuItem>
            <MenuItem value="4" data-testid="mobile-width-4" aria-label="1/3rd width">{Locale.label("site.rowMobileSizes.size4")}</MenuItem>
            <MenuItem value="5" data-testid="mobile-width-5" aria-label="5/12th width">{Locale.label("site.rowMobileSizes.size5")}</MenuItem>
            <MenuItem value="6" data-testid="mobile-width-6" aria-label="Half width">{Locale.label("site.rowMobileSizes.size6")}</MenuItem>
            <MenuItem value="7" data-testid="mobile-width-7" aria-label="7/12th width">{Locale.label("site.rowMobileSizes.size7")}</MenuItem>
            <MenuItem value="8" data-testid="mobile-width-8" aria-label="2/3rd width">{Locale.label("site.rowMobileSizes.size8")}</MenuItem>
            <MenuItem value="9" data-testid="mobile-width-9" aria-label="3/4th width">{Locale.label("site.rowMobileSizes.size9")}</MenuItem>
            <MenuItem value="10" data-testid="mobile-width-10" aria-label="5/6th width">{Locale.label("site.rowMobileSizes.size10")}</MenuItem>
            <MenuItem value="11" data-testid="mobile-width-11" aria-label="11/12th width">{Locale.label("site.rowMobileSizes.size11")}</MenuItem>
            <MenuItem value="12" data-testid="mobile-width-12" aria-label="Full width">{Locale.label("site.rowMobileSizes.size12")}</MenuItem>
          </Select>
        </TableCell>
      </TableRow>);
    });

    return (<>
      <div style={{ marginTop: 10 }}><b>{Locale.label("site.rowMobileSizes.customizeLayout")}</b></div>
      <p><i>{Locale.label("site.rowMobileSizes.mobileWidthsHelper")}</i></p>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{Locale.label("site.rowMobileSizes.desktopWidth")}</TableCell>
            <TableCell>{Locale.label("site.rowMobileSizes.mobileWidth")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {result}
        </TableBody>
      </Table><br /></>);
  };

  return (
    <>
      {getCustomSizes()}
    </>
  );


}
