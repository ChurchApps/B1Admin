import React from "react";
import { useSearchParams, Navigate, useLocation } from "react-router-dom";
import {
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Icon
} from "@mui/material";
import { ApiHelper, UserHelper } from "@churchapps/apphelper";

interface DeviceInfo {
  userCode: string;
  clientId: string;
  scopes: string;
  expiresIn: number;
  error?: string;
}

interface ApproveResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

export const DeviceAuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const initialCode = searchParams.get("code") || "";
  const [userCode, setUserCode] = React.useState(initialCode);
  const [deviceInfo, setDeviceInfo] = React.useState<DeviceInfo | null>(null);
  const [clientName, setClientName] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [step, setStep] = React.useState<"code" | "confirm">("code");

  // If not authenticated, redirect to login with state for return
  if (!ApiHelper.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Use the already-selected church from login
  const churchName = UserHelper.currentUserChurch?.church?.name;

  const verifyCode = async (code: string) => {
    setLoading(true);
    setError(null);

    try {
      // Normalize code (remove hyphens, uppercase)
      const normalizedCode = code.replace(/-/g, "").toUpperCase();

      const result = await ApiHelper.get(`/oauth/device/pending/${normalizedCode}`, "MembershipApi");

      if (result && !result.error) {
        setDeviceInfo(result);
        setStep("confirm");
      } else {
        setError("Invalid or expired code. Please check and try again.");
      }
    } catch (err) {
      setError("Failed to verify code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit code if passed via query string
  React.useEffect(() => {
    if (initialCode && initialCode.length >= 6 && !deviceInfo && !loading) {
      verifyCode(initialCode);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch client name when device info is available
  React.useEffect(() => {
    if (deviceInfo?.clientId) {
      ApiHelper.get(`/oauth/clients/clientId/${deviceInfo.clientId}`, "MembershipApi").then((client: { name?: string }) => {
        if (client?.name) setClientName(client.name);
      });
    }
  }, [deviceInfo?.clientId]);

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyCode(userCode);
  };

  const handleApprove = async () => {
    setLoading(true);
    setError(null);

    try {
      const result: ApproveResponse = await ApiHelper.post("/oauth/device/approve", {
        user_code: userCode,
        church_id: UserHelper.currentUserChurch.church.id
      }, "MembershipApi");

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.message || "Failed to authorize device");
      }
    } catch (err) {
      setError("Authorization failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = async () => {
    setLoading(true);
    try {
      await ApiHelper.post("/oauth/device/deny", { user_code: userCode }, "MembershipApi");
      setError("Device authorization denied");
      setStep("code");
      setDeviceInfo(null);
      setUserCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
    setUserCode(clean);
    setError(null);
  };

  const renderContent = () => {
    if (success) {
      return (
        <>
          <div style={{ textAlign: "center" }}>
            <Icon style={{ fontSize: 120, marginTop: 30, color: "var(--success-main, #4caf50)" }}>check_circle</Icon>
            <h2>Device Authorized!</h2>
            <p>You can now return to your TV. The device will connect automatically.</p>
          </div>
        </>
      );
    }

    if (step === "code") {
      return (
        <>
          <div style={{ textAlign: "center" }}>
            <Icon style={{ fontSize: 120, marginTop: 30, color: "var(--text-muted)" }}>tv</Icon>
            <h2>Authorize Device</h2>
            <p>Enter the code displayed on your TV:</p>
          </div>
          <div style={{ marginLeft: 50, marginRight: 50 }}>
            <Box component="form" onSubmit={handleCodeSubmit}>
              <TextField
                fullWidth
                value={userCode}
                onChange={handleCodeChange}
                placeholder="XXXXXX"
                inputProps={{
                  maxLength: 6,
                  style: {
                    fontSize: "1.5rem",
                    letterSpacing: "0.2em",
                    textAlign: "center",
                    fontFamily: "monospace"
                  }
                }}
                autoFocus
                sx={{ mb: 2 }}
              />
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
            </Box>
          </div>
          <Box sx={{ backgroundColor: "action.hover", padding: "10px" }}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={handleCodeSubmit}
              disabled={loading || userCode.length < 6}
            >
              {loading ? <CircularProgress size={24} /> : "Continue"}
            </Button>
          </Box>
        </>
      );
    }

    if (step === "confirm" && deviceInfo) {
      return (
        <>
          <div style={{ textAlign: "center" }}>
            <Icon style={{ fontSize: 120, marginTop: 30, color: "var(--text-muted)" }}>lock</Icon>
            <h2>{clientName || "Loading..."}</h2>
            <p>
              Would you like to access the following data from <b>{churchName}</b> in the above application?
            </p>
          </div>
          <div style={{ marginLeft: 50, marginRight: 50 }}>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9em" }}>
              Device code: <strong>{deviceInfo.userCode}</strong>
              <br />
              <span style={{ fontSize: "0.85em" }}>Expires in {Math.floor(deviceInfo.expiresIn / 60)} minutes</span>
            </p>
            <p><strong>Requested Permissions:</strong></p>
            <ul>
              {deviceInfo.scopes.split(" ").map((scope) => (
                <li key={scope}>{scope}</li>
              ))}
            </ul>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
          </div>
          <Box sx={{ backgroundColor: "action.hover", padding: "10px" }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }} style={{ textAlign: "center" }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="error"
                  onClick={handleDeny}
                  disabled={loading}
                >
                  Deny
                </Button>
              </Grid>
              <Grid size={{ xs: 6 }} style={{ textAlign: "center" }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={handleApprove}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : "Allow"}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </>
      );
    }

    return null;
  };

  return (
    <Box sx={{ display: "flex", backgroundColor: "background.default", minHeight: "100vh" }}>
      <div style={{ marginLeft: "auto", marginRight: "auto", paddingTop: 20 }}>
        <Box
          sx={{
            width: 500,
            minHeight: 100,
            backgroundColor: "background.paper",
            border: "1px solid var(--border-main)",
            borderRadius: "5px",
            padding: "10px",
          }}
          px="16px"
          mx="auto"
        >
          <div style={{ textAlign: "center", margin: 50 }}>
            <img src={"/images/logo-login.png"} alt="logo" />
          </div>
          <Alert severity="info" style={{ fontWeight: "bold" }}>
            {success ? "DEVICE AUTHORIZED" : "AUTHORIZATION REQUIRED"}
          </Alert>
          {renderContent()}
        </Box>
      </div>
    </Box>
  );
};

export default DeviceAuthPage;
