import React from "react";
import { useSearchParams, Navigate, useLocation } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Container
} from "@mui/material";
import { ApiHelper } from "@churchapps/apphelper";
import { type LoginUserChurchInterface } from "@churchapps/helpers";
import UserContext from "../UserContext";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

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
  const context = React.useContext(UserContext);
  const [userCode, setUserCode] = React.useState(searchParams.get("code") || "");
  const [deviceInfo, setDeviceInfo] = React.useState<DeviceInfo | null>(null);
  const [selectedChurchId, setSelectedChurchId] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [step, setStep] = React.useState<"code" | "confirm">("code");

  // If not authenticated, redirect to login with state for return
  if (!ApiHelper.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userChurches = context?.userChurches || [];

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Normalize code (remove hyphens, uppercase)
      const normalizedCode = userCode.replace(/-/g, "").toUpperCase();

      const result = await ApiHelper.get(`/oauth/device/pending/${normalizedCode}`, "MembershipApi");

      if (result && !result.error) {
        setDeviceInfo(result);
        setStep("confirm");
        if (userChurches.length === 1) {
          setSelectedChurchId(userChurches[0].church.id);
        }
      } else {
        setError("Invalid or expired code. Please check and try again.");
      }
    } catch (err) {
      setError("Failed to verify code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedChurchId) {
      setError("Please select a church");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result: ApproveResponse = await ApiHelper.post("/oauth/device/approve", {
        user_code: userCode,
        church_id: selectedChurchId
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

  if (success) {
    return (
      <Container maxWidth="sm" sx={{ py: 5 }}>
        <Card>
          <CardContent sx={{ textAlign: "center", py: 5 }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: "success.main", mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Device Authorized!
            </Typography>
            <Typography color="text.secondary">
              You can now return to your TV. The device will connect automatically.
            </Typography>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 5 }}>
      <Card>
        <CardHeader title="Authorize Device" />
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {step === "code" && (
            <Box component="form" onSubmit={handleCodeSubmit}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enter the code displayed on your TV:
              </Typography>
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
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading || userCode.length < 6}
              >
                {loading ? <CircularProgress size={24} /> : "Continue"}
              </Button>
            </Box>
          )}

          {step === "confirm" && deviceInfo && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Authorizing device code:</strong> {deviceInfo.userCode}
                </Typography>
                <Typography variant="caption">
                  Expires in {Math.floor(deviceInfo.expiresIn / 60)} minutes
                </Typography>
              </Alert>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="church-select-label">Select Church</InputLabel>
                <Select
                  labelId="church-select-label"
                  value={selectedChurchId}
                  label="Select Church"
                  onChange={(e) => setSelectedChurchId(e.target.value)}
                >
                  {userChurches.map((uc: LoginUserChurchInterface) => (
                    <MenuItem key={uc.church.id} value={uc.church.id}>
                      {uc.church.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight="bold">
                  Requested Permissions:
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                  {deviceInfo.scopes.split(" ").map((scope) => (
                    <li key={scope}>
                      <Typography variant="body2">{scope}</Typography>
                    </li>
                  ))}
                </Box>
              </Box>

              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="contained"
                  color="success"
                  sx={{ flex: 1 }}
                  onClick={handleApprove}
                  disabled={loading || !selectedChurchId}
                >
                  {loading ? <CircularProgress size={24} /> : "Authorize Device"}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleDeny}
                  disabled={loading}
                >
                  Deny
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default DeviceAuthPage;
