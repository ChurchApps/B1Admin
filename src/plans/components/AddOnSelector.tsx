import React, { useState, useCallback, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Box,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Grid,
} from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";

interface AddOnInterface {
  id?: string;
  providerId?: string;
  category?: string;
  name?: string;
  image?: string;
  addOnType?: string;
  fileId?: string;
  seconds?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (addOnId: string, addOnName: string, image?: string, seconds?: number) => void;
}

export const AddOnSelector: React.FC<Props> = ({ open, onClose, onSelect }) => {
  const [addOns, setAddOns] = useState<AddOnInterface[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedAddOn, setSelectedAddOn] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const loadAddOns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ApiHelper.getAnonymous("/addOns/public", "LessonsApi");
      setAddOns(data || []);

      // Get unique categories
      const categories = [...new Set((data || []).map((a: AddOnInterface) => a.category))].filter(Boolean);
      if (categories.length > 0) {
        setSelectedCategory(categories[0] as string);
      }
    } catch (error) {
      console.error("Error loading add-ons:", error);
      setAddOns([]);
    }
    setLoading(false);
  }, []);

  const getCategories = useCallback(() => {
    const categories = [...new Set(addOns.map((a) => a.category))].filter(Boolean);
    return categories.sort();
  }, [addOns]);

  const getFilteredAddOns = useCallback(() => {
    if (!selectedCategory) return addOns;
    return addOns.filter((a) => a.category === selectedCategory);
  }, [addOns, selectedCategory]);

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    setSelectedAddOn("");
  }, []);

  const handleAddOnClick = useCallback((addOn: AddOnInterface) => {
    setSelectedAddOn(addOn.id || "");
  }, []);

  const handleSelect = useCallback(() => {
    if (selectedAddOn) {
      const addOn = addOns.find((a) => a.id === selectedAddOn);
      if (addOn) {
        onSelect(addOn.id || "", addOn.name || "Add-On", addOn.image, addOn.seconds);
        onClose();
      }
    }
  }, [selectedAddOn, addOns, onSelect, onClose]);

  const handleClose = useCallback(() => {
    setSelectedCategory("");
    setSelectedAddOn("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) loadAddOns();
  }, [open, loadAddOns]);

  const filteredAddOns = getFilteredAddOns();
  const categories = getCategories();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{Locale.label("plans.addOnSelector.selectAddOn") || "Select Add-On"}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>{Locale.label("plans.addOnSelector.category") || "Category"}</InputLabel>
            <Select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              label={Locale.label("plans.addOnSelector.category") || "Category"}
            >
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {loading ? (
            <Typography color="text.secondary">Loading add-ons...</Typography>
          ) : filteredAddOns.length === 0 ? (
            <Typography color="text.secondary">
              {Locale.label("plans.addOnSelector.noAddOns") || "No add-ons available"}
            </Typography>
          ) : (
            <Box sx={{ maxHeight: 400, overflow: "auto" }}>
              <Grid container spacing={2}>
                {filteredAddOns.map((addOn) => (
                  <Grid size={{ xs: 6, sm: 4, md: 3 }} key={addOn.id}>
                    <Card
                      sx={{
                        cursor: "pointer",
                        border: selectedAddOn === addOn.id ? "2px solid" : "1px solid",
                        borderColor: selectedAddOn === addOn.id ? "primary.main" : "grey.300",
                        transition: "all 0.2s",
                        "&:hover": {
                          borderColor: "primary.main",
                          boxShadow: 2,
                        },
                      }}
                      onClick={() => handleAddOnClick(addOn)}
                    >
                      {addOn.image && (
                        <CardMedia
                          component="img"
                          height="100"
                          image={addOn.image}
                          alt={addOn.name}
                          sx={{ objectFit: "cover" }}
                        />
                      )}
                      <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
                        <Typography variant="body2" noWrap title={addOn.name}>
                          {addOn.name}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{Locale.label("common.cancel")}</Button>
        <Button onClick={handleSelect} disabled={!selectedAddOn} variant="contained">
          {Locale.label("plans.addOnSelector.selectAddOn") || "Select Add-On"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
