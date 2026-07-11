import React from "react";
import type { ElementInterface, SectionInterface } from "../../helpers";
import { DraggableIcon } from "./DraggableIcon";
import { Section } from "./Section";
import { SectionToolbar } from "./SectionToolbar";


interface Props {
  first?: boolean,
  section: SectionInterface,
  churchId?: string;
  churchSettings: any;
  onEdit?: (section: SectionInterface, element: ElementInterface | null) => void
  onMove?: () => void
  onSectionMove?: (section: SectionInterface, direction: "up" | "down") => void;
  onSectionDuplicate?: (sectionId: string) => void;
  onSectionDelete?: (section: SectionInterface) => void;
  isFirstSection?: boolean;
  isLastSection?: boolean;
}

export const SectionBlock: React.FC<Props> = props => {

  const getEdit = () => {
    if (props.onEdit && props.onSectionMove) {
      return (
        <SectionToolbar
          isFirst={!!props.isFirstSection}
          isLast={!!props.isLastSection}
          dragHandle={<DraggableIcon dndType="section" elementType="section" data={props.section} />}
          onSettings={() => props.onEdit?.(props.section, null)}
          onMoveUp={() => props.onSectionMove?.(props.section, "up")}
          onMoveDown={() => props.onSectionMove?.(props.section, "down")}
          onDuplicate={() => props.onSectionDuplicate?.(props.section.id || "")}
          onDelete={() => props.onSectionDelete?.(props.section)}
        />
      );
    }
  };

  const getSections = () => {
    const result: React.ReactElement[] = [];
    props.section.sections?.forEach(section => {
      result.push(<Section key={section.id} section={section} churchSettings={props.churchSettings} />);
    });
    return result;
  };

  const getClassName = () => {
    let result = "";
    if (props.onEdit) result += "sectionBlock sectionWrapper sectionEditWrapper";
    return result;
  };

  return (<div style={{ minHeight: 30, position: "relative" }} className={getClassName()}>
    {getEdit()}
    {getSections()}
  </div>);
};
