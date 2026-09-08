import { TableHead, Table, TableCell, TableRow, TableBody, Typography, Box } from "@mui/material";
import { Devices as DevicesIcon } from "@mui/icons-material";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ErrorMessages, DateHelper, Locale, UserHelper } from "@churchapps/apphelper";
import { PairScreen } from "./components/PairScreen";
import { DeviceEdit } from "./components/DeviceEdit";
import { EmptyState } from "../components/ui";
import { AddBlock, PlatedRecord, SectionLabel, Verb, plainTableSx } from "./components/plate";

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

  const firstName = UserHelper.user?.firstName || "";
  const lastName = UserHelper.user?.lastName || "";
  const email = UserHelper.user?.email || "";
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || Locale.label("profile.profilePage.profEdit");

  const slice = showAdd ? (
    <PairScreen
      updatedFunction={() => {
        setShowAdd(false);
        devices.refetch();
      }}
    />
  ) : editDevice ? (
    <DeviceEdit
      device={editDevice}
      updatedFunction={() => {
        setEditDevice(null);
        devices.refetch();
      }}
    />
  ) : (
    <Box id="mainContent">
      <ErrorMessages errors={errors} />
      <SectionLabel>{Locale.label("profile.devices.title")}</SectionLabel>
      <Table sx={plainTableSx}>
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
              <EmptyState
                variant="table"
                colSpan={4}
                icon={<DevicesIcon />}
                title={Locale.label("profile.devices.emptyTitle")}
                description={Locale.label("profile.devices.emptyDescription")}
              />
            </TableRow>
          )}
          {(devices.data || []).map((device) => (
            <TableRow key={device.id}>
              <TableCell>{device.label || Locale.label("profile.devices.device")}</TableCell>
              <TableCell>{DateHelper.toDate(device.registrationDate).toLocaleDateString()}</TableCell>
              <TableCell>{DateHelper.toDate(device.lastActiveDate).toLocaleDateString()}</TableCell>
              <TableCell align="right" className="rowActions">
                <Verb onClick={() => setEditDevice(device)} testId={`edit-device-button-${device.id}`}>{Locale.label("common.edit")}</Verb>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <AddBlock title={Locale.label("profile.devices.addScreen")}>
        <Verb onClick={() => setShowAdd(true)} testId="add-device-button">{Locale.label("common.add")}</Verb>
      </AddBlock>
    </Box>
  );

  return (
    <PlatedRecord
      identity={(
        <>
          <Typography id="page-header-title" component="h1" sx={{ fontSize: { xs: "1.8rem", sm: "2.4rem" }, fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
            {displayName}
          </Typography>
          <Typography id="page-header-subtitle" sx={{ color: "text.secondary", mt: 1, mb: 2 }}>{email}</Typography>
          <Box sx={{ display: "flex", gap: 1.75, flexWrap: "wrap" }}>
            <Verb to="/profile">{Locale.label("helpers.secondaryMenuHelper.profile")}</Verb>
            <Verb onClick={() => { setShowAdd(false); setEditDevice(null); }}>{Locale.label("helpers.secondaryMenuHelper.devices")}</Verb>
            <Verb onClick={() => { setEditDevice(null); setShowAdd(true); }} testId="add-device-button-header">{Locale.label("common.add")}</Verb>
          </Box>
        </>
      )}
      slice={slice}
    />
  );
};
