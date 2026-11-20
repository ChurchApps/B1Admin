import type { InlineStylesInterface, StyleOption } from "../../../helpers";
import { allStyleOptions } from "../../../helpers";
import React from "react";
import { StyleEdit } from "./StyleEdit";
import { Grid } from "@mui/material";
import { Locale } from "@churchapps/apphelper";

interface Props {
  fields: string[];
  styles: InlineStylesInterface;
  onChange: (styles: InlineStylesInterface) => void;
}

export const StyleList: React.FC<Props> = (props) => {
  const [editStyle, setEditStyle] = React.useState<{ platform: string; name: string; value: string } | null>(null);

  const options: StyleOption[] = [];
  allStyleOptions.forEach((o) => {
    const base = o.key.split("-")[0];
    if (props.fields.indexOf(base) > -1) options.push(o);
  });

  const getCurrentStyles = () => {
    const result: React.ReactElement[] = [];
    result.push(getPlatformStyles("all", Locale.label("site.styleEdit.all")));
    result.push(getPlatformStyles("desktop", Locale.label("site.styleEdit.desktopOnly")));
    result.push(getPlatformStyles("mobile", Locale.label("site.styleEdit.mobileOnly")));
    return result;
  };

  const getPlatformStyles = (platformKey: string, displayName: string) => {
    const result = [];
    result.push(<div key={crypto.randomUUID()}>{displayName}:</div>);
    const platform: Record<string, string | number> = props.styles[platformKey as keyof InlineStylesInterface] || {};
    Object.keys(platform).forEach((key: string) => {
      const value = platform[key];
      const field = options.find((o) => o.key === key);
      if (field) {
        result.push(
          <div key={crypto.randomUUID()} style={{ marginBottom: 5 }}>
            <a
              href="about:blank"
              style={{ color: "var(--b1-muted)", textDecoration: "underline" }}
              onClick={(e) => {
                e.preventDefault();
                setEditStyle({ platform: platformKey, name: key, value: String(value) });
              }}>
              {field.label}: {value}
            </a>
          </div>
        );
      }
    });
    result.push(
      <a
        key={crypto.randomUUID()}
        href="about:blank"
        style={{ marginBottom: 15, display: "block" }}
        onClick={(e) => {
          e.preventDefault();
          setEditStyle({ platform: platformKey, name: "", value: "" });
        }}>
        {Locale.label("site.styleEdit.addStyle")}
      </a>
    );
    return (
      <Grid key={crypto.randomUUID()} size={{ lg: 4 }}>
        {result}
      </Grid>
    );
  };

  const handleSave = (platform: string, name: string, value: string | number | null | undefined) => {
    if (name) {
      const styles: InlineStylesInterface = props.styles ? { ...props.styles } : {};
      const platformKey = platform as keyof InlineStylesInterface;
      const p: Record<string, string | number> = styles[platformKey] ? { ...styles[platformKey] } : {};
      delete p[name];
      if (value) p[name] = value;
      if (Object.keys(p).length === 0) {
        delete styles[platformKey];
      } else styles[platformKey] = p;

      props.onChange(styles);
    }
    setEditStyle(null);
  };

  if (editStyle) return <StyleEdit style={editStyle} fieldOptions={options} onSave={handleSave} />;
  else {
    return (
      <>
        <hr />
        <p style={{ color: "var(--b1-muted)", fontSize: 12 }}>{Locale.label("site.styleEdit.stylesHelper")}</p>
        <div>
          <b>{Locale.label("site.styleEdit.platform")}</b>
        </div>
        <Grid container spacing={2}>
          {getCurrentStyles()}
        </Grid>
      </>
    );
  }
};
