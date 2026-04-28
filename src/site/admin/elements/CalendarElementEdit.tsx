import { useEffect, useState } from "react";
import type { SelectChangeEvent } from "@mui/material";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { ApiHelper, Loading, Locale } from "@churchapps/apphelper";
import type { GroupInterface, CuratedCalendarInterface } from "@churchapps/helpers";

interface Props {
  parsedData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<string>) => void;
}

export const CalendarElementEdit = ({ parsedData, handleChange }: Props) => {
  const [calendars, setCalendars] = useState<GroupInterface[] | CuratedCalendarInterface[]>(null);

  const loadCalendars = () => {
    const apiCalls = () => {
      if (parsedData.calendarType === "group") ApiHelper.get("/groups/my", "MembershipApi").then((data: any) => setCalendars(data));
      else ApiHelper.get("/curatedCalendars", "ContentApi").then((data: any) => setCalendars(data));
    };

    if (parsedData.calendarType) apiCalls();
  };

  useEffect(() => { loadCalendars(); }, [parsedData?.calendarType]);

  return (
    <>
      <FormControl fullWidth>
        <InputLabel>{Locale.label("site.calendarElementEdit.select")}</InputLabel>
        <Select fullWidth size="small" label={Locale.label("site.calendarElementEdit.select")} name="calendarType" onChange={handleChange} value={parsedData.calendarType || ""}>
          <MenuItem value="group">{Locale.label("site.calendarElementEdit.groupCalendar")}</MenuItem>
          <MenuItem value="curated">{Locale.label("site.calendarElementEdit.curatedCalendar")}</MenuItem>
        </Select>
      </FormControl>
      <div style={{ marginTop: 15 }}>
        {parsedData.calendarType && (<>{calendars?.length > 0 ? (<><FormControl fullWidth><InputLabel>{Locale.label("site.calendarElementEdit.selectCalendar")}</InputLabel><Select fullWidth size="small" label={Locale.label("site.calendarElementEdit.selectCalendar")} name="calendarId" onChange={handleChange} value={parsedData.calendarId || ""}>{calendars.map((calendar) => <MenuItem value={calendar.id}>{calendar.name}</MenuItem>)}</Select></FormControl></>) : (<Loading />)}</>)}
      </div>
    </>
  );
};
