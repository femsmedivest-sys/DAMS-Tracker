// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================

// Google Apps Script URL (dapatkan selepas deploy)
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyR7DkRgTQXe-eIf3c979cX3rAI8EpdkvULJejrxLvoZJ8fbrBtt46g2zy-IftkN3ku/exec';

// Telegram Configuration (dapatkan dari @BotFather)
const TELEGRAM_BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN_HERE';
const TELEGRAM_CHAT_ID = 'YOUR_TELEGRAM_CHAT_ID_HERE';

// Email Configuration
const ADMIN_EMAIL = 'muhammad.waliuddin@medivest.com.my';

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
    const today = new Date().toISOString().split('T')[0];
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
// FORM SUBMISSION WITH TELEGRAM & EMAIL
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
        timestamp: new Date().toISOString(),
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
            throw new Error('Submission failed');
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
// GOOGLE SHEETS INTEGRATION
// ============================================
async function submitToGoogleSheets(data) {
    const payload = {
        action: 'submit',
        data: data
    };
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        return await response.json();
    } catch (error) {
        console.error('Error submitting to Google Sheets:', error);
        throw error;
    }
}

async function loadStatusData() {
    showLoading();
    
    try {
        // In production, fetch from Google Sheets
        // const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getData`);
        // currentData = await response.json();
        
        // For demo, use mock data
        currentData = getMockData();
        
        displayStatusData(currentData);
        updateDroneCount();
        
        const statusMessage = document.getElementById('statusMessage');
        statusMessage.classList.add('hidden');
        
    } catch (error) {
        console.error('Error loading data:', error);
        showMessage('statusMessage', 'Failed to load data. Please try again.', 'error');
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
// EMAIL NOTIFICATION FUNCTIONS
// ============================================
async function sendEmailNotification(type, data) {
    const emailData = {
        action: 'sendEmail',
        type: type,
        data: data
    };
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailData)
        });
        
        console.log('Email notification sent');
        return true;
    } catch (error) {
        console.error('Error sending email notification:', error);
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
    
    const filteredData = data.filter(item => {
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
    const today = new Date().toISOString().split('T')[0];
    const bookingDate = item.dateTaken;
    let status = item.status || 'Booked';
    let statusClass = status.toLowerCase();
    let showActions = true;
    let actionButton = '';
    
    // Auto-update status based on date
    if (status === 'Booked' && bookingDate === today) {
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
                    <h3>${item.model} 
                        <span class="site-badge">${item.site}</span>
                    </h3>
                    <small>ID: ${item.id}</small>
                </div>
                <span class="status-indicator ${statusClass}">${status}</span>
            </div>
            
            <div class="status-details">
                <div class="detail-item">
                    <i class="fas fa-user"></i>
                    <div>
                        <strong>Borrower:</strong>
                        <div>${item.name}</div>
                    </div>
                </div>
                
                <div class="detail-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <div>
                        <strong>From Site:</strong>
                        <div style="font-weight: 500; color: #1565c0;">${item.site}</div>
                    </div>
                </div>
                
                <div class="detail-item">
                    <i class="fas fa-bullseye"></i>
                    <div>
                        <strong>Purpose:</strong>
                        <div>${item.purpose}</div>
                    </div>
                </div>
                
                <div class="detail-item">
                    <i class="fas fa-route"></i>
                    <div>
                        <strong>Destination:</strong>
                        <div>${item.destination}</div>
                    </div>
                </div>
                
                <div class="detail-item">
                    <i class="fas fa-calendar"></i>
                    <div>
                        <strong>Date Taken:</strong>
                        <div>${formatDate(item.dateTaken)}</div>
                    </div>
                </div>
                
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <div>
                        <strong>Time Taken:</strong>
                        <div>${formatTime(item.timeTaken)}</div>
                    </div>
                </div>
                
                ${item.timestamp ? `
                <div class="detail-item">
                    <i class="fas fa-history"></i>
                    <div>
                        <strong>Submitted:</strong>
                        <div>${formatDateTime(item.timestamp)}</div>
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
    modalMessage.textContent = `Confirm that ${item.model} has been returned by ${item.name}?`;
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
            // Update status
            selectedAction.item.status = 'Cancelled';
            
            // Send notifications
            await sendTelegramNotification('cancelled', selectedAction.item);
            await sendEmailNotification('cancelled', selectedAction.item);
            
        } else if (selectedAction.type === 'return') {
            // Update status
            selectedAction.item.status = 'Returned';
            
            // Send notifications
            await sendTelegramNotification('returned', selectedAction.item);
            await sendEmailNotification('returned', selectedAction.item);
        }
        
        // Update display
        displayStatusData(currentData);
        updateDroneCount();
        
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
    return timeString;
}

function formatDateTime(dateTimeString) {
    if (!dateTimeString) return 'N/A';
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-MY', {
        hour: '2-digit',
        minute: '2-digit',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
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
    let csv = 'ID,Name,Site,Model,Purpose,Destination,Date Taken,Time Taken,Status,Timestamp\n';
    
    currentData.forEach(item => {
        csv += `"${item.id}","${item.name}","${item.site}","${item.model}","${item.purpose}",` +
               `"${item.destination}","${item.dateTaken}","${item.timeTaken}","${item.status}",` +
               `"${item.timestamp || ''}"\n`;
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dams_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// ============================================
// MOCK DATA FOR DEMO
// ============================================
function getMockData() {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
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
            timestamp: new Date(Date.now() - 3600000).toISOString()
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
            timestamp: new Date(Date.now() - 86400000).toISOString()
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
            timestamp: new Date(Date.now() - 172800000).toISOString()
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
        console.error('Error sending reminder:', error);
        return null;
    }
}