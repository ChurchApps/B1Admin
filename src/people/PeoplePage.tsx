import React, { memo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Permissions, UserHelper, type PersonInterface, type SearchCondition } from "@churchapps/helpers";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { PeopleSearchResults, PeopleColumns } from "./components";
import { Grid, Box, Typography, Card, Stack, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, CircularProgress, Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Select } from "@mui/material";
import { B1AdminPersonHelper } from "../helpers";
import { PeopleSearch } from "./components/PeopleSearch";
import { SavedLists, type ListConditions, type ListInterface } from "./components/SavedLists";
import { buildRulesFromCriteria } from "./components/listRules";
import { type ActiveFilter } from "./components/AdvancedPeopleSearch";
import { People as PeopleIcon, PersonAdd as PersonAddIcon, Print as PrintIcon, BookmarkAdd as SaveListIcon, BarChart as BarChartIcon } from "@mui/icons-material";
import { PageHeader } from "@churchapps/apphelper";
import { AppIconButton } from "../components/ui/AppIconButton";
import { CountChip, ExportButton } from "../components/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AISearch } from "./components/AISearch";
import { PeopleBulkActions } from "./components/bulk/PeopleBulkActions";
import { type BulkResult } from "./components/bulk/BulkFieldDialog";

interface BulkDeleteResponse {
  success: boolean;
  deletedIds: string[];
  count: number;
}

const INITIAL_PAGE_SIZE = 50;

