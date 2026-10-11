import React, { useEffect } from "react";
import { Button, Checkbox, FormControlLabel } from "@mui/material";
import { type GroupInterface } from "@churchapps/helpers";
import { ApiHelper, Locale } from "@churchapps/apphelper";

interface Props {
  group: GroupInterface;
  onUpdate: (array: string[]) => void;
}

export const GroupLabelsEdit: React.FC<Props> = (props) => {
  const [allLabels, setAllLabels] = React.useState<string[]>(["Small Group", "Sunday School Class"]);
  const groupLabels = props.group?.labelArray || [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.currentTarget.name;
    const updatedLabels = [...groupLabels];
    const idx = updatedLabels.indexOf(val);
    if (idx === -1) {
      updatedLabels.push(val);
    } else {
      updatedLabels.splice(idx, 1);
    }
    props.onUpdate(updatedLabels);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    const newLabel = prompt(Locale.label("groups.groupLabelsEdit.newLabelPrompt"));
    if (newLabel) {
      const val = newLabel.trim();
      if (val.length > 0) {
        const idx = allLabels.indexOf(val);
        if (idx === -1) {
          const updatedAllLabels = [...allLabels, val].sort();
          setAllLabels(updatedAllLabels);
          const updatedGroupLabels = [...groupLabels, val];
          props.onUpdate(updatedGroupLabels);
        }
      }
    }
  };

  const loadData = () => {
    ApiHelper.get("/groups", "MembershipApi").then((groups: any) => {
      const result: string[] = [];
      groups.forEach((group: GroupInterface) => {
        (group.labelArray || []).forEach((label) => {
          if (label && label.trim() !== "" && !result.includes(label)) {
            result.push(label);
          }
        });
      });
      setAllLabels(result.sort());
    });
  };

  useEffect(loadData, []);

  const getLabelCheck = (key: string) => {
    const isChecked = groupLabels.includes(key);
    return (
      <FormControlLabel
        key={key}
        control={<Checkbox name={key} checked={isChecked} onChange={handleChange} data-testid={`label-checkbox-${key.toLowerCase().replace(/\s+/g, "-")}`} aria-label={`Label ${key}`} />}
        label={key}
      />
    );
  };

  const getItems = () => allLabels.map((key) => getLabelCheck(key));

  return (
    <>
      <div style={{ marginTop: 10 }}>{Locale.label("groups.groupLabelsEdit.labels")}</div>
      {getItems()}
      <Button type="button" size="small" onClick={handleAdd} data-testid="add-new-label-link" aria-label={Locale.label("groups.groupLabelsEdit.addNewLabelAria")}>
        {Locale.label("groups.groupLabelsEdit.addNewLabel")}
      </Button>
    </>
  );
};
