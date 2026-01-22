import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./Home.css";
import { io } from "socket.io-client";
import {
  Cloud,
  Folder,
  Image as ImageIcon,
  FileText,
  MoreVertical,
  Menu,
  X,
  ArrowLeft,
  UploadCloud,
  Loader2,
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
  PlayCircle,
  Video as VideoIcon,
  CheckCircle2,
  AlertCircle,
  Trash,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE = "https://family-cloud-backend-bfu9.onrender.com";

export default function Home() {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);

  // --- STATE ---
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [previewFile, setPreviewFile] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const [files, setFiles] = useState([]);
  const [recentFiles, setRecentFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Upload State
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTimeLeft, setUploadTimeLeft] = useState(null);
  const [uploadCount, setUploadCount] = useState(0);

  // Swipe State
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const stageStartTimeRef = useRef(0);
  const currentStageRef = useRef("");

  // --- API CALLS ---
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 🟢 SOCKET CONNECTION
  useEffect(() => {
    socketRef.current = io(API_BASE);

    socketRef.current.on("uploadProgress", (data) => {
      // data = { stage: 'cloud_upload', percent: 50 }

      setUploadProgress(data.percent);

      // 1. Detect Stage Change to Reset Timer
      if (currentStageRef.current !== data.stage) {
        currentStageRef.current = data.stage;
        stageStartTimeRef.current = Date.now(); // Reset start time for new stage
      }

      // 2. Calculate ETA
      // Formula: (Time Elapsed / Current %) * Remaining %
      let etaString = "";
      if (data.percent > 0 && data.percent < 100) {
        const timeElapsed = (Date.now() - stageStartTimeRef.current) / 1000; // in seconds
        const rate = data.percent / timeElapsed; // percent per second
        const remainingPercent = 100 - data.percent;
        const secondsLeft = remainingPercent / rate;

        if (secondsLeft < 300) {
          // Only show if valid (under 5 mins)
          etaString = ` • ${formatTime(secondsLeft)} left`;
        }
      }

      // 3. Update Text with ETA
      if (data.stage === "optimizing_image") {
        setUploadTimeLeft("Optimizing image...");
      } else if (data.stage === "compressing_video") {
        setUploadTimeLeft(`Compressing video... ${data.percent}%${etaString}`);
      } else if (data.stage === "cloud_upload") {
        setUploadTimeLeft(`Uploading to Cloud... ${data.percent}%${etaString}`);
      } else if (data.stage === "processing") {
        setUploadTimeLeft("Processing...");
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const displayFiles = folderId
    ? files.filter((f) => f.folderId === folderId)
    : recentFiles;

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const currentFolder = folders.find((f) => f._id === folderId);

  // --- HELPERS ---
  const parseSize = (sizeStr) => {
    if (!sizeStr) return 0;
    const units = {
      Bytes: 1,
      KB: 1024,
      MB: 1024 ** 2,
      GB: 1024 ** 3,
      TB: 1024 ** 4,
    };
    const [value, unit] = sizeStr.split(" ");
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

  const totalUsageBytes = files.reduce(
    (acc, file) => acc + parseSize(file.size),
    0,
  );
  const totalUsageStr = formatSize(totalUsageBytes);
  const maxLimitBytes = 5 * 1024 * 1024 * 1024 * 1024;
  const usagePercent = Math.min((totalUsageBytes / maxLimitBytes) * 100, 100);

  // --- NAVIGATION ---
  const handleNext = (e) => {
    e?.stopPropagation();
    if (!previewFile) return;
    const currentIndex = displayFiles.findIndex(
      (f) => f._id === previewFile._id,
    );
    if (currentIndex < displayFiles.length - 1)
      setPreviewFile(displayFiles[currentIndex + 1]);
  };

  const handlePrev = (e) => {
    e?.stopPropagation();
    if (!previewFile) return;
    const currentIndex = displayFiles.findIndex(
      (f) => f._id === previewFile._id,
    );
    if (currentIndex > 0) setPreviewFile(displayFiles[currentIndex - 1]);
  };

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

  const onTouchStart = (e) =>
    setTouchEnd(null) || setTouchStart(e.targetTouches[0].clientX);
  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) handleNext();
    if (distance < -50) handlePrev();
  };

  // --- HANDLERS ---
  const handleCreateFolder = async () => {
    if (!inputValue.trim()) return;
    try {
      await axios.post(`${API_BASE}/api/folders`, { name: inputValue });
      fetchData();
      setInputValue("");
      setModalMode(null);
    } catch (err) {
      alert("Failed");
    }
  };

  const handleDeleteFolder = async (folderId, folderName) => {
    if (
      !window.confirm(
        `Delete folder "${folderName}"? Files will be moved to the Bin.`,
      )
    )
      return;
    try {
      await axios.delete(`${API_BASE}/api/folders/${folderId}`);
      fetchData();
    } catch (err) {
      alert("Failed to delete folder");
    }
  };

  const handleFileSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;

    try {
      setUploadStatus("uploading");
      setUploadProgress(0);
      setUploadTimeLeft("Starting...");
      setUploadCount(selectedFiles.length);
      setModalMode(null);

      // Reset Refs for the "Sending" phase
      const uploadStartTime = Date.now();

      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("files", file));
      formData.append(
        "uploadedBy",
        localStorage.getItem("userName") || "Guest",
      );
      if (folderId) formData.append("folderId", folderId);
      if (socketRef.current) formData.append("socketId", socketRef.current.id);

      await axios.post(`${API_BASE}/api/files/upload-multiple`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total;
          const current = progressEvent.loaded;
          let percent = Math.round((current * 100) / total);

          setUploadProgress(percent);

          // Calculate ETA for browser -> server upload
          if (percent < 100 && percent > 0) {
            const timeElapsed = (Date.now() - uploadStartTime) / 1000;
            const rate = percent / timeElapsed;
            const secondsLeft = (100 - percent) / rate;
            const eta = formatTime(secondsLeft);

            setUploadTimeLeft(`Sending to server... ${percent}% • ${eta} left`);
          } else {
            setUploadTimeLeft("Waiting for server...");
          }
        },
      });
    } catch (err) {
      console.error(err);
      setUploadStatus("error");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm("Delete this file?")) return;
    try {
      await axios.delete(`${API_BASE}/api/files/${fileId}`);
      setFiles((p) => p.filter((f) => f._id !== fileId));
      setRecentFiles((p) => p.filter((f) => f._id !== fileId));
      setPreviewFile(null);
    } catch (err) {
      alert("Failed to delete");
    }
  };

  const handleDownload = (file) =>
    window.open(`${API_BASE}/api/files/download/${file._id}`, "_blank");

  const handleShareFile = async (file) => {
    const fileLink = `${API_BASE}/api/files/download/${file._id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: file.name,
          text: "Check out this file",
          url: fileLink,
        });
      } catch (err) {
        console.log("Share canceled");
      }
    } else {
      navigator.clipboard.writeText(fileLink);
      alert("Link copied!");
    }
  };

  const handleCopyLink = (id) => {
    const link = `${window.location.origin}/share/${id}`;

    // 1. Try the modern Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(link)
        .then(() => {
          handleCopySuccess();
        })
        .catch((err) => {
          console.error("Clipboard API failed, using fallback", err);
          fallbackCopyTextToClipboard(link);
        });
    } else {
      // 2. Fallback for non-HTTPS or unsupported browsers
      fallbackCopyTextToClipboard(link);
    }
  };

  // Helper for Copy Success UI
  const handleCopySuccess = () => {
    setCopied(true);
    // Remove the annoying alert and use your 'copied' state for UI feedback
    setTimeout(() => setCopied(false), 2000);
  };

  // 🟢 THE FALLBACK METHOD
  function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Ensure the textarea is not visible
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand("copy");
      if (successful) handleCopySuccess();
    } catch (err) {
      console.error("Fallback: Unable to copy", err);
    }

    document.body.removeChild(textArea);
  }

  const handleTogglePublic = async () => {
    try {
      await axios.patch(`${API_BASE}/api/folders/${folderId}/toggle-public`);
      fetchData();
    } catch (err) {
      alert("Error");
    }
  };

  const isCreator = (file) =>
    file.uploadedBy === (localStorage.getItem("userName") || "Guest");
  const isImage = (file) =>
    file.type === "img" || file.name.match(/\.(jpeg|jpg|png|webp|heic)$/i);
  const isVideo = (file) =>
    file.type === "video" || file.name.match(/\.(mp4|mov|avi|mkv)$/i);

  // --- RENDER ---
  return (
    <div className="app">
      {isMobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* SIDEBAR */}
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
            className={`nav-item ranchers`}
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
          <div className="storage-bar-bg ">
            <div
              className="storage-bar-fill ranchers"
              style={{ width: `${usagePercent}%`, background: "#6366f1" }}
            ></div>
          </div>
          <p className="storage-text ">{totalUsageStr} used of 5 TB</p>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main">
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
              {folderId ? currentFolder?.name : "Dashboard"}
            </span>
            {folderId && (
              <span className="meta-badge">
                {folderId && `${displayFiles.length} items`}
              </span>
            )}
          </div>
          <div className="avatar ranchers">
            {localStorage.getItem("userName")?.substring(0, 2) || "DT"}
          </div>
        </header>

        <div className="content">
          {!folderId && (
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
                      <p>Folder</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

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

            <div className="grid-files">
              {displayFiles.map((file) => (
                <div
                  key={file._id}
                  className="card-file-optimized" // New class for performance
                  onClick={() => setPreviewFile(file)}
                >
                  <div className="file-preview">
                    {/* 🟢 Add loading="lazy" and decodings="async" for smoother scrolling */}
                    <img
                      src={`${API_BASE}/api/files/preview/${file._id}`}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "block";
                      }}
                    />
                    <div
                      style={{ display: "none" }}
                      className="preview-placeholder"
                    >
                      <FileText size={40} color="#666" />
                    </div>

                    {isVideo(file) && (
                      <div className="grid-video-overlay">
                        <PlayCircle
                          size={42}
                          fill="rgba(0,0,0,0.5)"
                          color="white"
                        />
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
            {displayFiles.length === 0 && (
              <p style={{ color: "#666", marginTop: 20, fontStyle: "italic" }}>
                {folderId ? "No files in this folder." : "No recent uploads."}
              </p>
            )}
          </section>
        </div>
      </main>

      <div className={`fab-container ${folderId ? "show-desktop" : ""}`}>
        <button
          className="fab-main"
          onClick={() => setModalMode("new-options")}
        >
          <Plus size={28} />
        </button>
      </div>

      {/* UPLOAD TOAST */}
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
                  ></div>
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

      {/* MODALS - 🟢 NOW PROPERLY INSIDE THE RETURN STATEMENT */}
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

      {(modalMode === "create" || modalMode === "upload") && (
        <div className="modal-overlay" onClick={() => setModalMode(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalMode === "create" ? "New Folder" : "Upload File"}</h3>
              <button onClick={() => setModalMode(null)}>
                <X size={24} />
              </button>
            </div>
            {modalMode === "create" ? (
              <div className="modal-body">
                <input
                  className="modal-input"
                  placeholder="Name"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  autoFocus
                />
                <button className="btn-primary" onClick={handleCreateFolder}>
                  Create
                </button>
              </div>
            ) : (
              <div
                className="dropzone"
                onClick={() => fileInputRef.current.click()}
              >
                <UploadCloud size={40} />
                <p>Select Files</p>
                <input
                  type="file"
                  hidden
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                />
              </div>
            )}
          </div>
        </div>
      )}

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
                  className={`share-icon-box ${currentFolder?.isPublic ? "public" : "private"}`}
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
                    {currentFolder?.isPublic ? "Anyone with link" : "Private"}
                  </p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={currentFolder?.isPublic || false}
                    onChange={handleTogglePublic}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
              {currentFolder?.isPublic && (
                <div className="share-link-group animate-slide-down">
                  <div className="input-group">
                    <input
                      className="share-input"
                      readOnly
                      value={`${window.location.origin}/share/${currentFolder?.shareId}`}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevents modal from closing
                        handleCopyLink(currentFolder?.shareId);
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

      {previewFile && (
        <div
          className="preview-overlay"
          onClick={() => setPreviewFile(null)}
          /* 🟢 ATTACH THE HANDLERS HERE */
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
          <div className="preview-body">
            <button
              className="nav-arrow left desktop-only"
              onClick={handlePrev}
            >
              <ChevronLeft size={42} />
            </button>
            {isVideo(previewFile) ? (
              <video
                controls
                autoPlay
                playsInline
                preload="metadata"
                crossOrigin="anonymous"
                src={`${API_BASE}/api/files/download/${previewFile._id}?inline=true`}
                className="preview-media"
              />
            ) : isImage(previewFile) ? (
              <img
                src={`${API_BASE}/api/files/preview/${previewFile._id}`}
                className="preview-media"
                onClick={(e) => e.stopPropagation()}
                alt="preview"
              />
            ) : (
              <div className="preview-fallback">
                <FileText size={100} color="white" />
                <p>No preview</p>
              </div>
            )}
            <button
              className="nav-arrow right desktop-only"
              onClick={handleNext}
            >
              <ChevronRight size={42} />
            </button>
          </div>
        </div>
      )}
    </div>
  ); // 🟢 End of RETURN
} // 🟢 End of FUNCTION
