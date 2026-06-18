import { useEffect, useMemo, useRef, useState } from "react";
import { fetchUserAttributes } from "aws-amplify/auth";
import { getMedia, getUploadUrl } from "./api";
import "./App.css";

const ACCEPTED_TYPES = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "video/mp4": "video",
  "video/quicktime": "video",
  "video/webm": "video",
};

const EXTENSION_TYPES = {
  jpg: { mediaType: "image", contentType: "image/jpeg" },
  jpeg: { mediaType: "image", contentType: "image/jpeg" },
  png: { mediaType: "image", contentType: "image/png" },
  webp: { mediaType: "image", contentType: "image/webp" },
  mp4: { mediaType: "video", contentType: "video/mp4" },
  mov: { mediaType: "video", contentType: "video/quicktime" },
  webm: { mediaType: "video", contentType: "video/webm" },
};

const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp,.mp4,.mov,.webm";

const STATUS_TEXT = {
  idle: "No file selected",
  ready: "File selected and ready to upload",
  gettingUrl: "Getting upload URL",
  uploading: "Uploading",
  success: "Uploaded successfully",
  failed: "Upload failed",
};

const THREE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js";
const VANTA_CDN = "https://cdnjs.cloudflare.com/ajax/libs/vanta/0.5.24/vanta.net.min.js";

