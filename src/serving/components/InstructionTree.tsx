import React from "react";
import { Button, Typography, Box, IconButton } from "@mui/material";
import { PlayArrow as PlayArrowIcon, ExpandMore as ExpandMoreIcon, ChevronRight as ChevronRightIcon, Add as AddIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { type InstructionItem } from "@churchapps/content-provider-helper";

interface InstructionTreeProps {
  items: InstructionItem[];
  providerId: string;
  expandedSections: Set<string>;
  onToggleExpanded: (sectionId: string) => void;
  onAddSection: (section: InstructionItem, provId: string, pathIndices: number[]) => void;
  onAddAction: (action: InstructionItem, provId: string, pathIndices: number[]) => void;
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
}> = ({ item, providerId, depth, pathIndices, expandedSections, onToggleExpanded, onAddSection, onAddAction }) => {
  const itemId = item.relatedId || item.id || "";
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedSections.has(itemId);
  const isSection = item.itemType === 'section' || item.itemType === 'header';

  // Items with children are expandable (sections, headers, or actions with files)
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
          <IconButton size="small" onClick={() => onToggleExpanded(itemId)} sx={{ mr: 1 }}>
            {isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: depth === 0 ? 500 : 400 }}>{item.label}</Typography>
            {item.description && (
              <Typography variant="caption" color="text.secondary">
                {item.description}
                {item.seconds ? ` - ${Math.round(item.seconds / 60)}min` : ""}
              </Typography>
            )}
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => isSection ? onAddSection(item, providerId, pathIndices) : onAddAction(item, providerId, pathIndices)}
            sx={{ ml: 1 }}
          >
            {isSection
              ? (Locale.label("plans.actionSelector.addSection") || "Add Section")
              : (Locale.label("plans.actionSelector.addAction") || "Add")}
          </Button>
        </Box>
        {isExpanded && (
          <Box sx={{ pl: 4 }}>
            {item.children!.map((child, childIndex) => (
              <InstructionItemRow
                key={child.relatedId || child.id || childIndex}
                item={child}
                providerId={providerId}
                depth={depth + 1}
                pathIndices={[...pathIndices, childIndex]}
                expandedSections={expandedSections}
                onToggleExpanded={onToggleExpanded}
                onAddSection={onAddSection}
                onAddAction={onAddAction}
              />
            ))}
          </Box>
        )}
      </Box>
    );
  }

  // Leaf items (no children) - just show with add button
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
      <PlayArrowIcon sx={{ mr: 1, fontSize: 18, color: "primary.main" }} />
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2">{item.label}</Typography>
        {item.description && (
          <Typography variant="caption" color="text.secondary">
            {item.description}
            {item.seconds ? ` - ${Math.round(item.seconds / 60)}min` : ""}
          </Typography>
        )}
      </Box>
      <IconButton
        size="small"
        color="primary"
        onClick={() => onAddAction(item, providerId, pathIndices)}
        title={Locale.label("plans.actionSelector.addAction") || "Add Action"}
      >
        <AddIcon />
      </IconButton>
    </Box>
  );
};

export const InstructionTree: React.FC<InstructionTreeProps> = ({ items, providerId, expandedSections, onToggleExpanded, onAddSection, onAddAction }) => (
  <Box sx={{ maxHeight: "400px", overflowY: "auto" }}>
    {items.length === 0 ? (
      <Typography color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
        {Locale.label("plans.actionSelector.noActionsAvailable") || "No actions available"}
      </Typography>
    ) : (
      items.map((section, index) => (
        <InstructionItemRow
          key={section.relatedId || section.id || index}
          item={section}
          providerId={providerId}
          depth={0}
          pathIndices={[index]}
          expandedSections={expandedSections}
          onToggleExpanded={onToggleExpanded}
          onAddSection={onAddSection}
          onAddAction={onAddAction}
        />
      ))
    )}
  </Box>
);
