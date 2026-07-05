import { Locale } from "@churchapps/apphelper";
import { DisplayBox } from "@churchapps/apphelper";
import { UserHelper } from "@churchapps/apphelper";
import type { LinkInterface } from "@churchapps/helpers";
import { Button, Icon } from "@mui/material";
import { Add as AddIcon, Edit as EditIcon } from "@mui/icons-material";
import React from "react";
import { TabEdit } from "./TabEdit";
import { useReorderableLinks } from "../../hooks";
import { TableList } from "./TableList";
import { AppIconButton } from "../../components/ui/AppIconButton";

export const Tabs: React.FC = () => {
  const { links: tabs, isLoading, loadData, moveUp, moveDown } = useReorderableLinks("streamingTab");
  const [currentTab, setCurrentTab] = React.useState<LinkInterface>(null);

  const handleUpdated = () => { setCurrentTab(null); loadData(); };
  const getEditContent = () => <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>{Locale.label("sermons.liveStreamTimes.sidebarTabs.add")}</Button>;

  const handleAdd = () => {
    const tab: LinkInterface = { churchId: UserHelper.currentUserChurch.church.id, sort: tabs.length, text: "", url: "", icon: "link", linkData: "", linkType: "url", category: "streamingTab" };
    setCurrentTab(tab);
  };

  const handleMoveUp = (e: React.MouseEvent) => { e.preventDefault(); moveUp(parseInt(e.currentTarget.getAttribute("data-idx"))); };
  const handleMoveDown = (e: React.MouseEvent) => { e.preventDefault(); moveDown(parseInt(e.currentTarget.getAttribute("data-idx"))); };

  const getRows = () => {
    let idx = 0;
    const rows: React.ReactElement[] = [];
    tabs.forEach(tab => {
      const upLink = (idx === 0) ? null : <a href="about:blank" data-idx={idx} onClick={handleMoveUp}><Icon>arrow_upward</Icon></a>;
      const downLink = (idx === tabs.length - 1) ? null : <a href="about:blank" data-idx={idx} onClick={handleMoveDown}><Icon>arrow_downward</Icon></a>;
      rows.push(
        <tr key={idx}>
          <td><a href={tab.url} style={{ display: "flex", alignItems: "center", color: "var(--link)", fontWeight: 500 }}><Icon sx={{ marginRight: "5px" }}>{tab.icon}</Icon>{tab.text}</a></td>
          <td style={{ textAlign: "right" }} className="rowActions">
            {upLink}
            {downLink}
            <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} onClick={() => setCurrentTab(tab)} />
          </td>
        </tr>
      );
      idx++;
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
