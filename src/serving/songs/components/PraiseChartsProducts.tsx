import React, { useEffect } from "react";
import { ApiHelper, CurrencyHelper } from "@churchapps/apphelper";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Icon } from "@mui/material";
import { PraiseChartsHelper } from "../../../helpers/PraiseChartsHelper";
import { Link } from "react-router-dom";

interface Props {
  praiseChartsId: string;
  keySignature: string;
  onHide: () => void;
}

export const PraiseChartsProducts = (props: Props) => {
  const [products, setProducts] = React.useState<any[]>([]);
  const [expandedSkus, setExpandedSkus] = React.useState<string[]>([]);
  const [hasAccount, setHasAccount] = React.useState<boolean>(true);

  const loadData = async () => {
    if (props.praiseChartsId) {
      let url = "/praiseCharts/products/" + props.praiseChartsId;
      if (props.keySignature) url += "?keys=" + props.keySignature;
      const data = await ApiHelper.get(url, "ContentApi");
      const tree = buildTree(data);

      if (data.length === 0) {
        const { hasAccount } = await ApiHelper.get("/praiseCharts/hasAccount", "ContentApi");
        setHasAccount(hasAccount);
      }

      setProducts(tree);
    }
  };

  const addChildren = (product: any, allProducts: any[]) => {
    if (product?.child_products) {
      product.children = [];
      product.child_products.forEach((child: any) => {
        const c = allProducts.find((p: any) => p.sku === child.sku);
        if (c) product.children.push(c);
        addChildren(c, allProducts);
      });
    }
  };

  const buildTree = (allProducts: any[]) => {
    const rootExcludedSkus: string[] = [];
    products.forEach((product: any) => {
      if (product.child_products) {
        product.child_products.forEach((child: any) => {
          rootExcludedSkus.push(child.sku);
        });
      }
    });

    const result: any[] = [];
    allProducts.forEach((product: any) => {
      if (!rootExcludedSkus.includes(product.sku)) {
        result.push(product);
      }
      if (product.child_products) {
        addChildren(product, allProducts);
      }
    });
    return result;
  };

  useEffect(() => {
    loadData();
  }, [props.praiseChartsId, props.keySignature]);

  const download = async (product: any) => {
    PraiseChartsHelper.download(product.sku, product.file_name, "");
  };

  const purchase = async (sku: string) => {
    const returnUrl = window.location.origin + "/pingback";
    const purchaseUrl = `https://www.praisecharts.com/buynow?sku=${sku}&XID=churchapps&return_url=${encodeURIComponent(returnUrl)}`;
    const popup = window.open(purchaseUrl, "oauth", "width=600,height=700");

    window.addEventListener("message", async (event) => {
      if (event.origin !== window.location.origin) return;
      popup.close();
      loadData();
    });
  };

  const getPriceButton = (product: any) => {
    let result = <></>;
    if (product.price) {
      if (product.permissions?.can_download) {
        result = (
          <Button
            variant="contained"
            size="small"
            color="primary"
            onClick={(e) => {
              e.preventDefault();
              download(product);
            }}>
            <Icon>download</Icon>
          </Button>
        );
      } else if (product.price.price === 0) {
        result = (
          <Button
            variant="contained"
            size="small"
            color="success"
            onClick={(e) => {
              e.preventDefault();
              purchase(product.sku);
            }}>
            Free
          </Button>
        );
      } else {
        result = (
          <Button
            variant="contained"
            size="small"
            color="error"
            onClick={(e) => {
              e.preventDefault();
              purchase(product.sku);
            }}>
            {CurrencyHelper.formatCurrency(product.price.price)}
          </Button>
        );
      }
    }
    return result;
  };

  const getProductRow = (product: any, indent: number) => {
    let expand = <></>;
    if (product.children?.length > 0) {
      if (expandedSkus.includes(product.sku)) {
        expand = (
          <button
            type="button"
            onClick={() => setExpandedSkus(expandedSkus.filter((s) => s !== product.sku))}
            style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}>
            <Icon>expand_less</Icon>
          </button>
        );
      } else {
        expand = (
          <button
            type="button"
            onClick={() => setExpandedSkus([...expandedSkus, product.sku])}
            style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}>
            <Icon>expand_more</Icon>
          </button>
        );
      }
    }
    const result = (
      <Grid container spacing={1} key={product.sku} style={{ marginBottom: 4 }}>
        <Grid size={{ xs: 1 }}>{expand}</Grid>
        <Grid size={{ xs: 4 }} style={{ paddingLeft: indent * 20 }}>
          {product.name}
        </Grid>
        <Grid size={{ xs: 1 }}>{product.file_type}</Grid>
        <Grid size={{ xs: 2 }}>{product.sku}</Grid>
        <Grid size={{ xs: 2 }}>{getPriceButton(product)}</Grid>
      </Grid>
    );

    if (expandedSkus.includes(product.sku)) {
      return [result, ...(product.children?.map((child: any) => getProductRow(child, indent + 1)) || [])];
    }

    return result;
  };

  return (
    <Dialog open={true} fullWidth={true} maxWidth="lg">
      <DialogTitle>Add Products from PraiseCharts</DialogTitle>
      <DialogContent>
        {products.map((product: any) => getProductRow(product, 0))}
        {!hasAccount && (
          <p>
            You do not have a linked PraiseCharts account. Go to your <Link to="/profile">profile</Link> to link an account.{" "}
          </p>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onHide} data-cy="cancel-merge">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
