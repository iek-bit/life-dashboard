window.LIFE_DASHBOARD_CONFIG = {
  google: {
    clientId: "428668705069-d067buiqe40u3k0voh5p00ei1kme27so.apps.googleusercontent.com",
    authCodeEndpoint: "https://life-dashboard-m3c251hcl-iek-bits-projects.vercel.app/api/auth/google/code",
    sessionEndpoint: "https://life-dashboard-m3c251hcl-iek-bits-projects.vercel.app/api/auth/session",
    bootstrapEndpoint: "https://life-dashboard-m3c251hcl-iek-bits-projects.vercel.app/api/google/bootstrap",
    logoutEndpoint: "https://life-dashboard-m3c251hcl-iek-bits-projects.vercel.app/api/auth/logout",
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
