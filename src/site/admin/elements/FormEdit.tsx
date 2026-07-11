import { useEffect, useState } from "react";
import type { SelectChangeEvent } from "@mui/material";
import { FormControl, InputLabel, Select, MenuItem, Typography, Link } from "@mui/material";
import { Loading, ApiHelper, Locale } from "@churchapps/apphelper";
import type { FormInterface } from "@churchapps/helpers";
import { EnvironmentHelper } from "../../../helpers/EnvironmentHelper";

type Props = {
  parsedData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<string>) => void;
};

export const FormEdit = ({ parsedData, handleChange }: Props) => {
  const [forms, setForms] = useState<FormInterface[] | null>(null);

  useEffect(() => {
    ApiHelper.get("/forms", "MembershipApi").then((data: any) => setForms(data));
  }, []);

  const standaloneForms = forms?.filter((form) => form.contentType === "form");

  if (!standaloneForms) {
    return <Loading />;
  }

  if (standaloneForms?.length === 0) {
    return (
      <Typography fontSize="15px" fontStyle="italic" align="center">
        {Locale.label("site.formEdit.noFormsAvailable")}
        <br />
        <Link href={`${EnvironmentHelper.Common.B1AdminRoot}/forms`} target="_blank" rel="noreferrer">{Locale.label("site.formEdit.createNewForm")}</Link>
      </Typography>
    );
  }

  return (
    <>
      <FormControl fullWidth>
        <InputLabel>{Locale.label("site.formEdit.select")}</InputLabel>
        <Select fullWidth size="small" label={Locale.label("site.formEdit.select")} name="formId" onChange={handleChange} value={parsedData.formId || ""}>
          {standaloneForms?.map((form: FormInterface) => (<MenuItem value={form.id}>{form.name}</MenuItem>))}
        </Select>
      </FormControl>
    </>
  );
};
