import { TableHead, Table, TableCell, TableRow, TableBody } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import React, { useState } from "react";
import { ApiHelper, ErrorMessages, DisplayBox, DateHelper, Locale, PageHeader } from "@churchapps/apphelper";
import { Box } from "@mui/material";
import { PairScreen } from "./components/PairScreen";
import { DeviceEdit } from "./components/DeviceEdit";
import { AppIconButton } from "../components/ui/AppIconButton";

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
  const [devices, setDevices] = useState<DeviceInterface[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editDevice, setEditDevice] = useState<DeviceInterface>(null);

  const loadData = () => {
    ApiHelper.get("/devices/my", "MessagingApi").then((data: any) => {
      data = data.filter((d: DeviceInterface) => d.appName === "ChurchAppsPlayer");
      setDevices(data);
    });
  };

  React.useEffect(loadData, []);

  const editContent = (
    <AppIconButton intent="add" label={Locale.label("common.add")} icon={<AddIcon />} tone="card" onClick={() => setShowAdd(true)} data-testid="add-device-button" />
  );

  return (
    <>
      <PageHeader title={Locale.label("profile.devices.title")} />
      <Box id="mainContent" sx={{ p: 3 }}>
        {showAdd && (
          <PairScreen
            updatedFunction={() => {
              setShowAdd(false);
              loadData();
            }}
          />
        )}
        {editDevice && (
          <DeviceEdit
            device={editDevice}
            updatedFunction={() => {
              setEditDevice(null);
              loadData();
            }}
          />
        )}
        <ErrorMessages errors={errors} />
        <DisplayBox headerText={Locale.label("profile.devices.title")} headerIcon="tv" editContent={editContent}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{Locale.label("profile.devices.label")}</TableCell>
                <TableCell>{Locale.label("profile.devices.registrationDate")}</TableCell>
                <TableCell>{Locale.label("profile.devices.lastActiveDate")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => setEditDevice(device)}
                      style={{ background: "none", border: 0, padding: 0, color: "var(--link)", fontWeight: 500, cursor: "pointer" }}>
                      {device.label || Locale.label("profile.devices.device")}
                    </button>
                  </TableCell>
                  <TableCell>{DateHelper.toDate(device.registrationDate).toLocaleDateString()}</TableCell>
                  <TableCell>{DateHelper.toDate(device.lastActiveDate).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DisplayBox>
      </Box>
    </>
  );
};
