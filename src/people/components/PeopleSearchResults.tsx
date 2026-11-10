import React, { useState, useEffect, useCallback, useMemo, memo, type JSX } from "react";
import { Link, useNavigate } from "react-router-dom";
import { B1AdminPersonHelper } from ".";
import { CreatePerson } from "../../components";
import { type PersonInterface } from "@churchapps/helpers";
import { PersonHelper, Loading, ApiHelper, ArrayHelper, DateHelper, Locale, PersonAvatar } from "@churchapps/apphelper";
import { Table, TableBody, TableRow, TableCell, Typography, Stack, Box, Checkbox } from "@mui/material";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { EmptyState, Pill, SortableTableHead, StatusChip, Surface, type SortableColumn } from "../../components/ui";
import { useCampuses } from "../../hooks/useCampuses";
import { useConfirmDelete } from "../../hooks";
import { formatFieldValue } from "../../helpers/PersonFieldHelper";
import { Delete as DeleteIcon, Email as EmailIcon, Phone as PhoneIcon } from "@mui/icons-material";

interface Props {
  people: PersonInterface[];
  columns: { key: string; label: string; shortName: string }[];
  selectedColumns: string[];
  updateSearchResults?: (people: PersonInterface[]) => void;
  updatedFunction?: () => void;
  canSelectPeople?: boolean;
  selectedPersonIds?: string[];
  togglePersonSelection?: (personId: string) => void;
  toggleAllVisiblePeople?: () => void;
  currentPersonId?: string;
  showCreatePerson?: boolean;
}

