import { TextField, Box, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";

import { ColorPicker } from "../ColorPicker";
import { HtmlEditor } from "@churchapps/apphelper/markdown";
import { Locale } from "@churchapps/apphelper";

type Props = {
  parsedData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => void;
  handleHtmlChange: (field: string, newValue: string) => void;
};

export const FaqEdit = ({ parsedData, handleChange, handleHtmlChange }: Props) => (
  <>
    <FormControl fullWidth>
      <InputLabel>{Locale.label("site.faqEdit.headingType")}</InputLabel>
      <Select fullWidth label={Locale.label("site.faqEdit.headingType")} name="headingType" value={parsedData.headingType} onChange={handleChange}>
        <MenuItem value="h6">{Locale.label("site.faqEdit.heading")}</MenuItem>
        <MenuItem value="link">{Locale.label("site.faqEdit.link")}</MenuItem>
      </Select>
    </FormControl>
    <TextField fullWidth label={Locale.label("site.faqEdit.title")} name="title" size="small" value={parsedData.title || ""} onChange={handleChange} placeholder={Locale.label("placeholders.faq.title")} />
    <Box sx={{ marginTop: 2 }}>
      <HtmlEditor
        value={parsedData.description || ""}
        onChange={(val) => handleHtmlChange("description", val)}
        style={{ maxHeight: 200, overflowY: "scroll" }}
      />
    </Box>
    <Box sx={{ marginTop: 2 }}>
      <InputLabel>{Locale.label("site.faqEdit.iconColor")}</InputLabel>
      <ColorPicker color={parsedData?.iconColor || "#03a9f4"} updatedCallback={(c) => handleHtmlChange("iconColor", c)} globalStyles={null} />
    </Box>
  </>
);
