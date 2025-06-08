const authConfig = {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL || `https://spotted-wildcat-961.convex.cloud`,
      applicationID: "convex",
    },
  ]
};
export default authConfig;