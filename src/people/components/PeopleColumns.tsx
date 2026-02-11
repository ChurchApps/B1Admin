import React, { memo, useCallback, useMemo } from "react";
import { Grid, FormControlLabel, Checkbox, Dialog, DialogTitle, DialogActions, Button, DialogContent, Tabs, Tab, Box } from "@mui/material";
import { SmallButton, ApiHelper, Locale } from "@churchapps/apphelper";

interface Props {
  columns: { key: string; label: string; shortName: string }[];
  selectedColumns: string[];
  toggleColumn: (key: string) => void;
}

export const PeopleColumns = memo(function PeopleColumns(props: Props) {
  const [open, setOpen] = React.useState(false);
  const [tabValue, setTabValue] = React.useState("standard");
  const [optionalColumns, setOptionalColumns] = React.useState<any[]>([]);

  const handleClick = useCallback((e: React.MouseEvent<Element, MouseEvent>) => {
    e.preventDefault();
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const standardItems = useMemo(() => {
    const result: JSX.Element[] = [];
    props.columns.forEach((o, i) => {
      const option = o;
      const selectedClass = props.selectedColumns.indexOf(o.key) > -1 ? "checked" : "";
      result.push(
        <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={selectedClass === "checked"}
                onChange={(e) => {
                  props.toggleColumn(e.target.name);
                }}
                name={option.key}
                data-testid={`column-checkbox-${option.key}`}
                aria-label={`Column ${option.label}`}
              />
            }
            label={option.label}
          />
        </Grid>
      );
    });
    return result;
  }, [props.columns, props.selectedColumns, props.toggleColumn]);

  const optionalItems = useMemo(() => {
    const result: JSX.Element[] = [];
    optionalColumns.forEach((oc, i) => {
      const optionalColumn = oc;
      const selectedClass = props.selectedColumns.indexOf(optionalColumn.id) > -1 ? "checked" : "";
      result.push(
        <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={selectedClass === "checked"}
                onChange={(e) => {
                  props.toggleColumn(e.target.name);
                }}
                name={optionalColumn.id}
                data-testid={`optional-column-checkbox-${optionalColumn.id}`}
                aria-label={`Optional column ${optionalColumn.title}`}
              />
            }
            label={optionalColumn.title}
          />
        </Grid>
      );
    });
    return result;
  }, [optionalColumns, props.selectedColumns, props.toggleColumn]);

  const currentTab = useMemo(() => {
    switch (tabValue) {
      case "standard":
        return (
          <Grid container spacing={0.5}>
            {standardItems}
          </Grid>
        );
      case "custom":
        return (
          <Grid container spacing={0.5} sx={{ minHeight: 323 }}>
            {optionalColumns.length > 0 ? <>{optionalItems}</> : <div>{Locale.label("people.peopleColumns.noFilt")}</div>}
          </Grid>
        );
      default: return null;
    }
  }, [tabValue, standardItems, optionalItems, optionalColumns.length]);

  React.useEffect(() => {
    ApiHelper.get("/forms?contentType=person", "MembershipApi").then((data) => {
      if (data.length > 0) {
        const personForms = data.filter((f: any) => f.contentType === "person");
        if (personForms.length > 0) {
          personForms.forEach((f: any) => {
            ApiHelper.get("/questions?formId=" + f.id, "MembershipApi").then((q) => setOptionalColumns((prevState) => [...prevState, ...q]));
          });
        }
      } else setOptionalColumns([]);
    });
  }, []);

  return (
    <>
      <SmallButton icon="view_column" onClick={handleClick} data-testid="columns-button" ariaLabel="Select columns" />
      <Dialog id="fieldsMenu" open={open} onClose={handleClose} fullWidth maxWidth="md">
        <DialogTitle>{Locale.label("people.peopleColumns.filt")}</DialogTitle>
        <DialogContent>
          <Tabs value={tabValue} onChange={(event: React.SyntheticEvent, newValue: string) => setTabValue(newValue)}>
            <Tab value="standard" label={Locale.label("people.peopleColumns.stand")} />
            <Tab value="custom" label={Locale.label("people.peopleColumns.cust")} />
          </Tabs>
          <Box sx={{ marginTop: 1 }}>{currentTab}</Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>{Locale.label("common.close")}</Button>
          <Button onClick={handleClose} variant="contained">
            {Locale.label("people.peopleColumns.appFilt")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
});
