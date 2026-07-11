import { TableHead, Table, TableCell, TableRow, TableBody } from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, Devices as DevicesIcon } from "@mui/icons-material";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ErrorMessages, DisplayBox, DateHelper, Locale, PageHeader } from "@churchapps/apphelper";
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
  const [showAdd, setShowAdd] = useState(false);
  const [editDevice, setEditDevice] = useState<DeviceInterface | null>(null);

  const devices = useQuery<DeviceInterface[]>({
    queryKey: ["/devices/my", "MessagingApi"],
    placeholderData: [],
    select: (data) => (data || []).filter((d: DeviceInterface) => d.appName === "ChurchAppsPlayer")
  });

  const editContent = (
    <AppIconButton intent="add" label={Locale.label("common.add")} icon={<AddIcon />} tone="card" onClick={() => setShowAdd(true)} data-testid="add-device-button" />
  );

  return (
    <>
      <PageHeader icon={<DevicesIcon />} title={Locale.label("profile.devices.title")} />
      <Box id="mainContent" sx={{ p: 3 }}>
        {showAdd && (
          <PairScreen
            updatedFunction={() => {
              setShowAdd(false);
              devices.refetch();
            }}
          />
        )}
        {editDevice && (
          <DeviceEdit
            device={editDevice}
            updatedFunction={() => {
              setEditDevice(null);
              devices.refetch();
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
                <TableCell align="right"></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(devices.data || []).map((device) => (
                <TableRow key={device.id}>
                  <TableCell>{device.label || Locale.label("profile.devices.device")}</TableCell>
                  <TableCell>{DateHelper.toDate(device.registrationDate).toLocaleDateString()}</TableCell>
                  <TableCell>{DateHelper.toDate(device.lastActiveDate).toLocaleDateString()}</TableCell>
                  <TableCell align="right" className="rowActions">
                    <AppIconButton
                      label={Locale.label("common.edit")}
                      icon={<EditIcon />}
                      onClick={() => setEditDevice(device)}
                      data-testid={`edit-device-button-${device.id}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DisplayBox>
      </Box>
    </>
  );
};