const PeopleSearchResults = memo(function PeopleSearchResults(props: Props) {
  const { people, columns, selectedColumns } = props;
  const navigate = useNavigate();

  const [sortDirection, setSortDirection] = useState<boolean | null>(null);
  const [currentSortedCol, setCurrentSortedCol] = useState<string>("");
  const [optionalColumns, setOptionalColumns] = React.useState<any[]>([]);
  const [formSubmissions, setFormSubmissions] = React.useState<any[]>([]);
  // Custom person field values by fieldId, then personId.
  const [personFieldValues, setPersonFieldValues] = React.useState<Record<string, Record<string, string>>>({});
  const { confirm, ConfirmDialogElement } = useConfirmDelete();
  const campuses = useCampuses();
  const campusMap = useMemo(() => {
    const map: Record<string, string> = {};
    campuses.forEach((c) => { if (c.id) map[c.id] = c.name || ""; });
    return map;
  }, [campuses]);
  const selectedPersonIds = props.selectedPersonIds || [];
  const visiblePersonIds = useMemo(() => people?.map((person) => person.id).filter((id): id is string => !!id && id !== props.currentPersonId) || [], [people, props.currentPersonId]);
  const allVisibleSelected = visiblePersonIds.length > 0 && visiblePersonIds.every((id) => selectedPersonIds.includes(id));
  const someVisibleSelected = visiblePersonIds.some((id) => selectedPersonIds.includes(id));

  const navigateToPersonCreate = useCallback(
    (person: PersonInterface) => {
      navigate("/people/" + person.id);
    },
    [navigate]
  );

  const getPhotoJSX = useCallback((p: PersonInterface) => {
    const photoUrl = PersonHelper.getPhotoUrl(p);
    const hasCustomPhoto = photoUrl !== "/images/sample-profile.png";

    if (hasCustomPhoto) {
      return (
        <a href={photoUrl} target="_blank" rel="noopener noreferrer">
          <PersonAvatar person={p} size="medium" />
        </a>
      );
    }

    return <PersonAvatar person={p} size="medium" />;
  }, []);

  const getAnswerValue = useCallback(
    (personId: string, questionId: string): string => {
      if (questionId.startsWith("personField_")) return personFieldValues[questionId.substring(12)]?.[personId] || "";
      for (const fs of formSubmissions) {
        if (fs.contentId === personId) {
          const answer = ArrayHelper.getOne(fs.answers, "questionId", questionId);
          if (answer) return answer.value || "";
        }
      }
      return "";
    },
    [formSubmissions, personFieldValues]
  );

  const getAnswer = useCallback(
    (p: PersonInterface, key: string) => {
      const value = getAnswerValue(p.id || "", key);
      const personField = optionalColumns.find((c) => c.id === key)?.personField;
      if (personField) return <>{formatFieldValue(personField, value)}</>;
      return value ? <>{value}</> : <></>;
    },
    [getAnswerValue, optionalColumns]
  );

  const handleDelete = useCallback(
    async (personId: string) => {
      if (!(await confirm(Locale.label("people.personEdit.confirmMsg")))) return;
      const peopleArray = [...people];
      ApiHelper.delete("/people/" + personId, "MembershipApi").then(() => {
        const idx = ArrayHelper.getIndex(peopleArray, "id", personId);
        if (idx > -1) {
          peopleArray.splice(idx, 1);
          props.updateSearchResults?.(peopleArray);
          if (props.updatedFunction) props.updatedFunction();
        }
      });
    },
    [people, props, confirm]
  );

  const getColumn = useCallback(
    (p: PersonInterface, key: string) => {
      let result = <></>;
      switch (key) {
        case "photo": result = getPhotoJSX(p); break;
        case "displayName":
          result = (
            <Box>
              <Link to={"/people/" + (p.id || "")} style={{ textDecoration: "none" }}>
                <Typography variant="body2" sx={{ color: "primary.main", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}>
                  {p?.name?.display}
                </Typography>
              </Link>
              {(p.membershipStatus || p.householdRole === "Child") && (
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                  {p.membershipStatus && <StatusChip status={p.membershipStatus} />}
                  {p.householdRole === "Child" && <Pill data-testid="person-child-tag">{Locale.label("people.householdEdit.child")}</Pill>}
                </Stack>
              )}
            </Box>
          );
          break;
        case "lastName": result = <>{p?.name?.last}</>; break;
        case "firstName": result = <>{p?.name?.first}</>; break;
        case "middleName": result = <>{p?.name?.middle}</>; break;
        case "address": result = <>{p?.contactInfo?.address1}</>; break;
        case "city": result = <>{p?.contactInfo?.city}</>; break;
        case "state": result = <>{p?.contactInfo?.state}</>; break;
        case "zip": result = <>{p?.contactInfo?.zip}</>; break;
        case "email":
          result = (
            <Stack direction="row" spacing={1} alignItems="center">
              {p?.contactInfo?.email && (
                <>
                  <EmailIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                  <Typography variant="body2">{p?.contactInfo?.email}</Typography>
                </>
              )}
            </Stack>
          );
          break;
        case "phone":
          result = (
            <Stack direction="row" spacing={1} alignItems="center">
              {(p?.contactInfo?.mobilePhone || p?.contactInfo?.homePhone || p?.contactInfo?.workPhone) && (
                <>
                  <PhoneIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                  <Typography variant="body2">{p?.contactInfo?.mobilePhone || p?.contactInfo?.homePhone || p?.contactInfo?.workPhone}</Typography>
                </>
              )}
            </Stack>
          );
          break;
        case "birthDate": result = <>{p.birthDate == null ? "" : B1AdminPersonHelper.getDateStringFromDate(new Date(p.birthDate))}</>; break;
        case "birthDay": result = <>{B1AdminPersonHelper.getBirthDay(p)}</>; break;
        case "age":
          result = (
            <Typography variant="body2" color="text.secondary">
              {p.birthDate == null ? "" : PersonHelper.getAge(new Date(p.birthDate))}
            </Typography>
          );
          break;
        case "gender": result = <>{p.gender}</>; break;
        case "membershipStatus":
          result = <StatusChip status={p.membershipStatus || "Unknown"} />;
          break;
        case "maritalStatus": result = <>{p.maritalStatus}</>; break;
        case "campus": result = <>{p.campusId ? (campusMap[p.campusId] || "") : ""}</>; break;
        case "anniversary": result = <>{p.anniversary == null ? "" : B1AdminPersonHelper.getDateStringFromDate(new Date(p.anniversary))}</>; break;
        case "nametagNotes": result = <>{p.nametagNotes}</>; break;
        case "dateAdded": result = <>{(p as any).dateAdded ? DateHelper.prettyDate(new Date((p as any).dateAdded)) : ""}</>; break;
        case "deleteOption":
          result = (
            <AppIconButton
              intent="remove"
              label={Locale.label("people.peopleSearchResults.deletePersonAria").replace("{name}", p?.name?.display || "")}
              icon={<DeleteIcon />}
              onClick={(e) => {
                e.stopPropagation();
                if (p.id) handleDelete(p.id.toString());
              }}
              data-testid={`delete-person-button-${p.id}`}
            />
          );
          break;
        case key: result = getAnswer(p, key); break;
      }

      return result;
    },
    [getPhotoJSX, handleDelete, getAnswer, campusMap]
  );

  const getColumns = useCallback(
    (p: PersonInterface) => {
      const result: JSX.Element[] = [];
      columns.forEach((c) => {
        if (selectedColumns.indexOf(c.key) > -1) {
          if (c.key === "deleteOption") result.push(<TableCell key={c.key} align="right" className="rowActions">{getColumn(p, c.key)}</TableCell>);
          else if (c.key === "age") result.push(<TableCell key={c.key} align="right">{getColumn(p, c.key)}</TableCell>);
          else result.push(<TableCell key={c.key}>{getColumn(p, c.key)}</TableCell>);
        }
      });
      if (optionalColumns.length > 0) {
        optionalColumns.forEach((c) => {
          if (selectedColumns.indexOf(c.id) > -1) {
            result.push(<TableCell key={c.id}>{getColumn(p, c.id)}</TableCell>);
          }
        });
      }
      return result;
    },
    [columns, selectedColumns, optionalColumns, getColumn]
  );

  useEffect(() => {
    ApiHelper.get("/forms?contentType=person", "MembershipApi").then((data: any) => {
      if (data.length > 0) {
        const personForms = data.filter((f: any) => f.contentType === "person");
        if (personForms.length > 0) {
          personForms.forEach((f: any) => {
            ApiHelper.get("/questions?formId=" + f.id, "MembershipApi").then((q: any) => setOptionalColumns((prevState) => [...prevState, ...q]));
          });
        }
      }
    });
    ApiHelper.get("/personfields", "MembershipApi")
      .then((fields: any) => setOptionalColumns((prevState) => [...prevState, ...(fields || []).map((f: any) => ({ id: "personField_" + f.id, title: f.name, personField: f }))]))
      .catch(() => { });
  }, []);

  const loadedSubmissionFormIds = React.useRef<Set<string>>(new Set());
  useEffect(() => {
    optionalColumns.forEach((c) => {
      if (selectedColumns.indexOf(c.id) === -1 || !c.formId || loadedSubmissionFormIds.current.has(c.formId)) return;
      loadedSubmissionFormIds.current.add(c.formId);
      ApiHelper.get(`/formsubmissions/formId/${c.formId}/?include=questions,answers`, "MembershipApi").then((fs: any) => setFormSubmissions((prevState) => [...prevState, ...(fs || [])]));
    });
  }, [optionalColumns, selectedColumns]);

  const loadedPersonFieldIds = React.useRef<Set<string>>(new Set());
  useEffect(() => {
    optionalColumns.forEach((c) => {
      const fieldId = c.personField?.id;
      if (!fieldId || selectedColumns.indexOf(c.id) === -1 || loadedPersonFieldIds.current.has(fieldId)) return;
      loadedPersonFieldIds.current.add(fieldId);
      ApiHelper.get("/personfieldvalues/field/" + fieldId, "MembershipApi").then((values: any) => {
        const byPerson: Record<string, string> = {};
        (values || []).forEach((v: any) => { if (v.personId) byPerson[v.personId] = v.value || ""; });
        setPersonFieldValues((prevState) => ({ ...prevState, [fieldId]: byPerson }));
      }).catch(() => { });
    });
  }, [optionalColumns, selectedColumns]);

  // Sort value as shown in the cell: Phone shows the first of mobile/home/work and Campus shows the name.
  const getSortValue = useCallback((p: any, key: string): any => {
    if (optionalColumns.some((c) => c.id === key)) return getAnswerValue(p.id, key);
    if (key === "phone") return p.contactInfo?.mobilePhone || p.contactInfo?.homePhone || p.contactInfo?.workPhone || "";
    if (key === "campus") return p.campusId ? (campusMap[p.campusId] || "") : "";
    if (key === "displayName") return p.name?.display || p.displayName || "";
    // Birthday (no year) sorts by month and day; the year is padded out.
    if (key === "birthDay") return p.birthDate ? new Date(2000, p.birthDate.getMonth(), p.birthDate.getDate()) : null;
    return p[key];
  }, [optionalColumns, getAnswerValue, campusMap]);

  const sortTableByKey = useCallback(
    (key: string) => {
      // The first click on a column sorts ascending (A-Z, youngest first); clicking again reverses it.
      const asc = currentSortedCol === key ? !sortDirection : true;
      setCurrentSortedCol(key);
      setSortDirection(asc);

      const compare = (a: any, b: any): number => {
        if (typeof a?.getTime === "function" && typeof b?.getTime === "function") return a.getTime() - b.getTime();
        const numA = Number(a);
        const numB = Number(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return String(a).localeCompare(String(b), undefined, { sensitivity: "base", numeric: true });
      };

      const sortedPeople = [...people].sort((a: any, b: any) => {
        const valA = getSortValue(a, key);
        const valB = getSortValue(b, key);
        // Blanks always go last, whichever way the column is sorted.
        const blankA = valA === null || valA === undefined || valA === "";
        const blankB = valB === null || valB === undefined || valB === "";
        if (blankA && blankB) return 0;
        if (blankA) return 1;
        if (blankB) return -1;
        const result = compare(valA, valB);
        return asc ? result : -result;
      });

      if (props.updateSearchResults) {
        props.updateSearchResults(sortedPeople);
      }
    },
    [people, props, getSortValue, currentSortedCol, sortDirection]
  );

  const rows = useMemo(() => {
    return (
      people?.map((p) => {
        const isCurrentUser = !!p.id && p.id === props.currentPersonId;
        return (
          <TableRow
            key={p.id}
            sx={{ cursor: "pointer" }}
            onClick={() => navigate(`/people/${p.id}`)}>
            {props.canSelectPeople && (
              <TableCell padding="checkbox">
                <Checkbox
                  checked={!!p.id && selectedPersonIds.includes(p.id)}
                  disabled={isCurrentUser}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => {
                    if (p.id) props.togglePersonSelection?.(p.id);
                  }}
                  inputProps={{ "aria-label": isCurrentUser ? `Cannot select ${p?.name?.display || "current user"}` : `Select ${p?.name?.display || "person"}` }}
                />
              </TableCell>
            )}
            {getColumns(p)}
          </TableRow>
        );
      }) || []
    );
  }, [people, getColumns, navigate, props.canSelectPeople, props.currentPersonId, props.togglePersonSelection, selectedPersonIds]);

  const headColumns = useMemo<SortableColumn[]>(() => {
    const result: SortableColumn[] = [];
    columns.forEach((c) => {
      if (selectedColumns.indexOf(c.key) > -1) {
        result.push({
          key: c.key,
          label: c.key === "deleteOption" ? "" : c.shortName,
          sortable: c.key !== "photo" && c.key !== "deleteOption",
          minWidth: c.key === "photo" ? 88 : 160,
          align: c.key === "deleteOption" || c.key === "age" ? "right" : undefined
        });
      }
    });
    optionalColumns.forEach((c) => {
      if (selectedColumns.indexOf(c.id) > -1) result.push({ key: c.id, label: c.title, sortable: true, minWidth: 160 });
    });
    return result;
  }, [columns, selectedColumns, optionalColumns]);

  const headers = useMemo(() => (
    <SortableTableHead
      columns={headColumns}
      sortBy={currentSortedCol}
      sortDirection={sortDirection ? "asc" : "desc"}
      onSort={sortTableByKey}
      leading={props.canSelectPeople ? (
        <TableCell key="bulkSelect" padding="checkbox">
          <Checkbox
            checked={allVisibleSelected}
            indeterminate={!allVisibleSelected && someVisibleSelected}
            onChange={() => props.toggleAllVisiblePeople?.()}
            slotProps={{ input: { "aria-label": "Select all visible people" } }}
          />
        </TableCell>
      ) : undefined}
    />
  ), [
    allVisibleSelected,
    headColumns,
    currentSortedCol,
    sortDirection,
    props.canSelectPeople,
    props.toggleAllVisiblePeople,
    someVisibleSelected,
    sortTableByKey
  ]);

  const getResults = () => {
    if (people.length === 0) {
      return (
        <EmptyState variant="plain" title={Locale.label("people.peopleSearchResults.noResMsg")} />
      );
    }

    return (
      <Box
        sx={{
          width: "100%",
          overflowX: "auto",
          overflowY: "hidden",
          WebkitOverflowScrolling: "touch"
        }}>
        <Table
          id="peopleTable"
          sx={{
            width: "max-content",
            minWidth: "100%",
            tableLayout: "auto",
            "& .MuiTableCell-root": {
              verticalAlign: "top",
              whiteSpace: "nowrap"
            }
          }}>
          {headers}
          <TableBody>{rows}</TableBody>
        </Table>
      </Box>
    );
  };

  if (!people) return <Loading />;
  return (
    <Box>
      {ConfirmDialogElement}
      {getResults()}
      {props.showCreatePerson !== false && (
        <Surface id="createPersonForm" sx={{ mt: 3 }}>
          <CreatePerson onCreate={navigateToPersonCreate} />
        </Surface>
      )}
    </Box>
  );
});

export { PeopleSearchResults };
