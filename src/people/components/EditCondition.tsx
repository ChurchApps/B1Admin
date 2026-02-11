import { Button, FormControl, InputLabel, MenuItem, Select, Stack, TextField, type SelectChangeEvent } from "@mui/material";
import React from "react";
import {
  type SearchCondition,
  type GroupInterface,
  type CampusInterface,
  type ServiceInterface,
  type ServiceTimeInterface
} from "@churchapps/helpers";
import {
  ApiHelper,
  Permissions,
  Loading,
  DateHelper,
  Locale
} from "@churchapps/apphelper";
import { type FundInterface } from "@churchapps/helpers";

interface Props {
  conditionAdded: (condition: any) => void;
}

export function EditCondition(props: Props) {
  const [condition, setCondition] = React.useState<SearchCondition>({ field: "displayName", operator: "equals", value: "" });
  const [loadedOptions, setLoadedOptions] = React.useState<any[]>([]);
  const [loadedOptionsField, setLoadedOptionsField] = React.useState("");
  const [loadingOptions, setLoadingOptions] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    const c = { ...condition };
    const { name, value } = e.target;

    switch (name) {
      case "field":
        c.field = value;
        c.operator = "equals";
        c.value = "";
        break;
      case "operator":
        c.operator = value;
        if (c.field === "memberDonations" || c.field === "memberAttendance") {
          c.value = "";
        }
        break;
      case "value":
        const parsedValue = (c.field === "memberAttendance" || c.field === "memberDonations") && JSON.parse(c?.value);
        c.value = e.target.value;
        if (parsedValue && Array.isArray(parsedValue)) {
          const newValue = [JSON.parse(e.target.value), parsedValue[1]];
          c.value = JSON.stringify(newValue);
        }
        break;
      case "from":
        const parsed = JSON.parse(c?.value);
        let newObj;
        if (Array.isArray(parsed)) {
          newObj = [
            { value: parsed[0].value, text: parsed[0].text },
            { from: e.target.value, to: parsed[1]?.to }
          ];
        } else {
          newObj = [
            { value: parsed.value, text: parsed.text },
            { from: e.target.value, to: parsed.to }
          ];
        }
        c.value = JSON.stringify(newObj);
        break;
      case "to":
        const parsedObj = JSON.parse(c?.value);
        let obj;
        if (Array.isArray(parsedObj)) {
          obj = [
            { value: parsedObj[0].value, text: parsedObj[0].text },
            { from: parsedObj[1]?.from, to: e.target.value }
          ];
        } else {
          obj = [
            { value: parsedObj.value, text: parsedObj.text },
            { from: parsedObj?.from, to: e.target.value }
          ];
        }
        c.value = JSON.stringify(obj);
        break;
    }
    setCondition(c);
  };

  const setDefaultValue = (val: string) => {
    if (!condition.value && val !== "") {
      const c = { ...condition };
      c.value = val;
      setCondition(c);
    }
  };

  const getValueField = () => {
    let options: JSX.Element[] = [];
    let result: JSX.Element = null;
    switch (condition.field) {
      case "gender":
        options = [
          <MenuItem key="/Unspecified" value="Unspecified">
            {Locale.label("person.unspecified")}
          </MenuItem>,
          <MenuItem value="Male">{Locale.label("person.male")}</MenuItem>,
          <MenuItem value="Female">{Locale.label("person.female")}</MenuItem>
        ];
        setDefaultValue("Unspecified");
        result = getValueSelect(options);
        break;
      case "maritalStatus":
        options = [
          <MenuItem key="/Unknown" value="Unknown">
            {Locale.label("person.unknown")}
          </MenuItem>,
          <MenuItem value="Single">{Locale.label("person.single")}</MenuItem>,
          <MenuItem value="Married">{Locale.label("person.married")}</MenuItem>,
          <MenuItem value="Divorced">{Locale.label("person.divorced")}</MenuItem>,
          <MenuItem value="Widowed">{Locale.label("person.widowed")}</MenuItem>
        ];
        setDefaultValue("Unknown");
        result = getValueSelect(options);
        break;
      case "membershipStatus":
        options = [
          <MenuItem key="/Visitor" value="Visitor">
            {Locale.label("person.visitor")}
          </MenuItem>,
          <MenuItem key="Regular Attendee" value="Regular Attendee">
            {Locale.label("person.regularAttendee")}
          </MenuItem>,
          <MenuItem value="Member">{Locale.label("person.member")}</MenuItem>,
          <MenuItem value="Staff">{Locale.label("person.staff")}</MenuItem>,
          <MenuItem key="Inactive" value="Inactive">
            {Locale.label("person.inactive")}
          </MenuItem>
        ];
        setDefaultValue("Visitor");
        result = getValueSelect(options);
        break;
      case "groupMember":
        loadedOptions.forEach((o, i) => {
          options.push(
            <MenuItem key={i} value={JSON.stringify(o)}>
              {o.text}
            </MenuItem>
          );
        });
        setDefaultValue(loadedOptions?.length > 0 ? JSON.stringify(loadedOptions[0]) : "");
        result = getValueSelect(options);
        break;
      case "birthMonth":
      case "anniversaryMonth":
        options = [
          <MenuItem key="January" value="1">
            {Locale.label("month.jan")}
          </MenuItem>,
          <MenuItem key="February" value="2">
            {Locale.label("month.feb")}
          </MenuItem>,
          <MenuItem key="March" value="3">
            {Locale.label("month.mar")}
          </MenuItem>,
          <MenuItem key="April" value="4">
            {Locale.label("month.apr")}
          </MenuItem>,
          <MenuItem key="May" value="5">
            {Locale.label("month.may")}
          </MenuItem>,
          <MenuItem key="June" value="6">
            {Locale.label("month.june")}
          </MenuItem>,
          <MenuItem key="July" value="7">
            {Locale.label("month.july")}
          </MenuItem>,
          <MenuItem key="August" value="8">
            {Locale.label("month.aug")}
          </MenuItem>,
          <MenuItem key="September" value="9">
            {Locale.label("month.sep")}
          </MenuItem>,
          <MenuItem key="October" value="10">
            {Locale.label("month.oct")}
          </MenuItem>,
          <MenuItem key="November" value="11">
            {Locale.label("month.nov")}
          </MenuItem>,
          <MenuItem key="December" value="12">
            {Locale.label("month.dec")}
          </MenuItem>
        ];
        setDefaultValue("1");
        result = getValueSelect(options);
        break;
      case "birthDate":
      case "anniversary":
        result = (
          <TextField
            fullWidth
            label={Locale.label("people.editCondition.value")}
            type="date"
            InputLabelProps={{ shrink: true }}
            style={{ marginBottom: 5 }}
            name="value"
            placeholder={Locale.label("people.editCondition.valuePlaceholder")}
            value={condition.value}
            onChange={handleChange}
          />
        );
        break;
      case "age":
      case "yearsMarried":
        result = <TextField fullWidth label={Locale.label("people.editCondition.value")} type="number" style={{ marginBottom: 5 }} name="value" placeholder={Locale.label("people.editCondition.valuePlaceholder")} value={condition.value} onChange={handleChange} />;
        break;
      case "memberDonations":
        let defaultDonationValue;
        if (condition.operator === "donatedToAny") {
          options.push(
            <MenuItem key="any" value={JSON.stringify({ value: "any", text: "Any" })}>
              {Locale.label("people.editCondition.any")}
            </MenuItem>
          );
          defaultDonationValue = JSON.stringify([
            { value: "any", text: "Any" },
            { from: DateHelper.formatHtml5Date(new Date()), to: DateHelper.formatHtml5Date(new Date()) }
          ]);
        } else {
          loadedOptions.forEach((o, i) => {
            options.push(
              <MenuItem key={i} value={JSON.stringify(o)}>
                {o.text}
              </MenuItem>
            );
          });
          defaultDonationValue = loadedOptions?.length > 0 ? JSON.stringify([loadedOptions[0], { from: DateHelper.formatHtml5Date(new Date()), to: DateHelper.formatHtml5Date(new Date()) }]) : "";
        }
        setDefaultValue(defaultDonationValue);
        result = (
          <>
            {getValueSelect(options)}
            <Stack direction="row" spacing={2} sx={{ marginTop: "16px", marginBottom: "8px" }}>
              <TextField fullWidth label={Locale.label("people.editCondition.from")} name="from" type="date" InputLabelProps={{ shrink: true }} onChange={handleChange} />
              <TextField fullWidth label={Locale.label("people.editCondition.to")} name="to" type="date" InputLabelProps={{ shrink: true }} onChange={handleChange} />
            </Stack>
          </>
        );
        break;
      case "memberAttendance":
        let defaultAttendanceValue;
        const defaultDateObj = { from: DateHelper.formatHtml5Date(new Date()), to: DateHelper.formatHtml5Date(new Date()) };
        if (condition.operator === "attendedAny") {
          options.push(
            <MenuItem key="any" value={JSON.stringify({ value: "any", text: "Any" })}>
              {Locale.label("people.editCondition.any")}
            </MenuItem>
          );
          defaultAttendanceValue = JSON.stringify([{ value: "any", text: "Any" }, defaultDateObj]);
        } else if (condition.operator === "attendedService") {
          const serviceOptions: any[] = loadedOptions.length > 0 && loadedOptions.filter((item) => "services" in item)[0]?.services;
          if (serviceOptions) {
            serviceOptions.forEach((o, i) => {
              options.push(
                <MenuItem key={i} value={JSON.stringify(o)}>
                  {o.text}
                </MenuItem>
              );
            });
          }
          defaultAttendanceValue = serviceOptions?.length > 0 ? JSON.stringify([serviceOptions[0], defaultDateObj]) : "";
        } else if (condition.operator === "attendedServiceTime") {
          const serviceTimeOptions: any[] = loadedOptions.length > 0 && loadedOptions.filter((item) => "serviceTimes" in item)[0]?.serviceTimes;
          if (serviceTimeOptions) {
            serviceTimeOptions.forEach((o, i) => {
              options.push(
                <MenuItem key={i} value={JSON.stringify(o)}>
                  {o.text}
                </MenuItem>
              );
            });
          }
          defaultAttendanceValue = serviceTimeOptions?.length > 0 ? JSON.stringify([serviceTimeOptions[0], defaultDateObj]) : "";
        } else if (condition.operator === "attendedGroup") {
          const groupOptions: any[] = loadedOptions.length > 0 && loadedOptions.filter((item) => "groups" in item)[0]?.groups;
          if (groupOptions) {
            groupOptions.forEach((o, i) => {
              options.push(
                <MenuItem key={i} value={JSON.stringify(o)}>
                  {o.text}
                </MenuItem>
              );
            });
          }
          defaultAttendanceValue = groupOptions?.length > 0 ? JSON.stringify([groupOptions[0], defaultDateObj]) : "";
        } else {
          const campusOptions: any[] = loadedOptions.length > 0 && loadedOptions.filter((item) => "campuses" in item)[0]?.campuses;
          if (campusOptions) {
            campusOptions.forEach((o, i) => {
              options.push(
                <MenuItem key={i} value={JSON.stringify(o)}>
                  {o.text}
                </MenuItem>
              );
            });
          }
          defaultAttendanceValue = campusOptions?.length > 0 ? JSON.stringify([campusOptions[0], defaultDateObj]) : "";
        }
        setDefaultValue(defaultAttendanceValue);
        result = (
          <>
            {getValueSelect(options)}
            <Stack direction="row" spacing={2} sx={{ marginTop: "16px", marginBottom: "8px" }}>
              <TextField fullWidth label={Locale.label("people.editCondition.from")} name="from" type="date" InputLabelProps={{ shrink: true }} onChange={handleChange} />
              <TextField fullWidth label={Locale.label("people.editCondition.to")} name="to" type="date" InputLabelProps={{ shrink: true }} onChange={handleChange} />
            </Stack>
          </>
        );
        break;
      default:
        result = <TextField fullWidth label={Locale.label("people.editCondition.value")} style={{ marginBottom: 5 }} name="value" type="text" placeholder={Locale.label("people.editCondition.valuePlaceholder")} value={condition.value} onChange={handleChange} />;
        break;
    }
    return result;
  };

  React.useEffect(() => {
    if (condition.field !== loadedOptionsField) {
      setLoadedOptionsField(condition.field);
      if (condition.field === "groupMember") {
        setLoadingOptions(true);
        ApiHelper.get("/groups", "MembershipApi").then((groups: GroupInterface[]) => {
          const options: any[] = [];
          groups.forEach((g) => {
            options.push({ value: g.id, text: g.name });
          });
          setLoadedOptions(options);
          setLoadingOptions(false);
        });
      }
      if (condition.field === "memberDonations") {
        setLoadingOptions(true);
        ApiHelper.get("/funds", "GivingApi").then((funds: FundInterface[]) => {
          const options: any[] = [];
          funds.forEach((f) => {
            options.push({ value: f.id, text: f.name });
          });
          setLoadedOptions(options);
          setLoadingOptions(false);
        });
      }
      if (condition.field === "memberAttendance") {
        const optionsArray: any[] = [];
        setLoadingOptions(true);
        ApiHelper.get("/campuses", "AttendanceApi").then((campuses: CampusInterface[]) => {
          const options: any[] = [];
          campuses.forEach((c) => {
            options.push({ value: c.id, text: c.name });
          });
          optionsArray.push({ campuses: options });
        });
        ApiHelper.get("/services", "AttendanceApi").then((services: ServiceInterface[]) => {
          const options: any[] = [];
          services.forEach((s) => {
            options.push({ value: s.id, text: `${s.campus.name} - ${s.name}` });
          });
          optionsArray.push({ services: options });
        });
        ApiHelper.get("/serviceTimes", "AttendanceApi").then((serviceTimes: ServiceTimeInterface[]) => {
          const options: any[] = [];
          serviceTimes.forEach((st) => {
            options.push({ value: st.id, text: st.longName });
          });
          optionsArray.push({ serviceTimes: options });
        });
        ApiHelper.get("/groups", "MembershipApi").then((groups: GroupInterface[]) => {
          const options: any[] = [];
          groups.forEach((g) => {
            options.push({ value: g.id, text: g.name });
          });
          optionsArray.push({ groups: options });
          setLoadingOptions(false);
        });
        setLoadedOptions(optionsArray);
      }
    }
  }, [condition?.field.toString()]);

  const getValueSelect = (options: JSX.Element[]) => {
    const parsedValue = (condition.field === "memberAttendance" || condition.field === "memberDonations") && condition.value !== "" && JSON.parse(condition.value);
    const selectValue = parsedValue && Array.isArray(parsedValue) ? JSON.stringify(parsedValue[0]) : condition.value;
    return (
      <FormControl fullWidth>
        <InputLabel>{Locale.label("people.editCondition.value")}</InputLabel>
        <Select name="value" label={Locale.label("people.editCondition.value")} type="text" placeholder="Value" value={selectValue} onChange={handleChange}>
          {options}
        </Select>
      </FormControl>
    );
  };

  const getOperatorOptions = () => {
    let result = [];

    switch (condition?.field) {
      case "gender":
        result = [
          <MenuItem key="/gender-equals" value="equals">
            =
          </MenuItem>,
          <MenuItem key="/gender-notEquals" value="notEquals">
            !=
          </MenuItem>
        ];
        break;
      case "groupMember":
        if (condition.operator !== "in" && condition.operator !== "notIn") {
          const c = { ...condition };
          c.operator = "in";
          setCondition(c);
        }
        result = [
          <MenuItem key="/in" value="in">
            {Locale.label("people.editCondition.isMem")}
          </MenuItem>,
          <MenuItem key="/notIn" value="notIn">
            {Locale.label("people.editCondition.notMem")}
          </MenuItem>
        ];
        break;
      case "memberDonations":
        if (condition.operator !== "donatedTo" && condition.operator !== "donatedToAny") {
          const c = { ...condition };
          c.operator = "donatedTo";
          setCondition(c);
        }
        result = [
          <MenuItem key="/donatedToAny" value="donatedToAny">
            {Locale.label("people.editCondition.hasDon")}
          </MenuItem>,
          <MenuItem key="/donatedTo" value="donatedTo">
            {Locale.label("people.editCondition.donTo")}
          </MenuItem>
        ];
        break;
      case "memberAttendance":
        if (
          condition.operator !== "attendedCampus" &&
          condition.operator !== "attendedAny" &&
          condition.operator !== "attendedService" &&
          condition.operator !== "attendedServiceTime" &&
          condition.operator !== "attendedGroup"
        ) {
          const c = { ...condition };
          c.operator = "attendedCampus";
          setCondition(c);
        }
        result = [
          <MenuItem key="/attendedAny" value="attendedAny">
            {Locale.label("people.editCondition.attGen")}
          </MenuItem>,
          <MenuItem key="/attendedCampus" value="attendedCampus">
            {Locale.label("people.editCondition.attCamp")}
          </MenuItem>,
          <MenuItem key="/attendedService" value="attendedService">
            {Locale.label("people.editCondition.attServ")}
          </MenuItem>,
          <MenuItem key="/attendedServiceTime" value="attendedServiceTime">
            {Locale.label("people.editCondition.attServTime")}
          </MenuItem>,
          <MenuItem key="/attendedGroup" value="attendedGroup">
            {Locale.label("people.editCondition.attGroup")}
          </MenuItem>
        ];
        break;
      default:
        result = [
          <MenuItem key="/equals" value="equals">
            =
          </MenuItem>,
          <MenuItem key="/contains" value="contains">
            {Locale.label("people.editCondition.contains")}
          </MenuItem>,
          <MenuItem key="/startsWith" value="startsWith">
            {Locale.label("people.editCondition.startW")}
          </MenuItem>,
          <MenuItem key="/endsWith" value="endsWith">
            {Locale.label("people.editCondition.endW")}
          </MenuItem>,
          <MenuItem key="/greaterThan" value="greaterThan">
            &gt;
          </MenuItem>,
          <MenuItem key="/greaterThanEqual" value="greaterThanEqual">
            &gt;=
          </MenuItem>,
          <MenuItem key="/lessThan" value="lessThan">
            &lt;
          </MenuItem>,
          <MenuItem key="/lessThanEqual" value="lessThanEqual">
            &lt;=
          </MenuItem>,
          <MenuItem key="/notEquals" value="notEquals">
            !=
          </MenuItem>
        ];
        break;
    }
    return result;
  };

  return (
    <>
      <FormControl fullWidth>
        <InputLabel>{Locale.label("people.editCondition.field")}</InputLabel>
        <Select name="field" label={Locale.label("people.editCondition.field")} type="text" value={condition.field} onChange={handleChange}>
          <MenuItem key="/person" value="person" disabled>
            {Locale.label("common.person")}
          </MenuItem>
          <MenuItem key="/displayName" value="displayName">
            {Locale.label("person.displayName")}
          </MenuItem>
          <MenuItem key="/firstName" value="firstName">
            {Locale.label("person.firstName")}
          </MenuItem>
          <MenuItem key="/lastName" value="lastName">
            {Locale.label("person.lastName")}
          </MenuItem>
          <MenuItem key="/middleName" value="middleName">
            {Locale.label("person.middleName")}
          </MenuItem>
          <MenuItem key="/nickName" value="nickName">
            {Locale.label("person.nickName")}
          </MenuItem>
          <MenuItem key="/prefix" value="prefix">
            {Locale.label("person.prefix")}
          </MenuItem>
          <MenuItem key="/suffix" value="suffix">
            {Locale.label("person.suffix")}
          </MenuItem>
          <MenuItem key="/birthDate" value="birthDate">
            {Locale.label("person.birthDate")}
          </MenuItem>
          <MenuItem key="/birthMonth" value="birthMonth">
            {Locale.label("people.editCondition.bMonth")}
          </MenuItem>
          <MenuItem key="/age" value="age">
            {Locale.label("person.age")}
          </MenuItem>
          <MenuItem key="/gender64" value="gender">
            {Locale.label("person.gender")}
          </MenuItem>
          <MenuItem key="/maritalStatus" value="maritalStatus">
            {Locale.label("person.maritalStatus")}
          </MenuItem>
          <MenuItem key="/anniversary" value="anniversary">
            {Locale.label("person.anniversary")}
          </MenuItem>
          <MenuItem key="/anniversaryMonth" value="anniversaryMonth">
            {Locale.label("people.editCondition.anniMonth")}
          </MenuItem>
          <MenuItem key="/yearsMarried" value="yearsMarried">
            {Locale.label("people.editCondition.marYears")}
          </MenuItem>
          <MenuItem key="/phone" value="phone">
            {Locale.label("person.phone")}
          </MenuItem>
          <MenuItem key="/email" value="email">
            {Locale.label("person.email")}
          </MenuItem>
          <MenuItem key="/address" value="address">
            {Locale.label("person.address")}
          </MenuItem>
          <MenuItem key="/city" value="city">
            {Locale.label("person.city")}
          </MenuItem>
          <MenuItem key="/state" value="state">
            {Locale.label("person.state")}
          </MenuItem>
          <MenuItem key="/zip" value="zip">
            {Locale.label("person.zip")}
          </MenuItem>
          <MenuItem key="/membership" value="membership" disabled>
            {Locale.label("person.membershp")}
          </MenuItem>
          <MenuItem key="/membershipStatus" value="membershipStatus">
            {Locale.label("person.membershipStatus")}
          </MenuItem>
          {Permissions.membershipApi.groupMembers && (
            <MenuItem key="/groupMember" value="groupMember">
              {Locale.label("people.editCondition.groupMem")}
            </MenuItem>
          )}
          <MenuItem key="/activity" value="activity" disabled>
            {Locale.label("people.editCondition.act")}
          </MenuItem>
          {Permissions.givingApi.donations && (
            <MenuItem key="/memberDonations" value="memberDonations">
              {Locale.label("people.editCondition.memDon")}
            </MenuItem>
          )}
          {Permissions.attendanceApi.attendance && (
            <MenuItem key="/memberAttendance" value="memberAttendance">
              {Locale.label("people.editCondition.memAtt")}
            </MenuItem>
          )}
        </Select>
      </FormControl>
      <FormControl fullWidth>
        <InputLabel>{Locale.label("people.editCondition.operator")}</InputLabel>
        <Select name="operator" label={Locale.label("people.editCondition.operator")} type="text" placeholder="Value" value={condition.operator} onChange={handleChange}>
          {getOperatorOptions()}
        </Select>
      </FormControl>

      {loadingOptions ? <Loading /> : <>{getValueField()}</>}
      <Button
        variant="outlined"
        fullWidth
        onClick={() => {
          props.conditionAdded(condition);
        }}>
        {Locale.label("people.editCondition.saveCon")}
      </Button>
    </>
  );
}
