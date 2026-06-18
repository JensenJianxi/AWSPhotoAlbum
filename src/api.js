import { API_BASE_URL } from "./config";
import { fetchAuthSession } from "aws-amplify/auth";

export async function getUploadUrl(uploadRequest) {
  const headers = await getAuthorizedJsonHeaders();
  const response = await fetch(`${API_BASE_URL}/upload-url`, {
    method: "POST",
    headers,
    body: JSON.stringify(uploadRequest),
  });

  if (!response.ok) {
    throw new Error(`Upload URL request failed with status ${response.status}.`);
  }

  return response.json();
}

export async function getMedia() {
  const response = await fetch(`${API_BASE_URL}/media`, {
    headers: await getAuthorizedHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Media request failed with status ${response.status}.`);
  }

  return response.json();
}

async function getAuthorizedJsonHeaders() {
  const headers = await getAuthorizedHeaders();
  headers["Content-Type"] = "application/json";
  return headers;
}

async function getAuthorizedHeaders() {
  const session = await fetchAuthSession();
  const accessToken = session.tokens?.accessToken?.toString() || "";

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}
