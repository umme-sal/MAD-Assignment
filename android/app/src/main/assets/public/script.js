// ============================================================
// 1. HELPER FUNCTIONS & LOCAL STORAGE
// ============================================================

const $ = (id) => document.getElementById(id);

const store = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
};

const load = (key, defaultValue) => {
    return JSON.parse(localStorage.getItem(key)) ?? defaultValue;
};


// ============================================================
// 2. APPLICATION DATA
// ============================================================

let tasks = load("studyflow_tasks", []);
let events = load("studyflow_events", []);
let goals = load("studyflow_goals", []);
let focusMinutes = load("studyflow_focus", 0);

let editingId = null;
let selectedDate = new Date();
let calendarDate = new Date();

let timerSeconds = 25 * 60;
let timerInterval = null;
let timerRunning = false;


// ============================================================
// 3. CATEGORIES & PRIORITY
// ============================================================

const cats = {
    study: "Study",
    work: "Work",
    personal: "Personal",
    health: "Health"
};

const priorityValue = {
    high: 1,
    medium: 2,
    low: 3
};


// ============================================================
// 4. DATE & TEXT HELPER FUNCTIONS
// ============================================================

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}


function isOverdue(task) {
    return (
        !task.completed &&
        task.dueDate &&
        new Date(
            `${task.dueDate}T${task.dueTime || "23:59"}`
        ) < new Date()
    );
}


function formatDate(date) {
    return new Date(
        date + "T00:00"
    ).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}


function esc(text = "") {
    const div = document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}


// ============================================================
// 5. PAGE NAVIGATION
// ============================================================

function navigate(page) {

    // Hide all pages
    document
        .querySelectorAll(".page")
        .forEach((p) => {
            p.classList.remove("active-page");
        });

    // Show selected page
    $(page).classList.add("active-page");

    // Update navigation buttons
    document
        .querySelectorAll(".nav-item, .bottom-nav button")
        .forEach((button) => {
            button.classList.toggle(
                "active",
                button.dataset.page === page
            );
        });

    // Update page title
    $("pageTitle").textContent =
        page[0].toUpperCase() + page.slice(1);

    // Render required content
    if (page === "dashboard") {
        renderDashboard();
    }

    if (page === "tasks") {
        renderTasks();
    }

    if (page === "planner") {
        renderCalendar();
    }

    if (page === "focus") {
        renderFocusTasks();
    }

    if (page === "analytics") {
        renderAnalytics();
    }

    if (page === "goals") {
        renderGoals();
    }
}


// Navigation buttons
document
    .querySelectorAll("[data-page]")
    .forEach((button) => {
        button.addEventListener(
            "click",
            () => navigate(button.dataset.page)
        );
    });


document
    .querySelectorAll("[data-page-link]")
    .forEach((button) => {
        button.addEventListener(
            "click",
            () => navigate(button.dataset.pageLink)
        );
    });


// ============================================================
// 6. TASK MODAL
// ============================================================

function openTask(id = null) {

    editingId = id;

    $("modalTitle").textContent =
        id ? "Edit Task" : "New Task";

    $("taskForm").reset();

    // Editing an existing task
    if (id) {

        const task = tasks.find(
            (item) => item.id === id
        );

        $("titleInput").value = task.title;

        $("descInput").value =
            task.description || "";

        $("categoryInput").value =
            task.category || "study";

        $("priorityInput").value =
            task.priority || "medium";

        $("dateInput").value =
            task.dueDate || "";

        $("timeInput").value =
            task.dueTime || "";

        $("importantInput").checked =
            !!task.important;
    }

    $("taskModal").classList.add("show");

    $("titleInput").focus();
}


// Close modal
function closeModal(id) {
    $(id).classList.remove("show");
}


// Task modal buttons
$("quickAdd").onclick = () => openTask();

$("addTask2").onclick = () => openTask();

$("closeTask").onclick = () =>
    closeModal("taskModal");

$("cancelTask").onclick = () =>
    closeModal("taskModal");


// Close modal when clicking outside
$("taskModal").onclick = (event) => {

    if (event.target.id === "taskModal") {
        closeModal("taskModal");
    }
};


