import React from "react";
import { Typography, Box, Card, CardActionArea, CardMedia, CardContent } from "@mui/material";
import { Folder as FolderIcon, PlayArrow as PlayArrowIcon, Add as AddIcon, CheckCircle as CheckCircleIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { type ContentFolder, type ContentFile } from "@churchapps/content-providers";

interface BrowseGridProps {
  folders: ContentFolder[];
  files?: ContentFile[];
  selectedProviderId: string;
  selectedFolderId?: string;
  isLeafFolder: (folder: ContentFolder) => boolean;
  onFolderClick: (folder: ContentFolder) => void;
  onFileClick?: (file: ContentFile, provId: string, pathIndices?: number[]) => void;
  /** When set, file cards toggle in and out of a selection (onFileClick) and show their selected state. */
  isFileSelected?: (file: ContentFile) => boolean;
}

export const BrowseGrid: React.FC<BrowseGridProps> = ({ folders, files = [], selectedProviderId, selectedFolderId, isLeafFolder, onFolderClick, onFileClick, isFileSelected }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
      gap: 2,
      maxHeight: "400px",
      overflowY: "auto",
      p: 1
    }}
  >
    {folders.map((folder) => {
      const isLeaf = isLeafFolder(folder);
      const isSelected = selectedFolderId === folder.id;
      return (
        <Card key={`folder-${folder.id}`} sx={{ border: isSelected ? 2 : 1, borderColor: isSelected ? "primary.main" : "divider", bgcolor: isSelected ? "action.selected" : "background.paper" }}>
          <CardActionArea onClick={() => onFolderClick(folder)}>
            {folder.thumbnail ? (
              <CardMedia component="img" height="80" image={folder.thumbnail} alt={folder.title} sx={{ objectFit: "cover", width: "100%" }} />
            ) : (
              <Box sx={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: isLeaf ? "primary.light" : "grey.200" }}>
                {isLeaf ? <PlayArrowIcon sx={{ fontSize: 40, color: "primary.contrastText" }} /> : <FolderIcon sx={{ fontSize: 40, color: "grey.500" }} />}
              </Box>
            )}
            <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
              <Typography variant="body2" noWrap title={folder.title} sx={{ fontWeight: isLeaf ? 600 : 400 }}>
                {folder.title}
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      );
    })}
    {files.map((file, fileIndex) => {
      const fileSelected = !!isFileSelected?.(file);
      return (
        <Card
          key={`file-${file.id}`}
          data-testid="browse-file-card"
          sx={{ position: "relative", border: fileSelected ? 2 : 1, borderColor: fileSelected ? "primary.main" : "divider", bgcolor: fileSelected ? "action.selected" : "background.paper" }}
        >
          <CardActionArea onClick={() => onFileClick?.(file, selectedProviderId, [0, fileIndex])} aria-pressed={isFileSelected ? fileSelected : undefined}>
            {file.thumbnail ? (
              <CardMedia component="img" height="80" image={file.thumbnail} alt={file.title} sx={{ objectFit: "cover", width: "100%" }} />
            ) : (
              <Box sx={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "secondary.light" }}>
                <AddIcon sx={{ fontSize: 40, color: "secondary.contrastText" }} />
              </Box>
            )}
            {fileSelected && <CheckCircleIcon color="primary" sx={{ position: "absolute", top: 4, right: 4, bgcolor: "background.paper", borderRadius: "50%" }} />}
            <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
              <Typography variant="body2" noWrap title={file.title}>{file.title}</Typography>
              <Typography variant="caption" color="secondary">{Locale.label("plans.browseGrid.addOn")}</Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      );
    })}
  </Box>
);
