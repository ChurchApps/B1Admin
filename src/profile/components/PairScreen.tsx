import { Alert, TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";

interface Props {
  updatedFunction: () => void;
}

type AnyRecord = Record<string, any>;

export const PairScreen = (props: Props) => {
  const { register, handleSubmit, setError, formState } = useForm<AnyRecord>({ defaultValues: { code: "" } });
  const e = formState.errors as any;
  const summaryErrors: string[] = [];
  if (e.code?.message) summaryErrors.push(e.code.message);

  const onValid = (values: AnyRecord) => {
    ApiHelper.get("/devices/pair/" + values.code, "MessagingApi").then((data: any) => {
      if (data.success) props.updatedFunction();
      else setError("code", { message: Locale.label("profile.pairScreen.invalidCode") });
    });
  };

  return (
    <>
      <FormCard title={Locale.label("profile.devices.addScreen")} icon="tv" onSave={handleSubmit(onValid)} onCancel={props.updatedFunction}>
        {summaryErrors.length > 0 && <Alert severity="error" sx={{ mb: 2 }}>{summaryErrors.map((msg) => <div key={msg}>{msg}</div>)}</Alert>}
        <TextField fullWidth label={Locale.label("profile.pairScreen.pairingCode")} id="code" type="text" placeholder={Locale.label("placeholders.pairScreen.code")} error={!!e.code} helperText={e.code?.message} {...register("code", { required: Locale.label("profile.pairScreen.codeRequired") })} />
      </FormCard>
    </>
  );
};