// ============================================================
// 7. ADD / EDIT TASK
// ============================================================

$("taskForm").onsubmit = (event) => {

    event.preventDefault();

    const data = {
        title: $("titleInput").value.trim(),

        description:
            $("descInput").value.trim(),

        category:
            $("categoryInput").value,

        priority:
            $("priorityInput").value,

        dueDate:
            $("dateInput").value,

        dueTime:
            $("timeInput").value,

        important:
            $("importantInput").checked
    };


    // Edit existing task
    if (editingId) {

        const task = tasks.find(
            (item) => item.id === editingId
        );

        Object.assign(task, data);

    }

    // Create new task
    else {

        tasks.push({
            id: Date.now(),
            ...data,
            completed: false,
            createdAt: new Date().toISOString()
        });
    }


    // Save tasks
    store("studyflow_tasks", tasks);

    // Close modal
    closeModal("taskModal");

    // Refresh application
    renderAll();
};


// ============================================================
// 8. RENDER TASKS
// ============================================================

function renderTasks() {

    const query =
        $("search").value.toLowerCase();

    const filter =
        $("taskFilter").value;

    const sort =
        $("taskSort").value;


    // Filter tasks
    let filteredTasks = tasks.filter((task) => {

        // Search
        if (
            query &&
            !(
                `${task.title} ${task.description || ""}`
            )
                .toLowerCase()
                .includes(query)
        ) {
            return false;
        }


        // Status filters
        if (
            filter === "pending" &&
            task.completed
        ) {
            return false;
        }

        if (
            filter === "completed" &&
            !task.completed
        ) {
            return false;
        }


        // Priority filter
        if (
            filter === "high" &&
            task.priority !== "high"
        ) {
            return false;
        }


        // Overdue filter
        if (
            filter === "overdue" &&
            !isOverdue(task)
        ) {
            return false;
        }

        return true;
    });


    // ========================================================
    // SORT TASKS
    // ========================================================

    if (sort === "due") {

        filteredTasks.sort(
            (a, b) =>
                (a.dueDate || "9999")
                    .localeCompare(
                        b.dueDate || "9999"
                    )
        );

    }

    else if (sort === "priority") {

        filteredTasks.sort(
            (a, b) =>
                priorityValue[a.priority] -
                priorityValue[b.priority]
        );

    }

    else if (sort === "az") {

        filteredTasks.sort(
            (a, b) =>
                a.title.localeCompare(b.title)
        );

    }

    else {

        // Recently added
        filteredTasks.sort(
            (a, b) => b.id - a.id
        );
    }


    // ========================================================
    // DISPLAY TASKS
    // ========================================================

    $("taskList").innerHTML =
        filteredTasks.length

            ? filteredTasks
                .map((task) => taskHTML(task))
                .join("")

            : `
                <div class="empty">
                    <div>📝</div>
                    <h3>No tasks found</h3>
                    <p>Add a task or change your filter.</p>
                </div>
            `;


    // ========================================================
    // TASK EVENT LISTENERS
    // ========================================================

    document
        .querySelectorAll(".toggle-task")
        .forEach((element) => {

            element.onchange = () =>
                toggleTask(
                    +element.dataset.id
                );
        });


    document
        .querySelectorAll(".edit-task")
        .forEach((element) => {

            element.onclick = () =>
                openTask(
                    +element.dataset.id
                );
        });


    document
        .querySelectorAll(".delete-task")
        .forEach((element) => {

            element.onclick = () =>
                deleteTask(
                    +element.dataset.id
                );
        });
}


// ============================================================
// 9. TASK HTML
// ============================================================

