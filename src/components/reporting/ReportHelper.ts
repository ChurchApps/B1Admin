import { DateHelper } from "@churchapps/apphelper";
import type { ColumnInterface } from "@churchapps/helpers";

export class ReportHelper {
  static getField = (column: ColumnInterface, dataRow: any) => {
    let result = "";
    try {
      result = dataRow[column.value]?.toString() || "";
    } catch {
      //do nothing
    }

    switch (column.formatter) {
      case "date":
        if (result) {
          const dt = new Date(result);
          result = isNaN(dt.getTime()) ? "" : DateHelper.prettyDate(dt);
        }
        break;
      case "number":
        try {
          const num = parseFloat(result);
          if (isNaN(num)) result = "";
          else {
            const [whole, fraction] = num.toString().split(".");
            result = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (fraction ? "." + fraction : "");
          }
        } catch {
          //do nothing
        }
        break;
      case "dollars":
        try {
          const num = parseFloat(result);
          const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
          result = usd.format(num).replace(".00", "");
        } catch {
          //do nothing
        }
        break;
    }
    return result;
  };
}
