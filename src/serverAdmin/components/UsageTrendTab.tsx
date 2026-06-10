import { DisplayBox, Locale } from "@churchapps/apphelper";
import { ReportWithFilter } from "../../components/reporting/ReportWithFilter";

export const UsageTrendsTab = () => (
  <>
    <ReportWithFilter keyName="usageTrends" autoRun={true} />
    <DisplayBox headerIcon="summarize" headerText={Locale.label("serverAdmin.adminPage.valueNotes")}>
      <div>
        <h4>{Locale.label("serverAdmin.adminPage.notes")}</h4>
        <ul>
          <li key="b1admin">
            <b>B1Admin</b> - {Locale.label("serverAdmin.adminPage.noteOne")}
          </li>
          <li key="b1">
            <b>B1</b> - {Locale.label("serverAdmin.adminPage.noteTwo")}
          </li>
          <li key="lessons">
            <b>Lessons</b> - {Locale.label("serverAdmin.adminPage.noteThree")}
          </li>
          <li key="freeshow">
            <b>FreeShow</b> - {Locale.label("serverAdmin.adminPage.noteFour")}
          </li>
        </ul>
      </div>
    </DisplayBox>
  </>
);
