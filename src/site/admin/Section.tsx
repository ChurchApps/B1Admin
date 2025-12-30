import React, { CSSProperties, useState } from "react";
import type { ElementInterface, SectionInterface } from "../../helpers";
import { ApiHelper } from "../../helpers";
import { StyleHelper } from "@churchapps/apphelper-website";
import { Box, Container } from "@mui/material";
import { DraggableWrapper, YoutubeBackground, DroppableArea, Element } from "@churchapps/apphelper-website";
import type { ChurchInterface } from "@churchapps/helpers";
import { ElementSelection } from "./ElementSelection";
import { FloatingElementSelection } from "./FloatingElementSelection";

interface Props {
  first?: boolean,
  section: SectionInterface,
  church?: ChurchInterface;
  churchSettings: any;
  onEdit?: (section: SectionInterface, element: ElementInterface) => void;
  onMove?: () => void;
  onBeforeChange?: (description: string) => void;
  selectedElementId?: string | null;
  onElementClick?: (elementId: string) => void;
  onElementDoubleClick?: (element: ElementInterface) => void;
  onElementDelete?: (elementId: string) => void;
  onElementDuplicate?: (elementId: string) => void;
  onElementMove?: (elementId: string, direction: "up" | "down") => void;
  onElementUpdate?: (element: ElementInterface) => void;
}

