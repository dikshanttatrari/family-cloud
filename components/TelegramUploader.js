import React, { useState } from "react";
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";

// 👇 YOUR CREDENTIALS
const API_ID = 34981332;
const API_HASH = "d1597a97c0f9d8cecdded25ce5139438";
const SESSION =
  "1BQANOTEuMTA4LjU2LjEyMgG7IdGEKZxl+E3LnmjIzgphXpDb3PCIh2+lpktXLd+0mj5jXgy7uaJzgdp8bS3jELnnwLgg1fRZlpQGYjVSVFePlLxAcsrG+ISOL11Hh77uQAsGsOiscGEtITCjqRvHPnpr/AdgHklI+jcz6enKl8RWrfcJv7GPcnL05Lu4MiTZzF1bTFhVcvGFJRogn+XXXOP/0eQhkuLsi2cKjHkWJxZZ9LeKv+Y/UxU9xANyJTiw8oPHjDWLjUnXpLOnuBVAR0Rh7H6vCHQ3qlGS4S/yDkMM39T/c67o7OEG89tsGJIQHe10q7dJQvIXxK2sQZ83fGeK3AsqnXnx4jrAKmX0sZWsqQ==";

export default function TelegramUploader() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Idle");
  const [fileId, setFileId] = useState("");

  const handleUpload = async (e) => {
    const rawFile = e.target.files[0];
    if (!rawFile) return;

    setStatus("Connecting...");

    const client = new TelegramClient(
      new StringSession(SESSION),
      Number(API_ID),
      API_HASH,
      { connectionRetries: 5 },
    );

    try {
      await client.connect();
      setStatus("Uploading... (Do not close tab)");

      // STEP 1: Upload the file explicitly
      // This function knows how to slice the 1GB file in the browser
      const inputFile = await client.uploadFile({
        file: rawFile,
        workers: 4,
        fileName: rawFile.name,
        onProgress: (progress) => {
          // progress is a float between 0 and 1
          const percent = Math.round(progress * 100);
          setProgress(percent);
        },
      });

      setStatus("Finalizing...");

      // STEP 2: Send the uploaded file reference
      const result = await client.sendFile("me", {
        file: inputFile, // We send the reference, not the raw file
        forceDocument: true,
        caption: rawFile.name, // Optional caption
      });

      console.log("Success:", result);
      setStatus("✅ Upload Complete!");

      // Save the ID safely
      if (result && result.media && result.media.document) {
        setFileId(String(result.media.document.id));
      }
    } catch (err) {
      console.error("Upload Failed:", err);
      setStatus("❌ Error: " + err.message);
    }
  };

  return (
    <div className="p-10 border rounded-xl bg-gray-50 max-w-md mx-auto mt-10">
      <h2 className="text-xl font-bold mb-4">Family Cloud</h2>
      <input
        type="file"
        onChange={handleUpload}
        className="mb-4 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />

      <p className="font-mono text-sm">Status: {status}</p>

      {progress > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      {fileId && (
        <div className="mt-4 p-2 bg-green-100 text-green-800 rounded text-xs break-all">
          <b>File ID:</b> {fileId}
        </div>
      )}
    </div>
  );
}
