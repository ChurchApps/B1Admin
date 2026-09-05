import React from "react";
import { Button, Checkbox, Typography, Box } from "@mui/material";
import { PlayArrow as PlayArrowIcon, ExpandMore as ExpandMoreIcon, ChevronRight as ChevronRightIcon, Add as AddIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { type InstructionItem } from "@churchapps/content-providers";

interface InstructionTreeProps {
  items: InstructionItem[];
  providerId: string;
  expandedSections: Set<string>;
  onToggleExpanded: (sectionId: string) => void;
  onAddSection: (section: InstructionItem, provId: string, pathIndices: number[]) => void;
  onAddAction: (action: InstructionItem, provId: string, pathIndices: number[]) => void;
  excludeHeaders?: boolean;  // When true, skip header items and show their children directly
  excludeActions?: boolean;  // When true, don't show action items (only headers/sections)
  /** When set, rows show a checkbox that reports through onAddSection/onAddAction instead of an immediate Add button. */
  isSelected?: (item: InstructionItem, pathIndices: number[]) => boolean;
}

const InstructionItemRow: React.FC<{
  item: InstructionItem;
  providerId: string;
  depth: number;
  pathIndices: number[];
  expandedSections: Set<string>;
  onToggleExpanded: (sectionId: string) => void;
  onAddSection: (section: InstructionItem, provId: string, pathIndices: number[]) => void;
  onAddAction: (action: InstructionItem, provId: string, pathIndices: number[]) => void;
  excludeActions?: boolean;
  isSelected?: (item: InstructionItem, pathIndices: number[]) => boolean;
}> = ({ item, providerId, depth, pathIndices, expandedSections, onToggleExpanded, onAddSection, onAddAction, excludeActions, isSelected }) => {
  const itemId = item.relatedId || item.id || "";
  const visibleChildren = item.children?.filter(child => {
    if (child.itemType === "file") return false;
    if (excludeActions && (child.itemType === "action" || child.itemType === "providerPresentation")) return false;
    return true;
  }) || [];
  const hasChildren = visibleChildren.length > 0;
  const isExpanded = expandedSections.has(itemId);
  const isSection = item.itemType === "section" || item.itemType === "header";
  const isAction = item.itemType === "action" || item.itemType === "providerPresentation";
  const handleAdd = () => (isSection ? onAddSection(item, providerId, pathIndices) : onAddAction(item, providerId, pathIndices));
  const selectCheckbox = isSelected ? (
    <Checkbox
      checked={isSelected(item, pathIndices)}
      onChange={handleAdd}
      data-testid="instruction-select-checkbox"
      slotProps={{ input: { "aria-label": (Locale.label("plans.actionSelector.selectItem") || "Select {label}").replace("{label}", item.label || "") } }}
      sx={{ ml: 1 }}
    />
  ) : null;

  const fileChild = item.children?.find(child => child.itemType === "file");
  const thumbnail = !isSection
    ? (item.thumbnail || fileChild?.thumbnail)
    : undefined;

  if (hasChildren) {
    return (
      <Box key={itemId} sx={{ mb: depth === 0 ? 1 : 0.5 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            py: depth === 0 ? 1 : 0.75,
            px: 1,
            borderRadius: 1,
            bgcolor: depth === 0 ? "grey.100" : "transparent",
            "&:hover": { bgcolor: depth === 0 ? "grey.200" : "action.hover" }
          }}
        >
          <AppIconButton label={isExpanded ? Locale.label("common.collapse") : Locale.label("common.expand")} icon={isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />} onClick={() => onToggleExpanded(itemId)} sx={{ mr: 1 }} />
          {thumbnail && (
            <Box
              component="img"
              src={thumbnail}
              alt=""
              sx={{ width: 40, height: 30, objectFit: "cover", borderRadius: 0.5, mr: 1.5 }}
            />
          )}
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: depth === 0 ? 500 : 400 }}>{item.label}</Typography>
            {item.content && (
              <Typography variant="caption" color="text.secondary">
                {item.content}
                {item.seconds ? ` - ${Math.round(item.seconds / 60)}min` : ""}
              </Typography>
            )}
          </Box>
          {selectCheckbox || (
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              sx={{ ml: 1 }}
            >
              {isSection
                ? (Locale.label("plans.actionSelector.addSection") || "Add Section")
                : (Locale.label("plans.actionSelector.addAction") || "Add")}
            </Button>
          )}
        </Box>
        {isExpanded && (
          <Box sx={{ pl: 4 }}>
            {visibleChildren.map((child) => {
              // Store original unfiltered index; navigateToPath walks unfiltered children.
              const originalIndex = item.children!.indexOf(child);
              return (
                <InstructionItemRow
                  key={child.relatedId || child.id || originalIndex}
                  item={child}
                  providerId={providerId}
                  depth={depth + 1}
                  pathIndices={[...pathIndices, originalIndex]}
                  expandedSections={expandedSections}
                  onToggleExpanded={onToggleExpanded}
                  onAddSection={onAddSection}
                  onAddAction={onAddAction}
                  excludeActions={excludeActions}
                  isSelected={isSelected}
                />
              );
            })}
          </Box>
        )}
      </Box>
    );
  }

  if (excludeActions && isAction) return null;

  if (isSection) {
    return (
      <Box
        key={itemId}
        sx={{
          display: "flex",
          alignItems: "center",
          py: 0.75,
          px: 1,
          borderRadius: 1,
          "&:hover": { bgcolor: "action.hover" }
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2">{item.label}</Typography>
          {item.content && (
            <Typography variant="caption" color="text.secondary">
              {item.content}
              {item.seconds ? ` - ${Math.round(item.seconds / 60)}min` : ""}
            </Typography>
          )}
        </Box>
        {selectCheckbox || (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            sx={{ ml: 1 }}
          >
            {Locale.label("plans.actionSelector.addSection") || "Add Section"}
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box
      key={itemId}
      sx={{
        display: "flex",
        alignItems: "center",
        py: 0.75,
        px: 1,
        borderRadius: 1,
        "&:hover": { bgcolor: "action.hover" }
      }}
    >
      {thumbnail ? (
        <Box
          component="img"
          src={thumbnail}
          alt=""
          sx={{ width: 40, height: 30, objectFit: "cover", borderRadius: 0.5, mr: 1.5 }}
        />
      ) : (
        <PlayArrowIcon sx={{ mr: 1, fontSize: 18, color: "primary.main" }} />
      )}
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2">{item.label}</Typography>
        {item.content && (
          <Typography variant="caption" color="text.secondary">
            {item.content}
            {item.seconds ? ` - ${Math.round(item.seconds / 60)}min` : ""}
          </Typography>
        )}
      </Box>
      {selectCheckbox || <AppIconButton label={Locale.label("common.add")} icon={<AddIcon />} intent="add" onClick={handleAdd} />}
    </Box>
  );
};

export const InstructionTree: React.FC<InstructionTreeProps> = ({ items, providerId, expandedSections, onToggleExpanded, onAddSection, onAddAction, excludeHeaders, excludeActions, isSelected }) => {
  const itemsToRender: { item: InstructionItem; pathIndices: number[] }[] = [];

  if (excludeHeaders) {
    items.forEach((item, index) => {
      if (item.itemType === "header") {
        // Skip the header, but add its children with adjusted path indices
        item.children?.forEach((child, childIndex) => {
          itemsToRender.push({ item: child, pathIndices: [index, childIndex] });
        });
      } else {
        itemsToRender.push({ item, pathIndices: [index] });
      }
    });
  } else {
    items.forEach((item, index) => {
      itemsToRender.push({ item, pathIndices: [index] });
    });
  }

  return (
    <Box sx={{ maxHeight: "400px", overflowY: "auto" }}>
      {itemsToRender.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
          {Locale.label("plans.actionSelector.noActionsAvailable") || "No actions available"}
        </Typography>
      ) : (
        itemsToRender.map(({ item, pathIndices }, index) => (
          <InstructionItemRow
            key={item.relatedId || item.id || index}
            item={item}
            providerId={providerId}
            depth={0}
            pathIndices={pathIndices}
            expandedSections={expandedSections}
            onToggleExpanded={onToggleExpanded}
            onAddSection={onAddSection}
            onAddAction={onAddAction}
            excludeActions={excludeActions}
            isSelected={isSelected}
          />
        ))
      )}
    </Box>
  );
};
