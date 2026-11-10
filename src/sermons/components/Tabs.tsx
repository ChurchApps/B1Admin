import { Locale } from "@churchapps/apphelper";
import { DisplayBox } from "@churchapps/apphelper";
import { UserHelper } from "@churchapps/apphelper";
import type { LinkInterface } from "@churchapps/helpers";
import { Button, Icon } from "@mui/material";
import { Add as AddIcon, ArrowDownward as ArrowDownwardIcon, ArrowUpward as ArrowUpwardIcon, Edit as EditIcon } from "@mui/icons-material";
import React from "react";
import { TabEdit } from "./TabEdit";
import { useReorderableLinks } from "../../hooks";
import { TableList } from "./TableList";
import { AppIconButton } from "../../components/ui/AppIconButton";

export const Tabs: React.FC = () => {
  const { links: tabs, isLoading, loadData, moveUp, moveDown } = useReorderableLinks("streamingTab");
  const [currentTab, setCurrentTab] = React.useState<LinkInterface | null>(null);

  const handleUpdated = () => { setCurrentTab(null); loadData(); };
  const getEditContent = () => <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>{Locale.label("sermons.liveStreamTimes.sidebarTabs.add")}</Button>;

  const handleAdd = () => {
    // After the last tab; existing sorts can start at 1, so tabs.length could tie with the last one.
    const sort = tabs.reduce((max, t) => Math.max(max, t.sort || 0), 0) + 1;
    const tab: LinkInterface = { churchId: UserHelper.currentUserChurch.church.id, sort, text: "", url: "", icon: "link", linkData: "", linkType: "url", category: "streamingTab" };
    setCurrentTab(tab);
  };

  const getRows = () => {
    const rows: React.ReactElement[] = [];
    tabs.forEach((tab, idx) => {
      // Chat and Prayer tabs have no URL, so only external links open anything (in a new tab, not over B1 Admin).
      const label = <><Icon sx={{ marginRight: "5px" }}>{tab.icon}</Icon>{tab.text}</>;
      const name = tab.linkType === "url" && tab.url
        ? <a href={tab.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", color: "var(--link)", fontWeight: 500 }}>{label}</a>
        : <span style={{ display: "flex", alignItems: "center", fontWeight: 500 }}>{label}</span>;
      rows.push(
        <tr key={tab.id || idx} data-testid={`stream-tab-${idx}`}>
          <td>{name}</td>
          <td style={{ textAlign: "right" }} className="rowActions">
            {idx > 0 && <AppIconButton label={Locale.label("common.moveUp")} icon={<ArrowUpwardIcon />} onClick={() => moveUp(idx)} />}
            {idx < tabs.length - 1 && <AppIconButton label={Locale.label("common.moveDown")} icon={<ArrowDownwardIcon />} onClick={() => moveDown(idx)} />}
            <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} onClick={() => setCurrentTab(tab)} />
          </td>
        </tr>
      );
    });
    return rows;
  };

  const getTable = () => (<TableList rows={getRows()} isLoading={isLoading} />);

  if (currentTab !== null) return <TabEdit currentTab={currentTab} updatedFunction={handleUpdated} />;
  else {
    return (
      <DisplayBox headerIcon="folder" headerText={Locale.label("sermons.liveStreamTimes.sidebarTabs.title")} editContent={getEditContent()}>
        {getTable()}
      </DisplayBox>

    );
  }

};
