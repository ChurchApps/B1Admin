"use client";

import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import React, { useState, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { ErrorMessages, InputBox } from "@churchapps/apphelper";
import { FundDonations } from "@churchapps/apphelper-donations";
import { ApiHelper, DateHelper, CurrencyHelper, Locale, DonationHelper } from "../../helpers";
import type { FundDonationInterface, FundInterface, PersonInterface, StripeDonationInterface, StripePaymentMethod, UserInterface, ChurchInterface } from "@churchapps/helpers";
import { Grid, Alert, TextField, Button, FormControl, InputLabel, Select, MenuItem, FormGroup, FormControlLabel, Checkbox, Typography } from "@mui/material";
import type { PaperProps } from "@mui/material/Paper";

interface Props {
  churchId: string;
  mainContainerCssProps?: PaperProps;
  showHeader?: boolean;
  recaptchaSiteKey: string;
  churchLogo?: string;
}

export const NonAuthDonationInner: React.FC<Props> = ({ mainContainerCssProps, showHeader = true, ...props }) => {
  const stripe = useStripe();
  const elements = useElements();
  const formStyling = { style: { base: { fontSize: "18px" } } };
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [fundsTotal, setFundsTotal] = React.useState<number>(0);
  const [transactionFee, setTransactionFee] = React.useState<number>(0);
  const [total, setTotal] = React.useState<number>(0);
  const [errors, setErrors] = React.useState([]);
  const [fundDonations, setFundDonations] = React.useState<FundDonationInterface[]>([]);
  const [funds, setFunds] = React.useState<FundInterface[]>([]);
  const [donationComplete, setDonationComplete] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);
  const [donationType, setDonationType] = useState<"once" | "recurring">("once");
  const [interval, setInterval] = useState("one_month");
  const [startDate, setStartDate] = useState(new Date().toDateString());
  const [captchaResponse, setCaptchaResponse] = useState("");
  const [church, setChurch] = useState<ChurchInterface>();
  const [gateway, setGateway] = React.useState(null);
  const [searchParams, setSearchParams] = React.useState<any>();
  const captchaRef = useRef(null);

  const getUrlParam = (param: string) => {
    if (typeof window === "undefined") return null;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  };

  const init = () => {
    const fundId = getUrlParam("fundId");
    const amount = getUrlParam("amount");
    setSearchParams({ fundId, amount });

    ApiHelper.get("/funds/churchId/" + props.churchId, "GivingApi").then((data) => {
      setFunds(data);
      if (fundId && fundId !== "") {
        const selectedFund = data.find((f: FundInterface) => f.id === fundId);
        if (selectedFund) {
          setFundDonations([{ fundId: selectedFund.id, amount: amount && amount !== "" ? parseFloat(amount) : 0 }]);
        }
      } else if (data.length) {
        setFundDonations([{ fundId: data[0].id }]);
      }
    });
    ApiHelper.get("/churches/" + props.churchId, "MembershipApi").then((data) => {
      setChurch(data);
    });
    ApiHelper.get("/gateways/churchId/" + props.churchId, "GivingApi").then((data) => {
      if (data.length !== 0) setGateway(data[0]);
    });
  };

  const handleCaptchaChange = () => {
    const captchaToken = captchaRef.current.getValue();
    ApiHelper.postAnonymous("/donate/captcha-verify", { token: captchaToken }, "GivingApi").then((data) => {
      setCaptchaResponse(data.response);
    });
  };

  const handleCheckChange = (e: React.SyntheticEvent<Element, Event>, checked: boolean) => {
    const totalPayAmount = checked ? fundsTotal + transactionFee : fundsTotal;
    setTotal(totalPayAmount);
  };

  // const handleAutoPayFee = () => {
  //   let totalPayAmount = fundsTotal + transactionFee;
  //   setTotal(totalPayAmount);
  // }

  const handleSave = async () => {
    if (validate()) {
      setProcessing(true);
      ApiHelper.post("/users/loadOrCreate", { userEmail: email, firstName, lastName }, "MembershipApi")
        .catch((ex) => {
          setErrors([ex.toString()]);
          setProcessing(false);
        })
        .then(async (userData) => {
          const personData = { churchId: props.churchId, firstName, lastName, email };
          const person = await ApiHelper.post("/people/loadOrCreate", personData, "MembershipApi");
          saveCard(userData, person);
        });
    }
  };

  const saveCard = async (user: UserInterface, person: PersonInterface) => {
    const cardData = elements.getElement(CardElement);
    const stripePM = await stripe.createPaymentMethod({ type: "card", card: cardData });
    if (stripePM.error) {
      setErrors([stripePM.error.message]);
      setProcessing(false);
    } else {
      const pm = { id: stripePM.paymentMethod.id, personId: person?.id, email: email, name: person?.name?.display, churchId: props.churchId };
      await ApiHelper.post("/paymentmethods/addcard", pm, "GivingApi").then((result) => {
        if (result?.raw?.message) {
          setErrors([result.raw.message]);
          setProcessing(false);
        } else {
          const d: { paymentMethod: StripePaymentMethod; customerId: string } = result;
          saveDonation(d.paymentMethod, d.customerId, person);
        }
      });
    }
  };

  const saveDonation = async (paymentMethod: StripePaymentMethod, customerId: string, person?: PersonInterface) => {
    const donation: StripeDonationInterface = {
      amount: total,
      id: paymentMethod.id,
      customerId: customerId,
      type: paymentMethod.type,
      churchId: props.churchId,
      funds: [],
      person: {
        id: person?.id,
        email: person?.contactInfo?.email,
        name: person?.name?.display
      }
    };

    if (donationType === "recurring") {
      donation.billing_cycle_anchor = +new Date(startDate);
      donation.interval = DonationHelper.getInterval(interval);
    }

    for (const fundDonation of fundDonations) {
      const fund = funds.find((fund: FundInterface) => fund.id === fundDonation.fundId);
      donation.funds.push({ id: fundDonation.fundId, amount: fundDonation.amount || 0, name: fund.name });
    }

    const churchObj = {
      name: church.name,
      subDomain: church.subDomain,
      churchURL: typeof window !== "undefined" && window.location.origin,
      logo: props?.churchLogo
    };

    let results;
    if (donationType === "once") results = await ApiHelper.post("/donate/charge/", { ...donation, church: churchObj }, "GivingApi");
    if (donationType === "recurring") results = await ApiHelper.post("/donate/subscribe/", { ...donation, church: churchObj }, "GivingApi");

    if (results?.status === "succeeded" || results?.status === "pending" || results?.status === "active") {
      setDonationComplete(true);
    }
    if (results?.raw?.message) {
      setErrors([results?.raw?.message]);
      setProcessing(false);
    }
    setProcessing(false);
  };

  const validate = () => {
    const result = [];
    if (!firstName) result.push(Locale.label("donation.donationForm.validate.firstName"));
    if (!lastName) result.push(Locale.label("donation.donationForm.validate.lastName"));
    if (!email) result.push(Locale.label("donation.donationForm.validate.email"));
    if (fundsTotal === 0) result.push(Locale.label("donation.donationForm.validate.amount"));
    if (result.length === 0) {
      if (!email.match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w+)+$/)) result.push(Locale.label("donation.donationForm.validate.validEmail")); //eslint-disable-line
    }
    //Todo - make sure the account doesn't exist. (loadOrCreate?)
    setErrors(result);
    return result.length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = e.currentTarget.value;
    switch (e.currentTarget.name) {
      case "firstName": setFirstName(val); break;
      case "lastName": setLastName(val); break;
      case "email": setEmail(val); break;
      case "startDate": setStartDate(val); break;
      case "interval": setInterval(val); break;
    }
  };

  const handleFundDonationsChange = async (fd: FundDonationInterface[]) => {
    setFundDonations(fd);
    let totalAmount = 0;
    const selectedFunds: any = [];
    for (const fundDonation of fd) {
      totalAmount += fundDonation.amount || 0;
      const fund = funds.find((fund: FundInterface) => fund.id === fundDonation.fundId);
      selectedFunds.push({ id: fundDonation.fundId, amount: fundDonation.amount || 0, name: fund.name });
    }
    setFundsTotal(totalAmount);
    setTotal(totalAmount);

    const fee = await getTransactionFee(totalAmount);
    setTransactionFee(fee);

    if (gateway && gateway.payFees === true) {
      setTotal(totalAmount + fee);
    }
  };

  const getTransactionFee = async (amount: number) => {
    if (amount > 0) {
      try {
        const response = await ApiHelper.post("/donate/fee?churchId=" + props.churchId, { type: "creditCard", amount }, "GivingApi");
        return response.calculatedFee;
      } catch (error) {
        console.log("Error calculating transaction fee:", error);
        return 0;
      }
    } else {
      return 0;
    }
  };

  const getFundList = () => {
    if (funds) {
      return (
        <>
          <hr />
          <h4>{Locale.label("donation.donationForm.funds")}</h4>
          <FundDonations fundDonations={fundDonations} funds={funds} params={searchParams} updatedFunction={handleFundDonationsChange} />
        </>
      );
    }
  };

  React.useEffect(init, []);

  // React.useEffect(() => { gateway && gateway.payFees === true && handleAutoPayFee() }, [fundDonations]);

  if (donationComplete) return <Alert severity="success">{Locale.label("donation.donationForm.thankYou")}</Alert>;
  else {
    return (
      <InputBox
        headerIcon={showHeader ? "volunteer_activism" : ""}
        headerText={showHeader ? Locale.label("donation.nonAuthDonation.donate") : ""}
        saveFunction={handleSave}
        saveText={Locale.label("donation.nonAuthDonation.donate")}
        isSubmitting={processing || !captchaResponse || captchaResponse === "robot"}
        mainContainerCssProps={mainContainerCssProps}>
        <ErrorMessages errors={errors} />
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Button
              aria-label="single-donation"
              size="small"
              fullWidth
              style={{ minHeight: "50px" }}
              variant={donationType === "once" ? "contained" : "outlined"}
              onClick={() => setDonationType("once")}>
              {Locale.label("donation.donationForm.make")}
            </Button>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Button
              aria-label="recurring-donation"
              size="small"
              fullWidth
              style={{ minHeight: "50px" }}
              variant={donationType === "recurring" ? "contained" : "outlined"}
              onClick={() => setDonationType("recurring")}>
              {Locale.label("donation.donationForm.makeRecurring")}
            </Button>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label={Locale.label("person.firstName")} name="firstName" value={firstName} onChange={handleChange} placeholder={Locale.label("placeholders.person.firstName")} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label={Locale.label("person.lastName")} name="lastName" value={lastName} onChange={handleChange} placeholder={Locale.label("placeholders.person.lastName")} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label={Locale.label("person.email")} name="email" value={email} onChange={handleChange} placeholder={Locale.label("placeholders.person.simpleEmail")} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <ReCAPTCHA sitekey={props.recaptchaSiteKey} ref={captchaRef} onChange={handleCaptchaChange} />
          </Grid>
        </Grid>
        <div style={{ padding: 10, border: "1px solid var(--border-main)", borderRadius: 5, marginTop: 10 }}>
          <CardElement options={formStyling} />
        </div>
        {donationType === "recurring" && (
          <Grid container spacing={3} style={{ marginTop: 0 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>{Locale.label("donation.donationForm.frequencyLabel")}</InputLabel>
                <Select
                  label={Locale.label("donation.donationForm.frequencyLabel")}
                  name="interval"
                  aria-label="interval"
                  value={interval}
                  onChange={(e) => {
                    setInterval(e.target.value);
                  }}>
                  <MenuItem value="one_week">{Locale.label("donation.donationForm.weekly")}</MenuItem>
                  <MenuItem value="two_week">{Locale.label("donation.donationForm.biWeekly")}</MenuItem>
                  <MenuItem value="one_month">{Locale.label("donation.donationForm.monthly")}</MenuItem>
                  <MenuItem value="three_month">{Locale.label("donation.donationForm.quarterly")}</MenuItem>
                  <MenuItem value="one_year">{Locale.label("donation.donationForm.annually")}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                name="startDate"
                type="date"
                aria-label="startDate"
                label={Locale.label("donation.donationForm.startDate")}
                value={DateHelper.formatHtml5Date(new Date(startDate))}
                onChange={handleChange}
              />
            </Grid>
          </Grid>
        )}
        {getFundList()}
        <div>
          {fundsTotal > 0 && (
            <>
              {gateway && gateway.payFees === true ? (
                <Typography fontSize={14} fontStyle="italic">
                  *{Locale.label("donation.donationForm.fees").replace("{}", CurrencyHelper.formatCurrency(transactionFee))}
                </Typography>
              ) : (
                <FormGroup>
                  <FormControlLabel
                    control={<Checkbox />}
                    name="transaction-fee"
                    label={Locale.label("donation.donationForm.cover").replace("{}", CurrencyHelper.formatCurrency(transactionFee))}
                    onChange={handleCheckChange}
                  />
                </FormGroup>
              )}
              <p>{Locale.label("donation.donationForm.totalAmount").replace("{}", CurrencyHelper.formatCurrency(total))}</p>
            </>
          )}
        </div>
      </InputBox>
    );
  }
};