function App({ signOut, user }) {
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedType, setSelectedType] = useState("");
  const [selectedContentType, setSelectedContentType] = useState("");
  const [status, setStatus] = useState("idle");
  const [statusDetail, setStatusDetail] = useState("");
  const [mediaItems, setMediaItems] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [accountEmail, setAccountEmail] = useState(user?.signInDetails?.loginId || "");

  useEffect(() => {
    loadMedia();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadUserAttributes() {
      try {
        const attributes = await fetchUserAttributes();

        if (!cancelled) {
          setAccountEmail(
            attributes.email || user?.signInDetails?.loginId || user?.username || ""
          );
        }
      } catch {
        if (!cancelled) {
          setAccountEmail(user?.signInDetails?.loginId || user?.username || "");
        }
      }
    }

    loadUserAttributes();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function startVanta() {
      try {
        await loadScript(THREE_CDN, "three-js");
        await loadScript(VANTA_CDN, "vanta-net-js");

        if (cancelled || !vantaRef.current || !window.VANTA?.NET) {
          return;
        }

        vantaEffect.current = window.VANTA.NET({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          scale: 1,
          scaleMobile: 1,
          color: 0x3b82f6,
          backgroundColor: 0xf7faff,
          points: 8,
          maxDistance: 20,
          spacing: 18,
          showDots: false,
        });
      } catch (error) {
        console.error("Vanta background could not load.", error);
      }
    }

    startVanta();

    return () => {
      cancelled = true;
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
        vantaEffect.current = null;
      }
    };
  }, []);

  const images = useMemo(
    () => mediaItems.filter((item) => getMediaType(item) === "image"),
    [mediaItems]
  );

  const videos = useMemo(
    () => mediaItems.filter((item) => getMediaType(item) === "video"),
    [mediaItems]
  );

  async function loadMedia() {
    try {
      setLoadingMedia(true);
      const data = await getMedia();
      setMediaItems(normalizeMediaList(data));
    } catch (error) {
      console.error(error);
      setStatus("failed");
      setStatusDetail("Could not load media from the API.");
    } finally {
      setLoadingMedia(false);
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      setSelectedType("");
      setSelectedContentType("");
      setStatus("idle");
      setStatusDetail("");
      return;
    }

    const fileInfo = getFileInfo(file);

    if (!fileInfo) {
      setSelectedFile(null);
      setSelectedType("");
      setSelectedContentType("");
      setStatus("failed");
      setStatusDetail("Choose a JPG, JPEG, PNG, WEBP, MP4, MOV, or WEBM file.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
    setSelectedType(fileInfo.mediaType);
    setSelectedContentType(fileInfo.contentType);
    setStatus("ready");
    setStatusDetail(`${file.name} will upload to ${getUploadPrefix(fileInfo.mediaType)}`);
  }

  async function handleUpload() {
    if (!selectedFile || !selectedType || !selectedContentType) {
      setStatus("idle");
      setStatusDetail("Choose an image or video before uploading.");
      return;
    }

    const uploadPrefix = getUploadPrefix(selectedType);
    const s3Key = `${uploadPrefix}${selectedFile.name}`;

    try {
      setStatus("gettingUrl");
      setStatusDetail(`Requesting a pre-signed URL for ${s3Key}`);

      const uploadData = await getUploadUrl({
        filename: selectedFile.name,
        fileType: selectedContentType,
        contentType: selectedContentType,
        type: selectedContentType,
        mediaType: selectedType,
        folder: uploadPrefix,
        key: s3Key,
      });

      const uploadUrl = uploadData.uploadUrl || uploadData.url;

      if (!uploadUrl) {
        throw new Error("The upload-url API did not return an uploadUrl.");
      }

      setStatus("uploading");
      setStatusDetail(`Uploading to ${uploadData.key || s3Key}`);

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": selectedContentType,
        },
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(
          `S3 upload failed with status ${uploadResponse.status}. ${getShortError(errorText)}`
        );
      }

      const uploadedKey = uploadData.key || s3Key;
      setStatus("success");
      setStatusDetail(`${selectedFile.name} uploaded to ${uploadedKey}`);
      setSelectedFile(null);
      setSelectedType("");
      setSelectedContentType("");
      await loadMedia();
    } catch (error) {
      console.error(error);
      setStatus("failed");
      setStatusDetail(error.message || "Something went wrong during upload.");
    }
  }

  const isBusy = status === "gettingUrl" || status === "uploading";

  return (
    <>
      <div ref={vantaRef} className="vanta-background" aria-hidden="true" />
      <main className="app-shell">
        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow">AWS Serverless Prototype</span>
            <h1>G3 Photo Album</h1>
            <p>Serverless Media Upload Prototype</p>
          </div>

          <div className="hero-side">
            <div className="system-card auth-card">
              <span className="pulse-dot" />
              <div className="auth-copy">
                <span className="section-label">Authenticated Session</span>
                <strong>Logged in as: {accountEmail || user?.username || "Unknown user"}</strong>
                <small>Cognito User Pool: us-east-1_hqsv8CzsK</small>
              </div>
              <button className="sign-out-button" type="button" onClick={signOut}>
                Logout
              </button>
            </div>

            <div className="system-card">
              <span className="pulse-dot" />
              <div>
                <strong>API Gateway</strong>
                <small>POST /upload-url and GET /media</small>
              </div>
            </div>
          </div>
        </section>

        <section className="upload-panel">
          <div className="panel-heading">
            <div>
              <span className="section-label">Upload Console</span>
              <h2>Image and Video Intake</h2>
            </div>
            <span className={`status-pill ${status}`}>{STATUS_TEXT[status]}</span>
          </div>

          <div className="upload-grid">
            <label className="drop-zone">
              <input
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={handleFileChange}
                disabled={isBusy}
              />
              <span className="upload-icon">+</span>
              <strong>{selectedFile ? selectedFile.name : "Choose media file"}</strong>
              <small>JPG, JPEG, PNG, WEBP, MP4, MOV, or WEBM</small>
            </label>

            <div className="upload-details">
              <InfoRow label="Detected type" value={selectedType || "Waiting for file"} />
              <InfoRow
                label="Content type"
                value={selectedContentType || "Resolved after file selection"}
              />
              <InfoRow
                label="S3 path"
                value={selectedType ? getUploadPrefix(selectedType) : "Select a file first"}
              />
              <InfoRow label="Status" value={statusDetail || STATUS_TEXT[status]} />
              <button
                className="upload-button"
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile || isBusy}
              >
                {isBusy ? "Working..." : "Upload to S3"}
              </button>
            </div>
          </div>
        </section>

        <section className="metrics-grid">
          <MetricCard label="Images" value={images.length} />
          <MetricCard label="Videos" value={videos.length} />
          <MetricCard label="Total Media" value={mediaItems.length} />
        </section>

        <section className="library-grid">
          <MediaSection title="Images" mediaType="image" items={images} loading={loadingMedia} />
          <MediaSection title="Videos" mediaType="video" items={videos} loading={loadingMedia} />
        </section>
      </main>
    </>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="metric-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function MediaSection({ title, mediaType, items, loading }) {
  return (
    <div className="media-section">
      <div className="media-section-header">
        <div>
          <span className="section-label">{mediaType} library</span>
          <h2>{title}</h2>
        </div>
        <span className="count-badge">{items.length}</span>
      </div>

      {loading ? (
        <p className="empty-state">Loading media...</p>
      ) : items.length === 0 ? (
        <p className="empty-state">No {title.toLowerCase()} uploaded yet.</p>
      ) : (
        <div className="card-list">
          {items.map((item) => (
            <MediaCard key={item.mediaId} item={item} mediaType={mediaType} />
          ))}
        </div>
      )}
    </div>
  );
}

