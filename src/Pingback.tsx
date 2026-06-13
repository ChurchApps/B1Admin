
export const Pingback = () => {
  const params = new URLSearchParams(window.location.search);
  const oauth_token = params.get("oauth_token");
  const oauth_verifier = params.get("oauth_verifier");

  window.opener.postMessage({ oauth_token, oauth_verifier }, window.location.origin);
  window.close();

  return <></>;
};
