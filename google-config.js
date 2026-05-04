window.LIFE_DASHBOARD_CONFIG = {
  google: {
    clientId: "",
    authCodeEndpoint: "http://localhost:8787/api/auth/google/code",
    sessionEndpoint: "http://localhost:8787/api/auth/session",
    bootstrapEndpoint: "http://localhost:8787/api/google/bootstrap",
    logoutEndpoint: "http://localhost:8787/api/auth/logout",
    scopes: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/tasks.readonly",
      "https://www.googleapis.com/auth/gmail.readonly"
    ]
  }
};
