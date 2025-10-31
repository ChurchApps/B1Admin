import { CommonEnvironmentHelper, ApiHelper, Locale } from "@churchapps/apphelper";
import { EnvironmentHelper as WebsiteEnvironmentHelper } from "@churchapps/apphelper-website";

export class EnvironmentHelper {
  private static LessonsApi = "";
  static B1Url = "";
  static ChurchAppsUrl = "";
  static Common = CommonEnvironmentHelper;

  static init = async () => {
    const stage = process.env.REACT_APP_STAGE;
    console.log(`Environment stage: ${stage}`);

    switch (stage) {
      case "staging":
        EnvironmentHelper.initStaging();
        break;
      case "prod":
        EnvironmentHelper.initProd();
        break;
      default:
        EnvironmentHelper.initDev();
        break;
    }
    EnvironmentHelper.Common.init(stage);

    WebsiteEnvironmentHelper.init();
    ApiHelper.apiConfigs.push(
      {
        keyName: "ReportingApi",
        url: EnvironmentHelper.Common.ReportingApi,
        jwt: "",
        permissions: [],
      },
      {
        keyName: "LessonsApi",
        url: EnvironmentHelper.LessonsApi,
        jwt: "",
        permissions: [],
      },
      {
        keyName: "AskApi",
        url: EnvironmentHelper.Common.AskApi,
        jwt: "",
        permissions: [],
      }
    );

    await Locale.init([`/locales/{{lng}}.json?v=1`, `/apphelper/locales/{{lng}}.json`]);
  };

  static initLocal = async () => { };

  static initDev = () => {
    this.initStaging();
    EnvironmentHelper.LessonsApi = process.env.REACT_APP_LESSONS_API || EnvironmentHelper.LessonsApi;
    EnvironmentHelper.B1Url = process.env.REACT_APP_B1_WEBSITE_URL || EnvironmentHelper.B1Url;
    console.log("LessonsAPI is", EnvironmentHelper.LessonsApi, process.env.REACT_APP_LESSONS_API);
  };

  //NOTE: None of these values are secret.
  static initStaging = () => {
    EnvironmentHelper.LessonsApi = "https://api.staging.lessons.church";
    EnvironmentHelper.B1Url = "https://{subdomain}.staging.b1.church";
  };

  //NOTE: None of these values are secret.
  static initProd = () => {
    EnvironmentHelper.Common.GoogleAnalyticsTag = "G-JB7VCG51LF";
    EnvironmentHelper.LessonsApi = "https://api.lessons.church";
    EnvironmentHelper.B1Url = "https://{subdomain}.b1.church";
  };
}
