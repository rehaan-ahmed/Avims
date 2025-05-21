// Initialize Supabase
const supabaseUrl = 'https://gvnzckeyeypbpvqzzepr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2bnpja2V5ZXlwYnB2cXp6ZXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3Mjk4MTYsImV4cCI6MjA2MzMwNTgxNn0.5Vnym6EV7Xph816gKILTCYiPrwb01fmb-5GY_ENMQ-k';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const appContainer = document.getElementById('app-container');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');
const magicLinkBtn = document.getElementById('magic-link-btn');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const currentUserSpan = document.getElementById('current-user');

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

// Current User and Scanner
let currentUser = null;
let scanner = null;

// Set today's date as default
storageDateInput.valueAsDate = new Date();

// Check auth state when page loads
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    setupEventListeners();
});

async function checkAuthState() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        currentUser = user;
        loginScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');
        currentUserSpan.textContent = user.email.split('@')[0];
    }
}

function setupEventListeners() {
    // Login with Email/Password
    loginBtn.addEventListener('click', handleEmailPasswordLogin);
    
    // Login with Magic Link
    magicLinkBtn.addEventListener('click', handleMagicLinkLogin);
    
    // Enter key support
    loginPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleEmailPasswordLogin();
    });
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // QR Scanner
    startScannerBtn.addEventListener('click', startQRScanner);
    stopScannerBtn.addEventListener('click', stopQRScanner);
    
    // Save Garment
    saveGarmentBtn.addEventListener('click', saveGarment);
    
    // Search
    searchBtn.addEventListener('click', searchGarments);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchGarments();
    });
}

async function handleEmailPasswordLogin() {
    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();

    if (!email || !password) {
        showLoginError("Please enter both email and password");
        return;
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        currentUser = data.user;
        loginScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');
        currentUserSpan.textContent = email.split('@')[0];
        loginError.textContent = "";
    } catch (error) {
        console.error('Login error:', error);
        showLoginError("Login failed: " + error.message);
    }
}

async function handleMagicLinkLogin() {
    const email = loginEmail.value.trim();

    if (!email) {
        showLoginError("Please enter an email address");
        return;
    }

    try {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.href
            }
        });

        if (error) throw error;

        showLoginError("Magic link sent! Check your email.", "success");
    } catch (error) {
        console.error('Magic link error:', error);
        showLoginError("Failed to send magic link: " + error.message);
    }
}

function showLoginError(message, type = "error") {
    loginError.textContent = message;
    loginError.className = `error-message ${type}`;
    setTimeout(() => {
        loginError.textContent = "";
        loginError.className = "error-message";
    }, 5000);
}

async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
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
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function startQRScanner() {
    scanner = new Instascan.Scanner({ video: qrVideo });
    
    Instascan.Camera.getCameras()
        .then(cameras => {
            if (cameras.length > 0) {
                scanner.start(cameras[0]);
                qrVideo.style.display = 'block';
                startScannerBtn.classList.add('hidden');
                stopScannerBtn.classList.remove('hidden');
            } else {
                alert('No cameras found');
            }
        })
        .catch(error => {
            console.error('Camera error:', error);
            alert('Camera access error: ' + error);
        });

    scanner.addListener('scan', content => {
        garmentIdInput.value = content;
        stopQRScanner();
    });
}

function stopQRScanner() {
    if (scanner) {
        scanner.stop();
        qrVideo.style.display = 'none';
        startScannerBtn.classList.remove('hidden');
        stopScannerBtn.classList.add('hidden');
    }
}

async function saveGarment() {
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
        garment_id: garmentId,
        customer_name: customerName,
        garment_desc: garmentDesc,
        rack,
        section,
        storage_date: storageDate,
        worker,
        created_at: new Date().toISOString()
    };

    try {
        const { error } = await supabase
            .from('garments')
            .insert(garmentData);

        if (error) throw error;

        showStatusMessage("Garment saved successfully!", "success");
        
        // Clear form
        garmentIdInput.value = "";
        customerNameInput.value = "";
        garmentDescInput.value = "";
        storageDateInput.valueAsDate = new Date();

        setTimeout(() => {
            saveStatus.textContent = "";
            saveStatus.className = "status-message";
        }, 3000);
    } catch (error) {
        console.error('Save error:', error);
        showStatusMessage("Error saving garment: " + error.message, "error");
    }
}

function showStatusMessage(message, type) {
    saveStatus.textContent = message;
    saveStatus.className = `status-message ${type}`;
}

async function searchGarments() {
    const searchTerm = searchInput.value.trim();

    if (!searchTerm) {
        alert("Please enter a customer name to search");
        return;
    }

    searchResults.innerHTML = "<p class='search-loading'>Searching...</p>";

    try {
        const { data, error } = await supabase
            .from('garments')
            .select('*')
            .ilike('customer_name', `%${searchTerm}%`);

        if (error) throw error;

        if (data.length === 0) {
            searchResults.innerHTML = "<p class='no-results'>No garments found for this customer</p>";
            return;
        }

        displaySearchResults(data);
    } catch (error) {
        console.error('Search error:', error);
        searchResults.innerHTML = `<p class="search-error">Error searching: ${error.message}</p>`;
    }
}

function displaySearchResults(results) {
    const html = results.map(item => `
        <div class="garment-card">
            <h3>${item.customer_name}</h3>
            <p><strong>Garment:</strong> ${item.garment_desc}</p>
            <p class="location"><strong>Location:</strong> Rack ${item.rack}, Section ${item.section}</p>
            <p><strong>Stored on:</strong> ${formatDate(item.storage_date)}</p>
            <p><strong>Processed by:</strong> ${item.worker.split('@')[0]}</p>
            <p><strong>QR ID:</strong> ${item.garment_id}</p>
        </div>
    `).join('');

    searchResults.innerHTML = html;
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}