import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import "./Home.css";
import { io } from "socket.io-client";
import PlyrJS from "plyr";
import "plyr/dist/plyr.css";

import {
  Folder,
  Image as ImageIcon,
  FileText,
  MoreVertical,
  Menu,
  X,
  ArrowLeft,
  UploadCloud,
  Plus,
  Share2,
  Copy,
  Check,
  Lock,
  Globe,
  FolderPlus,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  Video as VideoIcon,
  CheckCircle2,
  AlertCircle,
  Trash,
  Loader2,
  Play,
  Search,
  Grid3x3,
  List,
  SortAsc,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE = "http://192.168.1.13:7860";

// ============================================================
// 🛠️ HELPER FUNCTIONS (Moved outside component)
// ============================================================

const parseSize = (sizeStr) => {
  if (!sizeStr) return 0;
  const units = {
    Bytes: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
  };
  const parts = sizeStr.split(" ");
  if (parts.length !== 2) return 0;
  const [value, unit] = parts;
  return parseFloat(value) * (units[unit] || 1);
};

const formatTime = (seconds) => {
  if (!seconds || seconds === Infinity || seconds < 0) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const formatSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const isImage = (file) =>
  file.type === "img" || file.name?.match(/\.(jpeg|jpg|png|webp|heic|gif)$/i);

const isVideo = (file) =>
  file.type === "video" || file.name?.match(/\.(mp4|mov|avi|mkv|webm)$/i);

// ============================================================
// 🎬 VIDEO PLAYER COMPONENT
// ============================================================

const VideoPlayer = ({ src, poster }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && !playerRef.current) {
      playerRef.current = new PlyrJS(videoRef.current, {
        controls: [
          "play-large",
          "play",
          "progress",
          "current-time",
          "duration",
          "mute",
          "volume",
          "fullscreen",
        ],
        seekTime: 10,
        clickToPlay: true,
        hideControls: true,
        resetOnEnd: true,
        autoplay: true,
        keyboard: { focused: true, global: true },
        tooltips: { controls: true, seek: true },
      });
    }
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [src]);

  return (
    <div className="video-wrapper" onClick={(e) => e.stopPropagation()}>
      <video
        ref={videoRef}
        className="plyr-react plyr"
        playsInline
        controls
        crossOrigin="anonymous"
        poster={poster}
      >
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
};

// ============================================================
// 🏠 MAIN HOME COMPONENT
// ============================================================

export default function Home() {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);

  // ============================================================
  // 📦 STATE
  // ============================================================
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [previewFile, setPreviewFile] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const [files, setFiles] = useState([]);
  const [recentFiles, setRecentFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const [slideDirection, setSlideDirection] = useState("right");
  const [isImgLoaded, setIsImgLoaded] = useState(false);

  const [uploadStatus, setUploadStatus] = useState("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTimeLeft, setUploadTimeLeft] = useState(null);
  const [uploadCount, setUploadCount] = useState(0);

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("date");

  // ============================================================
  // 🌐 FETCH DATA
  // ============================================================
  const fetchData = async () => {
    try {
      setLoading(true);
      const [filesRes, foldersRes, recentRes] = await Promise.all([
        axios.get(`${API_BASE}/api/files`),
        axios.get(`${API_BASE}/api/folders`),
        axios.get(`${API_BASE}/api/files/recent`),
      ]);

      if (filesRes.data.success) setFiles(filesRes.data.data);
      if (foldersRes.data.success) setFolders(foldersRes.data.data);
      if (recentRes.data.success) setRecentFiles(recentRes.data.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [folderId]);

  useEffect(() => {
    setIsImgLoaded(false);
  }, [previewFile]);

  // ============================================================
  // 🔌 SOCKET CONNECTION
  // ============================================================
  useEffect(() => {
    socketRef.current = io(API_BASE, {
      transports: ["websocket", "polling"],
    });

    socketRef.current.on("uploadProgress", (data) => {
      setUploadProgress(data.percent || 0);
      const countText = `(${data.currentFile}/${data.totalFiles})`;

      switch (data.stage) {
        case "optimizing_image":
          setUploadTimeLeft(`Optimizing image ${countText}...`);
          break;
        case "compressing_video":
          setUploadTimeLeft(
            `Compressing video ${countText}... ${data.percent}%`,
          );
          break;
        case "cloud_upload":
          const eta = data.secondsLeft
            ? ` • ${formatTime(data.secondsLeft)} left`
            : "";
          setUploadTimeLeft(`Uploading ${countText}... ${data.percent}%${eta}`);
          break;
        case "processing":
          setUploadTimeLeft(`Processing ${countText}...`);
          break;
        default:
          break;
      }
    });

    socketRef.current.on("fileUploaded", () => {
      fetchData();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [folderId]);

  // ============================================================
  // 📊 COMPUTED VALUES (using useMemo for performance)
  // ============================================================
  const displayFiles = useMemo(() => {
    let filtered = folderId
      ? files.filter((f) => f.folderId === folderId)
      : recentFiles;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((f) => f.name?.toLowerCase().includes(query));
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.createdAt) - new Date(a.createdAt);
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "size":
          return parseSize(b.size) - parseSize(a.size);
        default:
          return 0;
      }
    });

    return filtered;
  }, [files, recentFiles, folderId, searchQuery, sortBy]);

  const currentFolder = useMemo(
    () => folders.find((f) => f._id === folderId),
    [folders, folderId],
  );

  const { totalUsageStr, usagePercent } = useMemo(() => {
    const totalUsageBytes = files.reduce(
      (acc, file) => acc + parseSize(file.size),
      0,
    );
    const maxLimitBytes = 5 * 1024 * 1024 * 1024 * 1024; // 5TB
    return {
      totalUsageStr: formatSize(totalUsageBytes),
      usagePercent: Math.min((totalUsageBytes / maxLimitBytes) * 100, 100),
    };
  }, [files]);

  // ============================================================
  // 🎯 EVENT HANDLERS
  // ============================================================

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Navigation
  const handleNext = (e) => {
    e?.stopPropagation();
    if (!previewFile) return;
    const currentIndex = displayFiles.findIndex(
      (f) => f._id === previewFile._id,
    );
    if (currentIndex < displayFiles.length - 1) {
      setSlideDirection("right");
      setPreviewFile(displayFiles[currentIndex + 1]);
    }
  };

  const handlePrev = (e) => {
    e?.stopPropagation();
    if (!previewFile) return;
    const currentIndex = displayFiles.findIndex(
      (f) => f._id === previewFile._id,
    );
    if (currentIndex > 0) {
      setSlideDirection("left");
      setPreviewFile(displayFiles[currentIndex - 1]);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!previewFile) return;
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") setPreviewFile(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewFile, displayFiles]);

  // Touch/swipe handlers
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) handleNext();
    if (distance < -50) handlePrev();
  };

  // ============================================================
  // 📁 FOLDER HANDLERS
  // ============================================================
  const handleCreateFolder = async () => {
    if (!inputValue.trim()) return;
    try {
      await axios.post(`${API_BASE}/api/folders`, { name: inputValue.trim() });
      fetchData();
      setInputValue("");
      setModalMode(null);
    } catch (err) {
      alert("Failed to create folder");
    }
  };

  const handleDeleteFolder = async (id, name) => {
    if (!window.confirm(`Delete folder "${name}" and all its files?`)) return;
    try {
      await axios.delete(`${API_BASE}/api/folders/${id}`);
      fetchData();
      navigate("/");
    } catch (err) {
      alert("Failed to delete folder");
    }
  };

  const handleTogglePublic = async () => {
    try {
      await axios.patch(`${API_BASE}/api/folders/${folderId}/toggle-public`);
      fetchData();
    } catch (err) {
      alert("Error toggling folder visibility");
    }
  };

  // ============================================================
  // 📤 FILE HANDLERS
  // ============================================================
  const handleFileSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;

    try {
      setUploadStatus("uploading");
      setUploadProgress(0);
      setUploadTimeLeft("Starting...");
      setUploadCount(selectedFiles.length);
      setModalMode(null);

      const uploadStartTime = Date.now();
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("files", file));
      formData.append(
        "uploadedBy",
        localStorage.getItem("userName") || "Guest",
      );
      if (folderId) formData.append("folderId", folderId);
      if (socketRef.current?.id)
        formData.append("socketId", socketRef.current.id);

      await axios.post(`${API_BASE}/api/files/upload-multiple`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const { loaded, total } = progressEvent;
          const percent = Math.round((loaded * 100) / total);
          setUploadProgress(percent);

          if (percent > 0 && percent < 100) {
            const elapsed = (Date.now() - uploadStartTime) / 1000;
            const rate = percent / elapsed;
            const remaining = (100 - percent) / rate;
            setUploadTimeLeft(
              `Sending... ${percent}% • ${formatTime(remaining)} left`,
            );
          } else if (percent >= 100) {
            setUploadTimeLeft("Processing on server...");
          }
        },
      });

      fetchData();
      setUploadStatus("success");
      setTimeout(() => setUploadStatus("idle"), 3000);
    } catch (err) {
      console.error("Upload error:", err);
      setUploadStatus("error");
      setTimeout(() => setUploadStatus("idle"), 3000);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm("Delete this file?")) return;
    try {
      await axios.delete(`${API_BASE}/api/files/${fileId}`);
      setFiles((prev) => prev.filter((f) => f._id !== fileId));
      setRecentFiles((prev) => prev.filter((f) => f._id !== fileId));
      setPreviewFile(null);
    } catch (err) {
      alert("Failed to delete file");
    }
  };

  const handleDownload = (file) => {
    window.open(`${API_BASE}/api/files/download/${file._id}`, "_blank");
  };

  const handleShareFile = async (file) => {
    const fileLink = `${API_BASE}/api/files/download/${file._id}`;

    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: file.name,
          text: "Check out this file",
          url: fileLink,
        });
        return;
      } catch (err) {
        // User cancelled or not supported
      }
    }

    // Fallback to clipboard
    copyToClipboard(fileLink);
    alert("Link copied to clipboard!");
  };

  const handleCopyLink = (shareId) => {
    const link = `${window.location.origin}/share/${shareId}`;
    copyToClipboard(link);
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      // Fallback for HTTP
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Copy failed:", err);
      }
      document.body.removeChild(textArea);
    }
  };

  const isCreator = (file) =>
    file.uploadedBy === (localStorage.getItem("userName") || "Guest");

  // ============================================================
  // 🎨 RENDER HELPERS
  // ============================================================
  const renderSkeletons = () => {
    return Array(8)
      .fill(0)
      .map((_, i) => (
        <div key={i} className="card-file-optimized skeleton-card">
          <div className="skeleton-preview shimmer"></div>
          <div className="file-details">
            <div
              className="skeleton-text shimmer"
              style={{ width: "70%" }}
            ></div>
          </div>
        </div>
      ));
  };

  // ============================================================
  // 🖼️ RENDER
  // ============================================================
  return (
    <div className="app">
      {/* Sidebar Overlay (Mobile) */}
      {isMobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileOpen ? "open" : ""}`}>
        <div className="brand">
          <img src="/logo.png" alt="logo" style={{ width: 50, height: 50 }} />
          <h2 className="ranchers" style={{ letterSpacing: 0.5 }}>
            FamilyCloud
          </h2>
        </div>

        <button
          className="btn-upload ranchers"
          onClick={() => {
            setModalMode("new-options");
            setIsMobileOpen(false);
          }}
        >
          <Plus size={20} /> New
        </button>

        <nav className="nav">
          <button
            className={`nav-item ranchers ${!folderId ? "active" : ""}`}
            onClick={() => {
              navigate("/");
              setIsMobileOpen(false);
            }}
          >
            <Folder size={18} /> All Files
          </button>
          <button
            className="nav-item ranchers"
            onClick={() => {
              navigate("/bin");
              setIsMobileOpen(false);
            }}
          >
            <Trash size={18} /> Bin
          </button>
        </nav>

        <div className="storage-widget">
          <div className="storage-header">
            <span className="storage-label ranchers">Storage</span>
            <span className="storage-val ranchers">
              {usagePercent.toFixed(1)}%
            </span>
          </div>
          <div className="storage-bar-bg">
            <div
              className="storage-bar-fill"
              style={{ width: `${usagePercent}%`, background: "#6366f1" }}
            />
          </div>
          <p className="storage-text">{totalUsageStr} used of 5 TB</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main">
        {/* Header */}
        <header className="header">
          <div className="header-title">
            {folderId ? (
              <button className="mobile-nav-btn" onClick={() => navigate("/")}>
                <ArrowLeft size={24} />
              </button>
            ) : (
              <button
                className="mobile-nav-btn"
                onClick={() => setIsMobileOpen(true)}
              >
                <Menu size={24} />
              </button>
            )}
            <span className="current-folder-name">
              {folderId ? currentFolder?.name || "Folder" : "Dashboard"}
            </span>
            {folderId && displayFiles.length > 0 && (
              <span className="meta-badge">{displayFiles.length} items</span>
            )}
          </div>

          {/* Desktop Search */}
          <div className="search-bar-container">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search files..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Header Actions */}
          <div className="header-actions">
            <button
              className={`view-toggle ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Grid View"
            >
              <Grid3x3 size={18} />
            </button>
            <button
              className={`view-toggle ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
              title="List View"
            >
              <List size={18} />
            </button>
            <div className="avatar ranchers">
              {localStorage
                .getItem("userName")
                ?.substring(0, 2)
                .toUpperCase() || "DT"}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="content">
          {/* Mobile Search */}
          <div className="mobile-search">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Folders Section */}
          {!folderId && folders.length > 0 && (
            <section className="section">
              <div className="section-header ranchers">
                <h3>Folders</h3>
              </div>
              <div className="grid-folders">
                {folders.map((f) => (
                  <div
                    key={f._id}
                    className="card-folder ranchers"
                    onClick={() => navigate(`/folder/${f._id}`)}
                  >
                    <div
                      className="folder-icon"
                      style={{ background: f.color || "#6366f1" }}
                    >
                      <Folder size={24} fill="white" fillOpacity={0.3} />
                    </div>
                    <div className="folder-info">
                      <h4>{f.name}</h4>
                      <p>{f.fileCount || 0} files</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Files Section */}
          <section className="section">
            <div className="section-header">
              <h3 className="ranchers">
                {folderId ? "Files" : "Recent Uploads"}
              </h3>
              {folderId && (
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    className="btn-header-share ranchers"
                    onClick={() => setShowShareModal(true)}
                  >
                    <Share2 size={16} /> Share
                  </button>
                  <button
                    className="btn-header-delete ranchers"
                    onClick={() =>
                      handleDeleteFolder(folderId, currentFolder?.name)
                    }
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              )}
            </div>

            {/* Sort Options */}
            {displayFiles.length > 0 && (
              <div className="sort-bar">
                <button
                  className={`sort-btn ${sortBy === "date" ? "active" : ""}`}
                  onClick={() => setSortBy("date")}
                >
                  <SortAsc size={16} /> Date
                </button>
                <button
                  className={`sort-btn ${sortBy === "name" ? "active" : ""}`}
                  onClick={() => setSortBy("name")}
                >
                  Name
                </button>
                <button
                  className={`sort-btn ${sortBy === "size" ? "active" : ""}`}
                  onClick={() => setSortBy("size")}
                >
                  Size
                </button>
              </div>
            )}

            {/* Files Grid/List */}
            <div
              className={
                viewMode === "grid" ? "grid-files" : "grid-files list-view"
              }
            >
              {loading
                ? renderSkeletons()
                : displayFiles.map((file) => (
                    <div
                      key={file._id}
                      className="card-file-optimized"
                      onClick={() => setPreviewFile(file)}
                    >
                      <div className="file-preview">
                        <img
                          src={`${API_BASE}/api/files/preview/${file._id}?thumb=true`}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            e.target.style.display = "none";
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = "flex";
                            }
                          }}
                        />
                        <div
                          className="preview-placeholder"
                          style={{ display: "none" }}
                        >
                          <FileText size={40} color="#666" />
                        </div>
                        {isVideo(file) && (
                          <div className="grid-video-overlay">
                            <Play size={42} fill="white" color="white" />
                          </div>
                        )}
                      </div>
                      <div className="file-details">
                        <span className="file-name">
                          {isVideo(file) ? (
                            <VideoIcon
                              size={16}
                              color="#6366f1"
                              style={{ minWidth: 16 }}
                            />
                          ) : isImage(file) ? (
                            <ImageIcon
                              size={16}
                              color="#10b981"
                              style={{ minWidth: 16 }}
                            />
                          ) : (
                            <FileText
                              size={16}
                              color="#9ca3af"
                              style={{ minWidth: 16 }}
                            />
                          )}
                          <span className="name-text">{file.name}</span>
                        </span>
                        <button
                          className="file-more"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(
                              activeMenuId === file._id ? null : file._id,
                            );
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {activeMenuId === file._id && (
                          <div
                            className="file-dropdown-menu"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                handleDownload(file);
                                setActiveMenuId(null);
                              }}
                            >
                              <Download size={16} /> Download
                            </button>
                            <button
                              onClick={() => {
                                handleShareFile(file);
                                setActiveMenuId(null);
                              }}
                            >
                              <Share2 size={16} /> Share
                            </button>
                            {isCreator(file) && (
                              <button
                                className="danger"
                                onClick={() => {
                                  handleDeleteFile(file._id);
                                  setActiveMenuId(null);
                                }}
                              >
                                <Trash2 size={16} /> Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
            </div>

            {/* Empty State */}
            {!loading && displayFiles.length === 0 && (
              <div className="empty-state">
                <UploadCloud size={64} color="#444" />
                <p>
                  {searchQuery
                    ? "No files match your search"
                    : folderId
                      ? "No files in this folder"
                      : "No recent uploads"}
                </p>
                {!searchQuery && (
                  <button
                    className="btn-outline"
                    onClick={() => setModalMode("new-options")}
                  >
                    <Plus size={18} /> Upload Files
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* FAB */}
      <div className={`fab-container ${folderId ? "show-desktop" : ""}`}>
        <button
          className="fab-main"
          onClick={() => setModalMode("new-options")}
        >
          <Plus size={28} />
        </button>
      </div>

      {/* Upload Toast */}
      {uploadStatus !== "idle" && (
        <div className="upload-toast">
          <div className="upload-toast-header">
            <span className="toast-title">
              {uploadStatus === "uploading"
                ? `Uploading ${uploadCount} item(s)`
                : uploadStatus === "success"
                  ? "Upload complete"
                  : "Upload failed"}
            </span>
            <button
              className="toast-close"
              onClick={() => setUploadStatus("idle")}
            >
              <X size={16} />
            </button>
          </div>
          <div className="upload-toast-body">
            {uploadStatus === "uploading" ? (
              <>
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="upload-meta">
                  <span>{uploadProgress}%</span>
                  <span>{uploadTimeLeft}</span>
                </div>
              </>
            ) : uploadStatus === "success" ? (
              <div className="upload-success">
                <CheckCircle2 size={24} color="#10b981" />
                <span>{uploadCount} items added</span>
              </div>
            ) : (
              <div className="upload-error">
                <AlertCircle size={24} color="#ef4444" />
                <span>Something went wrong</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 📦 MODALS */}
      {/* ============================================================ */}

      {/* New Options Modal */}
      {modalMode === "new-options" && (
        <div className="modal-overlay" onClick={() => setModalMode(null)}>
          <div
            className="modal new-options-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Create New</h3>
              <button onClick={() => setModalMode(null)} className="close-btn">
                <X size={24} />
              </button>
            </div>
            <div className="new-options-grid">
              <button
                className="new-option-btn folder-btn"
                onClick={() => setModalMode("create")}
              >
                <div className="icon-wrapper folder-icon-bg">
                  <FolderPlus size={28} />
                </div>
                <div className="btn-text">
                  <span className="btn-title">New Folder</span>
                  <span className="btn-desc">Organize files</span>
                </div>
              </button>
              <button
                className="new-option-btn upload-btn"
                onClick={() => setModalMode("upload")}
              >
                <div className="icon-wrapper upload-icon-bg">
                  <UploadCloud size={28} />
                </div>
                <div className="btn-text">
                  <span className="btn-title">Upload File</span>
                  <span className="btn-desc">Add photos & videos</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Upload Modal */}
      {(modalMode === "create" || modalMode === "upload") && (
        <div className="modal-overlay" onClick={() => setModalMode(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalMode === "create" ? "New Folder" : "Upload Files"}</h3>
              <button onClick={() => setModalMode(null)}>
                <X size={24} />
              </button>
            </div>
            {modalMode === "create" ? (
              <div className="modal-body">
                <input
                  className="modal-input"
                  placeholder="Folder Name"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateFolder();
                  }}
                />
                <button className="btn-primary" onClick={handleCreateFolder}>
                  Create Folder
                </button>
              </div>
            ) : (
              <div
                className="dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud size={48} />
                <p>Click to select files</p>
                <span style={{ fontSize: "0.85rem", color: "#666" }}>
                  Photos, videos, and documents
                </span>
                <input
                  type="file"
                  hidden
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,video/*,.pdf,.doc,.docx,.zip"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div
            className="modal cool-share-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Share Folder</h3>
              <button onClick={() => setShowShareModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="share-body">
              <div className="share-row">
                <div
                  className={`share-icon-box ${
                    currentFolder?.isPublic ? "public" : "private"
                  }`}
                >
                  {currentFolder?.isPublic ? (
                    <Globe size={24} />
                  ) : (
                    <Lock size={24} />
                  )}
                </div>
                <div className="share-info">
                  <h4>Public Access</h4>
                  <p>
                    {currentFolder?.isPublic
                      ? "Anyone with link can view"
                      : "Private"}
                  </p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={currentFolder?.isPublic || false}
                    onChange={handleTogglePublic}
                  />
                  <span className="slider round" />
                </label>
              </div>
              {currentFolder?.isPublic && currentFolder?.shareId && (
                <div className="share-link-group animate-slide-down">
                  <div className="input-group">
                    <input
                      className="share-input"
                      readOnly
                      value={`${window.location.origin}/share/${currentFolder.shareId}`}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyLink(currentFolder.shareId);
                      }}
                      className={`copy-btn-action ${copied ? "copied" : ""}`}
                    >
                      {copied ? <Check size={20} /> : <Copy size={20} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 🖼️ PREVIEW MODAL */}
      {/* ============================================================ */}
      {previewFile && (
        <div
          className="preview-overlay"
          onClick={() => setPreviewFile(null)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Header */}
          <div
            className="preview-header-immersive"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ph-left">
              <button className="ph-btn" onClick={() => setPreviewFile(null)}>
                <ArrowLeft size={28} />
              </button>
              <div className="ph-info">
                <h4 className="ranchers">{previewFile.name}</h4>
                <span className="ranchers">{previewFile.size}</span>
              </div>
            </div>
            <div className="ph-right">
              <button
                className="ph-btn"
                onClick={() => handleShareFile(previewFile)}
              >
                <Share2 size={26} />
              </button>
              <button
                className="ph-btn"
                onClick={() => handleDownload(previewFile)}
              >
                <Download size={26} />
              </button>
              {isCreator(previewFile) && (
                <button
                  className="ph-btn delete"
                  onClick={() => handleDeleteFile(previewFile._id)}
                >
                  <Trash2 size={26} />
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="preview-body">
            <button className="nav-arrow left" onClick={handlePrev}>
              <ChevronLeft size={42} />
            </button>

            {isVideo(previewFile) ? (
              <VideoPlayer
                src={`${API_BASE}/api/files/download/${previewFile._id}?inline=true`}
                poster={`${API_BASE}/api/files/preview/${previewFile._id}?thumb=true`}
              />
            ) : isImage(previewFile) ? (
              <>
                {!isImgLoaded && (
                  <div className="preview-loader">
                    <Loader2 size={48} className="animate-spin" color="white" />
                  </div>
                )}
                <img
                  key={previewFile._id}
                  src={`${API_BASE}/api/files/preview/${previewFile._id}`}
                  className={`preview-media ${
                    slideDirection === "right"
                      ? "slide-enter-right"
                      : "slide-enter-left"
                  }`}
                  style={{ display: isImgLoaded ? "block" : "none" }}
                  onLoad={() => setIsImgLoaded(true)}
                  onClick={(e) => e.stopPropagation()}
                  alt="preview"
                />
              </>
            ) : (
              <div className="preview-fallback">
                <FileText size={100} color="white" />
                <p>No preview available</p>
                <button
                  className="btn-outline"
                  onClick={() => handleDownload(previewFile)}
                >
                  <Download size={18} /> Download File
                </button>
              </div>
            )}

            <button className="nav-arrow right" onClick={handleNext}>
              <ChevronRight size={42} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
