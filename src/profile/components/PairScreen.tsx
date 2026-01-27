import React from "react";
import { TextField } from "@mui/material";
import { ApiHelper, ErrorMessages, InputBox, Locale } from "@churchapps/apphelper";

interface Props {
  updatedFunction: () => void;
}

export const PairScreen = (props: Props) => {
  const [code, setCode] = React.useState<string>("");
  const [errors, setErrors] = React.useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setErrors([]);
    const value = e.target.value;
    switch (e.target.name) {
      case "code":
        setCode(value);
        break;
    }
  };

  const validate = () => {
    const result = [];
    if (!code) result.push(Locale.label("profile.pairScreen.codeRequired"));
    setErrors(result);
    return result.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      ApiHelper.get("/devices/pair/" + code, "MessagingApi").then((data) => {
        if (data.success) props.updatedFunction();
        else setErrors([Locale.label("profile.pairScreen.invalidCode")]);
      });
    }
  };

  return (
    <>
      <ErrorMessages errors={errors} />
      <InputBox headerText={Locale.label("profile.devices.addScreen")} headerIcon="tv" saveFunction={handleSave} cancelFunction={props.updatedFunction}>
        <TextField fullWidth label={Locale.label("profile.pairScreen.pairingCode")} id="code" name="code" type="text" value={code} onChange={handleChange} placeholder={Locale.label("placeholders.pairScreen.code")} />
      </InputBox>
    </>
  );
};
