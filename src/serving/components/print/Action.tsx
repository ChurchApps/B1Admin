import React from "react";
import { AnalyticsHelper } from "@churchapps/apphelper";
import { MarkdownPreviewLight } from "@churchapps/apphelper/markdown";
import { ApiHelper, type FeedActionInterface, UserHelper } from "../../../helpers";

interface Props {
  action: FeedActionInterface;
  lessonId: string;
}

export function Action(props: Props) {
  let result = <></>;

  switch (props.action.actionType) {
    case "note":
      result = (
        <div className="note">
          <MarkdownPreviewLight value={props.action.content || ""} />
        </div>
      );
      break;
    case "do":
      result = (
        <div className="actions">
          <MarkdownPreviewLight value={props.action.content || ""} />
        </div>
      );
      break;
    case "say":
      result = (
        <div className="say">
          <MarkdownPreviewLight value={props.action.content || ""} />
        </div>
      );
      break;
    case "add-on":
      result = <div>{props.action.content}</div>;
      break;
    case "play":
      const f = props.action.files?.[0];
      if (!f) {
        result = (
          <div className="playAction">
            <a href="#" className="text" onClick={(e) => e.preventDefault()}>
              {props.action.content}
            </a>
          </div>
        );
      } else {
        let duration: React.JSX.Element | null = null;
        if (f.seconds && f.seconds > 0) {
          const min = Math.floor(f.seconds / 60);
          const sec = f.seconds % 60;
          duration = <span className="duration">{min.toString() + ":" + sec.toString().padStart(2, "0")}</span>;
        }
        let thumbnail = f.thumbnail || f.url || "";
        if (thumbnail.indexOf(".mp4") > -1 || thumbnail.indexOf(".webm") > -1) thumbnail = "";

        result = (
          <div className="playAction">
            {duration}
            {thumbnail && (
              <img src={thumbnail} alt={props.action.content || ""} width={128} height={72} style={{ height: 72, float: "left", borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }} />
            )}
            <a
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                const actionName = f.name || "";
                const label = window.location.pathname;
                try {
                  AnalyticsHelper.logEvent("Preview", actionName, label);
                } catch (error) {
                  console.warn("Analytics logging failed:", error);
                }
                const download = {
                  lessonId: props.lessonId,
                  fileId: f.id,
                  userId: UserHelper.user?.id || "",
                  churchId: UserHelper.currentUserChurch?.church?.id || "",
                  ipAddress: "",
                  downloadDate: new Date(),
                  fileName: f.name
                };
                ApiHelper.post("/downloads", [download], "LessonsApi");
              }}
              className="text">
              {props.action.content}
            </a>
          </div>
        );
      }
      break;
  }

  return result;
}
