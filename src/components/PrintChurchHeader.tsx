import React, { useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import UserContext from "../UserContext";

// The church's "Light Background Logo" from Website → Appearance, for white paper.
// `ready` turns true once the settings are in and the image has loaded (or failed,
// or 3s passed), so autoprint pages can wait for it before calling window.print().
export const usePrintLogo = (churchId?: string) => {
  const settings = useQuery<Record<string, string>>({
    queryKey: ["/settings/public/" + churchId, "MembershipApi"],
    enabled: !!churchId
  });
  const logoUrl = settings.data?.logoLight || "";
  const loaded = !churchId || settings.isFetched;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    if (!logoUrl) { setReady(true); return; }
    let done = false;
    const finish = () => { if (!done) { done = true; setReady(true); } };
    const img = new Image();
    img.onload = finish;
    img.onerror = finish;
    img.src = logoUrl;
    const t = setTimeout(finish, 3000);
    return () => { done = true; clearTimeout(t); };
  }, [loaded, logoUrl]);

  return { logoUrl, ready };
};

interface Props {
  churchName: string;
  // Pass when the page already has the logo; otherwise it is looked up for the current church.
  logoUrl?: string;
  style?: React.CSSProperties;
  // What prints when the church has no logo (the church name as each page styles it).
  children?: React.ReactNode;
}

export const PrintChurchHeader: React.FC<Props> = ({ churchName, logoUrl, style, children }) => {
  const churchId = useContext(UserContext)?.userChurch?.church?.id;
  const fetched = usePrintLogo(logoUrl === undefined ? churchId : undefined);
  const logo = logoUrl ?? fetched.logoUrl;
  if (!logo) return <>{children}</>;
  return (
    <img
      src={logo}
      alt={churchName}
      data-testid="print-church-logo"
      style={{ display: "block", maxHeight: 60, maxWidth: 240, objectFit: "contain", ...style }}
    />
  );
};
