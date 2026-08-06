export interface ByosProviderDescriptor {
  id: string;
  name: string;
  oauth: boolean;
  clientId?: string;
  buildAuthUrl?: (codeChallenge: string, redirectUri: string, state: string) => string;
}

// Client ids are public identifiers; secrets stay server-side (see Api ByosAuth.ts).
// TODO owner action: fill these here and in Api ByosAuth.ts — googledrive (pending #944 Google Cloud client),
// onedrive (new Azure AD confidential app), dropbox (new "app folder" access-type app with files.content.read/write;
// don't reuse the content-providers serving app 9io0q0q9angdz9j — it's read-scoped and full-Dropbox access type).
// Options render disabled while their id is empty.
const GOOGLE_CLIENT_ID = "214868247432-hao323qmsfu96h345udaifs8f1nc7i71.apps.googleusercontent.com";
const ONEDRIVE_CLIENT_ID = "";
const DROPBOX_CLIENT_ID = "6whskt40gy3ekjo";

export const BYOS_PROVIDERS: ByosProviderDescriptor[] = [
  {
    id: "googledrive",
    name: "Google Drive",
    oauth: true,
    clientId: GOOGLE_CLIENT_ID,
    buildAuthUrl: (codeChallenge, redirectUri, state) => {
      const params = new URLSearchParams({
        response_type: "code",
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        scope: "https://www.googleapis.com/auth/drive.file",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        access_type: "offline",
        prompt: "consent",
        state
      });
      return "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString();
    }
  },
  {
    id: "dropbox",
    name: "Dropbox",
    oauth: true,
    clientId: DROPBOX_CLIENT_ID,
    buildAuthUrl: (codeChallenge, redirectUri, state) => {
      const params = new URLSearchParams({
        response_type: "code",
        client_id: DROPBOX_CLIENT_ID,
        redirect_uri: redirectUri,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        token_access_type: "offline",
        state
      });
      return "https://www.dropbox.com/oauth2/authorize?" + params.toString();
    }
  },
  {
    id: "onedrive",
    name: "OneDrive",
    oauth: true,
    clientId: ONEDRIVE_CLIENT_ID,
    buildAuthUrl: (codeChallenge, redirectUri, state) => {
      const params = new URLSearchParams({
        response_type: "code",
        client_id: ONEDRIVE_CLIENT_ID,
        redirect_uri: redirectUri,
        scope: "Files.ReadWrite.AppFolder offline_access",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state
      });
      return "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?" + params.toString();
    }
  },
  { id: "s3", name: "S3-Compatible Bucket (S3, R2, B2)", oauth: false }
];
