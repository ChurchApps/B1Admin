import React from "react";
import type { LinkInterface } from "@churchapps/helpers";
import { DroppableWrapper } from "./DroppableWrapper";
import { DraggableWrapper } from "./DraggableWrapper";
import { Icon } from "@mui/material";
import { NavLinkEdit } from "../site/components/NavLinkEdit";
import { TableList } from "../sermons/components/TableList";

interface Props {
  links: LinkInterface[];
  refresh: () => void;
  select: (link: LinkInterface) => void;
  handleDrop: (index: number, parentId: string, link: LinkInterface) => void;
}

// Separate component for nav row to prevent re-renders
const NavRow: React.FC<{
  link: LinkInterface;
  index: number;
  nextLevel: number;
  style: React.CSSProperties;
  setEditLink: (link: LinkInterface) => void;
  handleDrop: (index: number, parentId: string, link: LinkInterface) => void;
}> = React.memo(({ link, index, nextLevel, style, setEditLink, handleDrop }) => {
  let linkText = link.text;
  if (!linkText || linkText.trim().length === 0) linkText = "[No Title]";

  const anchor = (
    <a
      href="about:blank"
      onClick={(e) => { e.preventDefault(); setEditLink(link); }}
      data-testid={`edit-nav-link-${link.id}`}
      aria-label={`Edit ${linkText} navigation link`}
    >
      {linkText}
    </a>
  );

  let dndType = "navItemLink" as "navItemLink" | "navItemParent";
  if (link.children) dndType = "navItemParent";
  const accept: ("navItemLink" | "navItemParent")[] = ["navItemLink"];
  if (nextLevel === 0) accept.push("navItemParent");

  return (
    <tr key={link.id || `${linkText}-${index}`}>
      <td style={style} data-pagetype={"navItemLink"}>
        {(index === 0 && nextLevel === 0) && (
          <DroppableWrapper accept={accept} onDrop={(item) => { handleDrop(-1, link.parentId || "", item.data); }}>
            <div style={{ height: 5 }}></div>
          </DroppableWrapper>
        )}
        <DraggableWrapper dndType={dndType} data={link}>
          {anchor}
        </DraggableWrapper>
        <DroppableWrapper accept={accept} onDrop={(item) => { handleDrop(index + 0.5, link.parentId || "", item.data); }}>
          <div style={{ height: 5 }}></div>
        </DroppableWrapper>
      </td>
      <td>
        {nextLevel === 0 && (
          <DroppableWrapper hideWhenInactive={true} accept={["navItemLink"]} onDrop={(item) => { handleDrop(-1, link.id || "", item.data); }}>
            <Icon style={{ height: 18 }}>chevron_right</Icon>
          </DroppableWrapper>
        )}
      </td>
    </tr>
  );
});

export const SiteNavigation: React.FC<Props> = (props) => {
  const [editLink, setEditLink] = React.useState<LinkInterface | null>(null);

  // Memoize callbacks to prevent NavRow re-renders
  const handleSetEditLink = React.useCallback((link: LinkInterface) => {
    setEditLink(link);
  }, []);

  const handleDropCallback = React.useCallback((index: number, parentId: string, link: LinkInterface) => {
    props.handleDrop(index, parentId, link);
  }, [props.handleDrop]);

  const getNestedChildren = (arr: LinkInterface[], parent: string) => {
    const result: LinkInterface[] = [];
    for (const i in arr) {
      if (arr[i].parentId == parent) {
        const children = getNestedChildren(arr, arr[i].id);
        const linkCopy = { ...arr[i] };
        if (children.length) {
          linkCopy.children = children;
        }
        result.push(linkCopy);
      }
    }
    return result;
  };

  const structuredLinks = React.useMemo(() =>
    props.links && getNestedChildren(props.links, undefined),
  [props.links]);

  // Memoize styles for each nesting level
  const styleCache = React.useRef<Map<number, React.CSSProperties>>(new Map());

  const getStyleForLevel = React.useCallback((level: number) => {
    if (!styleCache.current.has(level)) {
      styleCache.current.set(level, { paddingLeft: (level * 20) + "px" });
    }
    return styleCache.current.get(level)!;
  }, []);

  const buildRows = (childrenLinks: LinkInterface[] = [], nestedLevel = -1): React.ReactElement[] => {
    const rows: React.ReactElement[] = [];
    const nextLevel = nestedLevel + 1;
    const style = getStyleForLevel(nextLevel);
    let idx = 0;

    childrenLinks.forEach((link) => {
      const index = idx;
      idx++;

      rows.push(
        <NavRow
          key={link.id || `${link.text}-${index}`}
          link={link}
          index={index}
          nextLevel={nextLevel}
          style={style}
          setEditLink={handleSetEditLink}
          handleDrop={handleDropCallback}
        />
      );

      if (link.children) {
        rows.push(...buildRows(link.children, nextLevel));
      }
    });
    return rows;
  };

  const rows = buildRows(structuredLinks || [], -1);
  return (
    <>
      {editLink && (
        <NavLinkEdit
          link={editLink}
          updatedCallback={() => { setEditLink(null); props.refresh(); }}
          onDone={() => { setEditLink(null); }}
          data-testid="nav-link-edit-modal"
        />
      )}
      <TableList rows={rows} />
    </>
  );
};
