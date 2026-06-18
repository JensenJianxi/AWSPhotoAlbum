import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Amplify } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import "./index.css";
import App from "./App.jsx";
import { authConfig } from "./authConfig";

Amplify.configure(authConfig);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Authenticator loginMechanisms={["email"]} signUpAttributes={["email"]}>
      {({ signOut, user }) => <App signOut={signOut} user={user} />}
    </Authenticator>
  </StrictMode>,
)
