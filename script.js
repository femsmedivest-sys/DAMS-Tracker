// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================

// Google Apps Script URL (dapatkan selepas deploy)
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw2z0am2QEIDi_TBC2K5kY9Y1XJa_y0VtDBNxG8TK8IET-kgFg8lHhtR-GwT9Ie72LM/exec';
// Telegram Configuration (dapatkan dari @BotFather)
const TELEGRAM_BOT_TOKEN = '8354996644:AAG2GEND5Ry4LFFwwe7VyfjMlXLT4ClM8yI';
const TELEGRAM_CHAT_ID = '-1003661047589';
// Email Configuration
const ADMIN_EMAIL = 'muhammad.waliuddin@medivest.com.my';
// CLOUDFLARE CONFIGURATION
const USE_CLOUDFLARE_PROXY = false; // Set false untuk test direct connection
const CLOUDFLARE_WORKER_URL = 'https://silent-fog-b55a.femsmedivest.workers.dev'; // Ganti dengan URL worker Anda

// ============================================
// DYNAMIC API URL BASED ON CONFIGURATION
// ============================================
const API_URL = USE_CLOUDFLARE_PROXY ? CLOUDFLARE_WORKER_URL : GOOGLE_SCRIPT_URL;

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Format timestamp in Malaysia timezone without 'Z'
function formatTimestamp(date = new Date()) {
    return date.toLocaleString('en-MY', {
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).replace(',', '');
}

// Get current date in YYYY-MM-DD format
function getCurrentDate() {
    const now = new Date();
    return now.toLocaleDateString('en-MY', {
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).split('/').reverse().join('-');
}

// ============================================
// SYSTEM STATE
// ============================================
let currentData = [];
let selectedAction = null;
let currentFilter = '';

// ============================================
// DOM ELEMENTS
// ============================================
const borangBtn = document.getElementById('borangBtn');
const statusBtn = document.getElementById('statusBtn');
const formSection = document.getElementById('formSection');
const statusSection = document.getElementById('statusSection');
const backBtn = document.getElementById('backBtn');
const backStatusBtn = document.getElementById('backStatusBtn');
const droneForm = document.getElementById('droneForm');
const statusList = document.getElementById('statusList');
const searchInput = document.getElementById('searchInput');
const siteFilter = document.getElementById('siteFilter');
const statusFilter = document.getElementById('statusFilter');
const refreshBtn = document.getElementById('refreshBtn');
const actionModal = document.getElementById('actionModal');
const cancelModal = document.getElementById('cancelModal');
const confirmModal = document.getElementById('confirmModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const loadingSpinner = document.getElementById('loadingSpinner');
const currentTimeElement = document.getElementById('currentTime');
const currentDateElement = document.getElementById('currentDate');
const droneCountElement = document.getElementById('droneCount');
const exportBtn = document.getElementById('exportBtn');
const printBtn = document.getElementById('printBtn');
const siteSelect = document.getElementById('site');
const otherSiteInput = document.getElementById('otherSite');

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initializeSystem();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    setInterval(checkAutoUpdates, 60000); // Check every minute
    
    // Site selection logic
    siteSelect.addEventListener('change', function() {
        if (this.value === 'Other') {
            otherSiteInput.classList.remove('hidden');
            otherSiteInput.required = true;
        } else {
            otherSiteInput.classList.add('hidden');
            otherSiteInput.required = false;
            otherSiteInput.value = '';
        }
    });
    
    // Site filter change
    siteFilter.addEventListener('change', () => {
        displayStatusData(currentData);
    });
    
    // Status filter change
    statusFilter.addEventListener('change', () => {
        displayStatusData(currentData);
    });
});

function initializeSystem() {
    // Set minimum date to today
    const dateInput = document.getElementById('dateTaken');
    const today = getCurrentDate();
    dateInput.min = today;
    dateInput.value = today;
    
    // Set default time to next hour
    const timeInput = document.getElementById('timeTaken');
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1);
    timeInput.value = `${nextHour.getHours().toString().padStart(2, '0')}:00`;
    
    // Load initial data
    loadStatusData();
}

