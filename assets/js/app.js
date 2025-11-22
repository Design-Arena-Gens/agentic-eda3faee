(() => {
  const db = firebase.database();
  const analyticsRef = db.ref("analytics/landing");

  const heroStudiesCount = document.getElementById("heroStudiesCount");
  const heroPendingCount = document.getElementById("heroPendingCount");
  const heroComplianceStatus = document.getElementById("heroComplianceStatus");
  const footerYear = document.getElementById("footerYear");

  const fallbackSnapshot = {
    activeStudies: 12,
    pendingApprovals: 4,
    complianceStatus: "All labs compliant",
  };

  const applyLandingMetrics = (metrics) => {
    heroStudiesCount.textContent = metrics.activeStudies ?? 0;
    heroPendingCount.textContent = metrics.pendingApprovals ?? 0;
    heroComplianceStatus.textContent =
      metrics.complianceStatus ?? "Status unavailable";
  };

  analyticsRef.on(
    "value",
    (snapshot) => {
      const metrics = snapshot.val();
      if (metrics) {
        applyLandingMetrics(metrics);
      } else {
        applyLandingMetrics(fallbackSnapshot);
      }
    },
    () => {
      applyLandingMetrics(fallbackSnapshot);
    }
  );

  footerYear.textContent = new Date().getFullYear();
})();
