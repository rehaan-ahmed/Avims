// Initialize Supabase
const supabaseUrl = 'https://gvnzckeyeypbpvqzzepr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2bnpja2V5ZXlwYnB2cXp6ZXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3Mjk4MTYsImV4cCI6MjA2MzMwNTgxNn0.5Vnym6EV7Xph816gKILTCYiPrwb01fmb-5GY_ENMQ-k';
const supabase = window.Supabase.createClient(supabaseUrl, supabaseKey);

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const appContainer = document.getElementById('app-container');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');
const magicLinkBtn = document.getElementById('magic-link-btn'); // Add this in HTML
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const currentUserSpan = document.getElementById('current-user');
const userEmailSpan = document.getElementById('user-email');
const userInitials = document.getElementById('user-initials');
const fabMenu = document.getElementById('fab-menu');
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

// Inventory Elements
const totalGarmentsEl = document.getElementById('total-garments');
const rackSCountEl = document.getElementById('rack-s-count');
const inventoryList = document.getElementById('inventory-list');

// Current User and Scanner
let currentUser = null;
let scanner = null;

// Set today's date as default
storageDateInput.valueAsDate = new Date();

// Check auth state when page loads
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    setupEventListeners();
    
    // Add scroll animation to elements (excluding login screen)
    animateOnScroll();
});

// Check user authentication state
async function checkAuthState() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        
        if (user) {
            currentUser = user;
            loginScreen.classList.add('hidden');
            appContainer.classList.remove('hidden');
            updateUserInfo(user);
            loadInventoryStats();
        } else {
            loginScreen.classList.remove('hidden');
            appContainer.classList.add('hidden');
        }
    } catch (error) {
        console.error('Auth state error:', error.message);
        showLoginError("Error checking auth state: " + error.message);
    }
}

// Listen for auth state changes (e.g., after magic link login)
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
        currentUser = session.user;
        loginScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');
        updateUserInfo(session.user);
        loadInventoryStats();
    } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        appContainer.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    }
});

// Setup all event listeners
function setupEventListeners() {
    // Login with Email/Password
    loginBtn.addEventListener('click', handleEmailPasswordLogin);
    
    // Login with Magic Link
    magicLinkBtn.addEventListener('click', handleMagicLinkLogin);
    
    // Login with Enter key
    loginEmail.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleEmailPasswordLogin();
    });
    loginPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleEmailPasswordLogin();
    });
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // FAB Menu
    fabMenu.addEventListener('click', toggleSidebar);
    
    // Navigation Items
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            switchTab(item.getAttribute('data-tab'));
        });
    });
    
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

// Handle email/password login
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
        updateUserInfo(data.user);
        loadInventoryStats();
        loginError.textContent = "";
    } catch (error) {
        console.error('Login error:', error.message);
        showLoginError("Login failed: " + error.message);
    }
}

// Handle magic link login
async function handleMagicLinkLogin() {
    const email = loginEmail.value.trim();

    if (!email) {
        showLoginError("Please enter your email");
        return;
    }

    try {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: 'https://avis-avantivogue.netlify.app'
            }
        });

        if (error) throw error;

        showLoginError("Magic link sent! Check your email.", "success");
    } catch (error) {
        console.error('Magic link error:', error.message);
        showLoginError("Failed to send magic link: " + error.message);
    }
}

// Handle logout
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
            stopQRScanner();
        }
    } catch (error) {
        console.error('Logout error:', error.message);
        showLoginError("Logout failed: " + error.message);
    }
}

// Update user info in UI
function updateUserInfo(user) {
    const email = user.email;
    const name = email.split('@')[0];
    const initials = name.substring(0, 2).toUpperCase();
    
    currentUserSpan.textContent = name;
    userEmailSpan.textContent = email;
    userInitials.textContent = initials;
}

// Toggle sidebar
function toggleSidebar() {
    sidebar.classList.toggle('active');
}

// Switch between tabs
function switchTab(tabId) {
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-tab') === tabId) {
            item.classList.add('active');
        }
    });
    
    document.querySelectorAll('.content-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(`${tabId}-tab`).classList.add('active');
    
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
    }
    
    if (tabId === 'inventory') {
        loadInventoryStats();
    }
}

