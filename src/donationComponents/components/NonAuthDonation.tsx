"use client";

import React from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import { ApiHelper } from "../../helpers";
import { NonAuthDonationInner } from "./NonAuthDonationInner";
import type { PaperProps } from "@mui/material/Paper";

interface Props {
  churchId: string;
  mainContainerCssProps?: PaperProps;
  showHeader?: boolean;
  recaptchaSiteKey: string;
  churchLogo?: string;
}

export const NonAuthDonation: React.FC<Props> = ({ mainContainerCssProps, showHeader, ...props }) => {
  const [stripePromise, setStripe] = React.useState<Promise<Stripe>>(null);

  const init = () => {
    ApiHelper.get("/gateways/churchId/" + props.churchId, "GivingApi").then((data) => {
      if (data.length && data[0]?.publicKey) {
        setStripe(loadStripe(data[0].publicKey));
      }
    });
  };

  React.useEffect(init, []);

  return (
    <>
      <Elements stripe={stripePromise}>
        <NonAuthDonationInner
          churchId={props.churchId}
          mainContainerCssProps={mainContainerCssProps}
          showHeader={showHeader}
          recaptchaSiteKey={props.recaptchaSiteKey}
          churchLogo={props?.churchLogo}
        />
      </Elements>
    </>
  );
};
