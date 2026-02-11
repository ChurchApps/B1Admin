import { MenuItem, Select, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import React from "react";

type Props = {
  cols: number[]
  parsedData: any;
  onRealtimeChange: (parsedData: any) => void;
};

export function RowMobileOrder(props: Props) {
  const mobileOrder: number[] = [];
  props.parsedData.columns?.split(",").forEach((c: string, idx:number) => mobileOrder.push(idx + 1));
  props.parsedData.mobileOrder?.split(",").forEach((c: string, idx:number) => mobileOrder[idx] = parseInt(c));

  const updateMobileOrders = () => {
    const data = { ...props.parsedData };
    data.mobileOrder = mobileOrder.toString();
    props.onRealtimeChange(data);
  };

  const handleColumnChange = (e: SelectChangeEvent<number>, idx: number) => {
    const val = parseInt(e.target.value.toString());
    mobileOrder[idx] = val;
    updateMobileOrders();
  };

  const getCustomOrders = () => {
    const result: React.ReactElement[] = [];
    props.cols.forEach((c:number, idx:number) => {
      const index = idx;
      const order = (mobileOrder.length > idx) ? mobileOrder[idx] || idx + 1 : idx + 1;
      result.push(<TableRow key={idx}>
        <TableCell>{idx + 1}</TableCell>
        <TableCell>
          <Select name="width" fullWidth size="small" value={order} onChange={(e) => handleColumnChange(e, index)} data-testid={`mobile-order-select-${index}`} aria-label={`Select mobile order for column ${index + 1}`}>
            <MenuItem value="1" data-testid="mobile-order-1" aria-label="Order 1">1</MenuItem>
            <MenuItem value="2" data-testid="mobile-order-2" aria-label="Order 2">2</MenuItem>
            <MenuItem value="3" data-testid="mobile-order-3" aria-label="Order 3">3</MenuItem>
            <MenuItem value="4" data-testid="mobile-order-4" aria-label="Order 4">4</MenuItem>
            <MenuItem value="5" data-testid="mobile-order-5" aria-label="Order 5">5</MenuItem>
            <MenuItem value="6" data-testid="mobile-order-6" aria-label="Order 6">6</MenuItem>
            <MenuItem value="7" data-testid="mobile-order-7" aria-label="Order 7">7</MenuItem>
            <MenuItem value="8" data-testid="mobile-order-8" aria-label="Order 8">8</MenuItem>
            <MenuItem value="9" data-testid="mobile-order-9" aria-label="Order 9">9</MenuItem>
            <MenuItem value="10" data-testid="mobile-order-10" aria-label="Order 10">10</MenuItem>
            <MenuItem value="11" data-testid="mobile-order-11" aria-label="Order 11">11</MenuItem>
            <MenuItem value="12" data-testid="mobile-order-12" aria-label="Order 12">12</MenuItem>
          </Select>
        </TableCell>
      </TableRow>);
    });

    return (<>
      <div style={{ marginTop: 10 }}><b>Customize Mobile Order</b></div>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Desktop Order</TableCell>
            <TableCell>Mobile Order</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {result}
        </TableBody>
      </Table><br /></>);
  };

  return (
    <>
      {getCustomOrders()}
    </>
  );


}
