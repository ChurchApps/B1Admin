import React from "react";
import { TextField, Typography } from "@mui/material";
import { ApiHelper, ErrorMessages, Locale, PersonHelper } from "@churchapps/apphelper";
import { type PersonInterface } from "@churchapps/helpers";
import { type PledgeInterface } from "../../helpers";
import { PersonAdd } from "../../components";
import { FormCard } from "../../components/ui";
import { useConfirmDelete } from "../../hooks";

interface Props {
  campaignId: string;
  pledge: PledgeInterface;
  personName?: string;
  updatedFunction: () => void;
}

export const PledgeEdit: React.FC<Props> = (props) => {
  const [person, setPerson] = React.useState<PersonInterface>(null);
  const [amount, setAmount] = React.useState<string>("");
  const [errors, setErrors] = React.useState<string[]>([]);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  React.useEffect(() => {
    setPerson(null);
    setAmount(props.pledge?.amount ? props.pledge.amount.toString() : "");
    setErrors([]);
  }, [props.pledge]);

  const handleSave = () => {
    const result: string[] = [];
    const parsedAmount = parseFloat(amount);
    const personId = props.pledge?.personId || person?.id;
    if (!personId) result.push(Locale.label("donations.pledgeEdit.errPerson"));
    if (!parsedAmount || parsedAmount <= 0) result.push(Locale.label("donations.pledgeEdit.errAmount"));
    setErrors(result);
    if (result.length > 0) return;
    const pledge: PledgeInterface = { ...props.pledge, campaignId: props.campaignId, personId, amount: parsedAmount };
    ApiHelper.post("/pledges", [pledge], "GivingApi").then(() => props.updatedFunction());
  };

  const handleDelete = async () => {
    if (await confirm(Locale.label("donations.pledgeEdit.confirmMsg"))) {
      ApiHelper.delete("/pledges/" + props.pledge.id, "GivingApi").then(() => props.updatedFunction());
    }
  };

  const personSection = props.pledge?.id ? (
    <Typography variant="body1" sx={{ fontWeight: 500 }} data-testid="pledge-person-name">{props.personName}</Typography>
  ) : person ? (
    <Typography variant="body1" sx={{ fontWeight: 500 }} data-testid="pledge-person-name">{person.name?.display}</Typography>
  ) : (
    <PersonAdd getPhotoUrl={PersonHelper.getPhotoUrl} addFunction={(p) => setPerson(p)} />
  );

  return (
    <>
      {ConfirmDialogElement}
      <FormCard
        id="pledgeBox"
        icon="handshake"
        title={props.pledge?.id ? Locale.label("donations.pledgeEdit.editPledge") : Locale.label("donations.pledgeEdit.addPledge")}
        onCancel={props.updatedFunction}
        onSave={handleSave}
        onDelete={props.pledge?.id ? handleDelete : undefined}
        help="docs/b1-admin/donations/">
        <ErrorMessages errors={errors} />
        {personSection}
        <TextField
          fullWidth
          type="number"
          inputProps={{ step: "0.01", min: "0" }}
          label={Locale.label("donations.pledgeEdit.amount")}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          data-testid="pledge-amount-input"
        />
      </FormCard>
    </>
  );
};
