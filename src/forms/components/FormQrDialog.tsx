import React from "react";
import { Locale } from "@churchapps/apphelper";
import { ShareLinkDialog } from "../../components/ShareLinkDialog";

interface Props {
  open: boolean;
  onClose: () => void;
  formName: string;
  formUrl: string;
}

export const FormQrDialog: React.FC<Props> = (props) => {
  const slug = props.formName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "form";
  return (
    <ShareLinkDialog
      open={props.open}
      onClose={props.onClose}
      title={`${Locale.label("forms.formsPage.qrCode")}: ${props.formName}`}
      url={props.formUrl}
      hint={Locale.label("forms.formsPage.qrHint")}
      fileName={`form-qr-${slug}`}
      testIdPrefix="form-qr"
    />
  );
};
