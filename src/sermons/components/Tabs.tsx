import { SmallButton, Locale } from "@churchapps/apphelper";
import { DisplayBox } from "@churchapps/apphelper";
import { ApiHelper } from "@churchapps/apphelper";
import { UserHelper } from "@churchapps/apphelper";
import type { LinkInterface } from "@churchapps/helpers";
import { Icon } from "@mui/material";
import React from "react";
import { TabEdit } from "./TabEdit";
import { ensureSequentialSort, moveItemDown, moveItemUp } from "../../helpers/SortHelper";
import { TableList } from "./TableList";

export const Tabs: React.FC = () => {
  const [tabs, setTabs] = React.useState<LinkInterface[]>([]);
  const [currentTab, setCurrentTab] = React.useState<LinkInterface>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const handleUpdated = () => { setCurrentTab(null); loadData(); };
  const getEditContent = () => <SmallButton icon="add" text={Locale.label("sermons.liveStreamTimes.sidebarTabs.add")} onClick={handleAdd} />;
  const loadData = () => { ApiHelper.get("/links?category=streamingTab", "ContentApi").then((data: any) => { setTabs(data); setIsLoading(false); }); };
  const saveChanges = () => { ApiHelper.post("/links", tabs, "ContentApi").then(loadData); };

  const handleAdd = () => {
    const tab: LinkInterface = { churchId: UserHelper.currentUserChurch.church.id, sort: tabs.length, text: "", url: "", icon: "link", linkData: "", linkType: "url", category: "streamingTab" };
    setCurrentTab(tab);
  };

  const moveUp = (e: React.MouseEvent) => {
    e.preventDefault();
    const idx = parseInt(e.currentTarget.getAttribute("data-idx"));
    ensureSequentialSort(tabs);
    moveItemUp(tabs, idx);
    saveChanges();
  };

  const moveDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const idx = parseInt(e.currentTarget.getAttribute("data-idx"));
    ensureSequentialSort(tabs);
    moveItemDown(tabs, idx);
    saveChanges();
  };

  const getRows = () => {
    let idx = 0;
    const rows: React.ReactElement[] = [];
    tabs.forEach(tab => {
      const upLink = (idx === 0) ? null : <a href="about:blank" data-idx={idx} onClick={moveUp}><Icon>arrow_upward</Icon></a>;
      const downLink = (idx === tabs.length - 1) ? null : <a href="about:blank" data-idx={idx} onClick={moveDown}><Icon>arrow_downward</Icon></a>;
      rows.push(
        <tr key={idx}>
          <td><a href={tab.url} style={{ display: "flex", alignItems: "center" }}><Icon sx={{ marginRight: "5px" }}>{tab.icon}</Icon>{tab.text}</a></td>
          <td style={{ textAlign: "right" }}>
            {upLink}
            {downLink}
            <a href="about:blank" onClick={(e: React.MouseEvent) => { e.preventDefault(); setCurrentTab(tab); }}><Icon>edit</Icon></a>
          </td>
        </tr>
      );
      idx++;
    });
    return rows;
  };

  const getTable = () => (<TableList rows={getRows()} isLoading={isLoading} />);

  React.useEffect(() => { loadData(); }, []);

  if (currentTab !== null) return <TabEdit currentTab={currentTab} updatedFunction={handleUpdated} />;
  else {
    return (
      <DisplayBox headerIcon="folder" headerText={Locale.label("sermons.liveStreamTimes.sidebarTabs.title")} editContent={getEditContent()}>
        {getTable()}
      </DisplayBox>

    );
  }

};
