import React, { memo } from "react";
import { HouseholdEdit } from ".";
import { type HouseholdInterface, type PersonInterface } from "@churchapps/helpers";
import { ApiHelper, UserHelper, Permissions, UniqueIdHelper, Loading, Locale } from "@churchapps/apphelper";
import { useNavigate } from "react-router-dom";
import { personInitial, personPhotoUrl } from "../photo";

interface Props {
  person: PersonInterface;
  reload: any;
}

export const Household: React.FC<Props> = memo((props) => {
  const [household, setHousehold] = React.useState<HouseholdInterface | null>(null);
  const [members, setMembers] = React.useState<PersonInterface[] | null>(null);
  const [mode, setMode] = React.useState("display");
  const navigate = useNavigate();

  const handleEdit = () => setMode("edit");
  const handleUpdate = () => {
    loadData();
    loadMembers();
    setMode("display");
  };

  const loadData = () => {
    if (!UniqueIdHelper.isMissing(props.person?.householdId)) {
      ApiHelper.get("/households/" + props?.person.householdId, "MembershipApi").then((data: any) => setHousehold(data));
    } else if (props.person?.id && UserHelper.checkAccess(Permissions.membershipApi.people.edit)) {
      ApiHelper.post("/households", [{ name: props.person.name?.last || "" }], "MembershipApi").then((data: any) => {
        props.person.householdId = data[0].id;
        ApiHelper.post("/people", [props.person], "MembershipApi").then(() => setHousehold(data[0]));
      });
    }
  };

  const loadMembers = () => {
    if (household != null) {
      ApiHelper.get("/people/household/" + household.id, "MembershipApi").then((data: any) => setMembers(data));
    }
  };

  React.useEffect(loadData, [props.person]);
  React.useEffect(loadMembers, [household]);

  if (mode === "edit") {
    return <HouseholdEdit household={household!} currentMembers={members} updatedFunction={handleUpdate} currentPerson={props.person} />;
  }

  if (!members) return <Loading size="sm" />;

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
        {members.map((m) => {
          const src = personPhotoUrl(m);
          const short = m.name?.nick || m.name?.first || m.name?.display || "";
          return (
            <button key={m.id} className={`face${m.id === props.person.id ? " on" : ""}`} type="button" onClick={() => m.id && navigate("/people/" + m.id)}>
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
