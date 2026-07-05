import React from "react";
import { Button, Icon } from "@mui/material";
import { Add as AddIcon, Edit as EditIcon } from "@mui/icons-material";
import { LinkEdit } from "./LinkEdit";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { Locale } from "@churchapps/apphelper";
import { UserHelper } from "@churchapps/apphelper";
import { DisplayBox } from "@churchapps/apphelper";
import type { LinkInterface } from "@churchapps/helpers";
import { useReorderableLinks } from "../../hooks";
import { TableList } from "./TableList";

interface RecursiveInterface {
  childrenLinks: LinkInterface[];
  nestedLevel?: number;
}

interface Props {
  refresh?: any;
  category?: string;
}

const getNestedChildren = (arr: LinkInterface[], parent: string) => {
  const result: LinkInterface[] = [];
  for (const i in arr) {
    if (arr[i].parentId == parent) {
      const children = getNestedChildren(arr, arr[i].id);
      if (children.length) {
        arr[i].children = children;
      }
      result.push(arr[i]);
    }
  }
  return result;
};

export const Links: React.FC<Props> = (props) => {
  const cat = props.category ? props.category : "website";
  const { links, isLoading, loadData, moveUp, moveDown } = useReorderableLinks(cat, { refresh: props?.refresh });
  const [currentLink, setCurrentLink] = React.useState<LinkInterface>(null);

  const handleUpdated = () => { setCurrentLink(null); loadData(); };
  const getEditContent = () => <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={handleAdd} data-testid="add-link-button">{Locale.label("sermons.liveStreamTimes.navigationLinks.add")}</Button>;

  const handleAdd = () => {
    const link: LinkInterface = { churchId: UserHelper.currentUserChurch.church.id, sort: links.length, text: Locale.label("sermons.liveStreamTimes.navigationLinks.home"), url: "/", linkType: "url", linkData: "", category: cat, icon: "" };
    setCurrentLink(link);
  };

  const structuredLinks = links && getNestedChildren(links, undefined);

  const handleMoveUp = (e: React.MouseEvent, list: LinkInterface[]) => {
    e.preventDefault();
    moveUp(parseInt(e.currentTarget.getAttribute("data-idx")), list);
  };

  const handleMoveDown = (e: React.MouseEvent, list: LinkInterface[]) => {
    e.preventDefault();
    moveDown(parseInt(e.currentTarget.getAttribute("data-idx")), list);
  };

  const RecursiveLinks = ({ childrenLinks, nestedLevel }: RecursiveInterface) => {
    //nestedLevel shows the level of recursion based on which styling is done.
    nestedLevel = nestedLevel + 1;
    let idx = 0;
    return (
      <>
        {childrenLinks.map((link) => {
          const upLink = (idx === 0) ? null : <a href="about:blank" data-idx={idx} onClick={(e: React.MouseEvent) => handleMoveUp(e, childrenLinks)}><Icon>arrow_upward</Icon></a>;
          const downLink = (idx === childrenLinks.length - 1) ? null : <a href="about:blank" data-idx={idx} onClick={(e: React.MouseEvent) => handleMoveDown(e, childrenLinks)}><Icon>arrow_downward</Icon></a>;
          idx++;
          return (
            <>
              {link.children
                ? (
                  <>
                    <tr>
                      <td>
                        <a href={link.url} style={{ marginLeft: (nestedLevel * 20) + "px" }}>{link.text}</a>
                      </td>
                      <td style={{ textAlign: "right" }} className="rowActions">
                        {upLink}
                        {downLink}
                        <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} onClick={() => setCurrentLink(link)} />
                      </td>
                    </tr>
                    <>
                      <RecursiveLinks childrenLinks={link.children} nestedLevel={nestedLevel} />
                    </>
                  </>
                )
                : (
                  <tr>
                    <td>
                      <a href={link.url} style={{ marginLeft: (nestedLevel * 20) + "px" }}>{link.text}</a>
                    </td>
                    <td style={{ textAlign: "right" }} className="rowActions">
                      {upLink}
                      {downLink}
                      <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} onClick={() => setCurrentLink(link)} />
                    </td>
                  </tr>
                )}
            </>
          );
        })}
      </>
    );
  };

  const getLinks = (structuredLinks: LinkInterface[]) => {
    let idx = 0;
    const rows: React.ReactElement[] = [];
    structuredLinks.forEach((link: any) => {
      const upLink = (idx === 0) ? null : <a href="about:blank" data-idx={idx} onClick={(e: React.MouseEvent) => handleMoveUp(e, structuredLinks)}><Icon>arrow_upward</Icon></a>;
      const downLink = (idx === structuredLinks.length - 1) ? null : <a href="about:blank" data-idx={idx} onClick={(e: React.MouseEvent) => handleMoveDown(e, structuredLinks)}><Icon>arrow_downward</Icon></a>;
      rows.push(
        <>
          <tr key={idx}>
            <td><a href={link.url}>{link.text}</a></td>
            <td style={{ textAlign: "right" }} className="rowActions">
              {upLink}
              {downLink}
              <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} onClick={() => setCurrentLink(link)} />
            </td>
          </tr>
          {link.children && <RecursiveLinks childrenLinks={link.children} nestedLevel={0} />}
        </>
      );
      idx++;
    });
    return rows;
  };

  const getTable = (structuredLinks: LinkInterface[]) => (
    <TableList rows={getLinks(structuredLinks)} isLoading={isLoading} />
  );

  if (currentLink !== null) return <LinkEdit links={links} currentLink={currentLink} updatedFunction={handleUpdated} />;
  else {
    return (
      <DisplayBox headerIcon="link" headerText={Locale.label("sermons.liveStreamTimes.navigationLinks.title")} editContent={getEditContent()} data-testid="navigation-links-display-box">
        {structuredLinks && getTable(structuredLinks)}
      </DisplayBox>
    );
  }
};
