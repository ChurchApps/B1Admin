import React, { useEffect } from "react";
import { FormControl, InputLabel, MenuItem, Select, TextField, type SelectChangeEvent } from "@mui/material";
import { type GroupInterface, type PositionInterface } from "@churchapps/helpers";
import { ApiHelper, ErrorMessages, InputBox, Locale } from "@churchapps/apphelper";
import ReactSelect from "react-select";

interface Props {
  position: PositionInterface;
  categoryNames: string[];
  updatedFunction: () => void;
}

type OptionType = {
  value: string;
  label: string;
};

export const PositionEdit = (props: Props) => {
  const options: OptionType[] = [];
  props.categoryNames.forEach((categoryName) => options.push({ value: categoryName, label: categoryName }));

  const [position, setPosition] = React.useState<PositionInterface>(props.position);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [categoryInput, setCategoryInput] = React.useState("");
  const [categoryOptions, setCategoryOptions] = React.useState<OptionType[]>(options);
  const [groups, setGroups] = React.useState<GroupInterface[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    setErrors([]);
    const p = { ...position } as PositionInterface;
    const value = e.target.value;
    switch (e.target.name) {
      case "categoryName":
        p.categoryName = value;
        break;
      case "name":
        p.name = value;
        break;
      case "count":
        p.count = parseInt(value);
        break;
      case "groupId":
        p.groupId = value;
        break;
    }
    setPosition(p);
  };

  const handleSave = () => {
    const errors: string[] = [];
    if (!position.categoryName) errors.push(Locale.label("plans.positionEdit.catNameReq"));
    if (!position.name) errors.push(Locale.label("plans.positionEdit.nameReq"));
    setErrors(errors);
    if (errors.length === 0) ApiHelper.post("/positions", [position], "DoingApi").then(props.updatedFunction);
  };

  const handleDelete = () => {
    ApiHelper.delete("/positions/" + position.id, "DoingApi").then(props.updatedFunction);
  };

  const categoryOption = position?.categoryName === "" && categoryOptions.length > 0 ? categoryOptions[0] : { value: position.categoryName, label: position.categoryName };

  const handleCategoryChange = (newValue: { label: string; value: string }) => {
    const p: PositionInterface = { ...position };
    p.categoryName = newValue.value;
    setCategoryInput("");
    setPosition(p);
  };

  const handleCategoryBlur = () => {
    if (categoryInput) {
      const options = [...categoryOptions];
      options.push({ value: categoryInput, label: categoryInput });
      const p: PositionInterface = { ...position };
      p.categoryName = categoryInput;
      setCategoryOptions(options);
      setPosition(p);
    }
  };

  const getGroupOptions = () => {
    const options = [];
    for (let i = 0; i < groups.length; i++) {
      options.push(
        <MenuItem key={i} value={groups[i].id}>
          {groups[i].name}
        </MenuItem>
      );
    }
    return options;
  };

  const loadData = () => {
    ApiHelper.get("/groups/tag/team", "MembershipApi").then((data) => setGroups(data));
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <>
      <ErrorMessages errors={errors} />
      <InputBox
        headerText={props.position?.id ? Locale.label("plans.positionEdit.posEdit") : Locale.label("plans.positionEdit.posAdd")}
        headerIcon="assignment"
        saveFunction={handleSave}
        cancelFunction={props.updatedFunction}
        deleteFunction={position.id ? handleDelete : null}>
        <FormControl fullWidth>
          <div
            style={{
              fontSize: 12,
              color: "#999",
              position: "absolute",
              top: -8,
              left: 10,
              backgroundColor: "#FFF",
              zIndex: 999,
            }}>
            {Locale.label("plans.positionEdit.catName")}
          </div>
          <ReactSelect
            onInputChange={(newValue: string) => {
              setCategoryInput(newValue);
            }}
            value={categoryOption}
            onChange={handleCategoryChange}
            options={categoryOptions}
            onBlur={handleCategoryBlur}
            className="comboBox"
          />
        </FormControl>
        <TextField fullWidth label={Locale.label("common.name")} id="name" name="name" type="text" value={position.name} onChange={handleChange} />
        <TextField fullWidth label={Locale.label("plans.positionEdit.volCount")} id="count" name="count" type="number" value={position.count} onChange={handleChange} />
        <FormControl fullWidth>
          <InputLabel>{Locale.label("plans.positionEdit.volGroup")}</InputLabel>
          <Select name="groupId" label={Locale.label("plans.positionEdit.volGroup")} value={position.groupId} onChange={handleChange}>
            {getGroupOptions()}
          </Select>
        </FormControl>
      </InputBox>
    </>
  );
};
