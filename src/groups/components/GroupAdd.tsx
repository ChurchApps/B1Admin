import { TextField } from "@mui/material";
import React from "react";
import { type GroupInterface, type GroupMemberInterface } from "@churchapps/helpers";
import { ApiHelper, InputBox, ErrorMessages, Locale } from "@churchapps/apphelper";
import { CategorySelect } from "./CategorySelect";
import UserContext from "../../UserContext";

interface Props {
  updatedFunction: () => void;
  tags: string;
  categoryName?: string;
}

export const GroupAdd: React.FC<Props> = (props) => {
  const [group, setGroup] = React.useState<GroupInterface>({ categoryName: props.categoryName || "", name: "", tags: props.tags });
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const context = React.useContext(UserContext);

  const handleCancel = () => {
    props.updatedFunction();
  };

  const handleAdd = async () => {
    if (validate()) {
      setIsSubmitting(true);
      try {
        const result = await ApiHelper.post("/groups", [group], "MembershipApi");
        // Auto-add creator as member for ministries
        if (props.tags === "ministry" && result?.[0]?.id && context?.person?.id) {
          const groupMember: GroupMemberInterface = {
            groupId: result[0].id,
            personId: context.person.id
          };
          await ApiHelper.post("/groupMembers", [groupMember], "MembershipApi");
        }
      } finally {
        setIsSubmitting(false);
        props.updatedFunction();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setErrors([]);
    const g = { ...group } as GroupInterface;
    const value = e.target.value;
    switch (e.target.name) {
      case "name":
        g.name = value;
        break;
    }
    setGroup(g);
  };

  const handleCategoryChange = (value: string) => {
    setErrors([]);
    setGroup({ ...group, categoryName: value });
  };

  const validate = () => {
    const result = [];
    if (!group.categoryName) result.push(Locale.label("groups.groupAdd.catReq"));
    if (!group.name) result.push(Locale.label("groups.groupAdd.groupReq"));
    setErrors(result);
    return result.length === 0;
  };

  let label = Locale.label("groups.groupAdd.group");
  if (props.tags === "team") label = Locale.label("groups.groupAdd.team");
  else if (props.tags === "ministry") label = Locale.label("groups.groupAdd.ministry");

  return (
    <InputBox headerText={Locale.label("groups.groupAdd.new") + label} headerIcon="group" cancelFunction={handleCancel} saveFunction={handleAdd} saveText={Locale.label("groups.groupAdd.add")} isSubmitting={isSubmitting}>
      <ErrorMessages errors={errors} />
      {props.tags === "standard" && (
        <CategorySelect
          value={group.categoryName}
          onChange={handleCategoryChange}
          label={Locale.label("groups.groupAdd.catName")}
          tags={props.tags}
          testId="add-category-name"
        />
      )}
      <TextField
        fullWidth={true}
        label={Locale.label("common.name")}
        type="text"
        id="groupName"
        name="name"
        value={group.name}
        onChange={handleChange}
        placeholder={Locale.label("placeholders.group.name")}
        data-testid="add-group-name-input"
        aria-label="Group name"
      />
    </InputBox>
  );
};
