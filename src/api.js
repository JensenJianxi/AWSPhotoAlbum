import { API_BASE_URL } from "./config";

export async function getUploadUrl(uploadRequest) {
  const response = await fetch(`${API_BASE_URL}/upload-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(uploadRequest),
  });

  if (!response.ok) {
    throw new Error(`Upload URL request failed with status ${response.status}.`);
  }

  return response.json();
}

export async function getMedia() {
  const response = await fetch(`${API_BASE_URL}/media`);

  if (!response.ok) {
    throw new Error(`Media request failed with status ${response.status}.`);
  }

  return response.json();
}
