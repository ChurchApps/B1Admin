
import type { SelectChangeEvent } from "@mui/material";
import { MarkdownPreviewLight } from "@churchapps/apphelper-markdown";
import { HtmlEditor } from "@churchapps/apphelper-markdown";
import { Locale } from "@churchapps/apphelper";
import { Button, FormControl, Grid, InputLabel, MenuItem, Select, Table, TableBody, TableCell, TableRow, TextField } from "@mui/material";
import React from "react";

type Props = {
  parsedData: any;
  onRealtimeChange: (parsedData: any) => void;
};

export function TableEdit(props: Props) {
  const contents:string[][] = props.parsedData.contents || [["", ""], ["", ""], ["", ""], ["", ""]];
  const rows = contents.length;
  const cols = (contents.length > 0) ? contents[0].length : 0;
  const markdown = props.parsedData.markdown || false;
  const [editCellIdx, setEditCellIdx] = React.useState<number[]>(null);

  const updateRows = (newRows: number) => {
    const c = [...contents];
    if (newRows > rows) {
      for (let i = rows; i < newRows; i++) c.push(new Array(cols).fill(""));
    } else c.splice(newRows, rows - newRows);
    return c;
  };

  const updateCols = (newCols: number) => {
    const c = [...contents];
    for (let i = 0; i < c.length; i++) {
      if (newCols > cols) {
        for (let j = cols; j < newCols; j++) c[i].push("");
      } else c[i].splice(newCols, cols - newCols);
    }
    return c;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    e.preventDefault();
    const data = { ...props.parsedData };
    if (e.target.name === "rows") data.contents = updateRows(parseInt(e.target.value));
    if (e.target.name === "columns") data.contents = updateCols(parseInt(e.target.value));
    if (e.target.name === "head") data.head = (e.target.value === "true");
    if (e.target.name === "markdown") data.markdown = (e.target.value === "true");
    if (e.target.name === "size") data.size = e.target.value;
    if (e.target.name.startsWith("cell-")) {
      const parts = e.target.name.split("-");
      const row = parseInt(parts[1]);
      const col = parseInt(parts[2]);
      const c = [...contents];
      c[row][col] = e.target.value;
      data.contents = c;
    }
    props.onRealtimeChange(data);
  };

  const getMarkdownEditor = () => {
    const row = editCellIdx[0];
    const col = editCellIdx[1];
    return (<>
      <HtmlEditor value={contents[row][col]} onChange={val => {
        const c = [...contents];
        c[row][col] = val;
        const data = { ...props.parsedData };
        data.contents = c;
        props.onRealtimeChange({ ...props.parsedData, contents: c });
      }} />
      <Button style={{ float: "right" }} onClick={() => { setEditCellIdx(null); }} data-testid="table-cell-done-button">{Locale.label("common.done")}</Button>
      <br />
    </>);
  };

  const getGrid = () => {
    const result: React.ReactElement[] = [];
    for (let i = 0; i < rows; i++) {
      const row: React.ReactElement[] = [];
      for (let j = 0; j < cols; j++) {
        if (markdown) row.push(<TableCell key={j} style={{ cursor: "pointer" }} onClick={() => { setEditCellIdx([i, j]); }}><MarkdownPreviewLight value={contents[i][j] || "(empty)"} /></TableCell>);
        else row.push(<TableCell key={j}><TextField fullWidth size="small" label="" style={{ margin: 0 }} name={"cell-" + i + "-" + j} value={contents[i][j]} onChange={handleChange} data-testid={`table-cell-${i}-${j}-input`} /></TableCell>);
      }
      result.push(<TableRow key={i}>{row}</TableRow>);
    }
    return (<Table size="small"><TableBody>{result}</TableBody></Table>);
  };

  return (
    <>
      <Grid container columnSpacing={3}>
        <Grid size={{ md: 6, xs: 12 }}>
          <TextField fullWidth size="small" label="Rows" name="rows" value={rows} onChange={handleChange} data-testid="table-rows-input" />
        </Grid>
        <Grid size={{ md: 6, xs: 12 }}>
          <TextField fullWidth size="small" label="Columns" name="columns" value={cols} onChange={handleChange} data-testid="table-columns-input" />
        </Grid>
        <Grid size={{ md: 6, xs: 12 }}>
          <FormControl fullWidth size="small">
            <InputLabel>First Row is Header</InputLabel>
            <Select fullWidth label="First Row is Header" size="small" name="head" value={props.parsedData.head?.toString() || "false"} onChange={handleChange}>
              <MenuItem value="true">Yes</MenuItem>
              <MenuItem value="false">No</MenuItem>
            </Select>
          </FormControl>

        </Grid>
        <Grid size={{ md: 6, xs: 12 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Allow Markdown</InputLabel>
            <Select fullWidth label="Allow Markdown" size="small" name="markdown" value={props.parsedData.markdown?.toString() || "false"} onChange={handleChange}>
              <MenuItem value="true">Yes</MenuItem>
              <MenuItem value="false">No</MenuItem>
            </Select>
          </FormControl>

        </Grid>
      </Grid>

      <FormControl fullWidth size="small">
        <InputLabel>Size</InputLabel>
        <Select fullWidth label="Size" size="small" name="size" value={props.parsedData.size?.toString() || "medium"} onChange={handleChange}>
          <MenuItem value="medium">Medium</MenuItem>
          <MenuItem value="small">Small</MenuItem>
        </Select>
      </FormControl>
      {editCellIdx && getMarkdownEditor()}
      {!editCellIdx && getGrid()}
    </>
  );

}
