(() => {
  const auth = firebase.auth();
  const db = firebase.database();

  const labScope = "labs/defaultLab";
  const metricsRef = db.ref(`${labScope}/metrics`);
  const assignmentsRef = db.ref(`${labScope}/studies`);
  const alertsRef = db.ref("alerts").limitToLast(10);
  const equipmentRef = db.ref(`${labScope}/equipment`);
  const observationsRef = db.ref(`${labScope}/observations`).limitToLast(20);
  const messagesRef = db.ref(`${labScope}/messages`).limitToLast(50);
  const baseObservationsRef = db.ref(`${labScope}/observations`);
  const baseMessagesRef = db.ref(`${labScope}/messages`);

  const labTaskCount = document.getElementById("labTaskCount");
  const labSamplesDue = document.getElementById("labSamplesDue");
  const labAlerts = document.getElementById("labAlerts");
  const labAssignmentsTable = document.getElementById("labAssignmentsTable");
  const equipmentStatusList = document.getElementById("equipmentStatusList");
  const labObservationTimeline = document.getElementById("labObservationTimeline");
  const labChatThread = document.getElementById("labChatThread");
  const labUserEmail = document.getElementById("labUserEmail");
  const assignmentFilter = document.getElementById("assignmentFilter");
  const labSignOutBtn = document.getElementById("labSignOutBtn");

  const dataCaptureForm = document.getElementById("dataCaptureForm");
  const labMessageForm = document.getElementById("labMessageForm");
  const observationForm = document.getElementById("observationForm");
  const newMessageForm = document.getElementById("newMessageForm");
  const labLoginForm = document.getElementById("labLoginForm");
  const labRegisterForm = document.getElementById("labRegisterForm");

  const renderAssignments = (assignments) => {
    if (!assignments) return;
    const filter = assignmentFilter.value;
    const rows = Object.entries(assignments)
      .filter(([, assignment]) => {
        if (filter === "all") return true;
        return assignment.status === filter;
      })
      .map(([key, assignment]) => {
        const statusClassMap = {
          active: "bg-success",
          paused: "bg-danger",
          completed: "bg-primary",
          action: "bg-warning text-dark",
        };
        const statusKey = assignment.status ?? "active";
        const badgeClass = statusClassMap[statusKey] ?? "bg-info text-dark";
        const statusLabel =
          assignment.statusLabel ?? statusKey.replace(/^\w/, (c) => c.toUpperCase());
        return `
          <tr data-key="${key}">
            <td>
              <span class="fw-semibold text-dark">${assignment.study ?? "Study"}</span>
              <div class="small text-muted">${assignment.subtitle ?? ""}</div>
            </td>
            <td>${assignment.role ?? "Contributor"}</td>
            <td>${assignment.nextMilestone ?? "TBD"}</td>
            <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-primary">${assignment.cta ?? "Open"}</button>
            </td>
          </tr>
        `;
      })
      .join("");
    labAssignmentsTable.innerHTML = rows || labAssignmentsTable.innerHTML;
  };

  const renderEquipment = (equipment) => {
    if (!equipment) return;
    const items = Object.values(equipment)
      .map((item) => {
        const badgeClass =
          item.status === "alert"
            ? "bg-danger"
            : item.status === "due"
            ? "bg-warning text-dark"
            : "bg-success";
        const label = item.statusLabel ?? item.status ?? "Status";
        return `
          <div class="list-group-item px-0">
            <div class="d-flex justify-content-between">
              <div>
                <strong class="text-dark">${item.name ?? "Equipment"}</strong>
                <div class="text-muted small">${item.description ?? ""}</div>
              </div>
              <span class="badge ${badgeClass}">${label}</span>
            </div>
          </div>
        `;
      })
      .join("");
    equipmentStatusList.innerHTML = items || equipmentStatusList.innerHTML;
  };

  const renderTimeline = (entries) => {
    if (!entries) return;
    const nodes = Object.values(entries)
      .reverse()
      .map((entry) => {
        const badgeClass = entry.variant ?? "bg-primary";
        return `
          <div class="timeline-item">
            <div class="timeline-badge ${badgeClass}"></div>
            <div class="timeline-content">
              <strong class="text-dark">${entry.title ?? "Observation"}</strong>
              <div class="small text-muted">${entry.description ?? ""}</div>
              <span class="badge bg-info text-dark">${entry.relativeTime ?? "Moments ago"}</span>
            </div>
          </div>
        `;
      })
      .join("");
    labObservationTimeline.innerHTML = nodes || labObservationTimeline.innerHTML;
  };

  const renderMessages = (messages) => {
    if (!messages) return;
    const items = Object.values(messages)
      .slice(-10)
      .reverse()
      .map((message) => {
        const badgeClass = message.variant ?? "bg-info text-dark";
        return `
          <div class="list-group-item px-0">
            <div class="d-flex justify-content-between">
              <div>
                <strong class="text-dark">${message.author ?? "Team Member"}</strong>
                <div class="text-muted small">${message.body ?? ""}</div>
              </div>
              <span class="badge ${badgeClass}">${message.relativeTime ?? "Now"}</span>
            </div>
          </div>
        `;
      })
      .join("");
    labChatThread.innerHTML = items || labChatThread.innerHTML;
  };

  metricsRef.on(
    "value",
    (snapshot) => {
      const metrics = snapshot.val() ?? {};
      labTaskCount.textContent = metrics.taskCount ?? "0";
      labSamplesDue.textContent = metrics.samplesDue ?? "0";
      labAlerts.textContent = metrics.alerts ?? "0";
    },
    () => {
      /* fallback retains static counts */
    }
  );

  assignmentsRef.on("value", (snapshot) => renderAssignments(snapshot.val()));
  equipmentRef.on("value", (snapshot) => renderEquipment(snapshot.val()));
  observationsRef.on("value", (snapshot) => renderTimeline(snapshot.val()));
  messagesRef.on("value", (snapshot) => renderMessages(snapshot.val()));

  alertsRef.on(
    "value",
    (snapshot) => {
      const alerts = snapshot.val();
      if (!alerts) return;
      const count = Object.keys(alerts).length;
      labAlerts.textContent = String(count);
    },
    () => {
      /* fallback retains seeded alert */
    }
  );

  assignmentFilter?.addEventListener("change", () => {
    assignmentsRef.once("value").then((snapshot) => renderAssignments(snapshot.val()));
  });

  dataCaptureForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const payload = Object.fromEntries(formData.entries());
    db.ref("dataCapture").push({
      ...payload,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
    });
    event.target.reset();
  });

  labMessageForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const messageBody = event.target.labMessageInput.value.trim();
    if (!messageBody) return;
    baseMessagesRef.push({
      author: auth.currentUser?.email ?? "Research Associate",
      body: messageBody,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
    });
    event.target.reset();
  });

  observationForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const observation = Object.fromEntries(formData.entries());
    baseObservationsRef.push({
      ...observation,
      author: auth.currentUser?.email ?? "Research Associate",
      createdAt: firebase.database.ServerValue.TIMESTAMP,
    });
    event.target.reset();
    bootstrap.Modal.getInstance(document.getElementById("logObservationModal"))?.hide();
  });

  newMessageForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const channel = formData.get("messageChannel");
    const body = formData.get("messageBody");
    if (!body) return;
    db.ref(`${labScope}/channels/${channel}`).push({
      author: auth.currentUser?.email ?? "Research Associate",
      body,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
    });
    event.target.reset();
    bootstrap.Modal.getInstance(document.getElementById("newMessageModal"))?.hide();
  });

  const handleLabAuthStateChange = (user) => {
    if (user) {
      labUserEmail.textContent = user.email ?? "associate@nex.us";
    } else {
      labUserEmail.textContent = "Not signed in";
      const modal = new bootstrap.Modal(document.getElementById("labAuthModal"));
      modal.show();
    }
  };

  auth.onAuthStateChanged(handleLabAuthStateChange);

  labLoginForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = event.target.labLoginEmail.value;
    const password = event.target.labLoginPassword.value;
    auth
      .signInWithEmailAndPassword(email, password)
      .then(() => bootstrap.Modal.getInstance(document.getElementById("labAuthModal"))?.hide())
      .catch((error) => alert(`Login failed: ${error.message}`));
  });

  labRegisterForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = event.target.labRegisterEmail.value;
    const password = event.target.labRegisterPassword.value;
    auth
      .createUserWithEmailAndPassword(email, password)
      .then(() => bootstrap.Modal.getInstance(document.getElementById("labAuthModal"))?.hide())
      .catch((error) => alert(`Registration failed: ${error.message}`));
  });

  labSignOutBtn?.addEventListener("click", () => {
    auth.signOut();
  });
})();