function MediaCard({ item, mediaType }) {
  const processedPath =
    item.processedS3Key || "Processed output pending";
  const rawPath =
    item.rawS3Key || "Original source path unavailable";
  const previewUrl =
    mediaType === "image"
      ? `https://g3-photoalbum-processed-media.s3.amazonaws.com/${
          item.thumbnailS3Key || item.processedS3Key
        }`
      : null;
  return (
    <article className="media-card">
      <div className={`media-badge ${mediaType}`}>
        {mediaType}
      </div>

      {mediaType === "image" && previewUrl && (
        <img
          src={previewUrl}
          alt={item.friendlyDisplayName}
          className="media-thumbnail"
        />
      )}
      <div className="media-card-body">
        <h3>{item.friendlyDisplayName}</h3>
        <p>
          <strong>Processed:</strong> {processedPath}
        </p>

        <span>
          <strong>Source:</strong> {rawPath}
        </span>
      </div>
    </article>
  );
}

function getFileInfo(file) {
  if (ACCEPTED_TYPES[file.type]) {
    return {
      mediaType: ACCEPTED_TYPES[file.type],
      contentType: file.type,
    };
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  return EXTENSION_TYPES[extension] || null;
}

function getUploadPrefix(mediaType) {
  return mediaType === "video" ? "raw/videos/" : "raw/images/";
}

function getMediaType(item) {
  const mediaType = String(item.mediaType || "").toLowerCase();

  if (mediaType === "image" || mediaType === "video") {
    return mediaType;
  }

  return "";
}

function getFileName(key) {
  return key.split("/").filter(Boolean).pop() || key;
}

function normalizeMediaList(data) {
  const items = Array.isArray(data)
    ? data
    : data?.items || data?.media || data?.records || data?.files || [];

  return items
.map((item) => ({

  mediaId: item.mediaId || "",
  mediaType: String(item.mediaType || "").toLowerCase(),
  rawS3Key: item.rawS3Key || "",
  processedS3Key: item.processedS3Key || "",
  thumbnailS3Key: item.thumbnailS3Key || "",
  displayName: item.displayName || "",
  originalFileName: item.originalFileName || "",
  createdAt: item.createdAt || "",

}))
    .filter((item) => item.mediaId && (item.mediaType === "image" || item.mediaType === "video"))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map(addFriendlyDisplayName());
}

function addFriendlyDisplayName() {
  const nameCounts = new Map();

  return (item) => {
    const baseName = getBaseDisplayName(item);
    const count = nameCounts.get(baseName) || 0;
    nameCounts.set(baseName, count + 1);

    return {
      ...item,
      friendlyDisplayName: count === 0 ? baseName : appendDuplicateNumber(baseName, count),
    };
  };
}

function getBaseDisplayName(item) {
  return (
    item.displayName ||
    item.originalFileName ||
    getFileName(item.rawS3Key || item.processedS3Key) ||
    "Untitled media"
  );
}

function appendDuplicateNumber(fileName, count) {
  const dotIndex = fileName.lastIndexOf(".");

  if (dotIndex <= 0) {
    return `${fileName}${count}`;
  }

  const name = fileName.slice(0, dotIndex);
  const extension = fileName.slice(dotIndex);

  return `${name}${count}${extension}`;
}

function getShortError(errorText) {
  if (!errorText) {
    return "";
  }

  const code = errorText.match(/<Code>(.*?)<\/Code>/)?.[1];
  const message = errorText.match(/<Message>(.*?)<\/Message>/)?.[1];

  if (code || message) {
    return [code, message].filter(Boolean).join(": ");
  }

  return errorText.slice(0, 160);
}

function loadScript(src, id) {
  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById(id);

    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        resolve();
      } else {
        existingScript.addEventListener("load", resolve, { once: true });
        existingScript.addEventListener("error", reject, { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.dataset.loaded = "false";
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", reject);
    document.body.appendChild(script);
  });
}

export default App;
