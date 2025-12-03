import { useEffect, useState, useContext } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeProvider, createTheme, useMediaQuery, Container, Skeleton } from "@mui/material";
import { useWindowWidth } from "@react-hook/window-size";
import type { BlockInterface, ElementInterface, PageInterface, SectionInterface, GlobalStyleInterface } from "../../helpers/Interfaces";
import { ApiHelper, ArrayHelper, UserHelper } from "../../helpers";
import { Permissions } from "@churchapps/helpers";
import { Section } from "./Section";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import React from "react";
import { Theme, DroppableArea } from "@churchapps/apphelper-website";
import { SectionBlock } from "./SectionBlock";
import { StyleHelper } from "../../helpers/StyleHelper";
import { ElementAdd } from "./elements/ElementAdd";
import { ElementEdit } from "./elements/ElementEdit";
import { SectionEdit } from "./SectionEdit";
import { DroppableScroll } from "./DroppableScroll";
import UserContext from "../../UserContext";
import { EditorToolbar } from "./EditorToolbar";
import { HelpDialog } from "./HelpDialog";
import { ZoneBox } from "./ZoneBox";
import { EmptyState } from "./EmptyState";

interface ConfigInterface {
  globalStyles?: GlobalStyleInterface;
  appearance?: any;
  church?: any;
}

interface Props {
  loadData: (id: string) => Promise<any>,
  pageId?: string,
  blockId?: string
  onDone?: (url?: string) => void
  config?: ConfigInterface
};