function taskHTML(task) {

    let status = "";


    if (task.completed) {

        status =
            `<span class="badge done">
                Completed
            </span>`;

    }

    else if (isOverdue(task)) {

        status =
            `<span class="badge overdue">
                Overdue
            </span>`;

    }

    else if (task.dueDate) {

        status =
            `<span class="badge">
                📅 ${formatDate(task.dueDate)}
            </span>`;
    }


    return `
        <article class="task">

            <label class="check">

                <input
                    class="toggle-task"
                    data-id="${task.id}"
                    type="checkbox"
                    ${task.completed ? "checked" : ""}
                >

                <i></i>

            </label>


            <div class="task-body">

                <div class="task-title">

                    ${esc(task.title)}

                    ${
                        task.important
                            ? "<b class='star'>★</b>"
                            : ""
                    }

                </div>


                <p>
                    ${esc(
                        task.description ||
                        "No description"
                    )}
                </p>


                <div class="badges">

                    <span class="badge">
                        ${cats[task.category] || "📌 General"}
                    </span>

                    <span class="badge ${task.priority}">
                        ${task.priority}
                    </span>

                    ${status}

                </div>

            </div>


            <div class="task-actions">

                <button
                    class="edit-task"
                    data-id="${task.id}"
                >
                    ✏️
                </button>

                <button
                    class="delete-task"
                    data-id="${task.id}"
                >
                    🗑️
                </button>

            </div>

        </article>
    `;
}


// ============================================================
// 10. COMPLETE / DELETE TASK
// ============================================================

function toggleTask(id) {

    const task = tasks.find(
        (item) => item.id === id
    );

    task.completed = !task.completed;

    store("studyflow_tasks", tasks);

    renderAll();
}


function deleteTask(id) {

    if (
        confirm("Delete this task?")
    ) {

        tasks = tasks.filter(
            (task) => task.id !== id
        );

        store("studyflow_tasks", tasks);

        renderAll();
    }
}


// Search / Filter / Sort
$("search").oninput = renderTasks;

$("taskFilter").onchange = renderTasks;

$("taskSort").onchange = renderTasks;


// ============================================================
// 11. DASHBOARD
// ============================================================

function renderDashboard() {

    const total = tasks.length;

    const completed =
        tasks.filter(
            (task) => task.completed
        ).length;

    const pending =
        total - completed;

    const percentage =
        total
            ? Math.round(
                completed / total * 100
            )
            : 0;


    // Statistics
    $("totalStat").textContent =
        total;

    $("pendingStat").textContent =
        pending;

    $("completedStat").textContent =
        completed;


    // Focus time
    $("studyStat").textContent =
        focusMinutes >= 60

            ? `${Math.floor(focusMinutes / 60)}h ${focusMinutes % 60}m`

            : `${focusMinutes}m`;


    // Completion percentage
    $("heroPercent").textContent =
        percentage + "%";


    // Today's tasks
    $("todayTasks").innerHTML =

        tasks
            .filter(
                (task) => !task.completed
            )
            .slice(0, 5)
            .map(
                (task) => `
                    <div class="mini-task">

                        <span>
                            ${cats[task.category] || "📌"}
                        </span>

                        <b>
                            ${esc(task.title)}
                        </b>

                        <small>
                            ${
                                task.dueDate
                                    ? formatDate(task.dueDate)
                                    : "No deadline"
                            }
                        </small>

                    </div>
                `
            )
            .join("")

        ||

        `
            <div class="empty small">
                🎉 All clear! Add a new task.
            </div>
        `;
}


// ============================================================
// 12. RENDER EVERYTHING
// ============================================================

function renderAll() {

    renderDashboard();

    renderTasks();

    renderCalendar();

    renderFocusTasks();

    renderAnalytics();

    renderGoals();
}


// ============================================================
// 13. CALENDAR / STUDY PLANNER
// ============================================================

