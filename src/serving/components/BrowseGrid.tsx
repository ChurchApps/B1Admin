import React from "react";
import { Typography, Box, Card, CardActionArea, CardMedia, CardContent } from "@mui/material";
import { Folder as FolderIcon, PlayArrow as PlayArrowIcon, Add as AddIcon } from "@mui/icons-material";
import { type ContentFolder, type ContentFile } from "@churchapps/content-provider-helper";

interface BrowseGridProps {
  folders: ContentFolder[];
  files?: ContentFile[];
  selectedProviderId: string;
  selectedFolderId?: string;
  isLeafFolder: (folder: ContentFolder) => boolean;
  onFolderClick: (folder: ContentFolder) => void;
  onFileClick?: (file: ContentFile, provId: string, pathIndices?: number[]) => void;
}

export const BrowseGrid: React.FC<BrowseGridProps> = ({ folders, files = [], selectedProviderId, selectedFolderId, isLeafFolder, onFolderClick, onFileClick }) => (
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
            {folder.image ? (
              <CardMedia component="img" height="80" image={folder.image} alt={folder.title} sx={{ objectFit: "cover" }} />
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
    {files.map((file, fileIndex) => (
      <Card key={`file-${file.id}`} sx={{ border: 1, borderColor: "divider" }}>
        <CardActionArea onClick={() => onFileClick?.(file, selectedProviderId, [0, fileIndex])}>
          {file.image ? (
            <CardMedia component="img" height="80" image={file.image} alt={file.title} sx={{ objectFit: "cover" }} />
          ) : (
            <Box sx={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "secondary.light" }}>
              <AddIcon sx={{ fontSize: 40, color: "secondary.contrastText" }} />
            </Box>
          )}
          <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
            <Typography variant="body2" noWrap title={file.title}>{file.title}</Typography>
            <Typography variant="caption" color="secondary">Add-On</Typography>
          </CardContent>
        </CardActionArea>
      </Card>
    ))}
  </Box>
);
