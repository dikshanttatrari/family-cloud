import React, { useState } from "react";
import axios from "axios";
import { Lock, ArrowRight, Loader2 } from "lucide-react";
import "./Login.css"; // We will create this css next
import { useNavigate } from "react-router-dom";

const API_BASE = "https://dikshanttatrari-family-cloud-backend.hf.space";

export default function Login() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, { password });
      if (res.data.success) {
        console.log(res.data.token);
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("cloudToken", res.data.token);
        window.location.href = "/";
      }
    } catch (err) {
      setError("Incorrect Password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="icon-box">
          <Lock size={32} color="#6366f1" />
        </div>
        <h2 className="loginh2">Welcome Back</h2>
        <p className="loginp">Enter your admin password to access MyCloud</p>

        <form onSubmit={handleLogin}>
          <input
            className="logininput"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <div className="error-msg">{error}</div>}

          <button className="loginbutton" type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                Access <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
