import { Button, Grid } from "@mui/material";
import type { GlobalStyleInterface } from "../../helpers/Interfaces";
import type { FontsInterface } from "./FontEdit";
import type { ColorInterface } from "./PaletteEdit";

interface Props {
  globalStyle?: GlobalStyleInterface;
  churchSettings: any;
  churchName: string;
}

export function Preview(props: Props) {
  if (!props.globalStyle) return null;

  const fonts: FontsInterface = JSON.parse(props.globalStyle.fonts);
  const palette: ColorInterface = JSON.parse(props.globalStyle.palette);

  return (
    <>
      {props.globalStyle.customCss && <style>{props.globalStyle.customCss}</style>}
      <div style={{ fontFamily: fonts.body }}>
        <div style={{ backgroundColor: palette.light, color: palette.darkAccent, padding: 20, borderRadius: 5 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 4 }}>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: palette.darkAccent }}>{props.churchName}</div>
            </Grid>
            <Grid size={{ xs: 8 }} style={{ textAlign: "right", paddingTop: 30 }}>
              <a href="#" style={{ marginRight: 20, color: palette.darkAccent }}>Location</a>
              <a href="#" style={{ marginRight: 20, color: palette.darkAccent }}>Service Times</a>
              <a href="#" style={{ marginRight: 20, color: palette.darkAccent }}>Youth</a>
              <Button style={{ backgroundColor: palette.darkAccent, color: palette.light }} data-testid="preview-give-button">Give</Button>
            </Grid>
          </Grid>
        </div>
        <div style={{ backgroundImage: "url('/images/hero-bg.jpg')", backgroundSize: "cover", padding: 50, backgroundColor: "#cccccc" }}>
          <div style={{ backgroundColor: palette.light, color: palette.darkAccent, textAlign: "center", opacity: 0.9, padding: 30 }}>
            <h1 style={{ fontFamily: fonts.heading }}>Welcome to {props.churchName}</h1>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
            <Grid container spacing={3} style={{ paddingTop: 10 }}>
              <Grid size={{ xs: 6 }} style={{ textAlign: "right" }}>
                <Button style={{ backgroundColor: palette.accent, color: palette.light }} data-testid="preview-plan-visit-button">Plan Your Visit</Button>
              </Grid>
              <Grid size={{ xs: 6 }} style={{ textAlign: "left" }}>
                <Button style={{ backgroundColor: palette.light, color: palette.accent, border: "2px solid " + palette.accent }} data-testid="preview-learn-story-button">Learn Our Story</Button>
              </Grid>
            </Grid>
          </div>
        </div>
        <div style={{ backgroundColor: palette.lightAccent, color: palette.dark, padding: 10, textAlign: "center" }}>
          <h1 style={{ fontFamily: fonts.heading }}>Our Story</h1>
        </div>
        <div style={{ backgroundColor: palette.light, color: palette.dark, padding: 20 }}>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Vulputate ut pharetra sit amet aliquam id diam. Magna sit amet purus gravida. Urna molestie at elementum eu facilisis sed. Bibendum est ultricies integer quis auctor elit. Donec et odio pellentesque diam volutpat commodo sed. Dignissim suspendisse in est ante in nibh mauris. Elit ullamcorper dignissim cras tincidunt lobortis feugiat. Euismod elementum nisi quis eleifend quam adipiscing. Dictum varius duis at consectetur lorem.</p>
          <p>Quis viverra nibh cras pulvinar. Suspendisse interdum consectetur libero id faucibus nisl tincidunt. Neque ornare aenean euismod elementum nisi quis eleifend. Nec nam aliquam sem et tortor consequat. Eget nulla facilisi etiam dignissim diam. Mattis rhoncus urna neque viverra justo. Neque sodales ut etiam sit amet nisl purus. Consequat ac felis donec et odio pellentesque. Neque gravida in fermentum et sollicitudin ac orci. Non nisi est sit amet. Id aliquet lectus proin nibh nisl. Pharetra convallis posuere morbi leo urna molestie at elementum eu. Purus non enim praesent elementum. Blandit massa enim nec dui nunc. Condimentum vitae sapien pellentesque habitant morbi tristique senectus et. Adipiscing commodo elit at imperdiet dui. Nibh tortor id aliquet lectus.</p>
        </div>
        <div style={{ backgroundColor: palette.dark, color: palette.lightAccent, padding: 20 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 3 }}>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: palette.light }}>{props.churchName}</div>
            </Grid>
            <Grid size={{ xs: 9 }} style={{ paddingTop: 30, textAlign: "right" }}>
              &copy; 2024 {props.churchName}
            </Grid>
          </Grid>
        </div>
      </div>
    </>
  );
}
