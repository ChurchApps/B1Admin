import { type PersonInterface } from "@churchapps/helpers";
import { type DirectoryHousehold } from "../buildHouseholds";
import { personInitial, personPhotoUrl } from "../photo";
import { sortHouseholdMembers } from "../sortHouseholdMembers";

interface Props {
  households: DirectoryHousehold[];
  canSelect: boolean;
  selectedPersonIds: string[];
  currentPersonId: string;
  onOpen: (person: PersonInterface) => void;
  onToggleHousehold: (members: PersonInterface[]) => void;
  searchTerm?: string;
}

const face = (p: PersonInterface) => {
  const src = personPhotoUrl(p);
  return (
    <span key={p.id} className="face-slot">
      {src ? <img src={src} alt="" /> : <span className="ini">{personInitial(p)}</span>}
    </span>
  );
};

const markFor = (h: DirectoryHousehold) => {
  const visitors = h.members.filter((m) => m.membershipStatus === "Visitor");
  if (visitors.length > 0 && visitors.length === h.members.length) return { text: "first time", cls: "first" };
  if (visitors.length > 0) return { text: "first time", cls: "first" };
  return { text: "", cls: "" };
};

export const DirectoryHouseholds = (props: Props) => {
  const term = (props.searchTerm || "").trim().toLowerCase();

  const openHousehold = (h: DirectoryHousehold) => {
    if (term) {
      const match = h.members.find((m) => (m.name?.display || "").toLowerCase().includes(term));
      if (match) {
        props.onOpen(match);
        return;
      }
    }
    const head = h.members.find((m) => m.householdRole === "Head") || h.members[0];
    if (head) props.onOpen(head);
  };

  if (props.households.length === 0) {
    return <p className="lede">No one for that.</p>;
  }

  let letter = "";
  const rows: JSX.Element[] = [];
  props.households.forEach((h) => {
    const L = h.letter;
    if (L !== letter) {
      letter = L;
      rows.push(
        <tr key={`letter-${L}`}>
          <td colSpan={2}><div className="letter">{L}</div></td>
        </tr>
      );
    }
    const members = sortHouseholdMembers(h.members);
    const selectable = members.filter((m) => m.id && m.id !== props.currentPersonId);
    const selected = selectable.length > 0 && selectable.every((m) => props.selectedPersonIds.includes(m.id as string));
    const names = members.map((m) => m.name?.display).filter(Boolean).join(", ");
    const mark = markFor(h);
    rows.push(
      <tr key={h.key}>
        <td colSpan={2}>
          <div className="hh" onClick={() => openHousehold(h)}>
            {props.canSelect ? (
              <div className="hh-check" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={selectable.length === 0}
                  onChange={() => props.onToggleHousehold(selectable)}
                  aria-label={`Select ${h.displayName}`}
                />
              </div>
            ) : <span />}
            <div className="stack">{members.slice(0, 5).map(face)}</div>
            <div>
              <div className="name">{h.displayName}</div>
              <div className="who">{names}</div>
            </div>
            <div className={`mark-line ${mark.cls}`}>{mark.text}</div>
          </div>
        </td>
      </tr>
    );
  });

  return (
    <table id="peopleTable" className="dir">
      <tbody>{rows}</tbody>
    </table>
  );
};
