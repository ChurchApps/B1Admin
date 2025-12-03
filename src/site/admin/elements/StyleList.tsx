import type { InlineStylesInterface, StyleOption } from "../../../helpers";
import { allStyleOptions } from "../../../helpers";
import React from "react";
import { StyleEdit } from "./StyleEdit";
import { Grid } from "@mui/material";

interface Props {
  fields: string[];
  styles: InlineStylesInterface;
  onChange: (styles: any) => void;
}

export const StyleList: React.FC<Props> = (props) => {
  const [editStyle, setEditStyle] = React.useState<{ platform: string; name: string; value: any }>(null);

  const options: StyleOption[] = [];
  allStyleOptions.forEach((o) => {
    const base = o.key.split("-")[0];
    if (props.fields.indexOf(base) > -1) options.push(o);
  });

  const getCurrentStyles = () => {
    const result: React.ReactElement[] = [];
    result.push(getPlatformStyles("all", "All"));
    result.push(getPlatformStyles("desktop", "Desktop Only"));
    result.push(getPlatformStyles("mobile", "Mobile Only"));
    return result;
  };

  const getPlatformStyles = (platformKey: string, displayName: string) => {
    const result = [];
    result.push(<div key={crypto.randomUUID()}>{displayName}:</div>);
    const platform: any = props.styles[platformKey as keyof InlineStylesInterface] || {};
    Object.keys(platform).forEach((key: string) => {
      const value = platform[key];
      const field = options.find((o: any) => o.key === key);
      if (field) {
        result.push(
          <div key={crypto.randomUUID()} style={{ marginBottom: 5 }}>
            <a
              href="about:blank"
              style={{ color: "#999", textDecoration: "underline" }}
              onClick={(e) => {
                e.preventDefault();
                setEditStyle({ platform: platformKey, name: key, value });
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
        Add a style
      </a>
    );
    return (
      <Grid key={crypto.randomUUID()} size={{ lg: 4 }}>
        {result}
      </Grid>
    );
  };

  const handleSave = (platform: string, name: string, value: any) => {
    if (name) {
      const styles = props.styles ? { ...props.styles } : ({} as any);
      const p: any = styles[platform] ? { ...styles[platform] } : {};
      delete p[name];
      if (value) p[name] = value;
      if (Object.keys(p).length === 0) {
        delete styles[platform];
      } else styles[platform] = p;

      props.onChange(styles);
    }
    setEditStyle(null);
  };

  if (editStyle) return <StyleEdit style={editStyle} fieldOptions={options} onSave={handleSave} />;
  else {
    return (
      <>
        <hr />
        <p style={{ color: "#999999", fontSize: 12 }}>Use these fields to customize the style of a single element. For sitewide changes use the site appearance editor.</p>
        <div>
          <b>Platform:</b>
        </div>
        <Grid container spacing={2}>
          {getCurrentStyles()}
        </Grid>
      </>
    );
  }
};
