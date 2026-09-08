import React, { memo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Permissions, UserHelper, type PersonInterface, type SearchCondition, type HouseholdInterface } from "@churchapps/helpers";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { PeopleColumns } from "./components";
import { Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Stack, Typography } from "@mui/material";
import { B1AdminPersonHelper, EnvironmentHelper } from "../helpers";
import { PeopleSearch } from "./components/PeopleSearch";
import { SavedLists, type ListConditions, type ListInterface } from "./components/SavedLists";
import { buildRulesFromCriteria } from "./components/listRules";
import { type ActiveFilter } from "./components/AdvancedPeopleSearch";
import { CreatePerson } from "../components";
import { ExportButton } from "../components/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AISearch } from "./components/AISearch";
import { PeopleBulkActions } from "./components/bulk/PeopleBulkActions";
import { type BulkResult } from "./components/bulk/BulkFieldDialog";
import { DirectoryHouseholds } from "./components/DirectoryHouseholds";
import { buildHouseholds } from "./buildHouseholds";
import "./people.css";

interface BulkDeleteResponse {
  success: boolean;
  deletedIds: string[];
  count: number;
}

const INITIAL_PAGE_SIZE = 50;

const EXPORT_LABEL_KEYS = [
  "address", "address1", "address2", "age", "anniversary", "birthDate", "campusId", "churchId", "city", "contactCity", "contactEmail", "contactState", "contactZip", "conversationId", "display", "first", "last", "middle", "middleName", "mobilePhone", "nametagNotes", "nick", "optedOut", "phone", "photo", "photoUpdated", "state", "workPhone", "firstName", "lastName", "gender", "membershipStatus", "id", "householdId"
];

const formatHeader = (key: string): string => {
  if (EXPORT_LABEL_KEYS.indexOf(key) > -1) return Locale.label("people.export." + key);
  const result = key
    .replace(/([A-Z])/g, " $1")
    .replace(/([0-9]+)/g, " $1")
    .trim();
  return result.charAt(0).toUpperCase() + result.slice(1);
};

