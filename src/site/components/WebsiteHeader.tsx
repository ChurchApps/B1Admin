import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Container, AppBar, Stack, Box, IconButton, Drawer, Toolbar, List, ListItem,
  ListItemButton, ListItemText, Collapse
} from "@mui/material";
import MenuIcon from '@mui/icons-material/Menu';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { AppearanceHelper, ArrayHelper } from "@churchapps/apphelper";
import { StyleHelper } from "@churchapps/apphelper-website";
import type { SectionInterface, GlobalStyleInterface } from "../../helpers/Interfaces";

interface LinkInterface { id?: string; text?: string; url?: string; parentId?: string; children?: LinkInterface[]; }

interface Props {
  church: any;
  appearance: any;
  globalStyles?: GlobalStyleInterface;
  navLinks: LinkInterface[];
  overlayContent: boolean;
  sections?: SectionInterface[];
}

const getNestedChildren = (arr: LinkInterface[], parent: string | undefined) => {
  const result: LinkInterface[] = [];
  for (const i in arr) {
    if (arr[i].parentId == parent) {
      if (arr[i].id) {
        const children = getNestedChildren(arr, arr[i].id);
        if (children.length) arr[i].children = children;
      }
      result.push(arr[i]);
    }
  }
  return result;
};

const RecursiveListMenu = ({ links, handleClose }: { links?: LinkInterface[]; handleClose: () => void }) => {
  const [openStates, setOpenStates] = useState<{ [key: string]: boolean }>({});

  const handleClick = (id: string) => { setOpenStates({ ...openStates, [id]: !openStates[id] }); };

  return (
    <>
      {links?.map((item: LinkInterface) => (
        <Box key={item.id}>
          {item?.children ? (
            <Box>
              <ListItem disablePadding secondaryAction={<IconButton sx={{ color: "black !important" }} onClick={() => handleClick(item.id!)}>{openStates[item.id!] ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>}>
                <ListItemButton component={Link} to={item.url || ""} onClick={handleClose} sx={{ pl: 2 }}>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
              <Collapse in={openStates[item.id!]} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <RecursiveListMenu links={item?.children} handleClose={handleClose} />
                </List>
              </Collapse>
            </Box>
          ) : (
            <ListItem disablePadding>
              <ListItemButton component={Link} to={item.url || ""} onClick={handleClose} sx={{ pl: 2 }}>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          )}
        </Box>
      ))}
    </>
  );
};

const CascadingListMenu = ({ link, handleClose }: { link: LinkInterface; handleClose: () => void }) => {
  const [open, setOpen] = useState(false);

  const handleClick = () => { setOpen(!open); };

  return (
    <>
      {link?.children ? (
        <>
          <ListItem disablePadding secondaryAction={<IconButton sx={{ color: "black !important" }} onClick={handleClick}>{open ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>}>
            <ListItemButton component={Link} to={link.url || ""} onClick={handleClose}>
              <ListItemText primary={link.text} />
            </ListItemButton>
          </ListItem>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <RecursiveListMenu links={link?.children} handleClose={handleClose} />
            </List>
          </Collapse>
        </>
      ) : (
        <ListItem disablePadding>
          <ListItemButton component={Link} to={link.url || ""} onClick={handleClose}>
            <ListItemText primary={link.text} />
          </ListItemButton>
        </ListItem>
      )}
    </>
  );
};

export function WebsiteHeader(props: Props) {
  const [transparent, setTransparent] = useState(props.overlayContent);
  const [open, setOpen] = useState(false);

  const toggleDrawer = () => { setOpen(!open); };

  useEffect(() => {
    const handleScroll = () => {
      if (props.overlayContent) {
        const show = window.scrollY > 100;
        setTransparent(!show);
      }
    };

    document.addEventListener('scroll', handleScroll);
    return () => { document.removeEventListener('scroll', handleScroll); };
  }, [props.overlayContent]);

  const getLinkClass = () => {
    const sections = ArrayHelper.getAll(props.sections, "zone", "main");
    let result = "";
    let lc = (sections.length > 0 ? sections[0].linkColor : null);
    if (lc) {
      lc = lc.replace("var(--", "").replace(")", "");
      result = "links" + lc[0].toUpperCase() + lc.slice(1);
    }
    return result;
  };

  const getLogo = () => {
    if (transparent) {
      const textColor = StyleHelper.getTextColor(props.sections?.[0]?.textColor, props.globalStyles || {}, props.appearance);
      const logo = AppearanceHelper.getLogoByTextColor(props.appearance?.logoLight || null, props.appearance?.logoDark || null, textColor);
      return logo !== "" ? logo : null;
    } else {
      return props.appearance?.logoLight || null;
    }
  };

  const structuredData = getNestedChildren(props.navLinks, undefined);

  const getLinks = () => structuredData && structuredData.map((item) => (
    <Link
      key={item.id}
      to={item.url || ""}
      style={{
        paddingLeft: 15, paddingRight: 15, paddingBottom: 8, fontSize: 14, textDecoration: 'none', color: 'inherit'
      }}
    >
      {item.text}
    </Link>
  ));

  const getListMenu = () => structuredData && (
    <List component="nav">
      {structuredData.map((item) => <CascadingListMenu key={item.id} link={item} handleClose={() => toggleDrawer()} />)}
    </List>
  );

  let appBarClass = "";
  if (transparent) appBarClass = "transparent " + getLinkClass();

  return (
    <div>
      <AppBar id="navbar" position="fixed" className={appBarClass}>
        <Container style={{ height: 71 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Link to="/"><img src={getLogo()} alt={props.church.name} id="headerLogo" /></Link>
            <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", whiteSpace: "nowrap" }}>
              {getLinks()}
            </Box>
            <Box sx={{ display: { xs: "flex", md: "none" } }}>
              <IconButton size="large" color="inherit" id="nav-menu" onClick={toggleDrawer}>
                <MenuIcon />
              </IconButton>
              <Drawer open={open} onClose={toggleDrawer} anchor="right">
                <Toolbar disableGutters><IconButton onClick={toggleDrawer}><ChevronRightIcon /></IconButton></Toolbar>
                <Box sx={{ width: { xs: '100vw', sm: '50vw' } }}>
                  {getListMenu()}
                </Box>
              </Drawer>
            </Box>
          </Stack>
        </Container>
      </AppBar>
    </div>
  );
}
