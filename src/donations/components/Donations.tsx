import React from "react";
import { ArrayHelper, ApiHelper, UserHelper, DateHelper, CurrencyHelper, Permissions, UniqueIdHelper, Loading, Locale } from "@churchapps/apphelper";
import { type DonationInterface, type DonationBatchInterface, type FundInterface } from "@churchapps/helpers";
import { Table, TableBody, TableCell, TableRow, TableHead, Typography, Stack, Icon, Chip } from "@mui/material";
import { Edit as EditIcon, Person as PersonIcon, CalendarMonth as DateIcon, VolunteerActivism as DonationIcon, HourglassEmpty as PendingIcon } from "@mui/icons-material";
import { IconText, EmptyState } from "../../components";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { CardWithHeader, ExportButton, hoverRowSx } from "../../components/ui";

interface Props {
  batch: DonationBatchInterface;
  funds: FundInterface[];
  editFunction: (id: string) => void;
  currency?: string
}

export const Donations: React.FC<Props> = ({ currency = "usd", ...props }) => {
  const { batch, funds, editFunction } = props;
  const [donations, setDonations] = React.useState<DonationInterface[] | null>(null);

  // Memoize permission check to avoid repeated calls
  const canEdit = React.useMemo(() => UserHelper.checkAccess(Permissions.givingApi.donations.edit), []);

  const populatePeople = React.useCallback(async (data: DonationInterface[]) => {
    const peopleIds = ArrayHelper.getIds(data, "personId");
    if (peopleIds.length > 0) {
      const people = await ApiHelper.get("/people/ids?ids=" + escape(peopleIds.join(",")), "MembershipApi");
      data.forEach((d) => {
        if (!UniqueIdHelper.isMissing(d.personId)) d.person = ArrayHelper.getOne(people, "id", d.personId);
      });
    }
    setDonations(data);
  }, []);

  const loadData = React.useCallback(() => {
    ApiHelper.get("/donations?batchId=" + batch?.id, "GivingApi").then((data: any) => populatePeople(data));
  }, [batch, populatePeople]);

  const getHeaderActions = React.useCallback(() => {
    if (funds.length === 0 || !donations) return null;
    return <ExportButton data={donations} filename="donations.csv" text={Locale.label("donations.donations.export")} />;
  }, [funds.length, donations]);

  const showEditDonation = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const button = e.currentTarget as HTMLButtonElement;
      const id = button.getAttribute("data-id");
      editFunction(id || "");
    },
    [editFunction]
  );

  // Memoize the total calculation to avoid recalculating on every render
  const donationsTotal = React.useMemo(() => {
    if (!donations || donations.length === 0) return 0;
    return donations.reduce((sum, donation) => sum + (donation.amount || 0), 0);
  }, [donations]);

  const getTableHeader = React.useCallback(() => {
    if (props.funds.length === 0 || !donations || donations.length === 0) {
      return null;
    }

    return (
      <TableHead>
        <TableRow>
          <TableCell>{Locale.label("donations.donations.method")}</TableCell>
          <TableCell>{Locale.label("common.name")}</TableCell>
          <TableCell>{Locale.label("donations.donations.date")}</TableCell>
          <TableCell align="right">{Locale.label("donations.donations.amt")}</TableCell>
          {canEdit && <TableCell align="right" />}
        </TableRow>
      </TableHead>
    );
  }, [donations, props.funds.length, canEdit]);

  const getRows = React.useCallback(() => {
    const rows: React.ReactNode[] = [];

    if (props.funds.length === 0) {
      rows.push(
        <TableRow key="0">
          <EmptyState variant="table" colSpan={5} icon={<DonationIcon />} title={Locale.label("donations.donations.errMsg")} />
        </TableRow>
      );
      return rows;
    }

    if (!donations || donations.length === 0) {
      rows.push(
        <TableRow key="0">
          <EmptyState variant="table" colSpan={5} icon={<DonationIcon />} title={Locale.label("donations.donations.noDonMsg")} />
        </TableRow>
      );
      return rows;
    }

    for (let i = 0; i < donations.length; i++) {
      const d = donations[i];
      const editButton = canEdit ? (
        <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} data-cy={`edit-link-${i}`} data-id={d.id} onClick={showEditDonation} />
      ) : null;

      const isPending = (d as any).status === "pending";
      rows.push(
        <TableRow key={i} sx={{ ...hoverRowSx, opacity: isPending ? 0.8 : 1 }}>
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconText icon={<Icon>receipt</Icon>} iconSize={20} iconColor="primary.main" variant="body2">
                <span style={{ fontWeight: 500, color: "text.primary" }}>{[d.method, d.methodDetails].filter(Boolean).join(" - ") || "—"}</span>
              </IconText>
              {isPending && <Chip icon={<PendingIcon />} label={Locale.label("donations.donations.pending")} size="small" color="warning" variant="outlined" />}
            </Stack>
          </TableCell>
          <TableCell>
            <IconText icon={<PersonIcon />} iconSize={18} iconColor="text.secondary" variant="body2">
              {d.person?.name.display || Locale.label("donations.donations.anon")}
            </IconText>
          </TableCell>
          <TableCell>
            <IconText icon={<DateIcon />} iconSize={18} iconColor="text.secondary" variant="body2">
              {d.donationDate ? DateHelper.prettyDate(new Date(d.donationDate.split("T")[0] + "T00:00:00")) : ""}
            </IconText>
          </TableCell>
          <TableCell align="right">
            <Typography variant="body2" sx={{ fontWeight: 600, color: isPending ? "warning.main" : "success.main" }}>
              {CurrencyHelper.formatCurrencyWithLocale(d.amount || 0, currency)}
            </Typography>
          </TableCell>
          {canEdit && <TableCell align="right" className="rowActions">{editButton}</TableCell>}
        </TableRow>
      );
    }

    rows.push(
      <TableRow key="total" sx={{ borderTop: 2, backgroundColor: "grey.50" }}>
        <TableCell sx={{ fontWeight: "bold", fontSize: 15 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Icon sx={{ color: "primary.main", fontSize: 20 }}>calculate</Icon>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {Locale.label("donations.donations.total")}
            </Typography>
          </Stack>
        </TableCell>
        <TableCell></TableCell>
        <TableCell></TableCell>
        <TableCell align="right">
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "success.main" }}>
            {CurrencyHelper.formatCurrencyWithLocale(donationsTotal, currency)}
          </Typography>
        </TableCell>
        {canEdit && <TableCell></TableCell>}
      </TableRow>
    );

    return rows;
  }, [donations, props.funds.length, canEdit, showEditDonation, donationsTotal]);

  React.useEffect(() => {
    if (!UniqueIdHelper.isMissing(props.batch?.id)) loadData();
  }, [props.batch, loadData]);

  // Memoize the table content to avoid recreating when dependencies haven't changed
  const tableContent = React.useMemo(() => {
    if (!donations) return <Loading />;

    return (
      <CardWithHeader
        icon={<DonationIcon sx={{ color: "primary.main", fontSize: 20 }} />}
        title={Locale.label("donations.donations.don")}
        count={donations?.length}
        actions={getHeaderActions()}
      >
        <Table sx={{ minWidth: 650 }}>
          {getTableHeader()}
          <TableBody>{getRows()}</TableBody>
        </Table>
      </CardWithHeader>
    );
  }, [donations, getRows, getTableHeader, getHeaderActions]);

  return tableContent;
};
