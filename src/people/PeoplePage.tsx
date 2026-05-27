import React, { memo, useCallback, useMemo } from "react";
import { Permissions, UserHelper, type PersonInterface } from "@churchapps/helpers";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { PeopleSearchResults, PeopleColumns } from "./components";
import { ExportLink } from "@churchapps/apphelper";
import { Grid, Box, Typography, Card, Stack, Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert } from "@mui/material";
import { B1AdminPersonHelper } from "../helpers";
import { PeopleSearch } from "./components/PeopleSearch";
import { Search as SearchIcon, People as PeopleIcon, PersonAdd as PersonAddIcon, FileDownload as ExportIcon, Print as PrintIcon } from "@mui/icons-material";
import { PageHeader } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { AISearch } from "./components/AISearch";
import { PeopleBulkActions } from "./components/bulk/PeopleBulkActions";
import { type BulkResult } from "./components/bulk/BulkFieldDialog";

interface BulkDeleteResponse {
  success: boolean;
  deletedIds: string[];
  count: number;
}

const DEFAULT_SELECTED_COLUMNS = ["photo", "displayName"];
const SELECTED_COLUMNS_STORAGE_KEY = "people_selected_columns";

const getStorageKey = (churchId: string, personId: string) => {
  if (churchId && personId) return `${SELECTED_COLUMNS_STORAGE_KEY}_${churchId}_${personId}`;
  return SELECTED_COLUMNS_STORAGE_KEY;
};

const saveSelectedColumns = (storageKey: string, selectedColumns: string[]) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(selectedColumns));
  } catch {
    // localStorage can be unavailable in restricted browser contexts.
  }
};

const parseSavedColumns = (savedColumns: string | null) => {
  if (!savedColumns) return null;

  try {
    const parsed = JSON.parse(savedColumns);
    if (Array.isArray(parsed) && parsed.every((column) => typeof column === "string")) return parsed;
  } catch {
    return null;
  }

  return null;
};

const loadSelectedColumns = (storageKey: string) => {
  try {
    return parseSavedColumns(localStorage.getItem(storageKey));
  } catch {
    return null;
  }
};

const sortPeopleAlphabetically = (people: PersonInterface[]) => {
  return [...people].sort((a, b) => {
    const lastNameCompare = (a.name?.last || a.name?.display || "").localeCompare(b.name?.last || b.name?.display || "", undefined, { sensitivity: "base" });
    if (lastNameCompare !== 0) return lastNameCompare;

    const firstNameCompare = (a.name?.first || "").localeCompare(b.name?.first || "", undefined, { sensitivity: "base" });
    if (firstNameCompare !== 0) return firstNameCompare;

    return (a.name?.display || "").localeCompare(b.name?.display || "", undefined, { sensitivity: "base" });
  });
};

