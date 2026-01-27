import React from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type GroupInterface } from "@churchapps/helpers";
import { ComboBox } from "../../components";

interface Props {
  value: string;
  onChange: (value: string) => void;
  label: string;
  tags?: string;
  testId?: string;
  placeholder?: string;
}

export const CategorySelect: React.FC<Props> = (props) => {
  const [categories, setCategories] = React.useState<string[]>([]);

  const loadCategories = () => {
    const tags = props.tags || "standard";
    ApiHelper.get("/groups/tag/" + tags, "MembershipApi").then((data: GroupInterface[]) => {
      const uniqueCategories = Array.from(new Set(data.map((g) => g.categoryName).filter((c) => c)));
      setCategories(uniqueCategories);
    });
  };

  React.useEffect(() => {
    loadCategories();
  }, [props.tags]);

  return (
    <ComboBox
      value={props.value}
      onChange={props.onChange}
      label={props.label}
      options={categories}
      testId={props.testId}
      placeholder={props.placeholder || Locale.label("placeholders.group.category")}
    />
  );
};