function updateDateTime() {
    const now = new Date();
    
    // Update time
    const timeString = now.toLocaleTimeString('en-MY', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    currentTimeElement.textContent = timeString;
    
    // Update date
    const dateString = now.toLocaleDateString('en-MY', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    currentDateElement.textContent = dateString;
}

// ============================================
// NAVIGATION FUNCTIONS
// ============================================
borangBtn.addEventListener('click', () => {
    showSection(formSection);
});

statusBtn.addEventListener('click', () => {
    showSection(statusSection);
    loadStatusData();
});

backBtn.addEventListener('click', () => {
    hideAllSections();
    clearForm();
});

backStatusBtn.addEventListener('click', () => {
    hideAllSections();
});

function showSection(section) {
    document.querySelector('.dashboard').classList.add('hidden');
    formSection.classList.add('hidden');
    statusSection.classList.add('hidden');
    section.classList.remove('hidden');
}

function hideAllSections() {
    formSection.classList.add('hidden');
    statusSection.classList.add('hidden');
    document.querySelector('.dashboard').classList.remove('hidden');
}

// ============================================
// FORM SUBMISSION WITH TELEGRAM & EMAIL - FIXED VERSION
// ============================================
droneForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const siteSelectValue = document.getElementById('site').value;
    const otherSite = document.getElementById('otherSite').value;
    
    const formData = {
        name: document.getElementById('name').value.trim(),
        site: siteSelectValue === 'Other' ? otherSite.trim() : siteSelectValue,
        model: document.getElementById('model').value,
        purpose: document.getElementById('purpose').value,
        destination: document.getElementById('destination').value.trim(),
        dateTaken: document.getElementById('dateTaken').value,
        timeTaken: document.getElementById('timeTaken').value,
        timestamp: formatTimestamp(),
        status: 'Booked',
        notifyTelegram: document.getElementById('notifyTelegram').checked,
        notifyEmail: document.getElementById('notifyEmail').checked
    };
    
    if (!validateForm(formData)) {
        showMessage('formMessage', 'Please fill in all required fields correctly', 'error');
        return;
    }
    
    try {
        showLoading();
        
        // Submit to Google Sheets
        const response = await submitToGoogleSheets(formData);
        
        console.log('📋 Form submission response:', response);
        
        // ✅ CRITICAL FIX: Check response.result BUKAN response.success
        if (response.result === 'success') {  
            // Send notifications if enabled
            if (formData.notifyTelegram) {
                await sendTelegramNotification('booking', formData);
            }
            
            if (formData.notifyEmail) {
                await sendEmailNotification('booking', formData);
            }
            
            showMessage('formMessage', '✅ Drone booking submitted successfully! Notifications have been sent.', 'success');
            clearForm();
            
            // Update dashboard count
            updateDroneCount();
            
            // Return to dashboard after 3 seconds
            setTimeout(() => {
                hideAllSections();
                hideLoading();
            }, 3000);
            
        } else {
            throw new Error(response.message || 'Submission failed');
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        showMessage('formMessage', '❌ Failed to submit form. Please try again.', 'error');
        hideLoading();
    }
});

function validateForm(data) {
    return Object.values(data).every(value => {
        if (typeof value === 'string') {
            return value.trim() !== '';
        }
        return value !== null && value !== undefined;
    });
}

function clearForm() {
    droneForm.reset();
    document.getElementById('dateTaken').valueAsDate = new Date();
    document.getElementById('notifyTelegram').checked = true;
    document.getElementById('notifyEmail').checked = true;
    otherSiteInput.classList.add('hidden');
    otherSiteInput.value = '';
    otherSiteInput.required = false;
    const formMessage = document.getElementById('formMessage');
    formMessage.classList.add('hidden');
}

// ============================================
// GOOGLE SHEETS INTEGRATION - FIXED VERSION
// ============================================
// ============================================
// GOOGLE SHEETS INTEGRATION - CLOUDFLARE COMPATIBLE
// ============================================
async function submitToGoogleSheets(data) {
    const payload = {
        action: 'submit',
        data: data
    };
    
    console.log('📤 Sending data...');
    
    try {
        // OPTION 1: Gunakan Cloudflare Worker jika diaktifkan
        if (USE_CLOUDFLARE_PROXY) {
            return await submitViaCloudflareWorker(payload);
        }
        
        // OPTION 2: Direct to Google Apps Script (original)
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const result = await response.json();
        return result;
        
    } catch (error) {
        console.error('❌ Error:', error);
        
        // Fallback to JSONP
        return await submitViaJsonp(payload);
    }
}

// ✅ ALTERNATIVE: JSONP method untuk bypass CORS
function submitViaJsonp(payload) {
    return new Promise((resolve, reject) => {
        // Create unique callback name
        const callbackName = 'callback_' + Date.now();
        
        // Create script element
        const script = document.createElement('script');
        
        // URL with callback parameter
        const url = `${GOOGLE_SCRIPT_URL}?action=submit&callback=${callbackName}&data=${encodeURIComponent(JSON.stringify(payload.data))}`;
        
        script.src = url;
        
        // Define callback function
        window[callbackName] = function(response) {
            // Clean up
            delete window[callbackName];
            document.body.removeChild(script);
            
            resolve(response);
        };

        // Add error handling
        script.onerror = function() {
            delete window[callbackName];
            document.body.removeChild(script);
            reject(new Error('JSONP request failed'));
        };

         // Add to page
        document.body.appendChild(script);
     });
}

// ✅ OPTION 3: Proxy via your own server
async function submitViaProxy(data) {
    try {
        // Jika anda ada server sendiri, gunakan sebagai proxy
        const response = await fetch('/api/submit-drone-booking', {
              method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        return await response.json();
    } catch (error) {
        console.error('Proxy error:', error);
        throw error;
    }
}


async function loadStatusData() {
    showLoading();
    
    try {
        // OPTION 1: Gunakan Cloudflare Worker jika diaktifkan
        if (USE_CLOUDFLARE_PROXY) {
            return await loadDataViaCloudflareWorker();
        }
        
        // OPTION 2: Direct to Google Apps Script (original)
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getData&_=${Date.now()}`, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            // Try alternative method
            return await loadDataAlternative();
        }
        
        const result = await response.json();
        
        if (result.result === 'success' && result.data) {
            currentData = result.data;
            console.log(`✅ Loaded ${currentData.length} records`);
        } else {
            currentData = getMockData();
        }
        
        displayStatusData(currentData);
        updateDroneCount();
        
    } catch (error) {
        console.error('Error loading data:', error);
        currentData = getMockData();
        displayStatusData(currentData);
        updateDroneCount();
    } finally {
        hideLoading();
    }
}

// ✅ ALTERNATIVE DATA LOADING METHODS
async function loadDataAlternative() {
    try {
        // Method 1: Try with no-cors
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getData`, {
            mode: 'no-cors',
            credentials: 'omit'
        });
        
        // Method 2: Try JSONP
        return await loadDataViaJsonp();
        
    } catch (error) {
        console.error('All methods failed, using mock data');
        return getMockData();
    }
}

async function loadDataViaJsonp() {
    return new Promise((resolve, reject) => {
        const callbackName = 'jsonp_callback_' + Date.now();
        const script = document.createElement('script');
        
        window[callbackName] = function(data) {
            delete window[callbackName];
            document.body.removeChild(script);
            resolve(data);
        };
        
        script.src = `${GOOGLE_SCRIPT_URL}?action=getData&callback=${callbackName}`;
        script.onerror = reject;
        
        document.body.appendChild(script);
    });
}

// ============================================
// CLOUDFLARE WORKER INTEGRATION
// ============================================
async function submitViaCloudflareWorker(payload) {
    try {
        const response = await fetch(CLOUDFLARE_WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                endpoint: GOOGLE_SCRIPT_URL,
                payload: payload
            })
        });
        
        if (!response.ok) {
            throw new Error(`Cloudflare Worker error: ${response.status}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Cloudflare Worker error:', error);
        throw error;
    }
}

// ============================================
// LOAD DATA VIA CLOUDFLARE WORKER
// ============================================
async function loadDataViaCloudflareWorker() {
    try {
        const response = await fetch(`${CLOUDFLARE_WORKER_URL}?action=getData&_=${Date.now()}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Cloudflare Worker error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.result === 'success' && result.data) {
            currentData = result.data;
            console.log(`✅ Loaded ${currentData.length} records via Cloudflare`);
        } else {
            currentData = getMockData();
        }
        
        displayStatusData(currentData);
        updateDroneCount();
        
    } catch (error) {
        console.error('Cloudflare Worker load error:', error);
        currentData = getMockData();
        displayStatusData(currentData);
        updateDroneCount();
    } finally {
        hideLoading();
    }
}

