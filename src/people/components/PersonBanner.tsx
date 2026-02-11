import { type PersonInterface } from "@churchapps/helpers";
import { PersonHelper, UserHelper, Permissions, DateHelper, PersonAvatar, ApiHelper } from "@churchapps/apphelper";
import { Typography, IconButton, Stack, Chip } from "@mui/material";
import {
  Edit as EditIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Home as HomeIcon
} from "@mui/icons-material";
import React, { memo, useMemo, useState, useEffect } from "react";
import { StatusChip } from "../../components";

interface Props {
  person: PersonInterface;
  togglePhotoEditor?: (show: boolean) => void;
  onEdit?: () => void;
}

export const PersonBanner = memo((props: Props) => {
  const { person, togglePhotoEditor, onEdit } = props;

  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    if (person?.id) {
      ApiHelper.get("/userchurch/personid/" + person.id, "MembershipApi")
        .then((data: { email: string } | null) => {
          setUserEmail(data?.email || "");
        })
        .catch(() => setUserEmail(""));
    }
  }, [person?.id]);

  const canEdit = useMemo(() => UserHelper.checkAccess(Permissions.membershipApi.people.edit), []);

  const membershipStatus = useMemo(() => {
    if (!person?.membershipStatus) return null;
    return <StatusChip status={person.membershipStatus} size="small" />;
  }, [person?.membershipStatus]);

  const quickStats = useMemo(() => {
    if (!person) return [];
    const stats = [];

    if (person.birthDate) {
      const age = PersonHelper.getAge(person.birthDate);
      stats.push({ label: "Age", value: `${age}` });
    }

    if (person.gender && person.gender !== "Unspecified") {
      stats.push({ label: "Gender", value: person.gender });
    }

    if (person.maritalStatus && person.maritalStatus !== "Single") {
      let value = person.maritalStatus;
      if (person.anniversary) {
        value += ` (${DateHelper.getShortDate(DateHelper.toDate(person.anniversary))})`;
      }
      stats.push({ label: "Marital Status", value });
    }

    return stats;
  }, [person]);

  const contactInfo = useMemo(() => {
    if (!person?.contactInfo) return [];
    const info = [];

    if (person.contactInfo.email) {
      info.push({
        icon: <EmailIcon sx={{ color: "#fff", fontSize: 16 }} />,
        value: person.contactInfo.email,
        action: () => (window.location.href = `mailto:${person.contactInfo.email}`)
      });
    }

    const phone = person.contactInfo.mobilePhone || person.contactInfo.homePhone || person.contactInfo.workPhone;
    if (phone) {
      info.push({
        icon: <PhoneIcon sx={{ color: "#fff", fontSize: 16 }} />,
        value: phone
      });
    }

    if (person.contactInfo.address1) {
      const addressParts = [person.contactInfo.address1, person.contactInfo.address2, [person.contactInfo.city, person.contactInfo.state, person.contactInfo.zip].filter(Boolean).join(", ")].filter(
        Boolean
      );

      info.push({
        icon: <HomeIcon sx={{ color: "#fff", fontSize: 16 }} />,
        value: addressParts.join(", ")
      });
    }

    return info;
  }, [person]);

  if (!person) return null;

  return (
    <div style={{ backgroundColor: "var(--c1l2)", color: "#FFF", padding: "24px", position: "relative" }}>
      <Stack direction={{ xs: "column", lg: "row" }} spacing={{ xs: 2, md: 4 }} alignItems={{ xs: "flex-start", md: "center" }} sx={{ width: "100%" }}>
        {/* Column 1: Avatar + Name + Status */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ flexShrink: 0 }}>
          <div style={{ border: "3px solid #FFF", borderRadius: "50%" }}>
            <PersonAvatar person={person} size="responsive" onClick={() => canEdit && togglePhotoEditor?.(true)} />
          </div>
          <Stack spacing={1} sx={{ minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography
                sx={{
                  color: "#FFF",
                  fontWeight: 400,
                  mb: 0,
                  wordBreak: "break-word",
                  fontSize: { xs: "1.7rem", sm: "2rem", md: "2.5rem" },
                  lineHeight: 1.1
                }}>
                {person?.name?.display}
              </Typography>
              {canEdit && (
                <IconButton size="small" sx={{ color: "#FFF" }} onClick={onEdit}>
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {membershipStatus}
              {userEmail && (
                <Chip
                  label="Has login"
                  size="small"
                  title={userEmail}
                  sx={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#fff" }}
                />
              )}
              {quickStats.map((stat) => (
                <Typography key={`${stat.label}-${stat.value}`} variant="body2" sx={{ color: "#FFF", opacity: 0.9 }}>
                  {stat.value}
                </Typography>
              ))}
            </Stack>
          </Stack>
        </Stack>

        {/* Column 2: Contact Info */}
        <Stack spacing={0.5} sx={{ position: { xs: "static", lg: "absolute" }, left: { lg: "50%" }, top: { lg: "50%" }, transform: { lg: "translateY(-50%)" }, minWidth: 0 }}>
          {contactInfo.map((info) => (
            <Stack key={info.value} direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
              {info.icon}
              <Typography
                variant="body2"
                sx={{
                  color: "#FFF",
                  cursor: info.action ? "pointer" : "default",
                  "&:hover": info.action ? { textDecoration: "underline" } : {},
                  wordBreak: "break-word",
                  fontSize: { xs: "0.875rem", md: "1rem" }
                }}
                onClick={info.action}>
                {info.value}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </div>
  );
});
