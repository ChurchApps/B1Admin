import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import { Locale } from "@churchapps/apphelper";

export const DocChatLoading: React.FC = () => {
  const [statusText, setStatusText] = React.useState(Locale.label("components.docChat.searching"));

  React.useEffect(() => {
    const timer = setTimeout(() => setStatusText(Locale.label("components.docChat.composing")), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: "flex", justifyContent: "flex-start", gap: 1 }}>
        <SmartToyIcon sx={{ mt: 1, color: "primary.main", fontSize: 20 }} />
        <Paper elevation={1} sx={{ p: 1.5, backgroundColor: "background.paper" }}>
          <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", height: 20 }}>
            {[0, 1, 2].map((i) => (
              <Box key={i} sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "text.secondary",
                animation: "docChatBounce 1.4s infinite ease-in-out",
                animationDelay: `${i * 0.16}s`,
                "@keyframes docChatBounce": { "0%, 80%, 100%": { transform: "scale(0.6)", opacity: 0.4 }, "40%": { transform: "scale(1)", opacity: 1 } }
              }} />
            ))}
          </Box>
        </Paper>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ ml: 4.5, mt: 0.5, display: "block" }}>
        {statusText}
      </Typography>
    </Box>
  );
};