export const PeoplePage = memo(() => {
  const [searchResults, setSearchResults] = React.useState<PersonInterface[] | null>(null);
  const [selectedColumns, setSelectedColumns] = React.useState<string[]>(["photo", "displayName"]);
  const [isSearchPerformed, setIsSearchPerformed] = React.useState(false);
  const [selectedListFilters, setSelectedListFilters] = React.useState<Record<string, ActiveFilter> | undefined>(undefined);
  // The query behind the current results (advanced filter spec or simple/AI conditions),
  // so it can be saved as a List. Null when results aren't from a search.
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

  const refetch = useCallback(() => {
    peopleQuery.refetch();
  }, [peopleQuery]);

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
    else sc.splice(index, 1);
    localStorage.setItem("selectedColumns", JSON.stringify(sc));
    setSelectedColumns(sc);
  };

  React.useEffect(() => {
    if (localStorage.getItem("selectedColumns")) {
      setSelectedColumns(JSON.parse(localStorage.getItem("selectedColumns")));
    } else {
      localStorage.setItem("selectedColumns", JSON.stringify(["photo", "displayName"]));
    }
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
    // Match-any / household-inclusion semantics only exist server-side; those lists
    // evaluate via the rules engine. Plain all-match lists keep the client flow so
    // the advanced panel stays seeded and editable.
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
      // Advanced list: seed the advanced panel (new ref each time so re-selecting re-seeds).
      setSaveableCriteria(conditions);
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
      // The rules tree is the canonical server-evaluable query; the conditions blob is
      // kept alongside so the advanced panel can be re-seeded for editing.
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

  const togglePersonSelection = useCallback((personId: string) => {
    if (personId === currentPersonId) return;
    setSelectedPersonIds((current) => (current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId]));
  }, [currentPersonId]);

  const toggleAllVisiblePeople = useCallback(() => {
    if (!searchResults) return;

    const visibleIds = searchResults.map((person) => person.id).filter((id): id is string => !!id && id !== currentPersonId);
    if (visibleIds.length === 0) return;

    setSelectedPersonIds((current) => {
      const allVisibleSelected = visibleIds.every((id) => current.includes(id));
      if (allVisibleSelected) return current.filter((id) => !visibleIds.includes(id));

      const merged = new Set([...current, ...visibleIds]);
      return Array.from(merged);
    });
  }, [currentPersonId, searchResults]);

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
        message: `${response?.count || deletedIds.length} people deleted successfully`,
        severity: "success"
      });
    } catch (error) {
      setToast({
        open: true,
        message: error instanceof Error ? error.message : "Unable to delete selected people",
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

  const getExportData = (people: PersonInterface[]) => {
    return people.map((person) => {
      const { name, contactInfo, ...rest } = person;

      return {
        ...rest,

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
    });
  };

  return (
    <>
      <PageHeader
        title={Locale.label("people.peoplePage.searchPpl")}
        subtitle={
          searchResults
            ? isSearchPerformed
              ? Locale.label("people.peoplePage.peopleFound").replace("{count}", searchResults.length.toString())
              : Locale.label("people.peoplePage.showingMembers").replace("{count}", searchResults.length.toString())
            : peopleQuery.isLoading
              ? Locale.label("people.peoplePage.loading")
              : Locale.label("people.peoplePage.noPeopleFound")
        }>
        <Button
          variant="outlined"
          sx={{
            color: "#FFF",
            borderColor: "rgba(255,255,255,0.5)",
            mr: 1,
            "&:hover": {
              borderColor: "#FFF",
              backgroundColor: "rgba(255,255,255,0.1)"
            }
          }}
          startIcon={<BarChartIcon />}
          onClick={() => navigate("/people/demographics")}
          data-testid="demographics-button">
          {Locale.label("people.demographics.title")}
        </Button>
        {canEdit && (
          <Button
            variant="outlined"
            sx={{
              color: "#FFF",
              borderColor: "rgba(255,255,255,0.5)",
              "&:hover": {
                borderColor: "#FFF",
                backgroundColor: "rgba(255,255,255,0.1)"
              }
            }}
            startIcon={<PersonAddIcon />}
            onClick={() => {
              const createPersonSection = document.querySelector('[data-cy="createPerson"]') || document.querySelector(".create-person") || document.getElementById("createPersonForm");
              if (createPersonSection) {
                createPersonSection.scrollIntoView({ behavior: "smooth", block: "start" });
                setTimeout(() => {
                  const firstInput = createPersonSection.querySelector("input") as HTMLElement;
                  if (firstInput) firstInput.focus();
                }, 500);
              } else {
                window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
              }
            }}>
            {Locale.label("people.peoplePage.addPerson")}
          </Button>
        )}
      </PageHeader>

      {/* Main Content */}
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 3 }}>
            <PeopleSearch
              updateSearchResults={(people) => {
                setSearchResults(people);
                setIsSearchPerformed(true);
              }}
              resetSearchResults={resetSearchResults}
              updatedFunction={refetch}
              initialFilters={selectedListFilters}
              onReportCriteria={setSaveableCriteria}
            />
            <SavedLists onSelect={handleSelectList} canManage={canEdit} />
            <AISearch
              updateSearchResults={(people) => {
                setSearchResults(people);
                setIsSearchPerformed(true);
              }}
              onReportCriteria={setSaveableCriteria}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 9 }}>
            <Card>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: "var(--border-light)" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PeopleIcon sx={{ color: "primary.main", fontSize: 20 }} />
                    <Typography variant="h6">{isSearchPerformed ? Locale.label("people.peoplePage.searchResults") : Locale.label("people.peoplePage.allMembers")}</Typography>
                    {searchResults && searchResults.length > 0 && <CountChip count={searchResults.length} />}
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {canEdit && selectedPersonIds.length > 0 && (
                      <>
                        <Typography variant="body2" color="text.secondary">{Locale.label("people.bulk.selected").replace("{count}", selectedPersonIds.length.toString())}</Typography>
                        <Button size="small" onClick={() => setSelectedPersonIds([])}>{Locale.label("people.bulk.clearSelection")}</Button>
                        <PeopleBulkActions selectedPersonIds={selectedPersonIds} onComplete={handleBulkComplete} onDeleteClick={() => setShowBulkDeleteConfirm(true)} />
                      </>
                    )}
                    {canEdit && saveableCriteria && isSearchPerformed && searchResults && searchResults.length > 0 && (
                      <Button size="small" variant="outlined" startIcon={<SaveListIcon />} onClick={() => setSaveListDialog({ ...emptySaveListDialog, open: true })} sx={{ mr: 1 }}>
                        {Locale.label("people.lists.saveAs")}
                      </Button>
                    )}
                    {searchResults && <ExportButton data={getExportData(searchResults || [])} filename="people.csv" text={Locale.label("people.peoplePage.export")} />}
                    <AppIconButton label={Locale.label("people.peoplePage.printDirectory")} icon={<PrintIcon />} tone="card" onClick={() => window.open("/people/print-directory", "_blank")} />
                    <PeopleColumns selectedColumns={selectedColumns} toggleColumn={handleToggleColumn} columns={columns} />
                  </Stack>
                </Stack>
              </Box>
              <Box>
                <PeopleSearchResults
                  people={searchResults}
                  columns={columns}
                  selectedColumns={selectedColumns}
                  updateSearchResults={(people) => setSearchResults(people)}
                  updatedFunction={refetch}
                  canSelectPeople={canEdit}
                  selectedPersonIds={selectedPersonIds}
                  togglePersonSelection={togglePersonSelection}
                  toggleAllVisiblePeople={toggleAllVisiblePeople}
                  currentPersonId={currentPersonId}
                />
                {!isSearchPerformed && !loadAll && maybeMore && allPeople.length > 0 && (
                  <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                    <Button variant="outlined" onClick={handleShowAll} disabled={peopleQuery.isFetching} startIcon={peopleQuery.isFetching ? <CircularProgress size={16} /> : null}>
                      {Locale.label("people.peoplePage.showAll")}
                    </Button>
                  </Box>
                )}
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Box>

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
        <DialogTitle>Delete Selected People</DialogTitle>
        <DialogContent>
          <Typography>
            {`Are you sure you want to delete ${selectedPersonIds.length} selected people? This action cannot be undone.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBulkDeleteConfirm(false)} variant="outlined" disabled={isBulkDeleting}>
            {Locale.label("common.cancel") || "Cancel"}
          </Button>
          <Button onClick={handleBulkDelete} color="error" variant="contained" disabled={isBulkDeleting}>
            {isBulkDeleting ? "Deleting..." : "Delete"}
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
