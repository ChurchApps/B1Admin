import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ApiHelper, UserHelper } from "../helpers";
import { ContentEditor } from "./admin/ContentEditor";
import type { GlobalStyleInterface } from "../helpers/Interfaces";
import UserContext from "../UserContext";

interface ConfigInterface {
  globalStyles?: GlobalStyleInterface;
  appearance?: any;
  church?: any;
}

export const PageEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const context = useContext(UserContext);
  const [config, setConfig] = useState<ConfigInterface>(null);

  const loadData = async (id: string) =>
    await ApiHelper.get("/pages/" + UserHelper.currentUserChurch.church.id + "/tree?id=" + id, "ContentApi");

  const handleDone = (url?: string) => {
    if (url && url !== "") navigate(url);
    else navigate("/site/pages/preview/" + id);
  };

  useEffect(() => {
    ApiHelper.get("/globalStyles", "ContentApi").then((gs: any) => {
      if (gs) {
        setConfig({
          globalStyles: gs,
          appearance: context?.userChurch?.settings,
          church: context?.userChurch?.church
        });
      }
    });
  }, [context?.userChurch]);

  return (
    <ContentEditor
      loadData={loadData}
      pageId={id}
      onDone={handleDone}
      config={config}
    />
  );
};
