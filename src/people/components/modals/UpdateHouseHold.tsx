import React from "react";
import { Dialog, Button, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { Locale } from "@churchapps/apphelper";

interface Props {
  show: boolean;
  onHide: () => void;
  handleNo: () => void;
  handleYes: () => void;
  text: string;
  title?: string;
}

export const UpdateHouseHold: React.FC<Props> = (props) => (
  <Dialog open={props.show} aria-labelledby="contained-modal-title-vcenter" data-cy="update-household-modal">
    <DialogTitle>{props.title || Locale.label("people.updateHouseHold.update")}</DialogTitle>
    <DialogContent>
      <p>{props.text}</p>
    </DialogContent>
    <DialogActions>
      <Button onClick={props.handleNo} data-cy="no-button">
        {Locale.label("common.no")}
      </Button>
      <Button onClick={props.handleYes} data-cy="yes-button">
        {Locale.label("common.yes")}
      </Button>
    </DialogActions>
  </Dialog>
);