// ============================================
// LOAD DATA - CLOUDFLARE COMPATIBLE
// ============================================
async function loadStatusData() {
    showLoading();
    
    try {
        // Gunakan Cloudflare Worker jika diaktifkan
        if (USE_CLOUDFLARE_PROXY) {
            const response = await fetch(`${CLOUDFLARE_WORKER_URL}?action=getData&endpoint=${encodeURIComponent(GOOGLE_SCRIPT_URL)}`);
            const result = await response.json();
            
            if (result.result === 'success' && result.data) {
                currentData = result.data;
            } else {
                currentData = getMockData();
            }
        } else {
            // Original method
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getData&_=${Date.now()}`, {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                currentData = getMockData();
            } else {
                const result = await response.json();
                if (result.result === 'success' && result.data) {
                    currentData = result.data;
                } else {
                    currentData = getMockData();
                }
            }
        }
        
        displayStatusData(currentData);
        updateDroneCount();
        
    } catch (error) {
        console.error('Error loading data:', error);
        currentData = getMockData();
        displayStatusData(currentData);
        updateDroneCount();
    } finally {
        hideLoading();
    }
}

// ============================================
// TELEGRAM NOTIFICATION FUNCTIONS
// ============================================
async function sendTelegramNotification(type, data) {
    let message = '';
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-MY', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    switch(type) {
        case 'booking':
            message = `📋 *NEW DRONE BOOKING*\n\n` +
                     `👤 *Borrower:* ${data.name}\n` +
                     `🏢 *Site:* ${data.site}\n` +
                     `🚁 *Drone Model:* ${data.model}\n` +
                     `🎯 *Purpose:* ${data.purpose}\n` +
                     `📍 *Destination:* ${data.destination}\n` +
                     `📅 *Date:* ${formatDate(data.dateTaken)}\n` +
                     `⏰ *Time:* ${data.timeTaken}\n` +
                     `📊 *Status:* BOOKED\n\n` +
                     `📌 *Submission Time:* ${timeString}`;
            break;
            
        case 'cancelled':
            message = `❌ *DRONE BOOKING CANCELLED*\n\n` +
                     `🚁 *Drone Model:* ${data.model}\n` +
                     `👤 *Borrower:* ${data.name}\n` +
                     `📅 *Original Date:* ${formatDate(data.dateTaken)}\n` +
                     `📊 *Status:* CANCELLED\n\n` +
                     `⏰ *Cancelled at:* ${timeString}`;
            break;
            
        case 'using':
            message = `🚁 *DRONE IN USE*\n\n` +
                     `🚁 *Drone Model:* ${data.model}\n` +
                     `👤 *Borrower:* ${data.name}\n` +
                     `📍 *Destination:* ${data.destination}\n` +
                     `⏰ *Start Time:* ${data.timeTaken}\n` +
                     `📊 *Status:* IN USE\n\n` +
                     `🕐 *Taken at:* ${timeString}`;
            break;
            
        case 'returned':
            message = `✅ *DRONE RETURNED*\n\n` +
                     `🚁 *Drone Model:* ${data.model}\n` +
                     `👤 *Borrower:* ${data.name}\n` +
                     `📊 *Status:* RETURNED\n\n` +
                     `⏰ *Returned at:* ${timeString}`;
            break;
            
        default:
            message = `ℹ️ *DRONE STATUS UPDATE*\n\n` +
                     `Drone ${data.model} status updated to: ${data.status}`;
    }
    
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'Markdown',
                disable_notification: false
            })
        });
        
        const result = await response.json();
        console.log('Telegram notification sent:', result.ok ? 'Success' : 'Failed');
        return result;
    } catch (error) {
        console.error('Error sending Telegram notification:', error);
        return null;
    }
}

// ============================================
// EMAIL NOTIFICATION FUNCTIONS - FIXED VERSION
// ============================================
async function sendEmailNotification(type, data) {
    const emailData = {
        action: 'sendEmail',
        type: type,
        data: data
    };
    
    try {
        // ✅ USE SAME Content-Type AS SUBMIT FUNCTION
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(emailData)
        });
        
        console.log('📧 Email notification response:', response.ok);
        return response.ok;
    } catch (error) {
        console.error('Error sending email notification:', error);
        return false;
    }
}

// ============================================
// BACKEND TELEGRAM NOTIFICATION FUNCTION
// ============================================
async function sendBackendTelegramNotification(type, data) {
    console.log('📱 Sending backend telegram notification:', type);
    
    const telegramData = {
        action: 'sendTelegram',
        type: type,
        data: data
    };
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(telegramData)
        });
        
        const result = await response.json();
        console.log('📱 Backend telegram response:', result);
        
        if (result.result === 'success') {
            console.log('✅ Backend telegram sent successfully');
            return true;
        } else {
            console.error('❌ Failed to send backend telegram:', result.message);
            return false;
        }
    } catch (error) {
        console.error('Error sending backend telegram notification:', error);
        return false;
    }
}

// ============================================
// UPDATE BOOKING STATUS FUNCTION
// ============================================
async function updateBookingStatus(recordId, newStatus, meta = {}) {
    console.log('🔄 Updating booking status:', recordId, 'to', newStatus, 'meta:', meta);
    
    const updateData = {
        action: 'updateStatus',
        id: recordId,
        status: newStatus
    };

    if (meta.returnSite !== undefined) updateData.returnSite = meta.returnSite;
    if (meta.passTo !== undefined) updateData.passTo = meta.passTo;
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        console.log('📊 Update status response:', result);
        
        if (result.result === 'success') {
            console.log('✅ Status updated successfully');
            return true;
        } else {
            console.error('❌ Failed to update status:', result.message);
            return false;
        }
    } catch (error) {
        console.error('Error updating booking status:', error);
        return false;
    }
}

// ============================================
// STATUS DISPLAY FUNCTIONS
// ============================================
function displayStatusData(data) {
    if (!Array.isArray(data) || data.length === 0) {
        statusList.innerHTML = `
            <div class="message info" style="grid-column: 1/-1">
                <i class="fas fa-info-circle"></i> No drone bookings found.
            </div>
        `;
        return;
    }
    
    const searchTerm = searchInput.value.toLowerCase();
    const siteFilterValue = siteFilter.value;
    const statusFilterValue = statusFilter.value;
    
    // Sort data: Active bookings (Booked/Using) first, then completed (Cancelled/Returned)
    const sortedData = data.sort((a, b) => {
        const statusA = a.status || 'Booked';
        const statusB = b.status || 'Booked';
        
        // Define priority order: Booked/Using = 1, Cancelled/Returned = 2
        const getPriority = (status) => {
            return (status === 'Booked' || status === 'Using') ? 1 : 2;
        };
        
        const priorityA = getPriority(statusA);
        const priorityB = getPriority(statusB);
        
        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }
        
        // If same priority, sort by date taken (newest first)
        return new Date(b.dateTaken || 0) - new Date(a.dateTaken || 0);
    });
    
    const filteredData = sortedData.filter(item => {
        // Search filter
        const matchesSearch = 
            item.name.toLowerCase().includes(searchTerm) ||
            item.model.toLowerCase().includes(searchTerm) ||
            item.site.toLowerCase().includes(searchTerm) ||
            item.destination.toLowerCase().includes(searchTerm);
        
        // Site filter
        const matchesSite = !siteFilterValue || item.site === siteFilterValue;
        
        // Status filter
        const matchesStatus = !statusFilterValue || item.status === statusFilterValue;
        
        return matchesSearch && matchesSite && matchesStatus;
    });
    
    if (filteredData.length === 0) {
        statusList.innerHTML = `
            <div class="message info" style="grid-column: 1/-1">
                <i class="fas fa-search"></i> No results found for your filters.
            </div>
        `;
        return;
    }
    
    statusList.innerHTML = filteredData.map(item => createStatusCard(item)).join('');
    
    // Add event listeners to action buttons
    document.querySelectorAll('.btn-cancel').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.closest('.status-card').dataset.id;
            showCancelModal(id);
        });
    });
    
    document.querySelectorAll('.btn-return').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.closest('.status-card').dataset.id;
            showReturnModal(id);
        });
    });
}

function createStatusCard(item) {
    const today = getCurrentDate();
    const bookingDate = item.dateTaken;
    let status = item.status || 'Booked';
    let statusClass = status.toLowerCase();
    let showActions = true;
    let actionButton = '';
    
    // Auto-update status based on date (only for demo data)
    if (!item.isRealData && status === 'Booked' && bookingDate === today) {
        status = 'Using';
        statusClass = 'using';
    }
    
    // Determine action button based on status
    if (status === 'Returned' || status === 'Cancelled') {
        showActions = false;
    } else if (status === 'Using') {
        actionButton = `
            <button class="btn-return">
                <i class="fas fa-check-circle"></i>
                Return Drone
            </button>
        `;
    } else {
        actionButton = `
            <button class="btn-cancel">
                <i class="fas fa-times-circle"></i>
                Cancel Booking
            </button>
        `;
    }
    
    return `
        <div class="status-card" data-id="${item.id}">
            <div class="status-header">
                <div>
                    <h3>${item.model || 'Unknown Model'} 
                        <span class="site-badge">${item.site || 'Unknown Site'}</span>
                        ${item.isRealData ? 
                            '<span class="real-data-badge">LIVE</span>' : 
                            '<span class="demo-data-badge">DEMO</span>'
                        }
                    </h3>
                    <small>ID: ${item.id}</small>
                </div>
                <span class="status-indicator ${statusClass}">${status}</span>
            </div>

            ${!item.isRealData ? `
                <div class="demo-notice">        
                    <i class="fas fa-info-circle"></i>
                    This is demo data. Submit a real booking to see live records.
                </div>
            ` : ''}
            
            <div class="status-details">
                <div class="detail-item">
                    <i class="fas fa-user"></i>
                    <div>
                        <strong>Borrower:</strong>
                        <div>${item.name || 'Unknown'}</div>
                    </div>
                </div>
                
                <div class="detail-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <div>
                        <strong>From Site:</strong>
                        <div style="font-weight: 500; color: #1565c0;">${item.site || 'Not specified'}</div>
                    </div>
                </div>
                
                <div class="detail-item">
                    <i class="fas fa-bullseye"></i>
                    <div>
                        <strong>Purpose:</strong>
                        <div>${item.purpose || 'Not specified'}</div>
                    </div>
                </div>
                
                <div class="detail-item">
                    <i class="fas fa-route"></i>
                    <div>
                        <strong>Destination:</strong>
                        <div>${item.destination || 'Not specified'}</div>
                    </div>
                </div>
                
                <div class="detail-item">
                    <i class="fas fa-calendar"></i>
                    <div>
                        <strong>Date & Time Taken:</strong>
                        <div>${formatDateTimeCombined(item.dateTaken, item.timeTaken)}</div>
                    </div>
                </div>
                
                ${item.status === 'Returned' && (item.returnSite || item.passTo) ? `
                <div class="detail-item">
                    <i class="fas fa-arrow-right"></i>
                    <div>
                        <strong>Returned to:</strong>
                        <div>${item.returnSite || item.passTo}</div>
                    </div>
                </div>
                ` : ''}
            </div>
            
            ${showActions ? `
                <div class="status-actions">
                    ${actionButton}
                </div>
            ` : ''}
        </div>
    `;
}

// ============================================
// MODAL FUNCTIONS
// ============================================
function showCancelModal(id) {
    const item = currentData.find(item => item.id == id);
    if (!item) return;
    
    selectedAction = { type: 'cancel', id, item };
    modalTitle.textContent = 'Cancel Booking';
    modalMessage.textContent = `Are you sure you want to cancel the booking for ${item.model} (${item.name})?`;
    actionModal.classList.remove('hidden');
}

function showReturnModal(id) {
    const item = currentData.find(item => item.id == id);
    if (!item) return;

    selectedAction = { type: 'return', id, item };

    modalTitle.textContent = 'Return Drone';
    modalMessage.innerHTML = `
        <p>Confirm that <strong>${item.model}</strong> has been returned by <strong>${item.name}</strong>?</p>
        <div style="margin: 15px 0">
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="returnOptionHTJ" class="return-option-btn" style="flex: 1; padding: 10px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    <i class="fas fa-home"></i> Return to HTJ
                </button>
                <button id="returnOptionPass" class="return-option-btn" style="flex: 1; padding: 10px; background: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    <i class="fas fa-user-friends"></i> Pass to Someone
                </button>
            </div>
        </div>
        <div id="passToSection" style="display: none; margin-top: 10px;">
            <label>Pass To: <input id="passToInput" type="text" placeholder="Enter name to pass to" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" /></label>
        </div>
    `;

    // Add event listeners for the option buttons
    setTimeout(() => {
        document.getElementById('returnOptionHTJ').addEventListener('click', () => {
            selectedAction.returnType = 'htj';
            document.querySelectorAll('.return-option-btn').forEach(btn => btn.style.opacity = '0.5');
            document.getElementById('returnOptionHTJ').style.opacity = '1';
            document.getElementById('passToSection').style.display = 'none';
        });

        document.getElementById('returnOptionPass').addEventListener('click', () => {
            selectedAction.returnType = 'pass';
            document.querySelectorAll('.return-option-btn').forEach(btn => btn.style.opacity = '0.5');
            document.getElementById('returnOptionPass').style.opacity = '1';
            document.getElementById('passToSection').style.display = 'block';
        });
    }, 100);

    actionModal.classList.remove('hidden');
}

cancelModal.addEventListener('click', () => {
    actionModal.classList.add('hidden');
    selectedAction = null;
});

confirmModal.addEventListener('click', async () => {
    if (!selectedAction) return;
    
    try {
        showLoading();
        
        if (selectedAction.type === 'cancel') {
            // Update status in spreadsheet first
            const updateSuccess = await updateBookingStatus(selectedAction.item.id, 'Cancelled');
            if (!updateSuccess) {
                throw new Error('Failed to update status in spreadsheet');
            }
            
            // Update status locally
            selectedAction.item.status = 'Cancelled';
            
            // Send notifications (backend handles Telegram to avoid duplicates)
            await sendEmailNotification('cancelled', selectedAction.item);
            await sendBackendTelegramNotification('cancelled', selectedAction.item);
            
        } else if (selectedAction.type === 'return') {
            // Check if return type is selected
            if (!selectedAction.returnType) {
                alert('Please select a return option (HTJ or Pass).');
                hideLoading();
                return;
            }

            let returnSite = '';
            let passTo = '';

            if (selectedAction.returnType === 'htj') {
                returnSite = 'HTJ';
                passTo = '';
            } else {
                // For pass type, get the pass-to input
                passTo = document.getElementById('passToInput') ? document.getElementById('passToInput').value.trim() : '';
                if (!passTo) {
                    alert('Please enter a name to pass to.');
                    hideLoading();
                    return;
                }
            }

            // Update status in spreadsheet first (include metadata)
            const updateSuccess = await updateBookingStatus(selectedAction.item.id, 'Returned', { returnSite, passTo });
            if (!updateSuccess) {
                throw new Error('Failed to update status in spreadsheet');
            }

            selectedAction.item.status = 'Returned';
            selectedAction.item.returnSite = returnSite;
            selectedAction.item.passTo = passTo;
            
            // Send notifications (backend handles Telegram to avoid duplicates)
            await sendEmailNotification('returned', selectedAction.item);
            await sendBackendTelegramNotification('returned', selectedAction.item);
        }
        
        // Update display
        displayStatusData(currentData);
        updateDroneCount();
        
        // Auto refresh data from spreadsheet after status change
        await loadStatusData();
        
        // Show success message
        const actionText = selectedAction.type === 'cancel' ? 'cancelled' : 'returned';
        showMessage('statusMessage', 
            `✅ Drone ${actionText} successfully! Notifications sent.`, 
            'success');
        
        setTimeout(() => {
            const statusMessage = document.getElementById('statusMessage');
            statusMessage.classList.add('hidden');
        }, 3000);
        
    } catch (error) {
        console.error('Error:', error);
        showMessage('statusMessage', '❌ Failed to perform action. Please try again.', 'error');
    } finally {
        hideLoading();
        actionModal.classList.add('hidden');
        selectedAction = null;
    }
});

// ============================================
// SEARCH & FILTER FUNCTIONS
// ============================================
searchInput.addEventListener('input', () => {
    displayStatusData(currentData);
});

refreshBtn.addEventListener('click', () => {
    loadStatusData();
});

// ============================================
// AUTO-UPDATE FUNCTIONS
// ============================================
function checkAutoUpdates() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
    
    let updated = false;
    
    currentData.forEach(async (item) => {
        if (item.status === 'Booked' && item.dateTaken === today) {
            // Check if current time is past the taken time
            if (currentTime >= item.timeTaken) {
                item.status = 'Using';
                updated = true;
                
                // Send notification if not already sent
                if (!item.usageNotified) {
                    await sendTelegramNotification('using', item);
                    await sendEmailNotification('using', item);
                    item.usageNotified = true;
                }
            }
        }
    });
    
    if (updated) {
        displayStatusData(currentData);
        updateDroneCount();
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-MY', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(timeString) {
    if (!timeString) return 'N/A';

    // If it's already in HH:mm format, convert to 12-hour with AM/PM
    if (timeString.match(/^\d{1,2}:\d{2}$/)) {
        const [hours, minutes] = timeString.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }

    return timeString;
}

function formatDateTimeCombined(dateString, timeString) {
    if (!dateString || !timeString) return 'N/A';

    const date = new Date(dateString);
    const datePart = date.toLocaleDateString('en-MY', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    // If it's already in HH:mm format, convert to 12-hour with AM/PM
    let timePart = timeString;
    if (timeString.match(/^\d{1,2}:\d{2}$/)) {
        const [hours, minutes] = timeString.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        timePart = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }

    return `${datePart}, ${timePart}`;
}

function showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `message ${type}`;
    element.classList.remove('hidden');
}

function showLoading() {
    loadingSpinner.classList.remove('hidden');
}

function hideLoading() {
    loadingSpinner.classList.add('hidden');
}

function updateDroneCount() {
    const activeDrones = currentData.filter(item => 
        item.status === 'Using' || item.status === 'Booked'
    ).length;
    droneCountElement.textContent = activeDrones;
}

// ============================================
// EXPORT & PRINT FUNCTIONS
// ============================================
exportBtn.addEventListener('click', () => {
    exportToExcel();
});

printBtn.addEventListener('click', () => {
    window.print();
});

function exportToExcel() {
    // Create CSV content
    let csv = 'ID,Name,Site,Model,Purpose,Destination,Date & Time Taken,Status,Timestamp\n';

    currentData.forEach(item => {
        const dateTimeCombined = formatDateTimeCombined(item.dateTaken, item.timeTaken);
        csv += `"${item.id}","${item.name}","${item.site}","${item.model}","${item.purpose}",` +
               `"${item.destination}","${dateTimeCombined}","${item.status}",` +
               `"${item.timestamp || ''}"\n`;
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dams_export_${getCurrentDate()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// ============================================
// MOCK DATA FOR DEMO
// ============================================
function getMockData() {
    const today = getCurrentDate();
    const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('en-MY', {
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).split('/').reverse().join('-');
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-MY', {
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).split('/').reverse().join('-');

    const sites = [
        'HQ', 'MSB - BRI', 'MSB - OFFICE ROMS', 'MSB - OFFICE RONS',
        'MSB - OFFICE RONJ', 'MSB - HSA', 'MSB - MKA', 'MSB - HTJ',
        'MSB - KTG', 'MSB - HSI', 'MSB - PER', 'MSB - MKJ',
        'MSB - AGJ', 'MSB - TGK', 'MSB - MER', 'MSB - JLB',
        'MSB - JMP', 'MSB - PON', 'MSB - KUL', 'MSB - JSN',
        'MSB - KLN', 'MSB - BPH', 'MSB - PDX', 'MSB - MUR',
        'MSB - SGT', 'MSB - TMP', 'MSB - KPL'
    ];
    
    return [
        {
            id: 1,
            name: "Ahmad bin Ali",
            site: sites[0], // HQ
            model: "DJI Matrice 4T",
            purpose: "Site Inspection",
            destination: "Construction Site A",
            dateTaken: today,
            timeTaken: "09:00",
            status: "Using",
            timestamp: formatTimestamp(),
            isRealData: false,  // ⭐ TAMBAH INI ⭐
            note: "This is demo data - Submit a real booking to see live data"
        },
        {
            id: 2,
            name: "Siti Nurhaliza",
            site: sites[1], // MSB - BRI
            model: "DJI Phanto 4 Pro",
            purpose: "Aerial Photography",
            destination: "Corporate Building",
            dateTaken: tomorrow,
            timeTaken: "14:30",
            status: "Booked",
            timestamp: formatTimestamp(),
            isRealData: false,  // ⭐ TAMBAH INI ⭐
            note: "This is demo data - Submit a real booking to see live data"
        },
        {
            id: 3,
            name: "Raj Kumar",
            site: sites[5], // MSB - HSA
            model: "DJI Flip",
            purpose: "Survey & Mapping",
            destination: "Agricultural Land",
            dateTaken: yesterday,
            timeTaken: "10:00",
            status: "Returned",
            timestamp: formatTimestamp(),
            isRealData: false,  // ⭐ TAMBAH INI ⭐
            note: "This is demo data - Submit a real booking to see live data"
        },
    ];
}

// ============================================
// DAILY REMINDER FUNCTION
// ============================================
async function sendDailyReminders() {
    const now = new Date();
    const hours = now.getHours();
    
    // Only send reminders at 8 AM
    if (hours !== 8) return;
    
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    const todaysBookings = currentData.filter(item => 
        item.dateTaken === today && (item.status === 'Booked' || item.status === 'Using')
    );
    
    const tomorrowsBookings = currentData.filter(item => 
        item.dateTaken === tomorrow && item.status === 'Booked'
    );
    
    // Send reminder for today's bookings
    if (todaysBookings.length > 0) {
        const message = `📅 *TODAY'S DRONE SCHEDULE* (${formatDate(today)})\n\n` +
                      `${todaysBookings.map(item => 
                          `🚁 ${item.model} - ${item.name} (${item.timeTaken}) - ${item.status}`
                      ).join('\n')}\n\n` +
                      `Total: ${todaysBookings.length} drone(s)`;
        
        await sendTelegramMessage(message);
    }
    
    // Send reminder for tomorrow's bookings
    if (tomorrowsBookings.length > 0) {
        const message = `📅 *TOMORROW'S DRONE SCHEDULE* (${formatDate(tomorrow)})\n\n` +
                      `${tomorrowsBookings.map(item => 
                          `🚁 ${item.model} - ${item.name} (${item.timeTaken})`
                      ).join('\n')}\n\n` +
                      `Total: ${tomorrowsBookings.length} drone(s) scheduled`;
        
        await sendTelegramMessage(message);
    }
}

// Send reminders every hour (will only trigger at 8 AM)
setInterval(sendDailyReminders, 60 * 60 * 1000);

// Helper function for sending Telegram messages
async function sendTelegramMessage(message) {
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        
        return await response.json();
    } catch (error) {
        console.error('Proxy error:', error);
        throw error;
    }
}