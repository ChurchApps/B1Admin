import React, { memo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Permissions, UserHelper, type PersonInterface, type SearchCondition } from "@churchapps/helpers";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { PeopleSearchResults, PeopleColumns } from "./components";
import { ExportLink } from "@churchapps/apphelper";
import { Grid, Box, Typography, Card, Stack, Button, IconButton, Tooltip, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, CircularProgress } from "@mui/material";
import { B1AdminPersonHelper } from "../helpers";
import { PeopleSearch } from "./components/PeopleSearch";
import { SavedLists, type ListConditions } from "./components/SavedLists";
import { type ActiveFilter } from "./components/AdvancedPeopleSearch";
import { People as PeopleIcon, PersonAdd as PersonAddIcon, FileDownload as ExportIcon, Print as PrintIcon, BookmarkAdd as SaveListIcon, BarChart as BarChartIcon } from "@mui/icons-material";
import { PageHeader } from "@churchapps/apphelper";
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
  const [saveListDialog, setSaveListDialog] = React.useState<{ open: boolean; name: string; category: string; saving: boolean }>({ open: false, name: "", category: "", saving: false });
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

  const handleSelectList = useCallback((conditions: ListConditions) => {
    setSaveableCriteria(conditions);
    setIsSearchPerformed(true);
    if (Array.isArray(conditions)) {
      // Simple/AI list: run the stored conditions directly against current data.
      setSelectedListFilters(undefined);
      ApiHelper.post("/people/advancedSearch", conditions, "MembershipApi").then((data) => {
        setSearchResults(data.map((d: PersonInterface) => B1AdminPersonHelper.getExpandedPersonObject(d)));
      });
    } else {
      // Advanced list: seed the advanced panel (new ref each time so re-selecting re-seeds).
      setSelectedListFilters({ ...conditions });
    }
  }, []);

  React.useEffect(() => {
    const conditions = (location.state as { searchConditions?: SearchCondition[] } | null)?.searchConditions;
    if (conditions && conditions.length > 0) {
      handleSelectList(conditions);
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveList = useCallback(async () => {
    if (!saveableCriteria || !saveListDialog.name.trim()) return;
    setSaveListDialog((d) => ({ ...d, saving: true }));
    try {
      await ApiHelper.post("/lists", [{ name: saveListDialog.name.trim(), category: saveListDialog.category.trim() || undefined, conditions: saveableCriteria }], "MembershipApi");
      queryClient.invalidateQueries({ queryKey: ["/lists", "MembershipApi"] });
      setSaveListDialog({ open: false, name: "", category: "", saving: false });
    } catch {
      setSaveListDialog((d) => ({ ...d, saving: false }));
    }
  }, [saveableCriteria, saveListDialog.name, saveListDialog.category, queryClient]);

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
              // Scroll to the CreatePerson component at the bottom
              const createPersonSection = document.querySelector('[data-cy="createPerson"]') || document.querySelector(".create-person") || document.getElementById("createPersonForm");
              if (createPersonSection) {
                createPersonSection.scrollIntoView({ behavior: "smooth", block: "start" });
                // Focus on first input field after scrolling
                setTimeout(() => {
                  const firstInput = createPersonSection.querySelector("input") as HTMLElement;
                  if (firstInput) {
                    firstInput.focus();
                  }
                }, 500);
              } else {
                // Fallback: scroll to bottom of page
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
              <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PeopleIcon />
                    <Typography variant="h6">{isSearchPerformed ? Locale.label("people.peoplePage.searchResults") : Locale.label("people.peoplePage.allMembers")}</Typography>
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
                      <Button size="small" variant="outlined" startIcon={<SaveListIcon />} onClick={() => setSaveListDialog({ open: true, name: "", category: "", saving: false })} sx={{ mr: 1 }}>
                        {Locale.label("people.lists.saveAs")}
                      </Button>
                    )}
                    {searchResults && (
                      <Button size="small" variant="outlined" startIcon={<ExportIcon />} component={ExportLink} data={getExportData(searchResults || [])} filename="people.csv" sx={{ mr: 1 }}>
                        {Locale.label("people.peoplePage.export")}
                      </Button>
                    )}
                    <Tooltip title={Locale.label("people.peoplePage.printDirectory")}>
                      <IconButton size="small" onClick={() => window.open("/people/print-directory", "_blank")} sx={{ color: "text.secondary" }}>
                        <PrintIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveListDialog((d) => ({ ...d, open: false }))}>{Locale.label("common.cancel")}</Button>
          <Button onClick={handleSaveList} variant="contained" disabled={saveListDialog.saving || !saveListDialog.name.trim()}>{Locale.label("common.save")}</Button>
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
