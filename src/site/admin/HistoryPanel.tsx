import React from "react";
import { Dialog, DialogTitle, DialogContent, List, ListItem, ListItemButton, ListItemText, IconButton, Typography, Box } from "@mui/material";
import { Icon } from "@mui/material";

interface HistoryEntry {
  description: string;
  timestamp: number;
}

interface HistoryPanelProps {
  open: boolean;
  onClose: () => void;
  history: HistoryEntry[];
  currentIndex: number;
  onRestore: (index: number) => void;
}

export function HistoryPanel({ open, onClose, history, currentIndex, onRestore }: HistoryPanelProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const handleRestore = (index: number) => {
    onRestore(index);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Edit History</span>
        <IconButton onClick={onClose} size="small">
          <Icon>close</Icon>
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {history.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
            No history available yet. Make some changes to start tracking history.
          </Typography>
        ) : (
          <List dense>
            {history.map((entry, index) => {
              const isCurrentState = index === currentIndex;
              const isFutureState = index > currentIndex;

              return (
                <ListItem
                  key={index}
                  disablePadding
                  secondaryAction={
                    !isCurrentState && (
                      <IconButton
                        edge="end"
                        onClick={() => handleRestore(index)}
                        size="small"
                        title="Restore to this point"
                      >
                        <Icon fontSize="small">restore</Icon>
                      </IconButton>
                    )
                  }
                >
                  <ListItemButton
                    onClick={() => !isCurrentState && handleRestore(index)}
                    disabled={isCurrentState}
                    sx={{
                      bgcolor: isCurrentState ? "action.selected" : "transparent",
                      opacity: isFutureState ? 0.5 : 1,
                      borderLeft: isCurrentState ? "3px solid" : "3px solid transparent",
                      borderLeftColor: isCurrentState ? "primary.main" : "transparent"
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Icon fontSize="small" sx={{ color: isCurrentState ? "primary.main" : "text.secondary" }}>
                            {isCurrentState ? "radio_button_checked" : isFutureState ? "radio_button_unchecked" : "history"}
                          </Icon>
                          <span>{entry.description}</span>
                          {isCurrentState && (
                            <Typography variant="caption" color="primary" sx={{ ml: 1 }}>
                              (current)
                            </Typography>
                          )}
                        </Box>
                      }
                      secondary={formatTime(entry.timestamp)}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
