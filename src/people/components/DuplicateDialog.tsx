import React from "react";
import { type PersonInterface } from "@churchapps/helpers";
import { Locale, DateHelper } from "@churchapps/apphelper";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemText, Typography } from "@mui/material";

interface Props {
  matches: PersonInterface[];
  onUseExisting: (person: PersonInterface) => void;
  onCreateAnyway: () => void;
  onClose: () => void;
}

export const DuplicateDialog: React.FC<Props> = ({ matches, onUseExisting, onCreateAnyway, onClose }) => (
  <Dialog open onClose={onClose} maxWidth="sm" fullWidth data-testid="duplicate-dialog">
    <DialogTitle>{Locale.label("people.duplicateDialog.title")}</DialogTitle>
    <DialogContent>
      <Typography sx={{ marginBottom: 2 }}>{Locale.label("people.duplicateDialog.message")}</Typography>
      <List>
        {matches.map((p) => (
          <ListItem
            key={p.id}
            divider
            secondaryAction={
              <Button variant="outlined" size="small" onClick={() => onUseExisting(p)} data-testid={`duplicate-use-existing-${p.id}`}>
                {Locale.label("people.duplicateDialog.useExisting")}
              </Button>
            }>
            <ListItemText
              primary={p.name?.display}
              secondary={[
                p.contactInfo?.email,
                p.contactInfo?.mobilePhone || p.contactInfo?.homePhone || p.contactInfo?.workPhone,
                p.birthDate ? `${Locale.label("people.duplicateDialog.matchBirthDate")}: ${DateHelper.formatHtml5Date(p.birthDate)}` : null
              ].filter(Boolean).join(" · ")}
            />
          </ListItem>
        ))}
      </List>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCreateAnyway} data-testid="duplicate-create-anyway">
        {Locale.label("people.duplicateDialog.createAnyway")}
      </Button>
    </DialogActions>
  </Dialog>
);
