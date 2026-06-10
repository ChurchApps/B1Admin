import React, { useEffect } from "react";
import { useForm, Controller, useFormState } from "react-hook-form";
import { Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import { type GroupInterface, type PositionInterface } from "@churchapps/helpers";
import { ApiHelper, ErrorMessages, InputBox, Locale } from "@churchapps/apphelper";
import ReactSelect from "react-select";

interface Props {
  position: PositionInterface;
  categoryNames: string[];
  updatedFunction: () => void;
}

type AnyRecord = Record<string, any>;

type OptionType = {
  value: string;
  label: string;
};

export const PositionEdit = (props: Props) => {
  const initialOptions: OptionType[] = props.categoryNames.map((n) => ({ value: n, label: n }));

  const [categoryOptions, setCategoryOptions] = React.useState<OptionType[]>(initialOptions);
  const [categoryInput, setCategoryInput] = React.useState("");
  const [allowSelfSignup, setAllowSelfSignup] = React.useState<boolean>(props.position?.allowSelfSignup ?? false);
  const [groups, setGroups] = React.useState<GroupInterface[]>([]);

  const { control, register, handleSubmit, setValue, watch } = useForm<AnyRecord>({
    defaultValues: {
      categoryName: props.position?.categoryName ?? "",
      name: props.position?.name ?? "",
      count: props.position?.count ?? 0,
      groupId: props.position?.groupId ?? "",
      description: props.position?.description ?? ""
    }
  });

  const { errors } = useFormState({ control });
  const e = errors as any;

  const summaryErrors: string[] = React.useMemo(() => {
    const errs: string[] = [];
    if (e.categoryName?.message) errs.push(e.categoryName.message);
    if (e.name?.message) errs.push(e.name.message);
    return errs;
  }, [errors]);

  const watchedCategory = watch("categoryName");
  const categoryOption = !watchedCategory && categoryOptions.length > 0
    ? categoryOptions[0]
    : { value: watchedCategory, label: watchedCategory };

  const handleCategoryChange = (newValue: { label: string; value: string }) => {
    setValue("categoryName", newValue.value, { shouldValidate: true });
    setCategoryInput("");
  };

  const handleCategoryBlur = () => {
    if (categoryInput) {
      const opts = [...categoryOptions, { value: categoryInput, label: categoryInput }];
      setCategoryOptions(opts);
      setValue("categoryName", categoryInput, { shouldValidate: true });
    }
  };

  const getGroupOptions = () => {
    return groups.map((g, i) => (
      <MenuItem key={i} value={g.id}>{g.name}</MenuItem>
    ));
  };

  const onValid = (values: AnyRecord) => {
    const p: PositionInterface = {
      ...props.position,
      categoryName: values.categoryName,
      name: values.name,
      count: parseInt(values.count),
      groupId: values.groupId,
      description: values.description,
      allowSelfSignup
    };
    ApiHelper.post("/positions", [p], "DoingApi").then(props.updatedFunction);
  };

  const handleDelete = () => {
    ApiHelper.delete("/positions/" + props.position.id, "DoingApi").then(props.updatedFunction);
  };

  useEffect(() => {
    ApiHelper.get("/groups/tag/team", "MembershipApi").then((data: any) => setGroups(data));
  }, []);

  return (
    <>
      <ErrorMessages errors={summaryErrors} />
      <InputBox
        headerText={props.position?.id ? Locale.label("plans.positionEdit.posEdit") : Locale.label("plans.positionEdit.posAdd")}
        headerIcon="assignment"
        saveFunction={handleSubmit(onValid)}
        cancelFunction={props.updatedFunction}
        deleteFunction={props.position?.id ? handleDelete : null}>
        <FormControl fullWidth>
          <div style={{ fontSize: 12, color: "var(--text-muted)", position: "absolute", top: -8, left: 10, backgroundColor: "var(--bg-card)", zIndex: 999 }}>
            {Locale.label("plans.positionEdit.catName")}
          </div>
          <Controller name="categoryName" control={control} rules={{ required: Locale.label("plans.positionEdit.catNameReq") }} render={() => (
            <ReactSelect onInputChange={(v: string) => setCategoryInput(v)} value={categoryOption} onChange={handleCategoryChange} options={categoryOptions} onBlur={handleCategoryBlur} className="comboBox" />
          )} />
        </FormControl>
        <TextField fullWidth label={Locale.label("common.name")} id="name" type="text" placeholder={Locale.label("placeholders.position.name")} error={!!e.name} helperText={e.name?.message} {...register("name", { required: Locale.label("plans.positionEdit.nameReq") })} />
        <TextField fullWidth label={Locale.label("plans.positionEdit.volCount")} id="count" type="number" placeholder={Locale.label("placeholders.position.count")} {...register("count")} />
        <FormControl fullWidth>
          <InputLabel>{Locale.label("plans.positionEdit.volGroup")}</InputLabel>
          <Controller name="groupId" control={control} render={({ field }) => (
            <Select {...field} value={field.value ?? ""} label={Locale.label("plans.positionEdit.volGroup")}>
              {getGroupOptions()}
            </Select>
          )} />
        </FormControl>
        <FormControlLabel
          control={<Checkbox checked={allowSelfSignup} onChange={(ev) => setAllowSelfSignup(ev.target.checked)} />}
          label={Locale.label("plans.positionEdit.allowSelfSignup")}
        />
        <TextField fullWidth label={Locale.label("plans.positionEdit.description")} id="description" type="text" multiline rows={2} placeholder="" helperText={Locale.label("plans.positionEdit.descriptionHelper")} {...register("description")} />
      </InputBox>
    </>
  );
};
