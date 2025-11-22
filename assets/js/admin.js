(() => {
  const auth = firebase.auth();
  const db = firebase.database();

  const metricsRef = db.ref("admin/metrics");
  const studiesRef = db.ref("studies");
  const activityRef = db.ref("activity/admin").limitToLast(25);
  const notificationsRef = db.ref("notifications/admin").limitToLast(10);
  const complianceRef = db.ref("compliance");

  const adminActiveStudies = document.getElementById("adminActiveStudies");
  const adminPendingApprovals = document.getElementById("adminPendingApprovals");
  const adminIncidents = document.getElementById("adminIncidents");
  const adminComplianceScore = document.getElementById("adminComplianceScore");
  const adminUserEmail = document.getElementById("adminUserEmail");
  const adminActivityFeed = document.getElementById("adminActivityFeed");
  const adminNotificationStream = document.getElementById(
    "adminNotificationStream"
  );
  const studyTableBody = document.getElementById("studyTableBody");
  const studySearchInput = document.getElementById("studySearchInput");
  const downloadAuditBtn = document.getElementById("downloadAuditBtn");
  const adminSignOutBtn = document.getElementById("adminSignOutBtn");

  const createStudyForm = document.getElementById("createStudyForm");
  const inviteUserForm = document.getElementById("inviteUserForm");
  const incidentForm = document.getElementById("incidentForm");
  const adminLoginForm = document.getElementById("adminLoginForm");
  const adminRegisterForm = document.getElementById("adminRegisterForm");

  const defaultMetrics = {
    activeStudies: 7,
    pendingApprovals: 3,
    incidents: 1,
    complianceScore: "98%",
  };

  metricsRef.on(
    "value",
    (snapshot) => {
      const metrics = snapshot.val() ?? defaultMetrics;
      adminActiveStudies.textContent = metrics.activeStudies ?? 0;
      adminPendingApprovals.textContent = metrics.pendingApprovals ?? 0;
      adminIncidents.textContent = metrics.incidents ?? 0;
      adminComplianceScore.textContent = metrics.complianceScore ?? "N/A";
    },
    () => {
      adminActiveStudies.textContent = defaultMetrics.activeStudies;
      adminPendingApprovals.textContent = defaultMetrics.pendingApprovals;
      adminIncidents.textContent = defaultMetrics.incidents;
      adminComplianceScore.textContent = defaultMetrics.complianceScore;
    }
  );

  const renderStudyRow = (key, study) => {
    const statusMap = {
      onTrack: { label: "On track", className: "bg-success" },
      action: { label: "Action needed", className: "bg-warning text-dark" },
      paused: { label: "Paused", className: "bg-danger" },
      completed: { label: "Completed", className: "bg-success" },
    };

    const phase = study.phase ?? "N/A";
    const statusKey = study.status ?? "onTrack";
    const statusConfig = statusMap[statusKey] ?? statusMap.onTrack;

    return `
      <tr data-key="${key}" data-search="${(
        (study.title ?? "") + " " + (study.principalInvestigator ?? "")
      )
        .toLowerCase()
        .trim()}">
        <td>
          <span class="fw-semibold text-dark">${study.title ?? "Untitled Study"}</span>
          <div class="small text-muted">${study.subtitle ?? "Realtime synced record"}</div>
        </td>
        <td>${study.principalInvestigator ?? "Unassigned"}</td>
        <td>${phase}</td>
        <td><span class="badge bg-info text-dark">${study.participantCount ?? 0}</span></td>
        <td><span class="badge ${statusConfig.className}">${statusConfig.label}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary" data-study="${key}">
            View
          </button>
        </td>
      </tr>
    `;
  };

  const applyStudyFilter = () => {
    const query = studySearchInput.value.trim().toLowerCase();
    studyTableBody.querySelectorAll("tr").forEach((row) => {
      if (!query) {
        row.classList.remove("d-none");
        return;
      }
      const haystack = row.dataset.search ?? "";
      row.classList.toggle("d-none", !haystack.includes(query));
    });
  };

  studiesRef.on(
    "value",
    (snapshot) => {
      const studies = snapshot.val();
      if (!studies) return;
      const rows = Object.entries(studies)
        .map(([key, value]) => renderStudyRow(key, value))
        .join("");
      studyTableBody.innerHTML = rows;
      applyStudyFilter();
    },
    () => {
      /* fallback uses seeded HTML rows */
    }
  );

  studySearchInput?.addEventListener("input", applyStudyFilter);

  activityRef.on(
    "value",
    (snapshot) => {
      const activities = snapshot.val();
      if (!activities) return;
      const items = Object.values(activities)
        .reverse()
        .map(
          (item) => `
            <li class="activity-item border-bottom pb-3 mb-3">
              <div class="d-flex justify-content-between">
                <div>
                  <strong class="text-dark">${item.actor ?? "Team Member"}</strong>
                  <div class="text-muted small">${item.summary ?? ""}</div>
                </div>
                <span class="badge bg-info text-dark align-self-start">${item.relativeTime ?? "Just now"}</span>
              </div>
            </li>
          `
        )
        .join("");
      adminActivityFeed.innerHTML = items;
    },
    () => {
      /* fallback retains seeded items */
    }
  );

  notificationsRef.on(
    "value",
    (snapshot) => {
      const notifications = snapshot.val();
      if (!notifications) return;
      const alerts = Object.values(notifications)
        .reverse()
        .map((notification) => {
          const badgeClass = notification.variant ?? "info";
          const actionLabel = notification.actionLabel ?? "Open";
          return `
            <div class="alert alert-${badgeClass} d-flex justify-content-between align-items-center">
              <div>
                <strong>${notification.title ?? "Notification"}</strong> ${notification.details ?? ""}
              </div>
              <button class="btn btn-sm btn-outline-primary">${actionLabel}</button>
            </div>
          `;
        })
        .join("");
      adminNotificationStream.innerHTML = alerts;
    },
    () => {
      /* fallback retains seeded alerts */
    }
  );

  complianceRef.child("logs").limitToLast(50);

  downloadAuditBtn?.addEventListener("click", () => {
    const now = new Date().toISOString();
    const blob = new Blob(
      [
        `NeuroNexus Compliance Export\nGenerated: ${now}\nSource: Firebase /compliance/logs\n\nReplace with live export logic.`,
      ],
      { type: "text/plain;charset=utf-8" }
    );
    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `neuronexus-compliance-${now}.txt`;
    downloadLink.click();
    URL.revokeObjectURL(downloadLink.href);
  });

  const handleAuthStateChange = (user) => {
    if (user) {
      adminUserEmail.textContent = user.email ?? "admin@nex.us";
    } else {
      adminUserEmail.textContent = "Not signed in";
      const authModal = new bootstrap.Modal(
        document.getElementById("authModal")
      );
      authModal.show();
    }
  };

  auth.onAuthStateChanged(handleAuthStateChange);

  adminLoginForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = event.target.adminLoginEmail.value;
    const password = event.target.adminLoginPassword.value;
    auth
      .signInWithEmailAndPassword(email, password)
      .then(() => bootstrap.Modal.getInstance(document.getElementById("authModal"))?.hide())
      .catch((error) => {
        alert(`Login failed: ${error.message}`);
      });
  });

  adminRegisterForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = event.target.adminRegisterEmail.value;
    const password = event.target.adminRegisterPassword.value;
    auth
      .createUserWithEmailAndPassword(email, password)
      .then(() => bootstrap.Modal.getInstance(document.getElementById("authModal"))?.hide())
      .catch((error) => {
        alert(`Registration failed: ${error.message}`);
      });
  });

  adminSignOutBtn?.addEventListener("click", () => {
    auth.signOut();
  });

  createStudyForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const payload = Object.fromEntries(formData.entries());
    const assignments = [];
    [
      { value: "east-wing", selector: "#assignEastWing" },
      { value: "central-neuro", selector: "#assignCentralNeuro" },
      { value: "north-lab", selector: "#assignNorthLab" },
    ].forEach(({ value, selector }) => {
      if (event.target.querySelector(selector)?.checked) {
        assignments.push(value);
      }
    });
    payload.assignments = assignments;
    payload.participantCount = Number(payload.studyInitialParticipants || 0);
    studiesRef.push(payload).then(() => event.target.reset());
  });

  inviteUserForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const invite = Object.fromEntries(formData.entries());
    db.ref("invites").push({
      ...invite,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
    });
    event.target.reset();
    bootstrap.Modal.getInstance(document.getElementById("inviteModal"))?.hide();
  });

  incidentForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const incident = Object.fromEntries(formData.entries());
    incident.severity =
      event.target.querySelector("input[name='incidentSeverity']:checked")?.value ??
      "low";
    db.ref("incidents").push({
      ...incident,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
    });
    event.target.reset();
    bootstrap.Modal.getInstance(document.getElementById("incidentModal"))?.hide();
  });
})();
