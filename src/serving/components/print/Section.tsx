import React from "react";
import { Card, CardContent, CardHeader } from "@mui/material";
import { type FeedSectionInterface } from "../../../helpers";
import { Action } from "./Action";

interface Props {
  lessonId?: string;
  section: FeedSectionInterface;
  toggleActive?: (id: string) => void;
  activeSectionId?: string | string[];
}

export function Section(props: Props) {
  const getParts = () => {
    const result: React.JSX.Element[] = [];
    if (props.section?.actions) {
      props.section.actions.forEach((r, idx) => {
        result.push(
          <div className="part" key={idx}>
            <Action action={r} lessonId={props.lessonId || ""} />
          </div>
        );
      });
    }
    return result;
  };

  return (
    <Card id={"section-" + props.section.name} className="sectionCard" style={{ marginBottom: 20 }}>
        <CardHeader
          title={props.section.name}
          subheader={
            props.section.materials && (
              <>
                <b>Materials:</b> {props.section.materials}
              </>
            )
          }
        />
        <CardContent>{getParts()}</CardContent>
      </Card>
    );
}
