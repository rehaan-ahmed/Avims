// Initialize Supabase
const supabaseUrl = 'https://gvnzckeyeypbpvqzzepr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2bnpja2V5ZXlwYnB2cXp6ZXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3Mjk4MTYsImV4cCI6MjA2MzMwNTgxNn0.5Vnym6EV7Xph816gKILTCYiPrwb01fmb-5GY_ENMQ-k';
const supabase = Supabase.createClient(supabaseUrl, supabaseKey);

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const appContainer = document.getElementById('app-container');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const currentUserSpan = document.getElementById('current-user');
const hamburgerMenu = document.querySelector('.hamburger-menu');
const sidebar = document.getElementById('sidebar');
const navItems = document.querySelectorAll('.nav-item');

// QR Scanner Elements
const qrVideo = document.getElementById('qr-video');
const startScannerBtn = document.getElementById('start-scanner');
const stopScannerBtn = document.getElementById('stop-scanner');
const garmentIdInput = document.getElementById('garment-id');

// Garment Form Elements
const customerNameInput = document.getElementById('customer-name');
const garmentDescInput = document.getElementById('garment-desc');
const rackSelect = document.getElementById('rack-select');
const sectionSelect = document.getElementById('section-select');
const storageDateInput = document.getElementById('storage-date');
const saveGarmentBtn = document.getElementById('save-garment');
const saveStatus = document.getElementById('save-status');

// Search Elements
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchResults = document.getElementById('search-results');

// Tab Elements
const contentTabs = document.querySelectorAll('.content-tab');

// Current User and Scanner
let currentUser = null;
let scanner = null;

// Set today's date as default
storageDateInput.valueAsDate = new Date();

// Login Function
loginBtn.addEventListener('click', async () => {
    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();

    if (!email || !password) {
        showLoginError("Please enter both email and password");
        return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        showLoginError("Login failed: " + error.message);
        return;
    }

    currentUser = data.user;
    loginScreen.classList.add('hidden');
    appContainer.classList.remove('hidden');
    currentUserSpan.textContent = email.split('@')[0];
    loginError.textContent = "";
});

function showLoginError(message) {
    loginError.textContent = message;
    setTimeout(() => {
        loginError.textContent = "";
    }, 5000);
}

// Logout Function
logoutBtn.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
        currentUser = null;
        appContainer.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        loginEmail.value = "";
        loginPassword.value = "";
        if (scanner) {
            scanner.stop();
            qrVideo.style.display = 'none';
            startScannerBtn.classList.remove('hidden');
            stopScannerBtn.classList.add('hidden');
        }
    }
});

// Hamburger Menu Toggle
hamburgerMenu.addEventListener('click', () => {
    sidebar.classList.toggle('active');
});

// Navigation Tabs
navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(navItem => navItem.classList.remove('active'));
        item.classList.add('active');
        contentTabs.forEach(tab => tab.classList.remove('active'));
        const tabId = item.getAttribute('data-tab');
        document.getElementById(`${tabId}-tab`).classList.add('active');
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
        }
    });
});

// QR Scanner Functionality
startScannerBtn.addEventListener('click', () => {
    scanner = new Instascan.Scanner({ video: qrVideo });
    Instascan.Camera.getCameras().then(function(cameras) {
        if (cameras.length > 0) {
            scanner.start(cameras[0]);
            qrVideo.style.display = 'block';
            startScannerBtn.classList.add('hidden');
            stopScannerBtn.classList.remove('hidden');
        } else {
            alert('No cameras found');
        }
    }).catch(function(e) {
        console.error(e);
        alert('Camera access error: ' + e);
    });

    scanner.addListener('scan', function(content) {
        garmentIdInput.value = content;
        scanner.stop();
        qrVideo.style.display = 'none';
        startScannerBtn.classList.remove('hidden');
        stopScannerBtn.classList.add('hidden');
    });
});

stopScannerBtn.addEventListener('click', () => {
    if (scanner) {
        scanner.stop();
        qrVideo.style.display = 'none';
        startScannerBtn.classList.remove('hidden');
        stopScannerBtn.classList.add('hidden');
    }
});

// Save Garment Function
saveGarmentBtn.addEventListener('click', async () => {
    const garmentId = garmentIdInput.value.trim();
    const customerName = customerNameInput.value.trim();
    const garmentDesc = garmentDescInput.value.trim();
    const rack = rackSelect.value;
    const section = sectionSelect.value;
    const storageDate = storageDateInput.value;
    const worker = currentUser.email;

    if (!garmentId || !customerName || !garmentDesc || !storageDate) {
        showStatusMessage("Please fill all required fields", "error");
        return;
    }

    const garmentData = {
        garmentId,
        customerName,
        garmentDesc,
        rack,
        section,
        storageDate,
        worker,
        createdAt: new Date().toISOString()
    };

    const { error } = await supabase
        .from('garments')
        .insert([garmentData]);

    if (error) {
        showStatusMessage("Error saving garment: " + error.message, "error");
        return;
    }

    showStatusMessage("Garment saved successfully!", "success");
    garmentIdInput.value = "";
    customerNameInput.value = "";
    garmentDescInput.value = "";
    storageDateInput.valueAsDate = new Date();

    setTimeout(() => {
        saveStatus.textContent = "";
        saveStatus.className = "status-message";
    }, 3000);
});

function showStatusMessage(message, type) {
    saveStatus.textContent = message;
    saveStatus.className = `status-message ${type}`;
}

// Search Functionality
searchBtn.addEventListener('click', searchGarments);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchGarments();
    }
});

async function searchGarments() {
    const searchTerm = searchInput.value.trim();

    if (!searchTerm) {
        alert("Please enter a customer name to search");
        return;
    }

    searchResults.innerHTML = "<p class='search-loading'>Searching...</p>";

    const { data, error } = await supabase
        .from('garments')
        .select('*')
        .ilike('customerName', `%${searchTerm}%`);

    if (error) {
        searchResults.innerHTML = `<p class="search-error">Error searching: ${error.message}</p>`;
        return;
    }

    if (data.length === 0) {
        searchResults.innerHTML = "<p class='no-results'>No garments found for this customer</p>";
        return;
    }

    let html = "";
    data.forEach((item) => {
        html += `
            <div class="garment-card">
                <h3>${item.customerName}</h3>
                <p><strong>Garment:</strong> ${item.garmentDesc}</p>
                <p class="location"><strong>Location:</strong> Rack ${item.rack}, Section ${item.section}</p>
                <p><strong>Stored on:</strong> ${formatDate(item.storageDate)}</p>
                <p><strong>Processed by:</strong> ${item.worker.split('@')[0]}</p>
                <p><strong>QR ID:</strong> ${item.garmentId}</p>
            </div>
        `;
    });

    searchResults.innerHTML = html;
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Check Auth State on Load
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        currentUser = session.user;
        loginScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');
        currentUserSpan.textContent = currentUser.email.split('@')[0];
    } else {
        currentUser = null;
        appContainer.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    }
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
        if (!sidebar.contains(e.target) && !hamburgerMenu.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    }
});