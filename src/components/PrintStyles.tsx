import React from "react";

// Shared print CSS for react-to-print content. `.no-print` hides on-screen chrome
// (buttons, actions) when printing; `.print-only` renders a header that exists only
// on paper. Same convention as forms/components/FormSubmissions.tsx.
export const PrintStyles: React.FC = () => (
  <style>{`
    @media print {
      .no-print, #display-box-actions { display: none !important; }
      .print-only { display: block !important; }
    }
    @media screen {
      .print-only { display: none; }
    }
  `}</style>
);
