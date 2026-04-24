import React from "react";
import { Button, Icon, IconButton, Tooltip } from "@mui/material";
import type { ElementInterface, SectionInterface } from "../../helpers";
import { ApiHelper } from "../../helpers";
import { Locale } from "@churchapps/apphelper";
import { DraggableIcon } from "./DraggableIcon";
import { Section } from "./Section";


interface Props {
  first?: boolean,
  section: SectionInterface,
  churchId?: string;
  churchSettings: any;
  onEdit?: (section: SectionInterface, element: ElementInterface) => void
  onDelete?: () => void
  onMove?: () => void
}

export const SectionBlock: React.FC<Props> = props => {

  const handleDelete = () => {
    if (window.confirm(Locale.label("site.section.confirmDelete"))) {
      ApiHelper.delete("/sections/" + props.section.id, "ContentApi").then(() => {
        if (props.onDelete) props.onDelete();
      });
    }
  };

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
                <td>
                  <Tooltip title="Delete section">
                    <IconButton size="small" onClick={handleDelete} sx={{ color: "error.main", ml: 0.5 }}>
                      <Icon>delete</Icon>
                    </IconButton>
                  </Tooltip>
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
