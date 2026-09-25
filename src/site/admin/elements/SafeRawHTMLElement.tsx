import React from "react";
import DOMPurify from "dompurify";
import { Typography } from "@mui/material";
import { Locale } from "@churchapps/apphelper";
import { registerElementRenderer } from "@churchapps/apphelper/website";
import type { ElementInterface } from "../../../helpers";

// Church-authored HTML/JS must never execute on the admin origin, so the editor renders a sanitized copy.
const sanitize = (html: string) => DOMPurify.sanitize(html, {
  FORCE_BODY: true,
  ADD_TAGS: ["iframe"],
  ADD_ATTR: ["target", "allow", "allowfullscreen", "frameborder", "scrolling"]
});

const SafeRawHTMLElement = ({ element, editing }: { element: ElementInterface; editing: boolean }) => {
  const rawHTML: string = element.answers?.rawHTML || "";
  const hasScript = !!element.answers?.javascript?.trim() || /<script/i.test(rawHTML);
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: sanitize(rawHTML) }} style={editing ? { minHeight: 50 } : {}} />
      {editing && hasScript && <Typography variant="caption" color="text.secondary">{Locale.label("site.elements.scriptsPublishedOnly")}</Typography>}
    </>
  );
};

registerElementRenderer("rawHTML", (p) => <SafeRawHTMLElement key={p.element.id} element={p.element} editing={!!p.onEdit} />);
