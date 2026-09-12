import React, { memo, useMemo } from "react";
import { HouseholdEdit } from ".";
import { type HouseholdInterface, type PersonInterface } from "@churchapps/helpers";
import { ApiHelper, UserHelper, Permissions, UniqueIdHelper, Locale } from "@churchapps/apphelper";
import { useNavigate, useParams } from "react-router-dom";
import { personInitial, personPhotoUrl } from "../photo";
import { sortHouseholdMembers } from "../sortHouseholdMembers";

interface Props {
  person: PersonInterface;
  reload?: unknown;
}

export const Household: React.FC<Props> = memo((props) => {
  const [household, setHousehold] = React.useState<HouseholdInterface | null>(null);
  const [members, setMembers] = React.useState<PersonInterface[]>([]);
  const [mode, setMode] = React.useState("display");
  const navigate = useNavigate();
  const params = useParams();
  const selectedId = params.id || props.person.id;
  const householdId = props.person?.householdId;

  const handleEdit = () => setMode("edit");
  const handleUpdate = () => {
    loadData();
    loadMembers();
    setMode("display");
  };

  const loadData = () => {
    if (!UniqueIdHelper.isMissing(householdId)) {
      ApiHelper.get("/households/" + householdId, "MembershipApi").then((data: HouseholdInterface) => setHousehold(data));
    } else if (props.person?.id && UserHelper.checkAccess(Permissions.membershipApi.people.edit)) {
      ApiHelper.post("/households", [{ name: props.person.name?.last || "" }], "MembershipApi").then((data: HouseholdInterface[]) => {
        props.person.householdId = data[0].id;
        ApiHelper.post("/people", [props.person], "MembershipApi").then(() => setHousehold(data[0]));
      });
    }
  };

  const loadMembers = () => {
    const id = household?.id || householdId;
    if (UniqueIdHelper.isMissing(id)) return;
    ApiHelper.get("/people/household/" + id, "MembershipApi").then((data: PersonInterface[]) => setMembers(sortHouseholdMembers(data || [])));
  };

  React.useEffect(loadData, [householdId]);
  React.useEffect(loadMembers, [household?.id, householdId, props.reload]);

  const ordered = useMemo(() => sortHouseholdMembers(members), [members]);

  if (mode === "edit") {
    return <HouseholdEdit household={household!} currentMembers={ordered} updatedFunction={handleUpdate} currentPerson={props.person} />;
  }

  if (ordered.length === 0) return null;

  return (
    <div id="householdBox">
      <h3>
        Household
        {UserHelper.checkAccess(Permissions.membershipApi.people.edit) && (
          <button type="button" className="back" aria-label="Edit" onClick={handleEdit} style={{ marginLeft: 12, textTransform: "none", letterSpacing: 0 }}>
            {Locale.label("common.edit")}
          </button>
        )}
      </h3>
      <div className="house">
        {ordered.map((m) => {
          const src = personPhotoUrl(m);
          const short = m.name?.nick || m.name?.first || m.name?.display || "";
          return (
            <button key={m.id} className={`face${m.id === selectedId ? " on" : ""}`} type="button" onClick={() => m.id && navigate("/people/" + m.id)}>
              {src ? <img src={src} alt="" /> : <span className="ini">{personInitial(m)}</span>}
              <h5>{m.name?.display || short}</h5>
              <span className="role">{m.householdRole}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
