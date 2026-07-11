import { CommonEnvironmentHelper, ApiHelper, Locale } from "@churchapps/apphelper";
import { EnvironmentHelper as WebsiteEnvironmentHelper } from "@churchapps/apphelper/dist/website/helpers/EnvironmentHelper.js";
import { setProviderSecret } from "@churchapps/content-providers";

export class EnvironmentHelper {
  private static LessonsApi = "";
  static B1Url = "";
  static ChurchAppsUrl = "";

  static get Common() { return CommonEnvironmentHelper; }

  static init = async () => {
    const stage = process.env.REACT_APP_STAGE;

    switch (stage) {
      case "demo": EnvironmentHelper.initDemo(); break;
      case "staging": EnvironmentHelper.initStaging(); break;
      case "prod": EnvironmentHelper.initProd(); break;
      default: EnvironmentHelper.initDev(); break;
    }
    EnvironmentHelper.Common.init(stage || "");
    setProviderSecret("gocurriculum", process.env.REACT_APP_GOCURRICULUM_CLIENT_SECRET || "");

    // Inlined from apphelper/website EnvironmentHelper.init — that helper crashes due to circular import.
    ApiHelper.apiConfigs = [
      { keyName: "MembershipApi", url: CommonEnvironmentHelper.MembershipApi, jwt: "", permissions: [] },
      { keyName: "AttendanceApi", url: CommonEnvironmentHelper.AttendanceApi, jwt: "", permissions: [] },
      { keyName: "MessagingApi", url: CommonEnvironmentHelper.MessagingApi, jwt: "", permissions: [] },
      { keyName: "ContentApi", url: CommonEnvironmentHelper.ContentApi, jwt: "", permissions: [] },
      { keyName: "GivingApi", url: CommonEnvironmentHelper.GivingApi, jwt: "", permissions: [] },
      { keyName: "DoingApi", url: CommonEnvironmentHelper.DoingApi, jwt: "", permissions: [] },
      { keyName: "ReportingApi", url: CommonEnvironmentHelper.ReportingApi, jwt: "", permissions: [] },
      { keyName: "LessonsApi", url: EnvironmentHelper.LessonsApi, jwt: "", permissions: [] },
      { keyName: "AskApi", url: CommonEnvironmentHelper.AskApi, jwt: "", permissions: [] }
    ];
    WebsiteEnvironmentHelper.Common = CommonEnvironmentHelper;
    WebsiteEnvironmentHelper.hasInit = true;

    await Locale.init([`/locales/{{lng}}.json?v=1`, `/apphelper/locales/{{lng}}.json`]);
  };

  static initLocal = async () => { };

  static initDev = () => {
    this.initStaging();
    EnvironmentHelper.LessonsApi = process.env.REACT_APP_LESSONS_API || EnvironmentHelper.LessonsApi;
    EnvironmentHelper.B1Url = process.env.REACT_APP_B1_WEBSITE_URL || EnvironmentHelper.B1Url;
  };

  //NOTE: None of these values are secret.
  static initDemo = () => {
    EnvironmentHelper.initStaging();
    EnvironmentHelper.B1Url = "https://{subdomain}.demosite.b1.church";
  };

  //NOTE: None of these values are secret.
  static initStaging = () => {
    EnvironmentHelper.LessonsApi = "https://api.staging.lessons.church";
    EnvironmentHelper.B1Url = "https://{subdomain}.staging.b1.church";
  };

  //NOTE: None of these values are secret.
  static initProd = () => {
    EnvironmentHelper.Common.GoogleAnalyticsTag = "G-47N4XQJQJ5";
    EnvironmentHelper.LessonsApi = "https://api.lessons.church";
    EnvironmentHelper.B1Url = "https://{subdomain}.b1.church";
  };
}
