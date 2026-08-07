import React from "react";
import { MarkdownPreviewLight } from "@churchapps/apphelper/markdown";
import { type FeedActionInterface, type FeedVenueInterface } from "../../../helpers";

interface Props {
  feed: FeedVenueInterface;
}

export function OlfScriptPrint(props: Props) {
  const getActions = (actions: FeedActionInterface[]) => {
    const result: React.JSX.Element[] = [];
    actions.forEach((a, idx) => {
      result.push(
        <li className={"olfAction " + (a.actionType || "")} key={idx}>
          <MarkdownPreviewLight value={a.content || ""} />
        </li>
      );
    });
    return result;
  };


  const getSections = () => {
    const result: React.JSX.Element[] = [];
    props.feed?.sections?.forEach((s, sectionIndex) => {
      result.push(
        <div className="olfScriptSection" key={"section" + sectionIndex}>
          <h2>{s.name}</h2>
          <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
            {getActions(s.actions || [])}
          </ul>
        </div>
      );
    });
    return result;
  };


  return (
    <div id="olfScriptPrint">
      <div className="olfScriptHeader">
        {props.feed.lessonImage && (
          <div style={{ textAlign: "center" }}>
            <img src={props.feed.lessonImage} alt="lesson image" width={320} height={180} style={{ objectFit: "cover" }} />
          </div>
        )}
        <h1>{props.feed.studyName}</h1>
        <h2>{props.feed.lessonName}</h2>
        <h3>{props.feed.name}</h3>
        <div>
          <MarkdownPreviewLight value={props.feed.lessonDescription || ""} />
        </div>
      </div>
      <div className="olfBody">{getSections()}</div>
    </div>
  );
}
