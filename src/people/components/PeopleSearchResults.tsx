import React, { useState, useEffect, useCallback, useMemo, memo, type JSX } from "react";
import { Link, useNavigate } from "react-router-dom";
import { B1AdminPersonHelper } from ".";
import { CreatePerson } from "../../components";
import { type PersonInterface } from "@churchapps/helpers";
import { PersonHelper, Loading, ApiHelper, ArrayHelper, Locale, PersonAvatar } from "@churchapps/apphelper";
import {
  Table, TableBody, TableRow, TableCell, TableHead, Tooltip, Icon, IconButton, Typography, Stack, Box, Chip, Card 
} from "@mui/material";
import { Email as EmailIcon, Phone as PhoneIcon } from "@mui/icons-material";

interface Props {
  people: PersonInterface[];
  columns: { key: string; label: string; shortName: string }[];
  selectedColumns: string[];
  updateSearchResults?: (people: PersonInterface[]) => void;
  updatedFunction?: () => void;
}

const PeopleSearchResults = memo(function PeopleSearchResults(props: Props) {
  const { people, columns, selectedColumns } = props;
  const navigate = useNavigate();

  const [sortDirection, setSortDirection] = useState<boolean | null>(null);
  const [currentSortedCol, setCurrentSortedCol] = useState<string>("");
  const [optionalColumns, setOptionalColumns] = React.useState<any[]>([]);
  const [formSubmissions, setFormSubmissions] = React.useState<any[]>([]);

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
      for (const fs of formSubmissions) {
        if (fs.submittedBy === personId) {
          const answer = ArrayHelper.getOne(fs.answers, "questionId", questionId);
          if (answer) return answer.value || "";
        }
      }
      return "";
    },
    [formSubmissions]
  );

  const getAnswer = useCallback(
    (p: PersonInterface, key: string) => {
      const value = getAnswerValue(p.id, key);
      return value ? <>{value}</> : <></>;
    },
    [getAnswerValue]
  );

  const handleDelete = useCallback(
    (personId: string) => {
      const peopleArray = [...people];
      ApiHelper.delete("/people/" + personId, "MembershipApi").then(() => {
        const idx = ArrayHelper.getIndex(peopleArray, "id", personId);
        if (idx > -1) {
          peopleArray.splice(idx, 1);
          props?.updateSearchResults(peopleArray);
          if (props.updatedFunction) props.updatedFunction();
        }
      });
    },
    [people, props]
  );

  const getColumn = useCallback(
    (p: PersonInterface, key: string) => {
      let result = <></>;
      switch (key) {
        case "photo":
          result = getPhotoJSX(p);
          break;
        case "displayName":
          result = (
            <Box>
              <Link to={"/people/" + (p.id || "")} style={{ textDecoration: "none" }}>
                <Typography variant="h6" sx={{ color: "primary.main", "&:hover": { textDecoration: "underline" } }}>
                  {p.name.display}
                </Typography>
              </Link>
              {p.membershipStatus && (
                <Chip
                  label={p.membershipStatus}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontSize: "0.75rem",
                    mt: 0.5,
                    backgroundColor: p.membershipStatus === "Member" ? "#e8f5e9" : p.membershipStatus === "Visitor" ? "#fff3e0" : "#f5f5f5",
                    color: p.membershipStatus === "Member" ? "#2e7d32" : p.membershipStatus === "Visitor" ? "#e65100" : "#616161",
                  }}
                />
              )}
            </Box>
          );
          break;
        case "lastName":
          result = <>{p.name.last}</>;
          break;
        case "firstName":
          result = <>{p.name.first}</>;
          break;
        case "middleName":
          result = <>{p.name.middle}</>;
          break;
        case "address":
          result = <>{p.contactInfo.address1}</>;
          break;
        case "city":
          result = <>{p.contactInfo.city}</>;
          break;
        case "state":
          result = <>{p.contactInfo.state}</>;
          break;
        case "zip":
          result = <>{p.contactInfo.zip}</>;
          break;
        case "email":
          result = (
            <Stack direction="row" spacing={1} alignItems="center">
              {p.contactInfo.email && (
                <>
                  <EmailIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                  <Typography variant="body2">{p.contactInfo.email}</Typography>
                </>
              )}
            </Stack>
          );
          break;
        case "phone":
          result = (
            <Stack direction="row" spacing={1} alignItems="center">
              {(p.contactInfo.mobilePhone || p.contactInfo.homePhone || p.contactInfo.workPhone) && (
                <>
                  <PhoneIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                  <Typography variant="body2">{p.contactInfo.mobilePhone || p.contactInfo.homePhone || p.contactInfo.workPhone}</Typography>
                </>
              )}
            </Stack>
          );
          break;
        case "birthDate":
          result = <>{p.birthDate === null ? "" : B1AdminPersonHelper.getDateStringFromDate(p.birthDate)}</>;
          break;
        case "birthDay":
          result = <>{B1AdminPersonHelper.getBirthDay(p)}</>;
          break;
        case "age":
          result = (
            <Typography variant="body2" color="text.secondary">
              {p.birthDate === null ? "" : PersonHelper.getAge(p.birthDate)}
            </Typography>
          );
          break;
        case "gender":
          result = <>{p.gender}</>;
          break;
        case "membershipStatus":
          result = (
            <Chip
              label={p.membershipStatus || "Unknown"}
              size="small"
              variant="outlined"
              sx={{
                fontSize: "0.75rem",
                backgroundColor: p.membershipStatus === "Member" ? "#e8f5e9" : p.membershipStatus === "Visitor" ? "#fff3e0" : "#f5f5f5",
                color: p.membershipStatus === "Member" ? "#2e7d32" : p.membershipStatus === "Visitor" ? "#e65100" : "#616161",
              }}
            />
          );
          break;
        case "maritalStatus":
          result = <>{p.maritalStatus}</>;
          break;
        case "anniversary":
          result = <>{p.anniversary === null ? "" : B1AdminPersonHelper.getDateStringFromDate(p.anniversary)}</>;
          break;
        case "nametagNotes":
          result = <>{p.nametagNotes}</>;
          break;
        case "deleteOption":
          result = (
            <Tooltip title={`Delete ${p.name.display}`} arrow placement="left-start">
              <IconButton
                sx={{ color: "#c84545" }}
                onClick={() => {
                  if (p.id) handleDelete(p.id.toString());
                }}
                data-testid={`delete-person-button-${p.id}`}
                aria-label={`Delete ${p.name.display}`}>
                <Icon>delete</Icon>
              </IconButton>
            </Tooltip>
          );
          break;
        case key:
          result = getAnswer(p, key);
          break;
      }

      return result;
    },
    [getPhotoJSX, handleDelete, getAnswer]
  );

  const getColumns = useCallback(
    (p: PersonInterface) => {
      const result: JSX.Element[] = [];
      columns.forEach((c) => {
        if (selectedColumns.indexOf(c.key) > -1) {
          result.push(<TableCell key={c.key}>{getColumn(p, c.key)}</TableCell>);
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
    ApiHelper.get("/forms?contentType=person", "MembershipApi").then((data) => {
      if (data.length > 0) {
        const personForms = data.filter((f: any) => f.contentType === "person");
        if (personForms.length > 0) {
          personForms.forEach((f: any) => {
            ApiHelper.get("/questions?formId=" + f.id, "MembershipApi").then((q) => setOptionalColumns((prevState) => [...prevState, ...q]));
            ApiHelper.get(`/formsubmissions/formId/${f.id}/?include=questions,answers`, "MembershipApi").then((fs) => setFormSubmissions((prevState) => [...prevState, ...fs]));
          });
        }
      } else setOptionalColumns([]);
    });
  }, []);

  const sortTableByKey = useCallback(
    (key: string) => {
      // Toggle direction if same column, otherwise start descending
      const asc = currentSortedCol === key ? !sortDirection : false;
      setCurrentSortedCol(key);
      setSortDirection(asc);

      // Check if this is a custom field
      const isCustomField = optionalColumns.some((c) => c.id === key);

      const sortedPeople = [...people].sort(function (a: any, b: any) {
        // Handle custom field sorting
        if (isCustomField) {
          const valA = getAnswerValue(a.id, key);
          const valB = getAnswerValue(b.id, key);
          if (!valA && !valB) return 0;
          if (!valA) return 1;
          if (!valB) return -1;
          const upperA = valA.toUpperCase();
          const upperB = valB.toUpperCase();
          if (upperA < upperB) return asc ? 1 : -1;
          if (upperA > upperB) return asc ? -1 : 1;
          return 0;
        }

        if (a[key] === null) return Infinity; // if value is null push to the end of array
        if (key === "birthDay") {
          //there's no 'birthDay' property in the people object; instead use birthDate to sort
          if (a["birthDate"] === null && b["birthDate"] === null) return 0;
          if (a["birthDate"] === null) return 1;
          if (b["birthDate"] === null) return -1;
        }

        if (typeof a[key]?.getMonth === "function") return asc ? a[key] - b[key] : b[key] - a[key];

        if (key === "birthDay") {
          //to sort dates as per the month
          if (asc) {
            if (a["birthDate"]?.getMonth() !== b["birthDate"]?.getMonth()) return a["birthDate"]?.getMonth() - b["birthDate"]?.getMonth();
            else {
              return a["birthDate"]?.getDate() - b["birthDate"]?.getDate();
            }
          } else {
            if (b["birthDate"]?.getMonth() !== a["birthDate"]?.getMonth()) return b["birthDate"]?.getMonth() - a["birthDate"]?.getMonth();
            else {
              return b["birthDate"]?.getDate() - a["birthDate"]?.getDate();
            }
          }
        }

        const parsedNum = parseInt(a[key]);
        if (!isNaN(parsedNum)) {
          return asc ? a[key] - b[key] : b[key] - a[key];
        }

        const valA = a[key]?.toUpperCase();
        const valB = b[key]?.toUpperCase();
        if (valA < valB) return asc ? 1 : -1;
        if (valA > valB) return asc ? -1 : 1;
        // equal
        return 0;
      });

      if (props.updateSearchResults) {
        props.updateSearchResults(sortedPeople);
      }
    },
    [people, props, optionalColumns, getAnswerValue, currentSortedCol, sortDirection]
  );

  const rows = useMemo(() => {
    return (
      people?.map((p) => (
        <TableRow
          key={p.id}
          sx={{
            "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" },
            cursor: "pointer",
          }}
          onClick={() => navigate(`/people/${p.id}`)}>
          {getColumns(p)}
        </TableRow>
      )) || []
    );
  }, [people, getColumns, navigate]);

  const headers = useMemo(() => {
    const result: JSX.Element[] = [];
    columns.forEach((c) => {
      if (selectedColumns.indexOf(c.key) > -1) {
        result.push(
          <th key={c.key} onClick={() => sortTableByKey(c.key)}>
            <span style={{ float: "left" }}>{c.shortName}</span>
            {c.key !== "photo" && c.key !== "deleteOption" && (
              <div style={{ display: "flex" }}>
                <div style={{ marginTop: "5px" }} className={`${sortDirection && currentSortedCol === c.key ? "sortAscActive" : "sortAsc"}`}></div>
                <div style={{ marginTop: "14px" }} className={`${!sortDirection && currentSortedCol === c.key ? "sortDescActive" : "sortDesc"}`}></div>
              </div>
            )}
          </th>
        );
      }
    });

    if (optionalColumns.length > 0) {
      optionalColumns.forEach((c) => {
        const key = c.id;
        if (selectedColumns.indexOf(key) > -1) {
          result.push(
            <th key={key} onClick={() => sortTableByKey(key)}>
              <span style={{ float: "left" }}>{c.title}</span>
              <div style={{ display: "flex" }}>
                <div style={{ marginTop: "5px" }} className={`${sortDirection && currentSortedCol === key ? "sortAscActive" : "sortAsc"}`}></div>
                <div style={{ marginTop: "14px" }} className={`${!sortDirection && currentSortedCol === key ? "sortDescActive" : "sortDesc"}`}></div>
              </div>
            </th>
          );
        }
      });
    }

    return (
      <TableHead>
        <TableRow>{result}</TableRow>
      </TableHead>
    );
  }, [columns, selectedColumns, optionalColumns, sortDirection, currentSortedCol, sortTableByKey]);

  const getResults = () => {
    if (people.length === 0) {
      return (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            {Locale.label("people.peopleSearchResults.noResMsg")}
          </Typography>
        </Box>
      );
    }

    return (
      <Table
        id="peopleTable"
        sx={{
          "& .MuiTableCell-root": {
            borderBottom: "1px solid rgba(224, 224, 224, 1)",
            py: 2,
          },
          "& .MuiTableHead-root .MuiTableCell-root": {
            backgroundColor: "#fafafa",
            fontWeight: 600,
          },
        }}>
        {headers}
        <TableBody>{rows}</TableBody>
      </Table>
    );
  };

  if (!people) return <Loading />;
  return (
    <Box>
      {getResults()}
      <Card sx={{ mt: 3 }} id="createPersonForm">
        <Box sx={{ p: 3 }}>
          <CreatePerson onCreate={navigateToPersonCreate} updatedFunction={props.updatedFunction} />
        </Box>
      </Card>
    </Box>
  );
});

export { PeopleSearchResults };