// QR Scanner functions
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
                showStatusMessage("No cameras found", "error");
            }
        })
        .catch(error => {
            console.error('Camera error:', error);
            showStatusMessage("Camera access error: " + error.message, "error");
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

// Save garment to database
async function saveGarment() {
    const garmentId = garmentIdInput.value.trim();
    const customerName = customerNameInput.value.trim();
    const garmentDesc = garmentDescInput.value.trim();
    const rack = rackSelect.value;
    const section = sectionSelect.value;
    const storageDate = storageDateInput.value;
    const worker = currentUser.email;

    if (!garmentId || !customerName || !garmentDesc || !rack || !section || !storageDate) {
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
            .insert([garmentData]);

        if (error) throw error;

        showStatusMessage("Garment saved successfully!", "success");
        
        garmentIdInput.value = "";
        customerNameInput.value = "";
        garmentDescInput.value = "";
        rackSelect.value = "";
        sectionSelect.value = "";
        storageDateInput.valueAsDate = new Date();

        loadInventoryStats();
    } catch (error) {
        console.error('Save error:', error.message);
        showStatusMessage("Error saving garment: " + error.message, "error");
    }
}

// Search garments
async function searchGarments() {
    const searchTerm = searchInput.value.trim();

    if (!searchTerm) {
        showStatusMessage("Please enter a customer name to search", "error");
        return;
    }

    searchResults.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Searching...</p>
        </div>
    `;

    try {
        const { data, error } = await supabase
            .from('garments')
            .select('*')
            .ilike('customer_name', `%${searchTerm}%`);

        if (error) throw error;

        displaySearchResults(data);
    } catch (error) {
        console.error('Search error:', error.message);
        searchResults.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error searching: ${error.message}</p>
            </div>
        `;
    }
}

// Display search results
function displaySearchResults(results) {
    if (results.length === 0) {
        searchResults.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>No garments found for this customer</p>
            </div>
        `;
        return;
    }

    let html = '';
    results.forEach(item => {
        html += `
            <div class="garment-card">
                <h3>${item.customer_name}</h3>
                <p><strong>Garment:</strong> ${item.garment_desc}</p>
                <p class="location"><strong>Location:</strong> Rack ${item.rack}, Section ${item.section}</p>
                <p><strong>Stored on:</strong> ${formatDate(item.storage_date)}</p>
                <p><strong>Processed by:</strong> ${item.worker.split('@')[0]}</p>
                <p><strong>QR ID:</strong> ${item.garment_id}</p>
            </div>
        `;
    });

    searchResults.innerHTML = html;
}

// Load inventory statistics
async function loadInventoryStats() {
    try {
        const { count: totalCount } = await supabase
            .from('garments')
            .select('*', { count: 'exact', head: true });
        
        const { count: rackSCount } = await supabase
            .from('garments')
            .select('*', { count: 'exact', head: true })
            .eq('rack', 'S');
        
        totalGarmentsEl.textContent = totalCount || 0;
        rackSCountEl.textContent = rackSCount || 0;
        
        loadRecentItems();
    } catch (error) {
        console.error('Inventory stats error:', error.message);
    }
}

// Load recent inventory items
async function loadRecentItems() {
    try {
        const { data, error } = await supabase
            .from('garments')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        displayRecentItems(data);
    } catch (error) {
        console.error('Recent items error:', error.message);
    }
}

// Display recent inventory items
function displayRecentItems(items) {
    if (items.length === 0) {
        inventoryList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <p>No inventory items found</p>
            </div>
        `;
        return;
    }

    let html = '';
    items.forEach(item => {
        html += `
            <div class="garment-card">
                <h3>${item.customer_name}</h3>
                <p><strong>Garment:</strong> ${item.garment_desc}</p>
                <p class="location"><strong>Location:</strong> Rack ${item.rack}, Section ${item.section}</p>
                <p><strong>Stored on:</strong> ${formatDate(item.storage_date)}</p>
                <p><strong>QR ID:</strong> ${item.garment_id}</p>
            </div>
        `;
    });

    inventoryList.innerHTML = html;
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Show status message
function showStatusMessage(message, type) {
    const element = type === 'error' ? loginError : saveStatus;
    element.textContent = message;
    element.className = `status-message ${type}`;
    
    if (type === 'error') {
        setTimeout(() => {
            element.textContent = '';
            element.className = 'status-message';
        }, 5000);
    } else if (type === 'success') {
        setTimeout(() => {
            element.textContent = '';
            element.className = 'status-message';
        }, 3000);
    }
}

// Animate elements on scroll (excluding login screen)
function animateOnScroll() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
            }
        });
    }, {
        threshold: 0.1
    });

    document.querySelectorAll('.section-header, .card').forEach(el => {
        observer.observe(el);
    });
}