export const PeoplePage = memo(() => {
  const [searchResults, setSearchResults] = React.useState<PersonInterface[] | null>(null);
  const [selectedColumns, setSelectedColumns] = React.useState<string[]>(DEFAULT_SELECTED_COLUMNS);
  const [isSearchPerformed, setIsSearchPerformed] = React.useState(false);
  const [selectedPersonIds, setSelectedPersonIds] = React.useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = React.useState(false);
  const [toast, setToast] = React.useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success"
  });
  const canEdit = UserHelper.checkAccess(Permissions.membershipApi.people.edit);
  const currentPersonId = UserHelper.currentUserChurch?.person?.id || "";
  const currentChurchId = UserHelper.currentUserChurch?.church?.id || "";
  const selectedColumnsStorageKey = useMemo(() => getStorageKey(currentChurchId, currentPersonId), [currentChurchId, currentPersonId]);

  const directoryPeople = useQuery<PersonInterface[]>({
    queryKey: ["/people", "MembershipApi", "directory"],
    queryFn: async () => {
      const data: PersonInterface[] = await ApiHelper.get("/people", "MembershipApi");
      return sortPeopleAlphabetically(data.map((person: PersonInterface) => B1AdminPersonHelper.getExpandedPersonObject(person)));
    }
  });

  const refetch = useCallback(() => {
    directoryPeople.refetch();
  }, [directoryPeople]);

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
    { key: "maritalStatus", label: Locale.label("person.maritalStatus"), shortName: Locale.label("person.married") },
    { key: "anniversary", label: Locale.label("person.anniversary"), shortName: Locale.label("person.anniversary") },
    { key: "nametagNotes", label: Locale.label("people.peoplePage.nameNote"), shortName: Locale.label("common.notes") },
    { key: "deleteOption", label: Locale.label("people.peoplePage.deleteOp"), shortName: Locale.label("common.delete") }
  ];

  const handleToggleColumn = useCallback((key: string) => {
    setSelectedColumns((current) => {
      const updatedColumns = current.includes(key) ? current.filter((column) => column !== key) : [...current, key];
      saveSelectedColumns(selectedColumnsStorageKey, updatedColumns);
      return updatedColumns;
    });
  }, [selectedColumnsStorageKey]);

  // Removed getEditContent - functionality moved to header

  React.useEffect(() => {
    const savedColumns = loadSelectedColumns(selectedColumnsStorageKey);
    if (savedColumns) {
      setSelectedColumns(savedColumns);
      return;
    }

    const defaultColumns = [...DEFAULT_SELECTED_COLUMNS];
    setSelectedColumns(defaultColumns);
    saveSelectedColumns(selectedColumnsStorageKey, defaultColumns);
  }, [selectedColumnsStorageKey]);

  const resetSearchResults = useCallback(() => {
    setSearchResults(directoryPeople.data || []);
    setIsSearchPerformed(false);
  }, [directoryPeople.data]);

  const updateSearchResults = useCallback((people: PersonInterface[]) => {
    setSearchResults(sortPeopleAlphabetically(people));
    setIsSearchPerformed(true);
  }, []);

  React.useEffect(() => {
    if (directoryPeople.data && !isSearchPerformed) {
      setSearchResults(directoryPeople.data);
    }
  }, [directoryPeople.data, isSearchPerformed]);

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
      setSelectedPersonIds([]);
      setShowBulkDeleteConfirm(false);
      setToast({
        open: true,
        message: `${response?.count || deletedIds.length} people deleted successfully`,
        severity: "success"
      });
      await directoryPeople.refetch();
    } catch (error) {
      setToast({
        open: true,
        message: error instanceof Error ? error.message : "Unable to delete selected people",
        severity: "error"
      });
    } finally {
      setIsBulkDeleting(false);
    }
  }, [directoryPeople, selectedPersonIds]);

  const handleBulkComplete = useCallback((result: BulkResult) => {
    setToast({ open: true, message: result.message, severity: result.severity });
    if (result.severity !== "success") return;

    if (result.fieldUpdates) {
      const selectedSet = new Set(selectedPersonIds);
      setSearchResults((current) => current?.map((person) => (person.id && selectedSet.has(person.id) ? { ...person, ...result.fieldUpdates } : person)) || null);
    }
    setSelectedPersonIds([]);
    directoryPeople.refetch();
  }, [selectedPersonIds, directoryPeople]);

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
        title={Locale.label("components.wrapper.ppl")}
        subtitle={
          searchResults
            ? Locale.label("people.peoplePage.peopleFound").replace("{count}", searchResults.length.toString())
            : directoryPeople.isLoading
              ? Locale.label("people.peoplePage.loading")
              : Locale.label("people.peoplePage.noPeopleFound")
        }>
        <SearchIcon
          sx={{
            fontSize: 32,
            color: "rgba(255,255,255,0.8)",
            cursor: "pointer",
            "&:hover": {
              color: "#FFF",
              transform: "scale(1.1)"
            },
            transition: "all 0.2s ease",
            mr: 2
          }}
          onClick={() => {
            const searchPanel = document.getElementById("peopleSearch");
            if (searchPanel) {
              searchPanel.scrollIntoView({ behavior: "smooth", block: "start" });
              // Focus on the search input after scrolling
              setTimeout(() => {
                const searchInput = document.getElementById("searchText") || document.querySelector('[data-testid="people-search-input"]');
                if (searchInput) {
                  (searchInput as HTMLElement).focus();
                }
              }, 500);
            }
          }}
        />
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
              updateSearchResults={updateSearchResults}
              resetSearchResults={resetSearchResults}
              updatedFunction={refetch}
            />
            <AISearch
              updateSearchResults={updateSearchResults}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 9 }}>
            <Card>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PeopleIcon />
                    <Typography variant="h6">{isSearchPerformed ? Locale.label("people.peoplePage.searchResults") : Locale.label("components.wrapper.ppl")}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {canEdit && selectedPersonIds.length > 0 && (
                      <>
                        <Typography variant="body2" color="text.secondary">{Locale.label("people.bulk.selected").replace("{count}", selectedPersonIds.length.toString())}</Typography>
                        <Button size="small" onClick={() => setSelectedPersonIds([])}>{Locale.label("people.bulk.clearSelection")}</Button>
                        <PeopleBulkActions selectedPersonIds={selectedPersonIds} onComplete={handleBulkComplete} onDeleteClick={() => setShowBulkDeleteConfirm(true)} />
                      </>
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
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Box>

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
