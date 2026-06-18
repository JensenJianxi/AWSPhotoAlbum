const userPoolClientId =
  import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID || "APP_CLIENT_ID";

export const authConfig = {
  Auth: {
    Cognito: {
      userPoolId: "us-east-1_hqsv8CzsK",
      userPoolClientId,
      loginWith: {
        email: true,
      },
    },
  },
};
