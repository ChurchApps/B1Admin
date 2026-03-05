import React from "react";
import { Button, Icon } from "@mui/material";
import type { ElementInterface, SectionInterface } from "../../helpers";
import { DraggableIcon } from "./DraggableIcon";
import { Section } from "./Section";


interface Props {
  first?: boolean,
  section: SectionInterface,
  churchId?: string;
  churchSettings: any;
  onEdit?: (section: SectionInterface, element: ElementInterface) => void
  onMove?: () => void
}

export const SectionBlock: React.FC<Props> = props => {

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
                    <Button size="small" variant="outlined" startIcon={<Icon>edit</Icon>} onClick={() => props.onEdit(props.section, null)} sx={{ minWidth: "auto" }}>Edit</Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }
  };

  const getSections = () => {
    const result: React.ReactElement[] = [];
    props.section.sections.forEach(section => {
      result.push(<Section key={section.id} section={section} churchSettings={props.churchSettings} />);
    });
    return result;
  };

  const getClassName = () => {
    let result = "";
    if (props.onEdit) result += "sectionBlock sectionWrapper";
    return result;
  };

  return (<div style={{ minHeight: 30, position: "relative" }} className={getClassName()}>
    {getEdit()}
    {getSections()}
  </div>);
};
