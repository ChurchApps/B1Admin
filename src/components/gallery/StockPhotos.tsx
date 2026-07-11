"use client";
import { Grid, TextField } from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import React, { useState } from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { CommonEnvironmentHelper } from "@churchapps/helpers";
import { AppIconButton } from "../ui/AppIconButton";

interface Props {
  aspectRatio: number,
  onSelect: (img: string) => void,
  onStockSelect: (img: string) => void
}

interface SearchResult { description: string, url: string, photographer: string, photographerUrl: string, large: string, thumbnail: string }

export const StockPhotos: React.FC<Props> = (props: Props) => {
  const [images, setImages] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);

  const contentRoot = CommonEnvironmentHelper.ContentRoot;

  const loadData = () => { ApiHelper.getAnonymous("/gallery/stock/" + props.aspectRatio.toString(), "ContentApi").then((data: any) => setImages(data.images)); };

  React.useEffect(loadData, [props.aspectRatio]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { e.preventDefault(); setSearchText(e.currentTarget.value); };

  const handleSearch = (e: React.MouseEvent) => {
    if (e !== null) e.preventDefault();
    const term = searchText.trim();
    ApiHelper.post("/stock/search", { term: term }, "ContentApi").then((data: SearchResult[]) => { setSearchResults(data); });
  };

  const getImages = () => {
    if (searchResults) return getResults();
    else return getSuggested();
  };

  const getResults = () => {
    const result: React.ReactElement[] = [];
    searchResults?.forEach((p: any) => {
      result.push(<Grid size={{ xs: 12, md: 4 }}>
        <a href="about:blank" onClick={(e) => { e.preventDefault(); props.onStockSelect(p.large); }}>
          <img
            src={p.thumbnail}
            alt="stock"
            style={{
              width: "100%",
              height: "auto",
              maxWidth: "100%",
              display: "block"
            }}
          />
        </a>
        <div>
          <i style={{ fontSize: 12 }}>
            <a href={p.url} target="_blank" rel="noreferrer noopener">{Locale.label("stockPhotos.photoBy")}</a> <a href={p.photographerUrl} target="_blank" rel="noreferrer noopener">{p.photographer}</a></i>
        </div>
      </Grid>);
    });
    return result;
  };

  const getSuggested = () => {
    const result: React.ReactElement[] = [];
    images.forEach((img: any) => {
      result.push(<Grid size={{ xs: 12, md: 4 }}>
        <a href="about:blank" onClick={(e) => { e.preventDefault(); props.onSelect(contentRoot + "/" + img); }}>
          <img
            src={contentRoot + "/" + img}
            alt="stock"
            style={{
              width: "100%",
              height: "auto",
              maxWidth: "100%",
              display: "block"
            }}
          />
        </a>
      </Grid>);
    });
    return result;
  };

  return (<>
    <TextField fullWidth name="personAddText" label="Search Term" value={searchText} onChange={handleChange}
      InputProps={{ endAdornment: <AppIconButton label={Locale.label("common.search")} icon={<SearchIcon />} id="searchButton" data-testid="search-button" onClick={handleSearch} /> }}
    />
    {searchResults && <div>{Locale.label("stockPhotos.providedBy")} <a href="https://pexels.com">Pexels</a>.</div>}
    <Grid container spacing={3} alignItems="center">
      {getImages()}
    </Grid>

  </>);
};
