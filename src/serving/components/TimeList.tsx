import React from "react";
import { Icon } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import {
  type PlanInterface,
  type PositionInterface,
  type TimeInterface
} from "@churchapps/helpers";
import {
  ArrayHelper,
  DateHelper,
  DisplayBox,
  Locale
} from "@churchapps/apphelper";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { TimeEdit } from "./TimeEdit";

interface Props {
  times: TimeInterface[];
  plan: PlanInterface;
  positions: PositionInterface[];
  canEdit: boolean;
  onUpdate: () => void;
}

export const TimeList = (props: Props) => {
  const [time, setTime] = React.useState<TimeInterface | null>(null);
  const { canEdit } = props;
  // Hoisted null-safe view: the compiler emits non-optional guard reads (props.plan.id)
  // for the handleAdd closure deps, which crash while the parent's plan is still null.
  const plan: PlanInterface = props.plan || ({} as PlanInterface);

  const handleAdd = () => {
    const startTime = new Date(plan.serviceDate || new Date());
    startTime.setHours(9);
    startTime.setMinutes(0);
    const endTime = new Date(plan.serviceDate || new Date());
    endTime.setHours(10);
    endTime.setMinutes(30);

    setTime({
      planId: plan.id,
      displayName: Locale.label("plans.timeList.sunServ"),
      startTime,
      endTime,
      serviceTimeType: "service"
    });
  };

  const handleSelect = (t: TimeInterface) => {
    t.startTime = new Date(t.startTime || new Date());
    t.endTime = new Date(t.endTime || new Date());
    t.startTime.setMinutes(t.startTime.getMinutes() - t.startTime.getTimezoneOffset());
    t.endTime.setMinutes(t.endTime.getMinutes() - t.endTime.getTimezoneOffset());
    setTime(t);
  };

  const getAddTimeLink = () => canEdit ? (
    <AppIconButton label={Locale.label("common.add")} icon={<AddIcon />} tone="card" intent="add" id="addBtnGroup" data-cy="add-button" onClick={handleAdd} data-testid="add-time-button" />
  ) : null;

  const getRows = () => {
    const result: JSX.Element[] = [];
    props.times.forEach((t) => {
      const teamList = t.teams?.split(",") || [];
      const startTime = new Date(t.startTime || new Date());
      //startTime.setMinutes(startTime.getMinutes() - startTime.getTimezoneOffset());
      const endTime = new Date(t.endTime || new Date());
      //endTime.setMinutes(endTime.getMinutes() - endTime.getTimezoneOffset());
      const typeIcon = t.serviceTimeType === "rehearsal" ? "music_note" : t.serviceTimeType === "other" ? "event_note" : "schedule";
      const typeLabel = t.serviceTimeType === "rehearsal"
        ? Locale.label("plans.timeEdit.typeRehearsal")
        : t.serviceTimeType === "other"
          ? Locale.label("plans.timeEdit.typeOther")
          : Locale.label("plans.timeEdit.typeService");
      result.push(
        <tr key={t.id}>
          <td style={{ verticalAlign: "top" }}>
            <Icon>{typeIcon}</Icon>
          </td>
          <td style={{ width: "90%" }}>
            {canEdit ? (
              <button
                type="button"
                onClick={() => handleSelect(t)}
                style={{ background: "none", border: 0, padding: 0, color: "var(--link)", cursor: "pointer" }}>
                {t.displayName}
              </button>
            ) : (
              <span>{t.displayName}</span>
            )}
            <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>{typeLabel}</span>
            <div style={{ fontSize: 12 }}>
              {DateHelper.prettyDateTime(startTime)}
              {t.endTime ? " - " + DateHelper.prettyTime(endTime) : ""}
              <br />
              <i style={{ color: "var(--text-muted)" }}>{teamList.join(", ")}</i>
            </div>
          </td>
        </tr>
      );
    });
    if (props.times.length === 0) {
      result.push(
        <tr>
          <td colSpan={2}>{Locale.label("plans.timeList.noTime")}</td>
        </tr>
      );
    }
    return result;
  };

  if (time && canEdit) {
    const categories = ArrayHelper.getUniqueValues(props.positions, "categoryName").sort();
    return (
      <TimeEdit
        time={time}
        categories={categories}
        onUpdate={() => {
          setTime(null);
          props.onUpdate();
        }}
      />
    );
  } else {
    return (
      <DisplayBox headerText={Locale.label("plans.timeList.times")} headerIcon="schedule" editContent={getAddTimeLink()}>
        <table style={{ width: "100%" }}>{getRows()}</table>
      </DisplayBox>
    );
  }
};
