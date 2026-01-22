import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  ArrowLeft,
  Trash2,
  RefreshCw,
  Loader2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Info,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./Bin.css";

const API_BASE = "https://family-cloud-backend-bfu9.onrender.com";

export default function Bin() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const navigate = useNavigate();

  const fetchBin = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/files/trash`);
      setFiles(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBin();
  }, []);

  // --- ACTIONS ---
  const handleRestore = async (id) => {
    setActionLoading(id);
    try {
      await axios.post(`${API_BASE}/api/files/restore/${id}`);
      setFiles(files.filter((f) => f._id !== id));
    } catch (err) {
      alert("Failed to restore");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!window.confirm("Delete forever? You cannot undo this.")) return;
    setActionLoading(id);
    try {
      await axios.delete(`${API_BASE}/api/files/permanent/${id}`);
      setFiles(files.filter((f) => f._id !== id));
    } catch (err) {
      alert("Failed to delete");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEmptyBin = async () => {
    if (files.length === 0) return;
    if (!window.confirm(`Permanently delete all ${files.length} items?`))
      return;

    // Optimistic UI update could be done here, but let's wait for API
    const promises = files.map((f) =>
      axios.delete(`${API_BASE}/api/files/permanent/${f._id}`),
    );
    await Promise.all(promises);
    setFiles([]);
  };

  const isImage = (file) =>
    file.type === "img" || file.name.match(/\.(jpeg|jpg|png|webp|heic)$/i);
  const isVideo = (file) =>
    file.type === "video" || file.name.match(/\.(mp4|mov|avi|mkv)$/i);

  if (loading)
    return (
      <div
        className="bin-app"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader2 className="animate-spin" size={50} color="#ef4444" />
      </div>
    );

  return (
    <div className="bin-app">
      {/* 🟢 1. CLEAN HEADER */}
      <header className="bin-header">
        <button className="btn-back" onClick={() => navigate("/")}>
          <ArrowLeft size={24} />
        </button>
        <h1>Recycle Bin</h1>
      </header>

      {/* 🟢 2. STATUS BAR (The Premium Touch) */}
      <div className="bin-status-bar">
        <div className="bin-info-text">
          <Info size={16} color="#6b7280" />
          {files.length > 0
            ? "Items in the trash are deleted after 30 days."
            : "No items in trash."}
        </div>

        {files.length > 0 && (
          <button className="btn-empty-bin" onClick={handleEmptyBin}>
            <Trash2 size={16} /> Empty Bin
          </button>
        )}
      </div>

      {/* 🟢 3. CONTENT GRID */}
      <main className="bin-main">
        <div className="bin-grid">
          {files.map((file) => (
            <div key={file._id} className="bin-card">
              <div style={{ height: "100%" }}>
                {isImage(file) || isVideo(file) ? (
                  <img
                    src={`${API_BASE}/api/files/preview/${file._id}`}
                    className="bin-media"
                    alt=""
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}

                {/* Fallback Icon */}
                <div
                  style={{
                    display: isImage(file) || isVideo(file) ? "none" : "flex",
                    height: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#202025",
                  }}
                >
                  <FileText size={48} color="#666" />
                </div>
              </div>

              {/* Hover Actions */}
              <div className="bin-actions-overlay">
                {actionLoading === file._id ? (
                  <Loader2 className="animate-spin" size={32} color="white" />
                ) : (
                  <>
                    <button
                      className="bin-btn btn-restore"
                      onClick={() => handleRestore(file._id)}
                    >
                      <RotateCcw size={16} /> Restore
                    </button>
                    <button
                      className="bin-btn btn-delete-forever"
                      onClick={() => handlePermanentDelete(file._id)}
                    >
                      <XCircle size={16} /> Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {files.length === 0 && (
          <div className="bin-empty">
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <CheckCircle2 size={32} color="#10b981" />
            </div>
            <h3>Bin is empty</h3>
            <p>Deleted files will appear here.</p>
          </div>
        )}
      </main>
    </div>
  );
}
