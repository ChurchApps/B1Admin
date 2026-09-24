import { ApiHelper } from "@churchapps/apphelper";
import { EnvironmentHelper } from "./EnvironmentHelper";

export class PraiseChartsHelper {
  static async download(sku: string, fileName: string, keys: string) {
    let url = `/praiseCharts/download?skus=${encodeURIComponent(sku)}&file_name=${encodeURIComponent(fileName)}`;
    if (keys) url += "&keys=" + encodeURIComponent(keys);
    const data = await ApiHelper.get(url, "ContentApi");
    let redirectUrl = data.redirectUrl;

    if (EnvironmentHelper.Common.ContentApi.indexOf("localhost") > -1) redirectUrl = EnvironmentHelper.Common.ContentApi + redirectUrl;
    else redirectUrl = EnvironmentHelper.Common.ContentRoot + redirectUrl;
    return redirectUrl;
  }
  /*
    console.log("Download URL", url);
    const config = ApiHelper.getConfig("ContentApi");
    const requestOptions: any = {
      method: "GET",
      headers: { Authorization: "Bearer " + config.jwt },
      cache: "no-store"
    };
    const response = await fetch(config.url + url, requestOptions);

    if (!response.ok) {
      console.error("Failed to download PDF");
      return;
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    console.log("BLOB URL", blobUrl);
    // Trigger file download
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName || "praisecharts.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the blob URL after download
    window.URL.revokeObjectURL(blobUrl);

  }
    */
}
