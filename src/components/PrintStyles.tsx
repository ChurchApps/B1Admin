import React from "react";

// Shared print CSS for react-to-print content. `.no-print` hides on-screen chrome
// (buttons, actions) when printing; `.print-only` renders a header that exists only
// on paper. Same convention as forms/components/FormSubmissions.tsx.
// Paper is white whatever the screen theme is, so print dark text on white; otherwise
// dark mode's near-white text comes out faint.
export const PrintStyles: React.FC = () => (
  <style>{`
    @media print {
      .no-print, #display-box-actions { display: none !important; }
      .print-only { display: block !important; }
      body { background: #fff !important; color: #1F2937 !important; }
      body * { color: #1F2937 !important; }
      .MuiPaper-root { background: #fff !important; }
    }
    @media screen {
      .print-only { display: none; }
    }
  `}</style>
);