export const PeoplePage = memo(() => {
  const [searchResults, setSearchResults] = React.useState<PersonInterface[] | null>(null);
  const [selectedColumns, setSelectedColumns] = React.useState<string[]>(["photo", "displayName"]);
  const [isSearchPerformed, setIsSearchPerformed] = React.useState(false);
  const [selectedListFilters, setSelectedListFilters] = React.useState<Record<string, ActiveFilter> | undefined>(undefined);
  const [selectedListId, setSelectedListId] = React.useState<string | undefined>(undefined);
  const [findTerm, setFindTerm] = React.useState("");
  const [saveableCriteria, setSaveableCriteria] = React.useState<ListConditions | null>(null);
  const emptySaveListDialog = { open: false, name: "", category: "", scope: "org", match: "all" as "all" | "any", householdInclusion: "none", autoRefresh: false, notifyOnChange: false, saving: false };
  const [saveListDialog, setSaveListDialog] = React.useState(emptySaveListDialog);
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedPersonIds, setSelectedPersonIds] = React.useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = React.useState(false);
  const [loadAll, setLoadAll] = React.useState(false);
  const [allPeople, setAllPeople] = React.useState<PersonInterface[]>([]);
  const [maybeMore, setMaybeMore] = React.useState(true);
  const [toast, setToast] = React.useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success"
  });
  const canEdit = UserHelper.checkAccess(Permissions.membershipApi.people.edit);
  const currentPersonId = UserHelper.currentUserChurch?.person?.id || "";

  const peopleQuery = useQuery<PersonInterface[]>({
    queryKey: [loadAll ? "/people/list" : `/people/list?pageSize=${INITIAL_PAGE_SIZE}`, "MembershipApi"],
    placeholderData: []
  });

  const householdRecords = useQuery<HouseholdInterface[]>({
    queryKey: ["/households", "MembershipApi"],
    placeholderData: []
  });

  const refetch = useCallback(() => {
    peopleQuery.refetch();
  }, [peopleQuery]);

  const scrollToCreatePerson = useCallback(() => {
    const form = document.getElementById("createPersonForm");
    form?.scrollIntoView({ behavior: "smooth", block: "start" });
    (form?.querySelector("input") as HTMLElement | null)?.focus();
  }, []);

  const columns = [
    { key: "photo", label: Locale.label("people.peoplePage.photo"), shortName: "" },
    { key: "displayName", label: Locale.label("person.displayName"), shortName: Locale.label("common.name") },
    { key: "lastName", label: Locale.label("person.lastName"), shortName: Locale.label("people.peoplePage.last") },
    { key: "firstName", label: Locale.label("person.firstName"), shortName: Locale.label("people.peoplePage.first") },
    { key: "middleName", label: Locale.label("person.middleName"), shortName: Locale.label("people.peoplePage.middle") },
    { key: "address", label: Locale.label("person.address"), shortName: Locale.label("person.address") },
    { key: "city", label: Locale.label("person.city"), shortName: Locale.label("person.city") },
    { key: "state", label: Locale.label("person.state"), shortName: Locale.label("person.state") },
    { key: "zip", label: Locale.label("person.zip"), shortName: Locale.label("person.zip") },
    { key: "email", label: Locale.label("people.peoplePage.primEmail"), shortName: Locale.label("person.email") },
    { key: "phone", label: Locale.label("people.peoplePage.primPhone"), shortName: Locale.label("person.phone") },
    { key: "birthDate", label: Locale.label("person.birthDate"), shortName: Locale.label("person.birthDate") },
    { key: "birthDay", label: Locale.label("people.peoplePage.bDayNo"), shortName: Locale.label("people.peoplePage.bDay") },
    { key: "age", label: Locale.label("person.age"), shortName: Locale.label("person.age") },
    { key: "gender", label: Locale.label("person.gender"), shortName: Locale.label("person.gender") },
    { key: "membershipStatus", label: Locale.label("person.membershipStatus"), shortName: Locale.label("person.membershipStatus") },
    { key: "campus", label: Locale.label("person.campus"), shortName: Locale.label("person.campus") },
    { key: "maritalStatus", label: Locale.label("person.maritalStatus"), shortName: Locale.label("person.married") },
    { key: "anniversary", label: Locale.label("person.anniversary"), shortName: Locale.label("person.anniversary") },
    { key: "nametagNotes", label: Locale.label("people.peoplePage.nameNote"), shortName: Locale.label("common.notes") },
    { key: "deleteOption", label: Locale.label("people.peoplePage.deleteOp"), shortName: Locale.label("common.delete") }
  ];

  const handleToggleColumn = (key: string) => {
    const sc = [...selectedColumns];
    const index = sc.indexOf(key);
    if (index === -1) sc.push(key);
    else {
      if (sc.length === 1) {
        if (key !== "displayName") {
          sc.splice(index, 1);
          sc.push("displayName");
        } else return;
      } else sc.splice(index, 1);
    }
    localStorage.setItem("selectedColumns", JSON.stringify(sc));
    setSelectedColumns(sc);
  };

  React.useEffect(() => {
    const stored = localStorage.getItem("selectedColumns");
    if (stored) setSelectedColumns(JSON.parse(stored));
    else localStorage.setItem("selectedColumns", JSON.stringify(["photo", "displayName"]));
  }, []);

  React.useEffect(() => {
    if (peopleQuery.isPlaceholderData) return;
    const data = peopleQuery.data;
    if (!data) return;
    const expanded = data.map((d: PersonInterface) => B1AdminPersonHelper.getExpandedPersonObject(d));
    setAllPeople(expanded);
    setMaybeMore(!loadAll && data.length === INITIAL_PAGE_SIZE);
  }, [peopleQuery.data, peopleQuery.isPlaceholderData, loadAll]);

  const resetSearchResults = useCallback(() => {
    setSearchResults(allPeople);
    setIsSearchPerformed(false);
    setSelectedListId(undefined);
    setSelectedListFilters(undefined);
  }, [allPeople]);

  React.useEffect(() => {
    if (isSearchPerformed) return;
    if (allPeople.length === 0 && peopleQuery.isFetching) return;
    setSearchResults(allPeople);
  }, [allPeople, isSearchPerformed, peopleQuery.isFetching]);

  const handleShowAll = useCallback(() => {
    setLoadAll(true);
  }, []);

  const handleSelectList = useCallback((list: ListInterface) => {
    const conditions = list.conditions;
    setIsSearchPerformed(true);
    setSelectedListId(list.id);
    const needsServerEval = !!list.id && !!list.rules && (list.rules.match !== "all" || (!!list.householdInclusion && list.householdInclusion !== "none"));
    if (needsServerEval) {
      setSaveableCriteria(null);
      setSelectedListFilters(undefined);
      ApiHelper.get(`/lists/${list.id}/people`, "MembershipApi").then((data: any) => {
        setSearchResults(data.map((d: PersonInterface) => B1AdminPersonHelper.getExpandedPersonObject(d)));
      });
    } else if (Array.isArray(conditions)) {
      setSaveableCriteria(conditions);
      setSelectedListFilters(undefined);
      ApiHelper.post("/people/advancedSearch", conditions, "MembershipApi").then((data: any) => {
        setSearchResults(data.map((d: PersonInterface) => B1AdminPersonHelper.getExpandedPersonObject(d)));
      });
    } else {
      setSaveableCriteria(conditions ?? null);
      setSelectedListFilters({ ...conditions });
    }
  }, []);

  React.useEffect(() => {
    const conditions = (location.state as { searchConditions?: SearchCondition[] } | null)?.searchConditions;
    if (conditions && conditions.length > 0) {
      handleSelectList({ conditions });
      navigate(location.pathname, { replace: true, state: null });
    }
  }, []);

  const handleSaveList = useCallback(async () => {
    if (!saveableCriteria || !saveListDialog.name.trim()) return;
    setSaveListDialog((d) => ({ ...d, saving: true }));
    try {
      const rules = buildRulesFromCriteria(saveableCriteria, saveListDialog.match);
      await ApiHelper.post("/lists", [
        {
          name: saveListDialog.name.trim(),
          category: saveListDialog.category.trim() || undefined,
          conditions: saveableCriteria,
          rules,
          scope: saveListDialog.scope,
          householdInclusion: saveListDialog.householdInclusion,
          autoRefresh: saveListDialog.autoRefresh,
          notifyOnChange: saveListDialog.autoRefresh && saveListDialog.notifyOnChange
        }
      ], "MembershipApi");
      queryClient.invalidateQueries({ queryKey: ["/lists", "MembershipApi"] });
      setSaveListDialog(emptySaveListDialog);
    } catch {
      setSaveListDialog((d) => ({ ...d, saving: false }));
    }
  }, [saveableCriteria, saveListDialog, queryClient]);

  React.useEffect(() => {
    if (!searchResults) return;
    const visibleIds = new Set(searchResults.map((person) => person.id).filter((id): id is string => !!id));
    setSelectedPersonIds((current) => current.filter((id) => id !== currentPersonId && visibleIds.has(id)));
  }, [currentPersonId, searchResults]);

  const toggleHouseholdSelection = useCallback((members: PersonInterface[]) => {
    const ids = members.map((m) => m.id).filter((id): id is string => !!id && id !== currentPersonId);
    if (ids.length === 0) return;
    setSelectedPersonIds((current) => {
      const allSelected = ids.every((id) => current.includes(id));
      if (allSelected) return current.filter((id) => !ids.includes(id));
      return Array.from(new Set([...current, ...ids]));
    });
  }, [currentPersonId]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedPersonIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const response = await ApiHelper.post("/people/bulk-delete", { personIds: selectedPersonIds }, "MembershipApi") as BulkDeleteResponse;
      const deletedIds = response?.deletedIds || selectedPersonIds;
      const deletedIdSet = new Set(deletedIds);
      setSearchResults((current) => current?.filter((person) => !person.id || !deletedIdSet.has(person.id)) || []);
      setAllPeople((current) => current.filter((person) => !person.id || !deletedIdSet.has(person.id)));
      setSelectedPersonIds([]);
      setShowBulkDeleteConfirm(false);
      setToast({
        open: true,
        message: Locale.label("people.bulk.deleteSuccess").replace("{count}", (response?.count || deletedIds.length).toString()),
        severity: "success"
      });
    } catch (error) {
      setToast({
        open: true,
        message: error instanceof Error ? error.message : Locale.label("people.bulk.deleteError"),
        severity: "error"
      });
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedPersonIds]);

  const handleBulkComplete = useCallback((result: BulkResult) => {
    setToast({ open: true, message: result.message, severity: result.severity });
    if (result.severity !== "success") return;
    if (result.fieldUpdates) {
      const selectedSet = new Set(selectedPersonIds);
      setSearchResults((current) => current?.map((person) => (person.id && selectedSet.has(person.id) ? { ...person, ...result.fieldUpdates } : person)) || null);
      setAllPeople((current) => current.map((person) => (person.id && selectedSet.has(person.id) ? { ...person, ...result.fieldUpdates } : person)));
    }
    setSelectedPersonIds([]);
  }, [selectedPersonIds]);

  const getExportData = (people: PersonInterface[]) => people.map((person) => {
    const { name, contactInfo, ...rest } = person;
    const photoUrl = person.photo ? (person.photo.startsWith("http") ? person.photo : (EnvironmentHelper.Common.ContentRoot + person.photo)) : "";
    const rawExport: any = {
      ...rest,
      photo: photoUrl,
      display: name?.display,
      first: name?.first,
      last: name?.last,
      middle: name?.middle,
      nick: name?.nick,
      suffix: name?.suffix,
      address1: contactInfo?.address1,
      address2: contactInfo?.address2,
      city: contactInfo?.city,
      state: contactInfo?.state,
      zip: contactInfo?.zip,
      email: contactInfo?.email,
      homePhone: contactInfo?.homePhone,
      workPhone: contactInfo?.workPhone,
      mobilePhone: contactInfo?.mobilePhone,
      contactCity: contactInfo?.city,
      contactState: contactInfo?.state,
      contactZip: contactInfo?.zip,
      contactEmail: contactInfo?.email
    };
    const formattedExport: any = {};
    Object.keys(rawExport).forEach((key) => {
      formattedExport[formatHeader(key)] = rawExport[key];
    });
    return formattedExport;
  });

  const householdNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    (householdRecords.data || []).forEach((h) => {
      if (h.id && h.name?.trim()) map.set(h.id, h.name.trim());
    });
    return map;
  }, [householdRecords.data]);

  const households = React.useMemo(
    () => buildHouseholds(searchResults || [], householdNameById),
    [searchResults, householdNameById]
  );

  const selectedNames = React.useMemo(() => {
    const set = new Set(selectedPersonIds);
    const last = new Set<string>();
    (searchResults || []).forEach((p) => {
      if (p.id && set.has(p.id) && p.name?.last) last.add(p.name.last);
    });
    return Array.from(last).slice(0, 4).join(", ");
  }, [searchResults, selectedPersonIds]);

  return (
    <>
      <main className="omarchy-people">
        <div className="dir-head">
          <h1>The church</h1>
          <div className="dir-verbs">
            <a href="/people/demographics" data-testid="demographics-button" onClick={(e) => { e.preventDefault(); navigate("/people/demographics"); }}>{Locale.label("people.demographics.title")}</a>
            <a href="/people/print-directory" onClick={(e) => { e.preventDefault(); window.open("/people/print-directory", "_blank"); }}>{Locale.label("people.peoplePage.printDirectory")}</a>
            {searchResults && <ExportButton data={getExportData(searchResults || [])} filename="people.csv" text={Locale.label("people.peoplePage.export")} />}
            <PeopleColumns selectedColumns={selectedColumns} toggleColumn={handleToggleColumn} columns={columns} />
            {canEdit && saveableCriteria && isSearchPerformed && searchResults && searchResults.length > 0 && (
              <button type="button" className="verb" onClick={() => setSaveListDialog({ ...emptySaveListDialog, open: true })}>{Locale.label("people.lists.saveAs")}</button>
            )}
            {canEdit && (
              <button type="button" className="verb" data-testid="add-person-button" onClick={scrollToCreatePerson}>{Locale.label("people.peoplePage.addPerson")}</button>
            )}
          </div>
        </div>
        <p className="lede">Households to browse. A person to open. Everything else is a list or a question.</p>

        <SavedLists
          variant="pills"
          onSelect={handleSelectList}
          canManage={canEdit}
          selectedId={selectedListId}
          onClear={resetSearchResults}
        />

        <PeopleSearch
          updateSearchResults={(people) => {
            setSearchResults(people);
            setIsSearchPerformed(true);
          }}
          resetSearchResults={resetSearchResults}
          updatedFunction={refetch}
          initialFilters={selectedListFilters}
          onReportCriteria={setSaveableCriteria}
          onTermChange={setFindTerm}
        />
        <AISearch
          updateSearchResults={(people) => {
            setSearchResults(people);
            setIsSearchPerformed(true);
          }}
          onReportCriteria={setSaveableCriteria}
          resetSearchResults={resetSearchResults}
        />

        <DirectoryHouseholds
          households={households}
          canSelect={canEdit}
          selectedPersonIds={selectedPersonIds}
          currentPersonId={currentPersonId}
          searchTerm={findTerm}
          onOpen={(person) => navigate("/people/" + person.id)}
          onToggleHousehold={toggleHouseholdSelection}
        />

        {!isSearchPerformed && !loadAll && maybeMore && allPeople.length > 0 && (
          <div className="show-all">
            <button type="button" onClick={handleShowAll} disabled={peopleQuery.isFetching}>
              {Locale.label("people.peoplePage.showAll")}
            </button>
          </div>
        )}

        {canEdit && (
          <div className="add" id="createPersonForm">
            <h2>Add a person</h2>
            <CreatePerson onCreate={(person) => navigate("/people/" + person.id)} />
          </div>
        )}

        <div className={`bulk${selectedPersonIds.length > 0 ? " show" : ""}`}>
          <div>
            <b>{Locale.label("people.bulk.selected").replace("{count}", selectedPersonIds.length.toString())}</b>
            {selectedNames && <span className="sel"> · {selectedNames}</span>}
            <Button size="small" onClick={() => setSelectedPersonIds([])}>{Locale.label("people.bulk.clearSelection")}</Button>
          </div>
          {canEdit && selectedPersonIds.length > 0 && (
            <PeopleBulkActions selectedPersonIds={selectedPersonIds} onComplete={handleBulkComplete} onDeleteClick={() => setShowBulkDeleteConfirm(true)} />
          )}
        </div>
      </main>

      <Dialog open={saveListDialog.open} onClose={() => setSaveListDialog((d) => ({ ...d, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle>{Locale.label("people.lists.saveAs")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth autoFocus label={Locale.label("people.lists.name")} value={saveListDialog.name} onChange={(e) => setSaveListDialog((d) => ({ ...d, name: e.target.value }))} />
            <TextField fullWidth label={Locale.label("people.lists.category")} placeholder={Locale.label("people.lists.categoryPlaceholder")} value={saveListDialog.category} onChange={(e) => setSaveListDialog((d) => ({ ...d, category: e.target.value }))} />
            <FormControl fullWidth size="small">
              <InputLabel>{Locale.label("people.lists.sharing")}</InputLabel>
              <Select label={Locale.label("people.lists.sharing")} value={saveListDialog.scope} onChange={(e) => setSaveListDialog((d) => ({ ...d, scope: e.target.value }))} data-testid="save-list-sharing">
                <MenuItem value="org">{Locale.label("people.lists.sharingOrg")}</MenuItem>
                <MenuItem value="private">{Locale.label("people.lists.sharingPrivate")}</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>{Locale.label("people.lists.match")}</InputLabel>
              <Select label={Locale.label("people.lists.match")} value={saveListDialog.match} onChange={(e) => setSaveListDialog((d) => ({ ...d, match: e.target.value as "all" | "any" }))} data-testid="save-list-match">
                <MenuItem value="all">{Locale.label("people.lists.matchAll")}</MenuItem>
                <MenuItem value="any">{Locale.label("people.lists.matchAny")}</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>{Locale.label("people.lists.household")}</InputLabel>
              <Select label={Locale.label("people.lists.household")} value={saveListDialog.householdInclusion} onChange={(e) => setSaveListDialog((d) => ({ ...d, householdInclusion: e.target.value }))} data-testid="save-list-household">
                <MenuItem value="none">{Locale.label("people.lists.householdNone")}</MenuItem>
                <MenuItem value="children">{Locale.label("people.lists.householdChildren")}</MenuItem>
                <MenuItem value="household">{Locale.label("people.lists.householdAll")}</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Checkbox checked={saveListDialog.autoRefresh} onChange={(e) => setSaveListDialog((d) => ({ ...d, autoRefresh: e.target.checked }))} data-testid="save-list-autorefresh" />}
              label={Locale.label("people.lists.autoRefresh")}
            />
            {saveListDialog.autoRefresh && (
              <FormControlLabel
                control={<Checkbox checked={saveListDialog.notifyOnChange} onChange={(e) => setSaveListDialog((d) => ({ ...d, notifyOnChange: e.target.checked }))} data-testid="save-list-notify" />}
                label={Locale.label("people.lists.notifyOnChange")}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveListDialog((d) => ({ ...d, open: false }))}>{Locale.label("common.cancel")}</Button>
          <Button onClick={handleSaveList} variant="contained" disabled={saveListDialog.saving || !saveListDialog.name.trim()} data-testid="save-list-confirm">{Locale.label("common.save")}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showBulkDeleteConfirm} onClose={() => !isBulkDeleting && setShowBulkDeleteConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{Locale.label("people.bulk.deleteSelected")}</DialogTitle>
        <DialogContent>
          <Typography>
            {Locale.label("people.bulk.deleteConfirm").replace("{count}", selectedPersonIds.length.toString())}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBulkDeleteConfirm(false)} variant="outlined" disabled={isBulkDeleting}>
            {Locale.label("common.cancel")}
          </Button>
          <Button onClick={handleBulkDelete} color="error" variant="contained" disabled={isBulkDeleting}>
            {isBulkDeleting ? Locale.label("people.bulk.deleting") : Locale.label("people.bulk.delete")}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={5000} onClose={() => setToast((current) => ({ ...current, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={toast.severity} onClose={() => setToast((current) => ({ ...current, open: false }))} sx={{ width: "100%" }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
});
