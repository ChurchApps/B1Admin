import React from "react";
import { MarkdownPreviewLight } from "@churchapps/apphelper/markdown";
import { type FeedActionInterface, type FeedSectionInterface, type FeedVenueInterface } from "../../../helpers";

interface Props {
  feed: FeedVenueInterface;
}

export function OlfPrint(props: Props) {
  const getActionGroups = (section: FeedSectionInterface) => {
    const blocks = groupActions(section.actions || []);
    const result: React.JSX.Element[] = [];
    blocks.forEach((b, idx) => {
      result.push(
        <div className="olfActionBlock" key={idx}>
          <table style={{ width: "100%" }}>
            <tbody>
              <tr>
                <td style={{ verticalAlign: "top", width: "100px", fontWeight: "bold" }}>
                  {b.actions[0].actionType.toUpperCase()}
                </td>
                <td>
                  <ul style={{ listStyleType: "none", paddingLeft: 0, margin: 0 }}>
                    {getActions(b.actions)}
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    });
    return result;
  };

  const getActions = (actions: FeedActionInterface[]) => {
    const result: React.JSX.Element[] = [];
    actions.forEach((a, idx) => {
      result.push(
        <li className="olfAction" key={idx} style={{ marginBottom: 5 }}>
          <MarkdownPreviewLight value={a.content || ""} />
        </li>
      );
    });
    return result;
  };

  const groupActions = (actions: FeedActionInterface[]) => {
    let lastActionType = "";
    const result: any[] = [];
    actions?.forEach((a) => {
      if (lastActionType !== a.actionType || result.length === 0) {
        result.push({ actions: [a] });
        lastActionType = a.actionType || "";
      } else {
        result[result.length - 1].actions.push(a);
      }
    });
    return result;
  };

  const getSections = () => {
    const result: React.JSX.Element[] = [];
    props.feed?.sections?.forEach((s, sectionIndex) => {
      result.push(
        <div className="olfSection" key={"section" + sectionIndex}>
          <h2>{s.name}</h2>
          {getActionGroups(s)}
        </div>
      );
    });
    return result;
  };

  return (
    <div id="olfPrint">
      <div className="olfHeader">
        {props.feed.lessonImage && (
          <div>
            <img
              src={props.feed.lessonImage}
              alt="lesson image"
              width={256}
              height={144}
              style={{ float: "right", objectFit: "cover" }}
            />
          </div>
        )}
        <h1>{props.feed.studyName}</h1>
        <h2>
          {props.feed.lessonName} | {props.feed.name}
        </h2>
        <div>
          <MarkdownPreviewLight value={props.feed.lessonDescription || ""} />
        </div>
        <div style={{ clear: "both" }}></div>
      </div>
      <div className="olfBody">{getSections()}</div>
    </div>
  );
}
