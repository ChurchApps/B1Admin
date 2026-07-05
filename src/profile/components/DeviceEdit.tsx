import { useEffect } from "react";
import { Alert, TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import { useErrorSummary } from "../../hooks";
import { type DeviceInterface } from "../DevicesPage";
import { DeviceContent } from "./DeviceContent";

interface Props {
  device: DeviceInterface;
  updatedFunction: () => void;
}

type AnyRecord = Record<string, any>;

export const DeviceEdit = (props: Props) => {
  "use no memo"; // compiler caches register() results, breaking RHF field re-registration after reset()
  const { register, handleSubmit, reset, formState } = useForm<AnyRecord>({ defaultValues: { label: "" } });
  const e = formState.errors as any;
  const summaryErrors = useErrorSummary(formState.errors, ["label"]);

  useEffect(() => {
    reset({ ...props.device });
  }, [props.device, reset]);

  const onValid = (values: AnyRecord) => {
    const device = { ...props.device, ...values };
    ApiHelper.post("/devices", [device], "MessagingApi").then(() => { props.updatedFunction(); });
  };

  return (
    <>
      <FormCard title={Locale.label("profile.devices.editDevice")} icon="tv" onSave={handleSubmit(onValid)} onCancel={props.updatedFunction}>
        {summaryErrors.length > 0 && <Alert severity="error" sx={{ mb: 2 }}>{summaryErrors.map((msg) => <div key={msg}>{msg}</div>)}</Alert>}
        <TextField fullWidth label={Locale.label("profile.deviceEdit.label")} type="text" placeholder={Locale.label("placeholders.device.label")} error={!!e.label} helperText={e.label?.message} {...register("label", { required: Locale.label("profile.deviceEdit.labelRequired") })} />
        <DeviceContent device={props.device} />
      </FormCard>
    </>
  );
};
