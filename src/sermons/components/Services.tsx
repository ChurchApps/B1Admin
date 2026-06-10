import { Button, Typography, Stack, Chip } from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, VideoCall as VideoCallIcon } from "@mui/icons-material";
import React from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { DateHelper } from "@churchapps/apphelper";
import { UserHelper } from "@churchapps/apphelper";
import { DisplayBox } from "@churchapps/apphelper";
import type { StreamingServiceInterface } from "@churchapps/helpers";
import { ServiceEdit } from "./ServiceEdit";
import { TableList } from "./TableList";
import { AppIconButton } from "../../components/ui/AppIconButton";

export const Services: React.FC = () => {
  const [services, setServices] = React.useState<StreamingServiceInterface[]>([]);
  const [currentService, setCurrentService] = React.useState<StreamingServiceInterface>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const handleUpdated = () => { setCurrentService(null); loadData(); };
  const getEditContent = () => (
    <Button
      variant="outlined"
      startIcon={<AddIcon />}
      onClick={handleAdd}
      data-testid="add-service-button"
      sx={{
        textTransform: "none",
        fontWeight: 600
      }}
    >
      {Locale.label("sermons.liveStreamTimes.servicesTab.addService")}
    </Button>
  );
  const loadData = () => {
    ApiHelper.get("/streamingServices", "ContentApi").then((data: any) => {
      data.forEach((s: StreamingServiceInterface) => {
        s.serviceTime = new Date(Date.parse(s.serviceTime.toString()));
        s.serviceTime.setMinutes(s.serviceTime.getMinutes() + s.timezoneOffset);
      });
      setServices(data);
      setIsLoading(false);
    });
  };

  const handleAdd = () => {
    const tz = new Date().getTimezoneOffset();
    const defaultDate = getNextSunday();
    defaultDate.setTime(defaultDate.getTime() + (9 * 60 * 60 * 1000));

    const link: StreamingServiceInterface = { churchId: UserHelper.currentUserChurch.church.id, serviceTime: defaultDate, chatBefore: 600, chatAfter: 600, duration: 3600, earlyStart: 600, provider: "youtube_live", providerKey: "", recurring: false, timezoneOffset: tz, videoUrl: "", label: Locale.label("sermons.liveStreamTimes.servicesTab.defaultLabel"), sermonId: "latest" };
    setCurrentService(link);
    loadData();
  };

  const getNextSunday = () => {
    const result = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    while (result.getDay() !== 0) result.setDate(result.getDate() + 1);
    return result;
  };

  const getRows = () => {
    const rows: React.ReactElement[] = [];
    services.forEach(service => {
      rows.push(
        <tr key={service.id}>
          <td>
            <Stack direction="row" spacing={1} alignItems="center">
              <VideoCallIcon sx={{ fontSize: 20, color: "primary.main" }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {service.label}
              </Typography>
              {service.recurring && (
                <Chip
                  label={Locale.label("sermons.liveStreamTimes.servicesTab.weekly")}
                  size="small"
                  sx={{ backgroundColor: "rgba(46, 125, 50, 0.08)", color: "success.main" }}
                />
              )}
            </Stack>
          </td>
          <td>
            <Typography variant="body2" color="text.secondary">
              {DateHelper.prettyDateTime(service.serviceTime)}
            </Typography>
          </td>
          <td style={{ textAlign: "right" }} className="rowActions">
            <AppIconButton
              label={Locale.label("common.edit")}
              icon={<EditIcon />}
              onClick={() => setCurrentService(service)}
            />
          </td>
        </tr>
      );
    });
    return rows;
  };

  const getTable = () => (<TableList rows={getRows()} isLoading={isLoading} />);

  React.useEffect(() => { loadData(); }, []);

  if (currentService !== null) return <ServiceEdit currentService={currentService} updatedFunction={handleUpdated} />;
  else {
    return (
      <DisplayBox headerIcon="calendar_month" headerText={Locale.label("sermons.liveStreamTimes.servicesTab.title")} editContent={getEditContent()} id="servicesBox" data-testid="services-display-box">
        {getTable()}
      </DisplayBox>
    );
  }

};
