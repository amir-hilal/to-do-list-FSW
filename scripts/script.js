document.addEventListener('DOMContentLoaded', () => {
  const taskForm = document.getElementById('task-form');
  const userForm = document.getElementById('user-form');

  const columns = {
      pending: document.getElementById('pending'),
      completed: document.getElementById('completed'),
      pastdue: document.getElementById('pastdue')
  };

  // Set the current date in the heading (current date)
  const currentDateElement = document.getElementById('current-date');
  const today = new Date();
  const formattedToday = today.toISOString().split('T')[0];
  currentDateElement.textContent = today.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // Ensure the user doesn't pick a date that is previous of the current date
  const dueDateInput = document.getElementById('dueDate');
  dueDateInput.setAttribute('min', formattedToday);

  taskForm.addEventListener('submit', addTask);
  userForm.addEventListener('submit', addUser);

  function addUser(event) {
    event.preventDefault();
    const userName = document.getElementById('username').value;
    if (isDuplicateUser(userName)) {
      alert('User already exists');
      return;
    }

    const user = { userName };
    saveUser(user);
    renderUsers();
    userForm.reset();
  }

  function addTask(event) {
    event.preventDefault();
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const dueDate = document.getElementById('dueDate').value;
    const dueTime = document.getElementById('dueTime').value;
    const assignedTo = document.getElementById('assignedTo').value;
    const createdAt = new Date().toISOString().split('T')[0];

    if (isDuplicateTask(title)) {
      alert('Task with this title already exists.');
      return;
    }

    const task = { title, description, createdAt, dueDate, dueTime, assignedTo,status: 'pending' };
    saveTask(task);
    renderTasks();
    taskForm.reset();
  }

  function isDuplicateTask(title) {
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    return tasks.some(task => task.title === title);
  }

  function isDuplicateUser(userName) {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    return users.some(user => user.userName === userName);
  }

  function saveTask(task) {
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    tasks.push(task);
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }

  function saveUser(user) {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    users.push(user);
    localStorage.setItem('users', JSON.stringify(users));
  }

  function deleteTask(taskId) {
    // Finding the task by the special ID that we gave for each task, and resetting the items in local storage without the found task
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    tasks = tasks.filter(t => `task-${t.createdAt}-${t.title}` !== taskId);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    renderTasks();
  }

  function renderUsers() {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const userListElement = document.getElementById('user-list');
    if (userListElement) {
      userListElement.innerHTML = ''; // Clear the existing list
      users.forEach(user => {
        const userItem = document.createElement('li');
        userItem.textContent = user.userName;
        userListElement.appendChild(userItem);
      });
    } else {
      console.error('User list element not found.');
    }

    const assignedToDropdown = document.getElementById('assignedTo');
    if (assignedToDropdown) {
        assignedToDropdown.innerHTML = '<option value="" disabled selected>Assign to user</option>';
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.userName;
            option.textContent = user.userName;
            assignedToDropdown.appendChild(option);
        });
    } else {
        console.error('Assigned to dropdown not found.');
    }
  }

  function renderTasks() {
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    console.log('Rendering tasks:', tasks);
    Object.keys(columns).forEach(column => {
      if (columns[column]) {
        columns[column].innerHTML = `<h2>${capitalizeFirstLetter(column)}</h2>`;
      } else {
        console.error(`Column ${column} is not defined`);
      }
    });

    const currentDate = new Date().toISOString().split('T')[0];

    // Sort tasks
    const sortedTasks = {
      pending: tasks.filter(task => task.status === 'pending' && task.dueDate >= currentDate).sort((a, b) => new Date(`${a.dueDate}T${a.dueTime}`) - new Date(`${b.dueDate}T${b.dueTime}`)),
      completed: tasks.filter(task => task.status === 'completed').sort((a, b) => new Date(`${b.dueDate}T${b.dueTime}`) - new Date(`${a.dueDate}T${a.dueTime}`)),
      pastdue: tasks.filter(task => task.dueDate < currentDate)
    };

    sortedTasks.pending.forEach(task => createTaskElement(task));
    sortedTasks.completed.forEach(task => createTaskElement(task));
    sortedTasks.pastdue.forEach(task => createTaskElement(task));
  }

  function createTaskElement(task) {
    const taskDiv = document.createElement('div');
    taskDiv.className = `task ${task.status}`;
    taskDiv.draggable = true;
    taskDiv.id = `task-${task.createdAt}-${task.title}`;
    taskDiv.ondragstart = drag;
    taskDiv.innerHTML = `
      <strong>${task.title}</strong>
      <p>${task.description}</p>
      <p>Created At: ${task.createdAt}</p>
      <p>Due Date: ${task.dueDate} ${task.dueTime}</p>
      <p>Assigned To: ${task.assignedTo}</p>
      <button onclick="deleteTask('${taskDiv.id}')">&times;</button>
      <select onchange="changeTaskStatus('${taskDiv.id}', this.value)">
        <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>To do</option>
        <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
      </select>
    `;
    const column = columns[task.status];
    if (column) {
      column.appendChild(taskDiv);
    } else {
      console.error(`Column for status ${task.status} is not defined`);
    }
  }

  window.allowDrop = function(event) {
    event.preventDefault();
  };

  window.drag = function(event) {
    event.dataTransfer.setData('task-id', event.target.id);
  };

  window.drop = function(event) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('task-id');
    const newStatus = event.target.closest('.column').id;

    // Prevent dropping into "past due"
    if (newStatus === 'pastdue') {
      alert('Tasks cannot be dropped into the "Past due" section.');
      return;
    }

    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    const task = tasks.find(t => `task-${t.createdAt}-${t.title}` === taskId);
    if (task) {
      task.status = newStatus;
      localStorage.setItem('tasks', JSON.stringify(tasks));
      renderTasks();
    } else {
      console.error('Task not found.');
    }
  };

  function changeTaskStatus(taskId, newStatus) {
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    const task = tasks.find(t => `task-${t.createdAt}-${t.title}` === taskId);
    if (task) {
      task.status = newStatus;
      localStorage.setItem('tasks', JSON.stringify(tasks));
      renderTasks();
    } else {
      console.error('Task not found.');
    }
  }

  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  // Make deleteTask and changeTaskStatus functions globally accessible
  window.deleteTask = deleteTask;
  window.changeTaskStatus = changeTaskStatus;

  renderTasks();
  renderUsers();
});
