"use client";

import React from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import { ApiHelper } from "../../helpers";
import { NonAuthDonationInner } from "./NonAuthDonationInner";
import { NonAuthDonation as SharedNonAuthDonation, DonationHelper } from "@churchapps/apphelper-donations";
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
  const [hasKF, setHasKF] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  const init = () => {
    ApiHelper.get("/gateways/churchId/" + props.churchId, "GivingApi").then((data) => {
      if (data.length) {
        const kfGateway = DonationHelper.findGatewayByProvider(data, "kingdomfunding");
        if (kfGateway) {
          setHasKF(true);
        } else if (data[0]?.publicKey) {
          setStripe(loadStripe(data[0].publicKey));
        }
      }
      setLoaded(true);
    });
  };

  React.useEffect(init, []);

  if (!loaded) return null;

  if (hasKF) {
    return (
      <SharedNonAuthDonation
        churchId={props.churchId}
        mainContainerCssProps={mainContainerCssProps}
        showHeader={showHeader}
        recaptchaSiteKey={props.recaptchaSiteKey}
        churchLogo={props?.churchLogo}
      />
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <NonAuthDonationInner
        churchId={props.churchId}
        mainContainerCssProps={mainContainerCssProps}
        showHeader={showHeader}
        recaptchaSiteKey={props.recaptchaSiteKey}
        churchLogo={props?.churchLogo}
      />
    </Elements>
  );
};
