import ReactGA4 from "react-ga4";
import { CommonEnvironmentHelper, UserHelper } from "@churchapps/helpers";

export class AnalyticsHelper {

  static init = () => {
    if (CommonEnvironmentHelper.GoogleAnalyticsTag !== "" && typeof(window) !== "undefined") {
      ReactGA4.initialize(CommonEnvironmentHelper.GoogleAnalyticsTag);
      AnalyticsHelper.logPageView();
    }
  };

  static logPageView = () => {
    if (CommonEnvironmentHelper.GoogleAnalyticsTag !== "" && typeof(window) !== "undefined") {
      this.setChurchKey();
      ReactGA4.send({ hitType: "pageview", page: window.location.pathname + window.location.search });
    }
  };

  static logEvent = (category: string, action: string, label?:string) => {
    if (CommonEnvironmentHelper.GoogleAnalyticsTag !== "" && typeof(window) !== "undefined") {
      this.setChurchKey();
      ReactGA4.event({ category, action, label });
    }
  };

  private static setChurchKey = () => {
    const churchKey = UserHelper?.currentUserChurch?.church?.subDomain;
    if (churchKey) ReactGA4.set({ church_key: churchKey });
  };

}
