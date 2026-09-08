import React, { memo, useCallback, useMemo } from "react";
import { UserHelper, Loading, Permissions, Locale } from "@churchapps/apphelper";
import { type FundInterface } from "@churchapps/helpers";
import { FundEdit } from ".";
import { Link } from "react-router-dom";
import { Box, Table, TableBody, TableCell, TableRow } from "@mui/material";
import { Edit as EditIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { Verb, VerbRow, SectionTitle, plainTableSx } from "./plate";

export const Funds: React.FC = memo(() => {
  const [editFund, setEditFund] = React.useState<FundInterface | null>(null);

  const funds = useQuery<FundInterface[]>({
    queryKey: ["/funds", "GivingApi"],
    placeholderData: []
  });

  const handleFundUpdated = useCallback(() => {
    funds.refetch();
    setEditFund(null);
  }, [funds]);

  const handleEdit = useCallback((fund: FundInterface) => setEditFund(fund), []);
  const canEdit = useMemo(() => UserHelper.checkAccess(Permissions.givingApi.donations.edit), []);
  const canViewIndividual = useMemo(() => UserHelper.checkAccess(Permissions.givingApi.donations.view), []);

  const tableRows = useMemo(() => {
    if (!funds.data) return [];
    if (funds.data.length === 0) {
      return [<TableRow key="0"><TableCell>{Locale.label("donations.funds.noFund")}</TableCell></TableRow>];
    }

    return funds.data.map((f, i) => {
      const editLink = canEdit ? (
        <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} data-cy={`edit-${i}`} onClick={() => handleEdit(f)} />
      ) : null;
      const viewLink = canViewIndividual ? <Link to={"/donations/funds/" + f.id}>{f.name}</Link> : <>{f.name}</>;
      return (
        <TableRow key={f.id || i}>
          <TableCell>{viewLink}</TableCell>
          <TableCell align="right" className="rowActions">{editLink}</TableCell>
        </TableRow>
      );
    });
  }, [funds.data, canEdit, canViewIndividual, handleEdit]);

  if (editFund === null) {
    return (
      <Box id="fundsBox" data-cy="funds-box">
        <SectionTitle sx={{ mt: 0 }}>{Locale.label("donations.funds.fund")}</SectionTitle>
        {funds.isLoading ? <Loading /> : <Table sx={plainTableSx} size="small"><TableBody>{tableRows}</TableBody></Table>}
        <VerbRow>
          {canEdit && <Verb onClick={() => setEditFund({ id: "", name: "", taxDeductible: true })} data-testid="add-fund-button">{Locale.label("common.add")}</Verb>}
        </VerbRow>
      </Box>
    );
  }
  return <FundEdit fund={editFund} updatedFunction={handleFundUpdated} />;
});
