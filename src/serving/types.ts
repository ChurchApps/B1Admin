/** Body for MessagingApi POST /notifications/create. */
export interface CreateNotificationRequest {
  peopleIds: (string | undefined)[];
  contentType: string;
  contentId?: string;
  message: string;
  link?: string;
}

/** A chart from ContentApi /praiseCharts/arrangement/raw (grouped by key signature). */
export interface PraiseChartsArrangementProduct {
  name: string;
  file_type: string;
  download: string;
}

/** A product from ContentApi /praiseCharts/products; buildTree fills in `children` from `child_products`. */
export interface PraiseChartsCatalogProduct {
  sku: string;
  name: string;
  file_type: string;
  file_name: string;
  price?: { price: number };
  permissions?: { can_download?: boolean };
  child_products?: { sku: string }[];
  children?: PraiseChartsCatalogProduct[];
}
