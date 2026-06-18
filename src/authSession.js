import { fetchAuthSession } from "aws-amplify/auth";

export async function getAuthTokens() {
  const session = await fetchAuthSession();

  return {
    accessToken: session.tokens?.accessToken?.toString() || "",
    idToken: session.tokens?.idToken?.toString() || "",
  };
}

export async function getAccessToken() {
  const { accessToken } = await getAuthTokens();
  return accessToken;
}

export async function getIdToken() {
  const { idToken } = await getAuthTokens();
  return idToken;
}