function renderCalendar() {

    $("monthTitle").textContent =
        calendarDate.toLocaleDateString(
            undefined,
            {
                month: "long",
                year: "numeric"
            }
        );


    const year =
        calendarDate.getFullYear();

    const month =
        calendarDate.getMonth();

    const firstDay =
        new Date(
            year,
            month,
            1
        ).getDay();

    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();


    let html = `

        <div class="week">

            ${
                [
                    "Sun",
                    "Mon",
                    "Tue",
                    "Wed",
                    "Thu",
                    "Fri",
                    "Sat"
                ]
                    .map(
                        (day) =>
                            `<b>${day}</b>`
                    )
                    .join("")
            }

        </div>

        <div class="days">
    `;


    // Empty spaces before first day
    for (
        let i = 0;
        i < firstDay;
        i++
    ) {

        html += "<span></span>";
    }


    // Calendar days
    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const iso =
            `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        const selected =
            iso ===
            selectedDate
                .toISOString()
                .slice(0, 10);

        const hasEvent =
            events.some(
                (event) =>
                    event.date === iso
            )
            ||
            tasks.some(
                (task) =>
                    task.dueDate === iso
            );


        html += `
            <button
                class="${selected ? "selected" : ""} ${hasEvent ? "has-event" : ""}"
                data-date="${iso}"
            >
                ${day}
            </button>
        `;
    }


    html += `
        </div>
    `;


    $("calendar").innerHTML = html;


    // Calendar date selection
    document
        .querySelectorAll(".days button")
        .forEach((button) => {

            button.onclick = () => {

                selectedDate =
                    new Date(
                        button.dataset.date +
                        "T00:00"
                    );

                renderCalendar();
            };
        });


    // Selected date label
    $("selectedDateLabel").textContent =
        selectedDate.toLocaleDateString(
            undefined,
            {
                weekday: "long",
                day: "numeric",
                month: "long"
            }
        );


    // Schedule
    const iso =
        selectedDate
            .toISOString()
            .slice(0, 10);

    const items =
        events.filter(
            (event) =>
                event.date === iso
        );


    $("scheduleList").innerHTML =

        items.length

            ? items
                .map(
                    (event) => `
                        <div class="schedule">

                            <b>
                                ${esc(event.time)}
                                ·
                                ${esc(event.title)}
                            </b>

                            <span>
                                ${esc(event.duration)}
                            </span>

                        </div>
                    `
                )
                .join("")

            : `
                <div class="empty small">
                    No scheduled sessions.
                </div>
            `;
}


// Previous month
$("prevMonth").onclick = () => {

    calendarDate.setMonth(
        calendarDate.getMonth() - 1
    );

    renderCalendar();
};


// Next month
$("nextMonth").onclick = () => {

    calendarDate.setMonth(
        calendarDate.getMonth() + 1
    );

    renderCalendar();
};


// ============================================================
// 14. ADD STUDY EVENT
// ============================================================

function openEvent() {

    $("eventDate").value =
        selectedDate
            .toISOString()
            .slice(0, 10);

    $("eventTime").value =
        "10:00";

    $("eventModal")
        .classList
        .add("show");
}


$("addEventBtn").onclick =
    openEvent;


$("closeEvent").onclick =
    () => closeModal("eventModal");


$("cancelEvent").onclick =
    () => closeModal("eventModal");


// Save event
$("eventForm").onsubmit =
    (event) => {

        event.preventDefault();

        events.push({

            id: Date.now(),

            title:
                $("eventTitle").value,

            date:
                $("eventDate").value,

            time:
                $("eventTime").value,

            duration:
                $("eventDuration").value
        });


        store(
            "studyflow_events",
            events
        );

        closeModal("eventModal");

        renderCalendar();
    };


// ============================================================
// 15. FOCUS / POMODORO TASKS
// ============================================================

function renderFocusTasks() {

    $("focusTasks").innerHTML =

        tasks
            .filter(
                (task) => !task.completed
            )
            .slice(0, 8)
            .map(
                (task) => `
                    <button
                        class="focus-task"
                        data-title="${esc(task.title)}"
                    >

                        ${
                            task.important
                                ? "⭐ "
                                : ""
                        }

                        ${esc(task.title)}

                        <small>
                            ${task.priority}
                        </small>

                    </button>
                `
            )
            .join("")

        ||

        `
            <div class="empty small">
                No pending tasks.
            </div>
        `;


    // Select focus task
    document
        .querySelectorAll(".focus-task")
        .forEach((button) => {

            button.onclick = () => {

                document
                    .querySelectorAll(".focus-task")
                    .forEach(
                        (item) =>
                            item.classList.remove(
                                "chosen"
                            )
                    );

                button.classList.add(
                    "chosen"
                );
            };
        });
}


// ============================================================
// 16. POMODORO TIMER
// ============================================================

function setTimer(minutes) {

    stopTimer();

    timerSeconds =
        minutes * 60;

    drawTimer();
}


function drawTimer() {

    const minutes =
        String(
            Math.floor(
                timerSeconds / 60
            )
        ).padStart(2, "0");

    const seconds =
        String(
            timerSeconds % 60
        ).padStart(2, "0");


    const time =
        `${minutes}:${seconds}`;


    $("bigTimer").textContent =
        time;

    $("dashTimer").textContent =
        time;
}


function startTimer() {

    // Pause
    if (timerRunning) {

        stopTimer();

        return;
    }


    // Start
    timerRunning = true;

    $("startTimer").textContent =
        "⏸ Pause";

    $("dashFocusBtn").textContent =
        "⏸ Pause";


    timerInterval =
        setInterval(() => {

            timerSeconds--;

            drawTimer();


            // Timer completed
            if (timerSeconds <= 0) {

                stopTimer();

                focusMinutes += 25;

                store(
                    "studyflow_focus",
                    focusMinutes
                );

                alert(
                    "Focus session complete! 🎉"
                );

                renderAll();
            }

        }, 1000);
}


function stopTimer() {

    clearInterval(
        timerInterval
    );

    timerInterval = null;

    timerRunning = false;

    $("startTimer").textContent =
        "▶ Start";

    $("dashFocusBtn").textContent =
        "Start Focus";
}


// Timer buttons
$("startTimer").onclick =
    startTimer;


$("resetTimer").onclick =
    () => setTimer(25);


$("dashFocusBtn").onclick =
    () => navigate("focus");


// Preset timer buttons
document
    .querySelectorAll(
        ".focus-presets button"
    )
    .forEach((button) => {

        button.onclick =
            () =>
                setTimer(
                    +button.dataset.min
                );
    });


// ============================================================
// 17. PRODUCTIVITY ANALYTICS
// ============================================================

function renderAnalytics() {

    const total =
        tasks.length;

    const completed =
        tasks.filter(
            (task) => task.completed
        ).length;

    const percentage =
        total
            ? Math.round(
                completed / total * 100
            )
            : 0;


    // Donut chart
    $("donut").style.background =
        `
            conic-gradient(
                #4f46e5
                ${percentage * 3.6}deg,
                var(--border) 0
            )
        `;


    $("donutText").textContent =
        percentage + "%";


    $("analyticsSummary").textContent =
        `${completed} of ${total} tasks completed`;


    // Performance statistics
    $("perfComplete").textContent =
        percentage + "%";

    $("perfPending").textContent =
        total - completed;

    $("perfFocus").textContent =

        focusMinutes >= 60

            ? `${Math.floor(focusMinutes / 60)}h ${focusMinutes % 60}m`

            : `${focusMinutes}m`;


    // Goal progress
    const goalPercentage =

        goals.length

            ? Math.round(
                goals.reduce(
                    (totalProgress, goal) =>
                        totalProgress +
                        Math.min(
                            100,
                            goal.progress /
                            goal.target *
                            100
                        ),
                    0
                ) / goals.length
            )

            : 0;


    $("perfGoals").textContent =
        goalPercentage + "%";


    // ========================================================
    // WEEKLY COMPLETION DATA
    // ========================================================

    const days = [
        "Sun",
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat"
    ];

    const today =
        new Date();

    const weeklyData = [];


    for (
        let i = 6;
        i >= 0;
        i--
    ) {

        const date =
            new Date(today);

        date.setDate(
            today.getDate() - i
        );


        const iso =
            date
                .toISOString()
                .slice(0, 10);


        const count =
            tasks.filter(
                (task) =>
                    task.completed &&
                    task.createdAt?.slice(0, 10) === iso
            ).length;


        weeklyData.push({

            day:
                days[date.getDay()],

            count:
                count
        });
    }


    // Maximum completed tasks
    const max =
        Math.max(
            1,
            ...weeklyData.map(
                (item) =>
                    item.count
            )
        );


    // Display weekly chart
    $("weeklyBars").innerHTML =

        weeklyData
            .map(
                (item) => `
                    <div class="bar-row">

                        <span>
                            ${item.day}
                        </span>

                        <div>
                            <i
                                style="
                                    width:
                                    ${item.count / max * 100}%
                                "
                            ></i>
                        </div>

                        <b>
                            ${item.count}
                        </b>

                    </div>
                `
            )
            .join("");
}


// ============================================================
// 18. GOALS
// ============================================================

function renderGoals() {

    $("goalList").innerHTML =

        goals.length

            ? goals
                .map((goal) => {

                    const percentage =
                        Math.min(
                            100,
                            Math.round(
                                goal.progress /
                                goal.target *
                                100
                            )
                        );


                    return `
                        <div class="goal panel">

                            <div class="goal-top">

                                <span>
                                    🎯
                                </span>

                                <button
                                    class="delete-goal"
                                    data-id="${goal.id}"
                                >
                                    🗑️
                                </button>

                            </div>


                            <h3>
                                ${esc(goal.title)}
                            </h3>


                            <p>
                                ${goal.progress}
                                /
                                ${goal.target}
                                completed
                            </p>


                            <div class="goal-progress">

                                <i
                                    style="
                                        width:
                                        ${percentage}%
                                    "
                                ></i>

                            </div>


                            <b>
                                ${percentage}%
                            </b>


                            <div>

                                <button
                                    class="goal-add"
                                    data-id="${goal.id}"
                                >
                                    + Progress
                                </button>

                            </div>

                        </div>
                    `;
                })
                .join("")

            : `
                <div class="empty">

                    <div>
                        🏆
                    </div>

                    <h3>
                        No goals yet
                    </h3>

                    <p>
                        Create your first goal.
                    </p>

                </div>
            `;


    // Add progress
    document
        .querySelectorAll(".goal-add")
        .forEach((button) => {

            button.onclick = () => {

                const goal =
                    goals.find(
                        (item) =>
                            item.id ===
                            +button.dataset.id
                    );


                goal.progress =
                    Math.min(
                        goal.target,
                        goal.progress + 1
                    );


                store(
                    "studyflow_goals",
                    goals
                );


                renderGoals();

                renderAnalytics();
            };
        });


    // Delete goal
    document
        .querySelectorAll(".delete-goal")
        .forEach((button) => {

            button.onclick = () => {

                goals =
                    goals.filter(
                        (goal) =>
                            goal.id !==
                            +button.dataset.id
                    );


                store(
                    "studyflow_goals",
                    goals
                );


                renderAll();
            };
        });
}


// ============================================================
// 19. ADD GOAL
// ============================================================

$("addGoalBtn").onclick = () => {

    $("goalForm").reset();

    $("goalModal")
        .classList
        .add("show");
};


$("closeGoal").onclick =
    () => closeModal("goalModal");


$("cancelGoal").onclick =
    () => closeModal("goalModal");


// Save goal
$("goalForm").onsubmit =
    (event) => {

        event.preventDefault();


        goals.push({

            id: Date.now(),

            title:
                $("goalTitle").value,

            target:
                +$("goalTarget").value,

            progress:
                +$("goalProgress").value
        });


        store(
            "studyflow_goals",
            goals
        );


        closeModal("goalModal");

        renderAll();
    };


// ============================================================
// 20. DARK MODE
// ============================================================

$("themeBtn").onclick = () => {

    document.body.classList.toggle(
        "dark"
    );


    localStorage.setItem(
        "studyflow_theme",
        document.body.classList.contains("dark")
            ? "dark"
            : "light"
    );
};


// Restore saved theme
if (
    localStorage.getItem(
        "studyflow_theme"
    ) === "dark"
) {

    document.body.classList.add(
        "dark"
    );
}


// ============================================================
// 21. DATE & GREETING
// ============================================================

$("dateText").textContent =
    new Date().toLocaleDateString(
        undefined,
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );


const currentHour =
    new Date().getHours();


$("greeting").textContent =

    currentHour < 12

        ? "Good morning 👋"

        : currentHour < 18

            ? "Good afternoon 👋"

            : "Good evening 👋";


// ============================================================
// 22. INITIALIZE APPLICATION
// ============================================================

renderAll();