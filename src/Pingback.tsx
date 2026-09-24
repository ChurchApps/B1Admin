import React from "react";

export const Pingback = () => {
  const params = new URLSearchParams(window.location.search);
  const oauth_token = params.get("oauth_token");
  const oauth_verifier = params.get("oauth_verifier");

  React.useEffect(() => {
    try {
      window.opener?.postMessage({ oauth_token, oauth_verifier }, window.location.origin);
    } catch { /* opener closed or cross-origin */ }
    if (window.opener) window.close();
  }, []);

  return <></>;
};