export const Section: React.FC<Props> = props => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);


  // Helper function to find element by ID in the nested structure
  const findElementById = (elements: ElementInterface[], id: string): ElementInterface | null => {
    for (const el of elements) {
      if (el.id === id) return el;
      if (el.elements && el.elements.length > 0) {
        const found = findElementById(el.elements, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Handle clicks on any element in the section (including nested ones in rows)
  const handleSectionClick = (event: React.MouseEvent) => {
    if (!props.onElementClick) return;

    const target = event.target as HTMLElement;

    // Find the closest element wrapper - look for data-element-id attribute or el-{id} pattern
    let elementId: string | null = null;

    // First, try to find element by data-element-id attribute (our wrapper)
    const wrapperWithId = target.closest('[data-element-id]') as HTMLElement;
    if (wrapperWithId) {
      elementId = wrapperWithId.getAttribute('data-element-id');
    }

    // If not found, try to find by el-{id} pattern (from RowElement)
    if (!elementId) {
      const elDiv = target.closest('[id^="el-"]') as HTMLElement;
      if (elDiv && elDiv.id.startsWith('el-')) {
        elementId = elDiv.id.substring(3); // Remove 'el-' prefix
      }
    }

    if (elementId) {
      event.stopPropagation();
      props.onElementClick(elementId);
    }
  };

  // Handle double-clicks on any element in the section (including nested ones in rows)
  const handleSectionDoubleClick = (event: React.MouseEvent) => {
    if (!props.onElementDoubleClick) return;

    const target = event.target as HTMLElement;
    let elementId: string | null = null;

    // First, try to find element by data-element-id attribute (our wrapper)
    const wrapperWithId = target.closest('[data-element-id]') as HTMLElement;
    if (wrapperWithId) {
      elementId = wrapperWithId.getAttribute('data-element-id');
    }

    // If not found, try to find by el-{id} pattern (from RowElement)
    if (!elementId) {
      const elDiv = target.closest('[id^="el-"]') as HTMLElement;
      if (elDiv && elDiv.id.startsWith('el-')) {
        elementId = elDiv.id.substring(3); // Remove 'el-' prefix
      }
    }

    if (elementId && props.section?.elements) {
      const element = findElementById(props.section.elements, elementId);
      if (element) {
        event.stopPropagation();
        props.onElementDoubleClick(element);
      }
    }
  };

  const getElements = () => {
    const result: React.ReactElement[] = [];
    props.section?.elements?.forEach(e => {
      const textColor = StyleHelper.getTextColor(props.section?.textColor, {}, props.churchSettings);
      const elementComponent = <Element key={e.id} element={e} onEdit={props.onEdit} onMove={props.onMove} church={props.church} churchSettings={props.churchSettings} textColor={textColor} />;

      // Wrap with ElementSelection if selection handlers are provided
      if (props.onElementClick && props.onElementDelete && props.onElementDuplicate && props.onElementMove && props.onElementUpdate) {
        result.push(
          <div
            key={e.id}
            data-element-id={e.id}
          >
            <ElementSelection
              element={e}
              isSelected={props.selectedElementId === e.id}
              onEdit={() => props.onEdit(null, e)}
              onDelete={() => props.onElementDelete(e.id)}
              onDuplicate={() => props.onElementDuplicate(e.id)}
              onMoveUp={() => props.onElementMove(e.id, "up")}
              onMoveDown={() => props.onElementMove(e.id, "down")}
              onUpdate={props.onElementUpdate}
            >
              {elementComponent}
            </ElementSelection>
          </div>
        );
      } else {
        result.push(elementComponent);
      }
    });
    return result;
  };

  const getStyle = () => {

    let result: CSSProperties = {};
    if (props.section.background.indexOf("/") > -1) {
      result = {
        backgroundImage: "url('" + props.section.background + "')"
      };
    } else {
      result = { background: props.section.background };
    }
    if (props.section.textColor?.startsWith("var(")) result.color = props.section.textColor;
    if (props.onEdit) {
      result.minHeight = 100;
      result.boxShadow = isHovered
        ? "0 4px 16px rgba(0, 0, 0, 0.12)"
        : "0 2px 8px rgba(0, 0, 0, 0.08)";
      result.transition = "box-shadow 0.2s ease";
    }

    result = { ...result };
    //console.log("SECTION STYLE", result)
    return result;
  };

  const getVideoClassName = () => {
    let result = "sectionVideo";
    if (props.section.textColor === "light") result += " sectionDark";
    if (props.first) result += " sectionFirst";
    if (props.onEdit) result += " sectionWrapper";
    return result;
  };

  const getClassName = () => {
    let result = "section";
    if (props.section.background.indexOf("/") > -1) result += " sectionBG";
    if (props.section.textColor === "light") result += " sectionDark";
    if (props.first) result += " sectionFirst";
    if (props.onEdit) result += " sectionWrapper";

    let hc = props.section.headingColor;
    if (hc) {
      hc = hc.replace("var(--", "").replace(")", "");
      result += " headings" + hc[0].toUpperCase() + hc.slice(1);
    }
    let lc = props.section.linkColor;
    if (lc) {
      lc = lc.replace("var(--", "").replace(")", "");
      result += " links" + lc[0].toUpperCase() + lc.slice(1);
    }

    return result;
  };

  /*
  const getEdit = () => {
    if (props.onEdit) {
      return (
        <div className="sectionActions">
          <table style={{ float: "right" }}>
            <tbody>
              <tr>
                <td><DraggableIcon dndType="section" elementType="section" data={props.section} /></td>
                <td>
                  <div className="sectionEditButton">
                    <SmallButton icon="edit" onClick={() => props.onEdit(props.section, null)} toolTip="section" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }
  }*/

  const handleDrop = (data: any, sort: number) => {
    if (data.data) {
      const element: ElementInterface = data.data;
      element.sort = sort;
      element.sectionId = props.section.id;
      if (props.onBeforeChange) props.onBeforeChange("Before moving element");
      ApiHelper.post("/elements", [element], "ContentApi").then(() => { props.onMove(); });
    } else {
      const element: ElementInterface = { sectionId: props.section.id, elementType: data.elementType, sort, blockId: props.section.blockId };
      if (data.blockId) element.answersJSON = JSON.stringify({ targetBlockId: data.blockId });
      else if (data.elementType === "row") element.answersJSON = JSON.stringify({ columns: "6,6" });
      else if (data.elementType === "box") element.answersJSON = JSON.stringify({ background: "var(--light)", text: "var(--dark)" });
      props.onEdit(null, element);
    }
  };

  const getAddElement = (s: number) => {
    const sort = s;
    return (<DroppableArea accept={["element", "elementBlock"]} text="Drop here to add element" onDrop={(data) => handleDrop(data, sort)} updateIsDragging={(dragging) => setIsDragging(dragging)} />);
  };

  const contents = (<Container onClick={handleSectionClick} onDoubleClick={handleSectionDoubleClick}>
    {props.onEdit && getAddElement(0)}
    {getElements()}
  </Container>);


  const getSectionAnchor = () => {
    if (props.section.answers?.sectionId) return <a id={props.section.answers?.sectionId} className="sectionAnchor"></a>;
    else return <></>;
  };

  const getId = () => {
    let result = "section-" + props.section.answers?.sectionId?.toString();
    if (result==="section-undefined") result = "section-" + props.section.id;
    return result;
  };

  // Check if the selected element is a nested element (inside a row, not a top-level element)
  const isNestedElementSelected = () => {
    if (!props.selectedElementId || !props.section?.elements) return false;
    // Check if the selected element is a top-level element
    const isTopLevel = props.section.elements.some(e => e.id === props.selectedElementId);
    if (isTopLevel) return false;
    // Check if it exists in the nested structure
    const found = findElementById(props.section.elements, props.selectedElementId);
    return !!found;
  };

  // Get the selected nested element
  const getSelectedNestedElement = (): ElementInterface | null => {
    if (!props.selectedElementId || !props.section?.elements) return null;
    return findElementById(props.section.elements, props.selectedElementId);
  };

  // Render floating selection for nested elements
  const renderFloatingSelection = () => {
    if (!isNestedElementSelected() || !props.onElementDelete || !props.onElementDuplicate || !props.onElementMove) return null;

    const selectedElement = getSelectedNestedElement();
    if (!selectedElement) return null;

    return (
      <FloatingElementSelection
        element={selectedElement}
        targetSelector={`#el-${props.selectedElementId}`}
        onEdit={() => props.onEdit(null, selectedElement)}
        onDelete={() => props.onElementDelete(selectedElement.id)}
        onDuplicate={() => props.onElementDuplicate(selectedElement.id)}
        onMoveUp={() => props.onElementMove(selectedElement.id, "up")}
        onMoveDown={() => props.onElementMove(selectedElement.id, "down")}
      />
    );
  };

  let result = <></>;
  if (props.section.background && props.section.background.indexOf("youtube:") > -1) {
    const youtubeId = props.section.background.split(":")[1];
    result = (<>{getSectionAnchor()}<YoutubeBackground isDragging={isDragging} id={getId()} videoId={youtubeId} overlay="rgba(0,0,0,.4)" contentClassName={getVideoClassName()}>{contents}</YoutubeBackground></>);
  } else result = (<>{getSectionAnchor()}<Box component="div" sx={{ ":before": { opacity: (props.section.answers?.backgroundOpacity) ? props.section.answers.backgroundOpacity + " !important" : "" } }} style={getStyle()} className={getClassName()} id={getId()}>{contents}</Box></>);

  if (props.onEdit) {
    return (
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <DraggableWrapper dndType="section" elementType="section" data={props.section} onDoubleClick={(e: React.MouseEvent) => { const target = e.target as HTMLElement; if (!target.closest('.elementWrapper')) { props.onEdit(props.section, null); } }}>
          {result}
        </DraggableWrapper>
        {renderFloatingSelection()}
      </div>
    );
  } else return result;
};
