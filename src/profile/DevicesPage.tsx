import { TableHead, Table, TableCell, TableRow, TableBody, Typography, Box, Button } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ErrorMessages, DateHelper, Locale, UserHelper } from "@churchapps/apphelper";
import { PairScreen } from "./components/PairScreen";
import { DeviceEdit } from "./components/DeviceEdit";
import { BackVerb, PageContainer, RecordHeading, RecordLayout, TextAction, VerbRow, tableScrollSx } from "../components/ui";

export interface DeviceInterface {
  id: string;
  appName: string;
  deviceId: string;
  personId: string;
  fcmToken: string;
  label: string;
  registrationDate: Date;
  lastActiveDate: Date;
  deviceInfo: string;
}

export const DevicesPage = () => {
  const [errors] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editDevice, setEditDevice] = useState<DeviceInterface | null>(null);

  const devices = useQuery<DeviceInterface[]>({
    queryKey: ["/devices/my", "MessagingApi"],
    placeholderData: [],
    select: (data) => (data || []).filter((d: DeviceInterface) => d.appName === "ChurchAppsPlayer" || d.appName === "FreePlay")
  });

  const displayName = [UserHelper.user?.firstName, UserHelper.user?.lastName].filter(Boolean).join(" ") || Locale.label("profile.profilePage.profEdit");
  const devicesLabel = Locale.label("profile.devices.title");
  const backToList = () => { setShowAdd(false); setEditDevice(null); };
  const done = () => { backToList(); devices.refetch(); };

  const identity = (
    <Box component="aside" data-testid="profile-identity">
      <Typography id="page-header-title" variant="h1" component="h1" sx={{ overflowWrap: "anywhere" }}>{displayName}</Typography>
      {UserHelper.user?.email && <Typography color="text.secondary" sx={{ mt: 0.5, overflowWrap: "anywhere" }}>{UserHelper.user.email}</Typography>}
      <VerbRow sx={{ mt: 2 }}>
        <TextAction to="/profile" component={Link} data-testid="devices-profile-link">{Locale.label("helpers.secondaryMenuHelper.profile")}</TextAction>
      </VerbRow>
    </Box>
  );

  const list = (
    <Box id="mainContent">
      <ErrorMessages errors={errors} />
      <RecordHeading label={devicesLabel}>
        <Box sx={{ ml: "auto !important" }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowAdd(true)} data-testid="add-device-button">{Locale.label("profile.devices.addScreen")}</Button>
        </Box>
      </RecordHeading>
      <Box sx={tableScrollSx} role="region" aria-label={devicesLabel} tabIndex={0}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{Locale.label("profile.devices.label")}</TableCell>
              <TableCell>{Locale.label("profile.devices.registrationDate")}</TableCell>
              <TableCell>{Locale.label("profile.devices.lastActiveDate")}</TableCell>
              <TableCell align="right"></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(devices.data || []).length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography color="text.secondary">{Locale.label("profile.devices.emptyTitle")}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{Locale.label("profile.devices.emptyDescription")}</Typography>
                </TableCell>
              </TableRow>
            )}
            {(devices.data || []).map((device) => (
              <TableRow key={device.id}>
                <TableCell>{device.label || Locale.label("profile.devices.device")}</TableCell>
                <TableCell>{DateHelper.toDate(device.registrationDate).toLocaleDateString(DateHelper.locale)}</TableCell>
                <TableCell>{DateHelper.toDate(device.lastActiveDate).toLocaleDateString(DateHelper.locale)}</TableCell>
                <TableCell align="right" className="rowActions">
                  <TextAction small onClick={() => setEditDevice(device)} data-testid={`edit-device-button-${device.id}`}>{Locale.label("common.edit")}</TextAction>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );

  const slice = showAdd
    ? <PairScreen updatedFunction={done} />
    : editDevice
      ? <DeviceEdit device={editDevice} updatedFunction={done} />
      : list;

  return (
    <PageContainer>
      <RecordLayout identity={identity} spacing={3} data-testid="devices-record">
        {(showAdd || editDevice) && <Box><BackVerb name={devicesLabel} onClick={backToList} data-testid="devices-back" /></Box>}
        {slice}
      </RecordLayout>
    </PageContainer>
  );
};
