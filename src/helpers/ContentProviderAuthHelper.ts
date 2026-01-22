import { getProvider } from "@churchapps/content-provider-helper";
import { ApiHelper } from "@churchapps/apphelper";
import type { ContentProviderAuthData } from "@churchapps/content-provider-helper";
import type { ContentProviderAuthInterface } from "./Interfaces";

export class ContentProviderAuthHelper {
  // Convert DB record to ContentProviderAuthData format
  private static toAuthData(record: ContentProviderAuthInterface): ContentProviderAuthData | null {
    if (!record.accessToken) return null;
    return {
      access_token: record.accessToken,
      refresh_token: record.refreshToken || "",
      token_type: record.tokenType || "Bearer",
      created_at: 0,
      expires_in: 0,
      scope: record.scope || ""
    };
  }

  static async getAuth(ministryId: string, providerId: string): Promise<ContentProviderAuthData | null> {
    try {
      const record = await ApiHelper.get(`/contentProviderAuths/ministry/${ministryId}/${providerId}`, "DoingApi");
      return record ? this.toAuthData(record) : null;
    } catch {
      return null;
    }
  }

  static async storeAuth(ministryId: string, providerId: string, auth: ContentProviderAuthData): Promise<void> {
    const expiresAt = new Date((auth.created_at + auth.expires_in) * 1000);
    await ApiHelper.post("/contentProviderAuths", [{
      ministryId,
      providerId,
      accessToken: auth.access_token,
      refreshToken: auth.refresh_token,
      tokenType: auth.token_type,
      expiresAt,
      scope: auth.scope
    }], "DoingApi");
  }

  static async removeAuth(authId: string): Promise<void> {
    await ApiHelper.delete(`/contentProviderAuths/${authId}`, "DoingApi");
  }

  static async getLinkedProviders(ministryId: string): Promise<ContentProviderAuthInterface[]> {
    try {
      return await ApiHelper.get(`/contentProviderAuths/ministry/${ministryId}`, "DoingApi");
    } catch {
      return [];
    }
  }

  static async getValidAuth(ministryId: string, providerId: string): Promise<ContentProviderAuthData | null> {
    const auth = await this.getAuth(ministryId, providerId);
    if (!auth) return null;

    const provider = getProvider(providerId);
    if (!provider) return null;

    if (provider.isAuthValid(auth)) return auth;

    // Try to refresh
    const refreshed = await provider.refreshToken(auth);
    if (refreshed) {
      await this.storeAuth(ministryId, providerId, refreshed);
      return refreshed;
    }
    return null;
  }

  static async isLinked(ministryId: string, providerId: string): Promise<boolean> {
    const auth = await this.getAuth(ministryId, providerId);
    return auth !== null;
  }
}
