import { useMemo, useState } from "react";
import { GroupAdd } from "./components";
import { ApiHelper, UserHelper, Loading, Locale, Permissions } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { Table, TableBody, TableCell, TableRow, Button } from "@mui/material";
import { type GroupInterface, type GroupJoinRequestInterface } from "@churchapps/helpers";
import { useQuery } from "@tanstack/react-query";
import { ExportButton } from "../components/ui";
import { useConfirmDelete } from "../hooks";
import "./omarchy.css";

const EXPORT_LABEL_KEYS = [
  "id", "churchId", "campusId", "categoryName", "joinPolicy", "labelCount", "memberCount", "meetingLocation", "meetingTime", "name", "labels", "tags"
];

const formatHeader = (key: string): string => {
  if (EXPORT_LABEL_KEYS.indexOf(key) > -1) return Locale.label("groups.export." + key);

  const result = key
    .replace(/([A-Z])/g, " $1")
    .replace(/([0-9]+)/g, " $1")
    .trim();
  return result.charAt(0).toUpperCase() + result.slice(1);
};

const GroupsPage = () => {
  const [showAdd, setShowAdd] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [list, setList] = useState<"all" | "archived" | string>("all");
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const canEditGroups = UserHelper.checkAccess(Permissions.membershipApi.groups.edit);

  const groupsQuery = useQuery<GroupInterface[]>({
    queryKey: [showArchived ? "/groups?archived=1" : "/groups/tag/standard", "MembershipApi"],
    placeholderData: []
  });
  const groups = groupsQuery.data || [];

  const categories = useMemo(() => {
    const names = Array.from(new Set(groups.map((g) => g.categoryName).filter((c): c is string => !!c)));
    return names.sort((a, b) => a.localeCompare(b));
  }, [groups]);

  const query = searchText.trim().toLowerCase();
  const filteredGroups = groups.filter((g) => {
    if (list !== "all" && list !== "archived" && g.categoryName !== list) return false;
    if (!query) return true;
    return (g.name || "").toLowerCase().includes(query) || (g.categoryName || "").toLowerCase().includes(query);
  });

  const handleAddUpdated = () => {
    setShowAdd(false);
    groupsQuery.refetch();
  };

  const handleRestore = async (g: GroupInterface) => {
    if (!(await confirm(Locale.label("groups.groupsPage.confirmRestore").replace("{name}", g.name || ""), { confirmLabel: Locale.label("groups.groupsPage.restore"), destructive: false }))) return;
    const group: GroupInterface = { ...g, archived: false };
    ApiHelper.post("/groups", [group], "MembershipApi").then(() => groupsQuery.refetch());
  };

  const selectList = (next: "all" | "archived" | string) => {
    setList(next);
    const archived = next === "archived";
    if (archived !== showArchived) setShowArchived(archived);
  };

  const canApproveRequests = UserHelper.checkAccess(Permissions.membershipApi.groupMembers.edit);
  const { data: pendingRequests = [] } = useQuery<GroupJoinRequestInterface[]>({
    queryKey: ["/groupjoinrequests/pending", "MembershipApi"],
    placeholderData: [],
    enabled: canApproveRequests
  });
  const pendingCount = pendingRequests?.length || 0;

  const exportData = groups.map((g) => {
    const { labelArray, ...rest } = g;

    const rawExport: any = {
      ...rest,

      labels: Array.isArray(labelArray)
        ? labelArray.join(", ")
        : "",

      labelCount: Array.isArray(labelArray)
        ? labelArray.length
        : 0,

      memberCount: Number(g.memberCount || 0)
    };

    const formattedExport: any = {};
    Object.keys(rawExport).forEach((key) => {
      formattedExport[formatHeader(key)] = rawExport[key];
    });

    return formattedExport;
  });

  const getRows = () => {
    const rows: JSX.Element[] = [];

    if (filteredGroups.length === 0) {
      rows.push(
        <TableRow key="0">
          <TableCell colSpan={4}>{query ? Locale.label("groups.groupsPage.noMatchMsg") : Locale.label("groups.groupsPage.noGroupMsg")}</TableCell>
        </TableRow>
      );
      return rows;
    }

    for (let i = 0; i < filteredGroups.length; i++) {
      const g = filteredGroups[i];
      const memberCount = g.memberCount === 1 ? Locale.label("groups.groupsPage.pers") : (g.memberCount || 0).toString() + Locale.label("groups.groupsPage.spPpl");
      const labels = (g.labelArray || []).filter((l) => l && l.trim()).join(" · ");
      rows.push(
        <TableRow key={g.id}>
          <TableCell>
            <div className="og-name">
              <Link to={"/groups/" + (g.id || "")}>{g.name}</Link>
            </div>
            <div className="og-who-line">
              {[g.categoryName, labels].filter(Boolean).join(" · ")}
            </div>
          </TableCell>
          <TableCell className="og-mark">{memberCount}</TableCell>
          {showArchived && (
            <TableCell className="rowActions">
              {canEditGroups && (
                <Button size="small" onClick={() => handleRestore(g)} data-testid={`restore-group-${g.id}`}>
                  {Locale.label("groups.groupsPage.restore")}
                </Button>
              )}
            </TableCell>
          )}
        </TableRow>
      );
    }
    return rows;
  };

  return (
    <>
      {ConfirmDialogElement}
      <main className="og-page">
        <h1>{Locale.label("groups.groupsPage.groups")}</h1>
        <p className="og-lede">{groups.length > 0 ? Locale.label("groups.groupsPage.subtitle.manage").replace("{count}", groups.length.toString()) : Locale.label("groups.groupsPage.subtitle.create")}</p>

        <div className="og-head-verbs">
          {UserHelper.checkAccess(Permissions.membershipApi.groupMembers.view) && (
            <Link to="/groups/health" data-testid="group-health-link">{Locale.label("groups.groupHealth.title")}</Link>
          )}
          {canApproveRequests && pendingCount > 0 && (
            <Link to="/groups/pending" data-testid="pending-requests-link">
              {pendingCount === 1
                ? Locale.label("groups.groupsPage.pendingRequestSingular").replace("{count}", pendingCount.toString())
                : Locale.label("groups.groupsPage.pendingRequests").replace("{count}", pendingCount.toString())}
            </Link>
          )}
          {groups.length > 0 && canEditGroups && (
            <ExportButton data={exportData} filename="groups.csv" text={Locale.label("groups.groupsPage.export")} />
          )}
        </div>

        <div className="og-lists">
          <button type="button" className={list === "all" ? "on" : ""} onClick={() => selectList("all")}>{Locale.label("common.all", "All")}</button>
          {categories.map((cat) => (
            <button key={cat} type="button" className={list === cat ? "on" : ""} onClick={() => selectList(cat)}>{cat}</button>
          ))}
          {canEditGroups && (
            <label className={showArchived ? "on" : ""} data-testid="show-archived-toggle">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(ev) => {
                  const next = ev.target.checked;
                  setShowArchived(next);
                  setList(next ? "archived" : "all");
                }}
              />
              {Locale.label("groups.groupsPage.showArchived")}
            </label>
          )}
          {UserHelper.checkAccess(Permissions.membershipApi.groupMembers.view) && (
            <Link to="/groups/health">{Locale.label("groups.groupNavigation.health")}</Link>
          )}
          {canApproveRequests && pendingCount > 0 && (
            <Link to="/groups/pending">{pendingCount.toString()}</Link>
          )}
        </div>

        {groups.length > 0 && (
          <div data-testid="groups-search">
            <input
              className="og-find"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={Locale.label("groups.groupsPage.searchPlaceholder")}
            />
          </div>
        )}

        {groupsQuery.isLoading ? (
          <Loading />
        ) : (
          <Table>
            <TableBody>{getRows()}</TableBody>
          </Table>
        )}

        {canEditGroups && (
          <div className="og-add">
            {showAdd ? (
              <GroupAdd updatedFunction={handleAddUpdated} tags="standard" />
            ) : (
              <button type="button" onClick={() => setShowAdd(true)} data-testid="add-group-button">{Locale.label("groups.groupsPage.addGroup")}</button>
            )}
          </div>
        )}
      </main>
    </>
  );
};

export default GroupsPage;