export function ContentEditor(props: Props) {
  const navigate = useNavigate();
  const context = useContext(UserContext);
  const [container, setContainer] = useState<PageInterface | BlockInterface>(null);
  const [editSection, setEditSection] = useState<SectionInterface>(null);
  const [editElement, setEditElement] = useState<ElementInterface>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [deviceType, setDeviceType] = useState("desktop");
  const windowWidth = useWindowWidth();
  const isMobileViewport = useMediaQuery('(max-width:900px)');
  const contentRef = React.useRef<HTMLDivElement>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const css = StyleHelper.getCss(container?.sections || []);

  let elementOnlyMode = false;
  if (props.blockId && container?.sections?.length===1 && container?.sections[0]?.id==="") elementOnlyMode = true;

  const zones: any = {
    cleanCentered: ["main"],
    embed: ["main"],
    headerFooter: ["main"],
  };

  const churchSettings = props.config?.appearance || context?.userChurch?.settings || {};

  useEffect(() => {
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) navigate("/site");
  }, []);

  const normalizeElements = (elements: ElementInterface[]): ElementInterface[] => {
    if (!elements) return elements;
    return elements.map(element => {
      if (!element.elements) element.elements = [];
      if (element.elements && element.elements.length > 0) element.elements = normalizeElements(element.elements);
      return element;
    });
  };

  const loadDataInternal = () => {
    if (UserHelper.checkAccess(Permissions.contentApi.content.edit)) {
      props.loadData(props.pageId || props.blockId).then((p: PageInterface | BlockInterface) => {
        if (p?.sections) {
          p.sections.forEach(section => {
            if (section.elements) section.elements = normalizeElements(section.elements);
          });
        }
        setContainer(p);
      });
    }
  };

  useEffect(loadDataInternal, [props.pageId, props.blockId]);

  useEffect(() => {
    if (isMobileViewport) navigate("/site");
  }, [isMobileViewport]);

  const handleDrop = (data: any, sort: number, zone: string) => {
    if (data.data) {
      const section: SectionInterface = data.data;
      section.sort = sort;
      section.zone = zone;
      section.pageId = (zone === "siteFooter") ? null : props.pageId;
      ApiHelper.post("/sections", [section], "ContentApi").then(() => { loadDataInternal(); });
    } else {
      const sec = {
        sort, background: "#FFF", textColor: "dark", pageId: props.pageId, blockId: props.blockId, targetBlockId: data.blockId, zone: zone 
      };
      if (sec.zone === "siteFooter") sec.pageId = null;
      setEditSection(sec);
    }
  };

  const getAddSection = (s: number, zone: string) => {
    const sort = s;
    return (<DroppableArea key={"addSection_" + zone + "_" + s.toString()} text="Drop here to add section" accept={["section", "sectionBlock"]} onDrop={(data) => handleDrop(data, sort, zone)} />);
  };

  const getSections = (zone: string) => {
    const result: React.ReactElement[] = [];
    result.push(getAddSection(0, zone));
    const sections = (zone === "block") ? container?.sections : ArrayHelper.getAll(container?.sections, "zone", zone);
    sections?.forEach(section => {
      if (section.targetBlockId) result.push(<SectionBlock key={section.id} section={section} churchSettings={churchSettings} onEdit={handleSectionEdit} onMove={() => { loadDataInternal(); }} />);
      else result.push(<Section key={section.id} section={section} churchSettings={churchSettings} onEdit={handleSectionEdit} onMove={() => { loadDataInternal(); }} church={context?.userChurch?.church} />);
      result.push(getAddSection(section.sort + 0.1, zone));
    });

    if (sections.length === 0) {
      result.push(<EmptyState key="empty" />);
    }
    return result;
  };

  const handleSectionEdit = (s: SectionInterface, e: ElementInterface) => {
    if (s) {
      if (s.targetBlockId) navigate(`/site/blocks/${s.targetBlockId}`);
      else setEditSection(s);
    } else if (e) setEditElement(e);
  };

  let rightBarStyle: CSSProperties = {};

  if (typeof window !== "undefined") {
    const editorBar = document.getElementById("editorBar");
    if (window.innerWidth > 900) {
      if (window?.innerHeight) {
        if (scrollTop < 50) rightBarStyle = { paddingTop: '70px' };
      }
    }
  }

  const handleDone = () => {
    let url = '';
    if (props.pageId) {
      const page = container as PageInterface;
      if (page.layout === "embed") {
        if (page.url.includes("/stream")) url = '/admin/video/settings';
      }
    }
    if (props.onDone) props.onDone(url);
    else navigate(`/site/pages/preview/${props.pageId}`);
  };

  useEffect(() => {
    const contentEl = contentRef.current;
    if (!contentEl) return;
    const onScroll = () => { setScrollTop(contentEl.scrollTop); };
    contentEl.addEventListener("scroll", onScroll);
    return () => contentEl.removeEventListener("scroll", onScroll);
  }, []);


  const handleRealtimeChange = (element: ElementInterface) => {
    const c = { ...container };
    c.sections.forEach(s => {
      realtimeUpdateElement(element, s.elements);
    });
    setContainer(c);
  };

  const realtimeUpdateElement = (element: ElementInterface, elements: ElementInterface[]) => {
    for (let i = 0; i < elements.length; i++) {
      if (elements[i].id === element.id) {
        elements[i] = element;
        return;
      }
      if (elements[i].elements && elements[i].elements.length > 0) {
        realtimeUpdateElement(element, elements[i].elements);
      }
    }
  };

  const getTheme = () => {
    if (deviceType === "mobile") {
      return createTheme({
        breakpoints: {
          values: { xs: 0, sm: 2000, md: 3000, lg: 4000, xl: 5000 },
        },
        components: {
          MuiTextField: { defaultProps: { margin: "normal" } },
          MuiFormControl: { defaultProps: { margin: "normal" } }
        }
      });
    } else {
      return createTheme({
        components: {
          MuiTextField: { defaultProps: { margin: "normal" } },
          MuiFormControl: { defaultProps: { margin: "normal" } }
        }
      });
    }
  };

  const getZoneBox = (sections: SectionInterface[], name: string, keyName: string) => (
    <ZoneBox sections={sections} name={name} keyName={keyName} deviceType={deviceType}>
      {getSections(keyName)}
    </ZoneBox>
  );

  const getZoneBoxes = () => {
    const result: any[] = [];
    let idx = 0;
    if (props.pageId) {
      const page = container as PageInterface;
      zones[page?.layout]?.forEach((z: string) => {
        const sections = ArrayHelper.getAll(page?.sections, "zone", z);
        const name = z.substring(0, 1).toUpperCase() + z.substring(1, z.length);
        result.push(getZoneBox(sections, name, z));
        idx++;
      });
    } else {
      const block = container as BlockInterface;
      if (block) result.push(getZoneBox((container as BlockInterface)?.sections, "Block Preview", "block"));
    }
    return <>{result}</>;
  };




  if (!container) {
    return (
      <>
        <Theme globalStyles={props.config?.globalStyles} appearance={props.config?.appearance} />
        <EditorToolbar
          onDone={handleDone}
          container={container}
          isPageMode={!!props.pageId}
          showHelp={showHelp}
          onToggleHelp={() => setShowHelp(!showHelp)}
          showAdd={showAdd}
          onToggleAdd={() => setShowAdd(!showAdd)}
          deviceType={deviceType}
          onDeviceTypeChange={setDeviceType}
        />
        <Container sx={{ mt: 5 }}>
          <Skeleton variant="rectangular" height={200} sx={{ mb: 2, borderRadius: 2 }} animation="wave" />
          <Skeleton variant="rectangular" height={200} sx={{ mb: 2, borderRadius: 2 }} animation="wave" />
          <Skeleton variant="rectangular" height={200} sx={{ mb: 2, borderRadius: 2 }} animation="wave" />
        </Container>
      </>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)", overflow: "hidden" }}>
      <Theme globalStyles={props.config?.globalStyles} appearance={props.config?.appearance} />
      <style>{css}</style>

      <EditorToolbar
        onDone={handleDone}
        container={container}
        isPageMode={!!props.pageId}
        showHelp={showHelp}
        onToggleHelp={() => setShowHelp(!showHelp)}
        showAdd={showAdd}
        onToggleAdd={() => setShowAdd(!showAdd)}
        deviceType={deviceType}
        onDeviceTypeChange={setDeviceType}
      />

      <div ref={contentRef} style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        <DndProvider backend={HTML5Backend}>
          <HelpDialog open={showHelp} onClose={() => setShowHelp(false)} />
          {showAdd && <ElementAdd includeBlocks={!elementOnlyMode} includeSection={!elementOnlyMode} updateCallback={() => { setShowAdd(false); }} draggingCallback={() => setShowAdd(false)} />}
          {editElement && <ElementEdit element={editElement} updatedCallback={(updatedElement) => {
            setEditElement(null);
            if (updatedElement) {
              const isNewElement = !editElement.id;
              if (isNewElement) loadDataInternal();
              else {
                const c = { ...container };
                c.sections.forEach(s => {
                  realtimeUpdateElement(updatedElement, s.elements);
                });
                setContainer(c);
              }
            } else {
              loadDataInternal();
            }
          }} onRealtimeChange={handleRealtimeChange} globalStyles={props.config?.globalStyles} />}
          {editSection && <SectionEdit section={editSection} updatedCallback={() => { setEditSection(null); loadDataInternal(); }} globalStyles={props.config?.globalStyles} />}

          <div style={{ marginTop: 0, paddingTop: 0 }}>
            {scrollTop > 150 && (
              <>
                <div style={{
                  position: "fixed", bottom: '30px', left: "50%", transform: "translateX(-50%)", zIndex: 1000, width: "min(600px, 80%)", maxWidth: "600px"
                }}>
                  <DroppableScroll key={"scrollDown"} text={"Scroll Down"} direction="down" />
                </div>
                <div style={{
                  position: "fixed", top: '120px', left: "50%", transform: "translateX(-50%)", zIndex: 1000, width: "min(600px, 80%)", maxWidth: "600px"
                }}>
                  <DroppableScroll key={"scrollUp"} text={"Scroll Up"} direction="up" />
                </div>
              </>
            )}

            <ThemeProvider theme={getTheme()}>
              {getZoneBoxes()}
            </ThemeProvider>
          </div>
        </DndProvider>
      </div>
    </div>
  );
}
