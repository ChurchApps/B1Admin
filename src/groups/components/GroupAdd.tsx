import { TextField } from "@mui/material";
import React from "react";
import { useForm, Controller, useFormState } from "react-hook-form";
import { type GroupInterface, type GroupMemberInterface } from "@churchapps/helpers";
import { ApiHelper, InputBox, ErrorMessages, Locale } from "@churchapps/apphelper";
import { CategorySelect } from "./CategorySelect";
import UserContext from "../../UserContext";

type AnyRecord = Record<string, any>;

interface Props {
  updatedFunction: () => void;
  tags: string;
  categoryName?: string;
}

export const GroupAdd: React.FC<Props> = (props) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const context = React.useContext(UserContext);

  const { control, register, handleSubmit } = useForm<AnyRecord>({ defaultValues: { categoryName: props.categoryName || "", name: "" } });

  const { errors } = useFormState({ control });
  const e = errors as any;

  const summaryErrors: string[] = React.useMemo(() => {
    const errs: string[] = [];
    if (e.categoryName?.message) errs.push(e.categoryName.message);
    if (e.name?.message) errs.push(e.name.message);
    return errs;
  }, [errors]);

  const handleCancel = () => {
    props.updatedFunction();
  };

  const onValid = async (values: AnyRecord) => {
    setIsSubmitting(true);
    try {
      const group: GroupInterface = { categoryName: values.categoryName, name: values.name, tags: props.tags };
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
  };

  let label = Locale.label("groups.groupAdd.group");
  if (props.tags === "team") label = Locale.label("groups.groupAdd.team");
  else if (props.tags === "ministry") label = Locale.label("groups.groupAdd.ministry");

  return (
    <InputBox headerText={Locale.label("groups.groupAdd.new") + label} headerIcon="group" cancelFunction={handleCancel} saveFunction={handleSubmit(onValid)} saveText={Locale.label("groups.groupAdd.add")} isSubmitting={isSubmitting}>
      <ErrorMessages errors={summaryErrors} />
      {props.tags === "standard" && (
        <Controller name="categoryName" control={control} rules={{ required: Locale.label("groups.groupAdd.catReq") }} render={({ field }) => (
          <CategorySelect
            value={field.value}
            onChange={field.onChange}
            label={Locale.label("groups.groupAdd.catName")}
            tags={props.tags}
            testId="add-category-name"
          />
        )} />
      )}
      <TextField fullWidth={true} label={Locale.label("common.name")} type="text" id="groupName" placeholder={Locale.label("placeholders.group.name")} data-testid="add-group-name-input" aria-label={Locale.label("groups.groupAdd.groupNameAria")} error={!!e.name} helperText={e.name?.message} {...register("name", { required: Locale.label("groups.groupAdd.groupReq") })} />
    </InputBox>
  );
};
