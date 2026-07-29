import React, { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { Box, Dialog, DialogActions, DialogContent, DialogTitle, Tab, Tabs } from "@mui/material";
import { SmallButton } from "@churchapps/apphelper";
import { type FeedVenueInterface } from "../../../helpers";
import { Section } from "./Section";
import { OlfPrint } from "./OlfPrint";
import { OlfScriptPrint } from "./OlfScriptPrint";

interface Props {
  onClose: () => void;
  feed: FeedVenueInterface;
  worshipOrderRender: () => React.JSX.Element;
}

export const OlfPrintPreview: React.FC<Props> = (props: Props) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef });
  const [format, setFormat] = useState("lessons.church");

  const getPrintSections = () => {
    const sections: React.JSX.Element[] = [];

    if (props.feed.sections) {
      props.feed.sections.forEach((s) => {
        sections.push(
          <Section
            section={s}
            key={s.name}
          />
        );
      });
    }

    return <div className="accordion">{sections}</div>;
  };

  const getContent = () => {
    if (format === "colorCoded") {
      return <OlfPrint feed={props.feed} />;
    } else if (format === "script") {
      return <OlfScriptPrint feed={props.feed} />;
    } else if (format === "worshipOrder") {
      return props.worshipOrderRender();
    } else {
      return getPrintSections();
    }
  };

  const getTabs = () => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      <span>Format:</span>
      <Box sx={{ borderBottom: 1, borderColor: "divider", marginRight: 2 }}>
        <Tabs
          value={format}
          onChange={(_, newValue) => {
            setFormat(newValue);
          }}
          aria-label="print format tabs"
        >
          <Tab label="Lessons.church" value="lessons.church" />
          <Tab label="Color Coded" value="colorCoded" />
          <Tab label="Script" value="script" />
          <Tab label="Service Order" value="worshipOrder" />
        </Tabs>
      </Box>
    </Box>
  );

  return (
    <Dialog open={true} onClose={props.onClose} fullScreen={true}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 3, py: 1, borderBottom: "1px solid", borderColor: "divider" }} className="no-print">
        <DialogTitle sx={{ p: 0 }}>Print Preview</DialogTitle>
        <DialogActions sx={{ p: 0 }}>
          {getTabs()}
          <SmallButton
            icon="print"
            text="Print"
            onClick={() => {
              handlePrint();
            }}
          />
          <SmallButton icon="close" text="Close" onClick={props.onClose} />
        </DialogActions>
      </Box>

      <DialogContent sx={{ p: 3, bgcolor: "#fff" }}>
        <div style={{ minWidth: 800, margin: "0 auto", padding: "10px" }} ref={contentRef} className="print-content">
          {getContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
