import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { Edit as EditIcon } from "@mui/icons-material";
import React from "react";
import { ApiHelper, DateHelper, Loading, Locale, UserHelper } from "@churchapps/apphelper";
import type { StreamingServiceInterface } from "@churchapps/helpers";
import { ServiceEdit } from "./ServiceEdit";
import { StatusBadge, Surface, tableScrollSx } from "../../components/ui";
import { AppIconButton } from "../../components/ui/AppIconButton";

const providerNames: Record<string, string> = {
  youtube: "YouTube",
  youtube_live: "YouTube Live",
  youtube_watchparty: "YouTube",
  vimeo: "Vimeo",
  vimeo_live: "Vimeo Live",
  vimeo_watchparty: "Vimeo",
  facebook: "Facebook",
  facebook_live: "Facebook Live",
  custom: "Custom"
};

const getNextSunday = () => {
  const result = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  while (result.getDay() !== 0) result.setDate(result.getDate() + 1);
  return result;
};

// A new service defaulting to 9am next Sunday in the browser's timezone.
export const newStreamingService = (): StreamingServiceInterface => {
  const serviceTime = getNextSunday();
  serviceTime.setTime(serviceTime.getTime() + (9 * 60 * 60 * 1000));
  return { churchId: UserHelper.currentUserChurch.church.id, serviceTime, chatBefore: 600, chatAfter: 600, duration: 3600, earlyStart: 600, provider: "youtube_live", providerKey: "", recurring: false, timezoneOffset: new Date().getTimezoneOffset(), videoUrl: "", label: Locale.label("sermons.liveStreamTimes.servicesTab.defaultLabel"), sermonId: "latest" };
};

interface Props {
  current: StreamingServiceInterface | null;
  onEdit: (service: StreamingServiceInterface | null) => void;
}

export const Services: React.FC<Props> = ({ current, onEdit }) => {
  const [services, setServices] = React.useState<StreamingServiceInterface[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadData = () => {
    ApiHelper.get("/streamingServices", "ContentApi").then((data: any) => {
      data.forEach((s: StreamingServiceInterface) => {
        s.serviceTime = new Date(Date.parse(s.serviceTime!.toString()));
        s.serviceTime.setMinutes(s.serviceTime.getMinutes() + s.timezoneOffset);
      });
      setServices(data);
      setIsLoading(false);
    });
  };

  React.useEffect(() => { loadData(); }, []);

  if (current !== null) return <ServiceEdit currentService={current} updatedFunction={() => { onEdit(null); loadData(); }} />;

  const minutes = (seconds?: number) => (seconds ? Math.round(seconds / 60) + " min" : "—");

  return (
    <Surface id="servicesBox" data-testid="services-display-box">
      {isLoading ? <Loading /> : services.length === 0
        ? <Typography color="text.secondary">{Locale.label("sermons.liveStreamTimes.servicesTab.none", "No services yet. Add one to schedule your live stream.")}</Typography>
        : (
          <Box sx={tableScrollSx} role="region" aria-label={Locale.label("sermons.liveStreamTimes.servicesTab.title")} tabIndex={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{Locale.label("sermons.liveStreamTimes.servicesTab.service", "Service")}</TableCell>
                  <TableCell>{Locale.label("sermons.liveStreamTimes.servicesTab.time", "Time")}</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{Locale.label("sermons.liveStreamTimes.servicesTab.provider", "Provider")}</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{Locale.label("sermons.liveStreamTimes.servicesTab.duration", "Duration")}</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id} hover>
                    <TableCell>
                      <Typography variant="body2" component="p" sx={{ fontWeight: 600, display: "inline", mr: 1 }}>{service.label}</Typography>
                      {!!service.recurring && <StatusBadge tone="success">{Locale.label("sermons.liveStreamTimes.servicesTab.weekly")}</StatusBadge>}
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>{DateHelper.prettyDateTime(service.serviceTime as Date)}</TableCell>
                    <TableCell sx={{ color: "text.secondary", display: { xs: "none", md: "table-cell" } }}>{providerNames[service.provider || ""] || service.provider}</TableCell>
                    <TableCell sx={{ color: "text.secondary", display: { xs: "none", md: "table-cell" } }}>{minutes(service.duration)}</TableCell>
                    <TableCell align="right" className="rowActions">
                      <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} onClick={() => onEdit(service)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
    </Surface>
  );
};
