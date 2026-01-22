import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import {
  Loader2,
  Lock,
  Cloud,
  PlayCircle,
  FileText,
  Download,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Grid,
} from "lucide-react";

import "./SharedView.css";

const API_BASE = "https://family-cloud-backend-bfu9.onrender.com";

export default function SharedView() {
  const { shareId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Preview & Swipe
  const [previewFile, setPreviewFile] = useState(null);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  useEffect(() => {
    const fetchSharedFolder = async () => {
      try {
        const res = await axios.get(
          `${API_BASE}/api/folders/public/${shareId}`,
        );
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || "Link invalid or expired");
      } finally {
        setLoading(false);
      }
    };
    fetchSharedFolder();
  }, [shareId]);

  // Safe Data
  const filesList = data?.files || data?.data?.files || [];

  const folderName = data?.data?.folder?.name || "Shared Folder";

  // --- HELPERS ---
  const handleDownload = (file) =>
    window.open(`${API_BASE}/api/files/download/${file._id}`, "_blank");
  const isImage = (file) =>
    file.type === "img" || file.name.match(/\.(jpeg|jpg|png|webp|heic)$/i);
  const isVideo = (file) =>
    file.type === "video" || file.name.match(/\.(mp4|mov|avi|mkv)$/i);

  // --- NAVIGATION ---
  const handleNext = (e) => {
    e?.stopPropagation();
    if (!previewFile || filesList.length === 0) return;
    const idx = filesList.findIndex((f) => f._id === previewFile._id);
    if (idx < filesList.length - 1) setPreviewFile(filesList[idx + 1]);
  };

  const handlePrev = (e) => {
    e?.stopPropagation();
    if (!previewFile || filesList.length === 0) return;
    const idx = filesList.findIndex((f) => f._id === previewFile._id);
    if (idx > 0) setPreviewFile(filesList[idx - 1]);
  };

  // --- KEYBOARD EVENTS ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!previewFile) return;
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") setPreviewFile(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewFile]);

  // --- SWIPE EVENTS ---
  const onTouchStart = (e) =>
    setTouchEnd(null) || setTouchStart(e.targetTouches[0].clientX);
  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) handleNext();
    if (distance < -50) handlePrev();
  };

  // --- LOADING / ERROR ---
  if (loading)
    return (
      <div
        className="shared-app"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader2 className="animate-spin" size={50} color="#6366f1" />
      </div>
    );

  if (error)
    return (
      <div
        className="shared-app"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Lock size={60} color="#ef4444" style={{ marginBottom: 20 }} />
        <h2>Access Denied</h2>
        <p style={{ color: "#888" }}>{error}</p>
      </div>
    );

  return (
    <div className="shared-app" style={{ height: "100vh", overflowY: "auto" }}>
      {/* 🟢 NEW PREMIUM HEADER */}
      <header className="premium-header">
        <div className="brand-label">
          {/* <Cloud size={16} color="#6366f1" fill="#6366f1" /> */}
          <img src="/logo.png" alt="logo" style={{ width: 30, height: 30 }} />
          FamilyCloud
        </div>
        <div className="brand-label">
          <h1 className="folder-title-large">{folderName}</h1>
          <h1 className="meta-badge">{filesList.length} Items</h1>
        </div>
      </header>

      {/* 🟢 CONTENT GRID */}
      <main className="shared-main">
        <div className="shared-grid">
          {filesList.map((file) => (
            <div
              key={file._id}
              className="shared-card"
              onClick={() => setPreviewFile(file)}
            >
              {isImage(file) ? (
                <img
                  src={`${API_BASE}/api/files/preview/${file._id}`}
                  loading="lazy"
                  className="card-media"
                  alt=""
                />
              ) : isVideo(file) ? (
                <>
                  <img
                    src={`${API_BASE}/api/files/preview/${file._id}`}
                    loading="lazy"
                    className="card-media"
                    alt=""
                  />
                  <div className="play-overlay">
                    <PlayCircle
                      size={40}
                      fill="rgba(0,0,0,0.5)"
                      color="white"
                    />
                  </div>
                </>
              ) : (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FileText size={40} color="#666" />
                </div>
              )}

              <div className="card-footer">
                <span className="card-name">{file.name}</span>
                {/* <button
                  className="btn-download-mini"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(file);
                  }}
                >
                  <Download size={16} />
                </button> */}
              </div>
            </div>
          ))}
        </div>

        {filesList.length === 0 && (
          <div className="shared-empty">
            <Grid size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
            <p>No files available.</p>
          </div>
        )}
      </main>

      {/* 🟢 IMMERSIVE PREVIEW (No changes needed here, just ensuring it renders) */}
      {previewFile && (
        <div
          className="preview-overlay"
          onClick={() => setPreviewFile(null)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="preview-header-immersive"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ph-left">
              <button className="ph-btn" onClick={() => setPreviewFile(null)}>
                <ArrowLeft size={24} />
              </button>
              <div className="ph-info">
                <h4>{previewFile.name}</h4>
                <span>{previewFile.size}</span>
              </div>
            </div>
            <div className="ph-right">
              <button
                className="download-btn"
                style={{
                  background: "white",
                  color: "black",
                  borderRadius: 20,
                  padding: "8px 20px",
                  fontWeight: 600,
                }}
                onClick={() => handleDownload(previewFile)}
              >
                <Download size={18} />
              </button>
            </div>
          </div>

          <div className="preview-body">
            <button
              className="nav-arrow left desktop-only"
              onClick={handlePrev}
            >
              <ChevronLeft size={48} />
            </button>
            {isVideo(previewFile) ? (
              <video
                controls
                autoPlay
                className="preview-media"
                src={`${API_BASE}/api/files/download/${previewFile._id}`}
                onClick={(e) => e.stopPropagation()}
              />
            ) : isImage(previewFile) ? (
              <img
                src={`${API_BASE}/api/files/preview/${previewFile._id}`}
                className="preview-media"
                onClick={(e) => e.stopPropagation()}
                alt=""
              />
            ) : (
              <div className="preview-fallback">
                <FileText size={80} color="white" />
                <p>No Preview</p>
              </div>
            )}
            <button
              className="nav-arrow right desktop-only"
              onClick={handleNext}
            >
              <ChevronRight size={48} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
