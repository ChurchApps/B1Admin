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
          // Date-only values arrive as UTC midnight; read them as calendar dates so US browsers don't show the day before.
          const dateOnly = result.match(/^(\d{4})-(\d{2})-(\d{2})(T00:00:00(\.000)?Z)?$/);
          const dt = dateOnly ? new Date(+dateOnly[1], +dateOnly[2] - 1, +dateOnly[3]) : new Date(result);
          result = isNaN(dt.getTime()) ? "" : DateHelper.prettyDate(dt);
        }
        break;
      case "time":
        if (result) {
          const dt = new Date(result);
          result = isNaN(dt.getTime()) ? "" : DateHelper.prettyTime(dt);
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
