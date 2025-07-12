// Các biến toàn cục
let socket = null;
let currentDeviceId = null;
let selectedDeviceId = null;
let selectedFiles = [];
let downloadedFiles = new Set();
let currentDeviceType = 'desktop';
let currentLanguage = localStorage.getItem('language') || 'vi';

// Connection management variables
let connectionState = 'disconnected';
let reconnectAttempts = 0;
let maxReconnectAttempts = 5;
let reconnectDelay = 1000; // Start with 1 second
let reconnectTimer = null;
let isManualDisconnect = false;

// Danh sách tên thiết bị
const deviceNames = [
    // Tên tiếng Việt
    'Minh', 'Hương', 'Hùng', 'Lan', 'Tuấn', 'Mai', 'Dũng', 'Hoa',
    'Nam', 'Hạnh', 'Quân', 'Thảo', 'Đức', 'Ngọc', 'Kiên', 'Trang',
    // Tên tiếng Anh
    'Peter', 'Mary', 'John', 'Alice', 'Bob', 'Emma', 'David', 'Sarah',
    'Michael', 'Jennifer', 'James', 'Lisa', 'Robert', 'Linda', 'William', 'Patricia'
];

// Định nghĩa các chuỗi đa ngôn ngữ
const translations = {
    vi: {
        appTitle: 'Chia sẻ file trong mạng local',
        connecting: 'Đang kết nối...',
        notRegistered: 'Chưa đăng ký',
        rename: 'Đổi tên',
        devicesInNetwork: 'Thiết bị trong mạng',
        sharedFiles: 'File đã chia sẻ',
        renameDevice: 'Đổi tên thiết bị',
        newName: 'Tên mới',
        cancel: 'Hủy',
        save: 'Lưu',
        shareWith: 'Chia sẻ file với',
        dragDrop: 'Kéo thả file vào đây',
        orClick: 'hoặc bấm để chọn file',
        upload: 'Tải lên',
        fileName: 'Tên file',
        fileSize: 'Kích thước',
        fileType: 'Định dạng',
        actions: 'Thao tác',
        preview: 'Xem trước file',
        from: 'Từ',
        time: 'Thời gian',
        download: 'Tải xuống',
        close: 'Đóng',
        cannotPreview: 'Không thể xem trước nội dung file này. Vui lòng tải xuống để xem.',
        errorReading: 'Không thể đọc nội dung file. Vui lòng tải xuống để xem.',
        uploadSuccess: 'Tải lên thành công!',
        uploadError: 'Lỗi khi tải lên file',
        renameSuccess: 'Đã đổi tên thành công!',
        enterNewName: 'Vui lòng nhập tên mới!',
        expired: 'Đã hết hạn',
        remaining: 'Còn lại',
        hours: 'h',
        minutes: 'm',
        seconds: 's',
        online: 'Đang online',
        language: 'Ngôn ngữ'
    },
    en: {
        appTitle: 'Local Network File Share',
        connecting: 'Connecting...',
        notRegistered: 'Not registered',
        rename: 'Rename',
        devicesInNetwork: 'Devices in network',
        sharedFiles: 'Shared files',
        renameDevice: 'Rename device',
        newName: 'New name',
        cancel: 'Cancel',
        save: 'Save',
        shareWith: 'Share file with',
        dragDrop: 'Drag and drop files here',
        orClick: 'or click to select files',
        upload: 'Upload',
        fileName: 'File name',
        fileSize: 'Size',
        fileType: 'Type',
        actions: 'Actions',
        preview: 'Preview file',
        from: 'From',
        time: 'Time',
        download: 'Download',
        close: 'Close',
        cannotPreview: 'Cannot preview this file type. Please download to view.',
        errorReading: 'Cannot read file content. Please download to view.',
        uploadSuccess: 'Upload successful!',
        uploadError: 'Error uploading file',
        renameSuccess: 'Name changed successfully!',
        enterNewName: 'Please enter a new name!',
        expired: 'Expired',
        remaining: 'Remaining',
        hours: 'h',
        minutes: 'm',
        seconds: 's',
        online: 'Online',
        language: 'Language'
    }
};

// Hàm dịch chuỗi
function t(key) {
    return translations[currentLanguage][key] || key;
}

// Connection management functions
function updateConnectionStatus(status, message = '') {
    connectionState = status;
    const indicator = document.getElementById('connectionIndicator');
    const icon = document.getElementById('connectionIcon');
    const text = document.getElementById('connectionText');

    if (!indicator || !icon || !text) return;

    // Remove all status classes
    indicator.className = 'connection-indicator';

    switch (status) {
        case 'connected':
            indicator.classList.add('connected');
            icon.className = 'bi bi-wifi';
            text.textContent = message || 'Connected';
            break;
        case 'disconnected':
            indicator.classList.add('disconnected');
            icon.className = 'bi bi-wifi-off';
            text.textContent = message || 'Disconnected';
            break;
        case 'connecting':
            indicator.classList.add('connecting');
            icon.className = 'bi bi-wifi';
            text.textContent = message || 'Connecting...';
            break;
        case 'reconnecting':
            indicator.classList.add('reconnecting');
            icon.className = 'bi bi-arrow-clockwise';
            text.textContent = message || `Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`;
            break;
    }
}

function initializeSocket() {
    if (socket) {
        socket.disconnect();
    }

    socket = io({
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true
    });

    setupSocketEventListeners();
}

function setupSocketEventListeners() {
    socket.on('connect', () => {
        console.log('Socket connected');
        connectionState = 'connected';
        reconnectAttempts = 0;
        reconnectDelay = 1000;
        isManualDisconnect = false;

        updateConnectionStatus('connected');

        // Re-register device on reconnection
        if (currentDeviceId) {
            const savedName = localStorage.getItem('deviceName');
            const deviceName = savedName || getRandomName();

            socket.emit('registerDevice', {
                id: currentDeviceId,
                name: deviceName,
                type: currentDeviceType
            });
        }
    });

    socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        connectionState = 'disconnected';
        updateConnectionStatus('disconnected');

        // Don't auto-reconnect if it was a manual disconnect
        if (!isManualDisconnect && reason !== 'io client disconnect') {
            scheduleReconnect();
        }
    });

    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        connectionState = 'disconnected';
        updateConnectionStatus('disconnected', 'Connection failed');

        if (!isManualDisconnect) {
            scheduleReconnect();
        }
    });

    // Existing socket event listeners
    socket.on('deviceList', handleDeviceList);
    socket.on('deviceNameUpdated', handleDeviceNameUpdated);
    socket.on('newFile', handleNewFile);
    socket.on('fileDeleted', handleFileDeleted);
}

function scheduleReconnect() {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
    }

    if (reconnectAttempts >= maxReconnectAttempts) {
        updateConnectionStatus('disconnected', 'Connection failed - Click to retry');
        showRetryButton();
        return;
    }

    reconnectAttempts++;
    updateConnectionStatus('reconnecting');

    reconnectTimer = setTimeout(() => {
        console.log(`Attempting to reconnect... (${reconnectAttempts}/${maxReconnectAttempts})`);
        initializeSocket();

        // Exponential backoff
        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
    }, reconnectDelay);
}

function showRetryButton() {
    const indicator = document.getElementById('connectionIndicator');
    if (indicator) {
        indicator.style.cursor = 'pointer';
        indicator.onclick = () => {
            reconnectAttempts = 0;
            reconnectDelay = 1000;
            indicator.style.cursor = 'default';
            indicator.onclick = null;
            initializeSocket();
        };
    }
}

function refreshDevices() {
    if (socket && socket.connected) {
        socket.emit('requestDeviceList');
    } else {
        initializeSocket();
    }
}

// Reset device name (for debugging/testing)
function resetDeviceName() {
    localStorage.removeItem('deviceName');
    localStorage.removeItem('deviceId');
    location.reload();
}

// Hàm chuyển đổi ngôn ngữ
function changeLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    updateUI();
}

// Cập nhật giao diện theo ngôn ngữ
function updateUI() {
    // Cập nhật title
    document.title = t('appTitle');

    // Cập nhật trạng thái thiết bị
    const currentDeviceStatus = document.getElementById('currentDeviceStatus');
    if (currentDeviceStatus) {
        currentDeviceStatus.textContent = t('notRegistered');
    }

    // Cập nhật nút đổi tên
    const renameDevice = document.getElementById('renameDevice');
    if (renameDevice) {
        renameDevice.innerHTML = `<i class="bi bi-pencil"></i> ${t('rename')}`;
    }

    // Cập nhật tiêu đề danh sách thiết bị
    const deviceListTitle = document.querySelector('.card-title');
    if (deviceListTitle) {
        deviceListTitle.textContent = t('devicesInNetwork');
    }

    // Cập nhật tiêu đề danh sách file
    const fileListTitle = document.querySelector('.card-title:last-child');
    if (fileListTitle) {
        fileListTitle.textContent = t('sharedFiles');
    }

    // Cập nhật modal đổi tên
    const renameModalTitle = document.querySelector('#renameModal .modal-title');
    if (renameModalTitle) {
        renameModalTitle.textContent = t('renameDevice');
    }

    const newNameLabel = document.querySelector('label[for="newDeviceName"]');
    if (newNameLabel) {
        newNameLabel.textContent = t('newName');
    }

    const cancelButton = document.querySelector('.btn-secondary');
    if (cancelButton) {
        cancelButton.textContent = t('cancel');
    }

    const saveButton = document.getElementById('saveNewName');
    if (saveButton) {
        saveButton.textContent = t('save');
    }

    // Cập nhật modal upload
    const uploadModalTitle = document.querySelector('#uploadModal .modal-title');
    if (uploadModalTitle) {
        uploadModalTitle.textContent = t('shareWith');
    }

    const uploadButton = document.getElementById('uploadButton');
    if (uploadButton) {
        uploadButton.innerHTML = `<i class="bi bi-cloud-upload me-2"></i>${t('upload')}`;
    }

    // Cập nhật modal xem trước
    const previewModalTitle = document.querySelector('#filePreviewModal .modal-title');
    if (previewModalTitle) {
        previewModalTitle.textContent = t('preview');
    }

    const downloadButton = document.getElementById('downloadFileBtn');
    if (downloadButton) {
        downloadButton.innerHTML = `<i class="bi bi-download me-2"></i>${t('download')}`;
    }

    const closeButton = document.querySelector('#filePreviewModal .btn-secondary');
    if (closeButton) {
        closeButton.textContent = t('close');
    }
}

// Các hàm tiện ích
function detectDeviceType() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        ? 'mobile'
        : 'desktop';
}

function getRandomName() {
    return deviceNames[Math.floor(Math.random() * deviceNames.length)];
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'pdf': 'bi-file-pdf',
        'doc': 'bi-file-word',
        'docx': 'bi-file-word',
        'xls': 'bi-file-excel',
        'xlsx': 'bi-file-excel',
        'ppt': 'bi-file-ppt',
        'pptx': 'bi-file-ppt',
        'jpg': 'bi-file-image',
        'jpeg': 'bi-file-image',
        'png': 'bi-file-image',
        'gif': 'bi-file-image',
        'zip': 'bi-file-zip',
        'rar': 'bi-file-zip',
        'txt': 'bi-file-text',
        'mp3': 'bi-file-music',
        'mp4': 'bi-file-play',
        'mov': 'bi-file-play',
        'avi': 'bi-file-play'
    };
    return icons[ext] || 'bi-file-earmark';
}

// Cập nhật icon thiết bị
function updateDeviceIcon(type) {
    const currentDeviceIcon = document.getElementById('currentDeviceIcon');
    if (currentDeviceIcon) {
        currentDeviceIcon.className = type === 'desktop'
            ? 'bi bi-pc-display'
            : 'bi bi-phone';
    }
}

// Generate a more stable device ID based on browser fingerprint
function generateDeviceId() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);

    const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL()
    ].join('|');

    // Create a simple hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }

    return 'device_' + Math.abs(hash).toString(36);
}

// Khởi tạo ứng dụng
function initializeApp() {
    currentDeviceType = detectDeviceType();
    updateDeviceIcon(currentDeviceType);

    // Generate or retrieve device ID
    if (!localStorage.getItem('deviceId')) {
        currentDeviceId = generateDeviceId();
        localStorage.setItem('deviceId', currentDeviceId);
    } else {
        currentDeviceId = localStorage.getItem('deviceId');
    }

    // Get device name - prompt user if not set
    let deviceName = localStorage.getItem('deviceName');
    if (!deviceName) {
        // Show device setup modal instead of auto-generating name
        showDeviceSetupModal();
        return;
    }

    document.getElementById('currentDeviceName').textContent = deviceName;
    document.getElementById('currentDeviceStatus').textContent = t('connecting');

    updateUI();

    // Initialize socket connection
    updateConnectionStatus('connecting');
    initializeSocket();
}

// Show device setup modal for first-time users
function showDeviceSetupModal() {
    // Create and show setup modal
    const setupModal = document.createElement('div');
    setupModal.className = 'modal fade';
    setupModal.id = 'deviceSetupModal';
    setupModal.setAttribute('data-bs-backdrop', 'static');
    setupModal.setAttribute('data-bs-keyboard', 'false');
    setupModal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Chào mừng đến với VigDrop!</h5>
                </div>
                <div class="modal-body">
                    <p>Vui lòng đặt tên cho thiết bị của bạn để bắt đầu chia sẻ file:</p>
                    <div class="mb-3">
                        <label for="initialDeviceName" class="form-label">Tên thiết bị</label>
                        <input type="text" class="form-control" id="initialDeviceName"
                               placeholder="Ví dụ: Máy tính của Nam" maxlength="50" required>
                        <div class="form-text">Tên này sẽ hiển thị cho các thiết bị khác trong mạng</div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" id="saveInitialName">Bắt đầu</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(setupModal);

    const modal = new bootstrap.Modal(setupModal);
    modal.show();

    // Handle save button
    document.getElementById('saveInitialName').addEventListener('click', () => {
        const deviceName = document.getElementById('initialDeviceName').value.trim();
        if (deviceName) {
            localStorage.setItem('deviceName', deviceName);
            modal.hide();
            setupModal.remove();

            // Continue with initialization
            document.getElementById('currentDeviceName').textContent = deviceName;
            document.getElementById('currentDeviceStatus').textContent = t('connecting');
            updateUI();
            updateConnectionStatus('connecting');
            initializeSocket();
        } else {
            // Show error
            const input = document.getElementById('initialDeviceName');
            input.classList.add('is-invalid');
            if (!input.nextElementSibling || !input.nextElementSibling.classList.contains('invalid-feedback')) {
                const feedback = document.createElement('div');
                feedback.className = 'invalid-feedback';
                feedback.textContent = 'Vui lòng nhập tên thiết bị';
                input.parentNode.appendChild(feedback);
            }
        }
    });

    // Handle enter key
    document.getElementById('initialDeviceName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('saveInitialName').click();
        }
    });

    // Focus on input
    setupModal.addEventListener('shown.bs.modal', () => {
        document.getElementById('initialDeviceName').focus();
    });
}

// Event handler functions
function handleDeviceNameUpdated(data) {
    // Cập nhật tên trong card thiết bị
    const deviceCard = document.getElementById('deviceList').querySelector(`[data-device-id="${data.id}"]`);
    if (deviceCard) {
        const nameElement = deviceCard.querySelector('.device-name');
        if (nameElement) {
            nameElement.textContent = data.name;
        }
    }
    // Cập nhật tên trong modal nếu đang mở
    const selectedDeviceName = document.getElementById('selectedDeviceName');
    if (selectedDeviceName && selectedDeviceId === data.id) {
        selectedDeviceName.textContent = data.name;
    }
}

function handleDeviceList(devices) {
    const deviceList = document.getElementById('deviceList');
    const noDevicesMessage = document.getElementById('noDevicesMessage');

    if (!deviceList) return;

    deviceList.innerHTML = '';

    const otherDevices = devices.filter(device => device.id !== currentDeviceId);

    if (otherDevices.length === 0) {
        if (noDevicesMessage) {
            noDevicesMessage.style.display = 'block';
        }
    } else {
        if (noDevicesMessage) {
            noDevicesMessage.style.display = 'none';
        }

        otherDevices.forEach(device => {
            const deviceCard = document.createElement('div');
            deviceCard.className = `card device-card`;
            deviceCard.dataset.deviceId = device.id;
            deviceCard.onclick = () => selectDevice(device);
            deviceCard.setAttribute('role', 'button');
            deviceCard.setAttribute('tabindex', '0');
            deviceCard.setAttribute('aria-label', `Share files with ${device.name}`);

            deviceCard.innerHTML = `
                <div class="card-body text-center">
                    <div class="device-icon">
                        <i class="bi ${device.type === 'desktop' ? 'bi-pc-display' : 'bi-phone'}"></i>
                    </div>
                    <div class="device-name">${device.name}</div>
                    <div class="device-status">${t('online')}</div>
                </div>
            `;

            // Add keyboard support
            deviceCard.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectDevice(device);
                }
            });

            deviceList.appendChild(deviceCard);
        });
    }
}

function handleFileDeleted(data) {
    const fileItem = document.querySelector(`.file-item[data-file-id="${data.fileId}"]`);
    if (fileItem) {
        fileItem.classList.add('expired');
        const expiryElement = fileItem.querySelector('.expiry-badge');
        if (expiryElement) {
            expiryElement.textContent = t('expired');
        }
        const downloadBtn = fileItem.querySelector('a');
        if (downloadBtn) {
            downloadBtn.classList.remove('btn-download');
            downloadBtn.classList.add('btn-secondary');
            downloadBtn.innerHTML = '<i class="bi bi-x-circle-fill"></i>';
            downloadBtn.removeAttribute('href');
            downloadBtn.removeAttribute('download');
        }
    }
}

function handleNewFile(fileInfo) {
    if (fileInfo.receiver === currentDeviceId) {
        addFileToList(fileInfo);

        // Hide empty state message
        const noFilesMessage = document.getElementById('noFilesMessage');
        if (noFilesMessage) {
            noFilesMessage.style.display = 'none';
        }

        // Show notification
        showToast(`New file received: ${fileInfo.name}`, 'success');
    }
}

// Chọn thiết bị
function selectDevice(device) {
    selectedDeviceId = device.id;
    const selectedDeviceName = document.getElementById('selectedDeviceName');
    if (selectedDeviceName) {
        selectedDeviceName.textContent = device.name;
    }
    const uploadModal = new bootstrap.Modal(document.getElementById('uploadModal'));
    uploadModal.show();
}

// File timer management
const fileTimers = new Map();

// Thêm file vào danh sách
function addFileToList(fileInfo) {
    const fileList = document.getElementById('fileList');
    if (!fileList) return;

    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.dataset.fileId = fileInfo.id;

    const size = formatFileSize(fileInfo.size);
    const time = new Date(fileInfo.uploadedAt).toLocaleString();
    const expiresAt = new Date(fileInfo.expiresAt);
    const isDownloaded = downloadedFiles.has(fileInfo.id);

    // Tạo countdown timer
    const expiryElement = document.createElement('div');
    expiryElement.className = 'expiry-badge';
    updateExpiryTime(expiryElement, expiresAt);

    // Lấy icon tương ứng với loại file
    const fileIcon = getFileIcon(fileInfo.name);

    fileItem.innerHTML = `
        <i class="bi ${fileIcon} file-icon" aria-hidden="true"></i>
        <div class="file-info">
            <div class="file-name">${fileInfo.name}</div>
            <div class="file-meta">
                <span>${size}</span>
                <span class="mx-2">•</span>
                <span>${t('from')}: ${fileInfo.senderName || fileInfo.sender || 'Unknown'}</span>
                <span class="mx-2">•</span>
                <span>${time}</span>
            </div>
        </div>
        <div class="file-actions">
            <button type="button" class="btn btn-icon preview-btn" data-file-info='${JSON.stringify(fileInfo)}' aria-label="Preview ${fileInfo.name}">
                <i class="bi bi-eye" aria-hidden="true"></i>
            </button>
            <a href="${fileInfo.path}" class="btn btn-icon ${isDownloaded ? 'btn-secondary' : 'btn-download'}" download aria-label="Download ${fileInfo.name}">
                <i class="bi ${isDownloaded ? 'bi-check-circle-fill' : 'bi-download'}" aria-hidden="true"></i>
            </a>
        </div>
    `;

    fileItem.appendChild(expiryElement);
    fileList.insertBefore(fileItem, fileList.firstChild);

    // Thêm event listener cho nút preview
    const previewBtn = fileItem.querySelector('.preview-btn');
    if (previewBtn) {
        previewBtn.addEventListener('click', () => {
            try {
                const fileInfo = JSON.parse(previewBtn.dataset.fileInfo);
                previewFile(fileInfo);
            } catch (error) {
                console.error('Error parsing file info:', error);
                showToast('Error opening file preview', 'danger');
            }
        });
    }

    // Xử lý sự kiện tải xuống
    const downloadBtn = fileItem.querySelector('a');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            downloadedFiles.add(fileInfo.id);
            downloadBtn.classList.remove('btn-download');
            downloadBtn.classList.add('btn-secondary');
            downloadBtn.innerHTML = '<i class="bi bi-check-circle-fill" aria-hidden="true"></i>';
            downloadBtn.setAttribute('aria-label', `${fileInfo.name} downloaded`);
        });
    }

    // Cập nhật thời gian còn lại mỗi giây
    const timer = setInterval(() => {
        if (!updateExpiryTime(expiryElement, expiresAt)) {
            clearInterval(timer);
            fileTimers.delete(fileInfo.id);
            fileItem.classList.add('expired');
            const downloadBtn = fileItem.querySelector('a');
            if (downloadBtn) {
                downloadBtn.classList.remove('btn-download');
                downloadBtn.classList.add('btn-secondary');
                downloadBtn.innerHTML = '<i class="bi bi-x-circle-fill" aria-hidden="true"></i>';
                downloadBtn.removeAttribute('href');
                downloadBtn.removeAttribute('download');
                downloadBtn.setAttribute('aria-label', `${fileInfo.name} expired`);
            }
        }
    }, 1000);

    // Store timer reference for cleanup
    fileTimers.set(fileInfo.id, timer);
}

// Cleanup function for file timers
function cleanupFileTimers() {
    fileTimers.forEach((timer, fileId) => {
        clearInterval(timer);
    });
    fileTimers.clear();
}

// Cập nhật thời gian còn lại
function updateExpiryTime(element, expiryDate) {
    const now = new Date();
    const diff = expiryDate - now;

    if (diff <= 0) {
        element.textContent = t('expired');
        return false;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    element.textContent = `${t('remaining')}: ${hours}${t('hours')} ${minutes}${t('minutes')} ${seconds}${t('seconds')}`;
    return true;
}

// Khởi tạo khi DOM đã tải xong
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();

    // Thêm các event listeners
    const renameDeviceBtn = document.getElementById('renameDevice');
    if (renameDeviceBtn) {
        renameDeviceBtn.addEventListener('click', () => {
            const newDeviceName = document.getElementById('newDeviceName');
            const currentDeviceName = document.getElementById('currentDeviceName');
            if (newDeviceName && currentDeviceName) {
                newDeviceName.value = currentDeviceName.textContent;
                new bootstrap.Modal(document.getElementById('renameModal')).show();
            }
        });
    }

    // Xử lý nút lưu tên mới
    const saveNewNameBtn = document.getElementById('saveNewName');
    if (saveNewNameBtn) {
        saveNewNameBtn.addEventListener('click', () => {
            const newName = document.getElementById('newDeviceName').value.trim();
            if (newName) {
                if (!socket || !socket.connected) {
                    showToast('Not connected to server. Please wait for connection to be restored.', 'danger');
                    return;
                }

                socket.emit('updateDeviceName', {
                    id: currentDeviceId,
                    name: newName
                });

                const currentDeviceName = document.getElementById('currentDeviceName');
                if (currentDeviceName) {
                    currentDeviceName.textContent = newName;
                }
                localStorage.setItem('deviceName', newName);
                bootstrap.Modal.getInstance(document.getElementById('renameModal')).hide();
                showToast(t('renameSuccess'), 'success');
            } else {
                showToast(t('enterNewName'), 'danger');
            }
        });
    }

    // Xử lý upload area
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');

    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());

        // Keyboard support for upload area
        uploadArea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInput.click();
            }
        });

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            // Only remove dragover if we're leaving the upload area entirely
            if (!uploadArea.contains(e.relatedTarget)) {
                uploadArea.classList.remove('dragover');
            }
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                handleFileSelect(e.dataTransfer.files);
            }
        });
    }

    // Xử lý chọn file
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                handleFileSelect(e.target.files);
            }
        });
    }

    // Xử lý nút upload
    if (uploadButton) {
        uploadButton.addEventListener('click', handleUpload);
    }
});

// Xử lý chọn file
function handleFileSelect(files) {
    const uploadFileList = document.getElementById('uploadFileList');
    if (!uploadFileList) return;

    Array.from(files).forEach(file => {
        if (!selectedFiles.some(f => f.name === file.name)) {
            selectedFiles.push(file);
            addFileToUploadList(file);
        }
    });

    const uploadButton = document.getElementById('uploadButton');
    if (uploadButton) {
        uploadButton.disabled = selectedFiles.length === 0;
    }
}

// Thêm file vào danh sách upload
function addFileToUploadList(file) {
    const uploadFileList = document.getElementById('uploadFileList');
    if (!uploadFileList) return;

    const row = document.createElement('tr');
    row.dataset.fileName = file.name;

    const fileIcon = getFileIcon(file.name);
    const size = formatFileSize(file.size);
    const ext = file.name.split('.').pop().toUpperCase();

    row.innerHTML = `
        <td>
            <i class="bi ${fileIcon} me-2"></i>
            ${file.name}
        </td>
        <td>${size}</td>
        <td>${ext}</td>
        <td>
            <button type="button" class="btn btn-sm btn-danger remove-file-btn">
                <i class="bi bi-trash"></i>
            </button>
        </td>
    `;

    const removeBtn = row.querySelector('.remove-file-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            selectedFiles = selectedFiles.filter(f => f.name !== file.name);
            row.remove();
            const uploadButton = document.getElementById('uploadButton');
            if (uploadButton) {
                uploadButton.disabled = selectedFiles.length === 0;
            }
        });
    }

    uploadFileList.appendChild(row);
}

// Xử lý upload
async function handleUpload() {
    if (selectedFiles.length === 0 || !selectedDeviceId) {
        showToast('Please select files and a target device', 'warning');
        return;
    }

    if (!socket || !socket.connected) {
        showToast('Not connected to server. Please wait for connection to be restored.', 'danger');
        return;
    }

    const uploadArea = document.getElementById('uploadArea');
    const uploadButton = document.getElementById('uploadButton');
    const progressBar = document.getElementById('uploadProgress');

    if (!uploadArea || !uploadButton || !progressBar) return;

    // Hiển thị trạng thái loading
    uploadArea.classList.add('loading');
    uploadButton.disabled = true;

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('senderId', currentDeviceId);
        formData.append('receiverId', selectedDeviceId);

        try {
            const result = await uploadFileWithRetry(formData, file, progressBar, i, selectedFiles.length);
            if (result.success) {
                successCount++;
            } else {
                failCount++;
                showToast(`${t('uploadError')} ${file.name}: ${result.error}`, 'danger');
            }
        } catch (error) {
            failCount++;
            console.error('Lỗi khi tải lên:', error);
            showToast(`${t('uploadError')} ${file.name}`, 'danger');
        }
    }

    // Upload hoàn tất
    bootstrap.Modal.getInstance(document.getElementById('uploadModal')).hide();
    resetUploadForm();

    if (successCount > 0 && failCount === 0) {
        showToast(t('uploadSuccess'), 'success');
    } else if (successCount > 0 && failCount > 0) {
        showToast(`${successCount} files uploaded successfully, ${failCount} failed`, 'warning');
    } else {
        showToast('All uploads failed. Please try again.', 'danger');
    }
}

async function uploadFileWithRetry(formData, file, progressBar, fileIndex, totalFiles, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await uploadFile(formData, progressBar, fileIndex, totalFiles);
            return {success: true, result};
        } catch (error) {
            console.error(`Upload attempt ${attempt} failed for ${file.name}:`, error);

            if (attempt === maxRetries) {
                return {success: false, error: error.message};
            }

            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
    }
}

function uploadFile(formData, progressBar, fileIndex, totalFiles) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/upload', true);

        // Set timeout
        xhr.timeout = 60000; // 60 seconds

        // Xử lý tiến trình upload
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const fileProgress = (e.loaded / e.total) * 100;
                const totalProgress = ((fileIndex + (e.loaded / e.total)) / totalFiles) * 100;
                progressBar.style.width = totalProgress + '%';
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response);
                } catch (e) {
                    reject(new Error('Invalid server response'));
                }
            } else {
                reject(new Error(`Server error: ${xhr.status} ${xhr.statusText}`));
            }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.ontimeout = () => reject(new Error('Upload timeout'));

        xhr.send(formData);
    });
}

// Reset form upload
function resetUploadForm() {
    selectedFiles = [];
    const fileInput = document.getElementById('fileInput');
    const uploadFileList = document.getElementById('uploadFileList');
    const uploadButton = document.getElementById('uploadButton');
    const uploadArea = document.getElementById('uploadArea');
    const progressBar = document.getElementById('uploadProgress');

    if (fileInput) fileInput.value = '';
    if (uploadFileList) uploadFileList.innerHTML = '';
    if (uploadButton) uploadButton.disabled = true;
    if (uploadArea) uploadArea.classList.remove('loading');
    if (progressBar) progressBar.style.width = '0';
}

// Hiển thị thông báo
function showToast(message, type = 'info') {
    // Tạo toast element
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    // Thêm toast vào container
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    toastContainer.appendChild(toast);
    document.body.appendChild(toastContainer);

    // Hiển thị toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    // Xóa toast sau khi ẩn
    toast.addEventListener('hidden.bs.toast', () => {
        toastContainer.remove();
    });
}

// Loading overlay functions
function showLoadingOverlay(message = 'Loading...') {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="text-center">
                <div class="loading-spinner"></div>
                <div class="mt-3" id="loadingMessage">${message}</div>
            </div>
        `;
        document.body.appendChild(overlay);
    } else {
        document.getElementById('loadingMessage').textContent = message;
        overlay.style.display = 'flex';
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function updateLoadingMessage(message) {
    const messageElement = document.getElementById('loadingMessage');
    if (messageElement) {
        messageElement.textContent = message;
    }
}

// Biến toàn cục để lưu instance của modal
let previewModal = null;

// Xử lý khi click vào nút xem trước file
function previewFile(fileInfo) {
    const modalElement = document.getElementById('filePreviewModal');

    // Nếu modal đã tồn tại, hủy nó trước
    if (previewModal) {
        previewModal.dispose();
    }

    // Tạo instance mới của modal
    previewModal = new bootstrap.Modal(modalElement, {
        focus: true,
        keyboard: true
    });

    const previewContainer = document.getElementById('filePreviewContainer');
    const previewContent = document.getElementById('previewContent');
    const previewFileName = document.getElementById('previewFileName');
    const previewFileSize = document.getElementById('previewFileSize');
    const previewFileSender = document.getElementById('previewFileSender');
    const previewFileTime = document.getElementById('previewFileTime');
    const previewFileIcon = document.getElementById('previewFileIcon');
    const downloadFileBtn = document.getElementById('downloadFileBtn');
    const closeBtn = document.querySelector('#filePreviewModal .btn-close');
    const cancelBtn = document.querySelector('#filePreviewModal .btn-secondary');

    if (!previewContainer || !previewContent || !previewFileName || !previewFileSize ||
        !previewFileSender || !previewFileTime || !previewFileIcon || !downloadFileBtn ||
        !closeBtn || !cancelBtn) {
        return;
    }

    // Cập nhật thông tin file
    previewFileName.textContent = fileInfo.name;
    previewFileSize.textContent = formatFileSize(fileInfo.size);
    previewFileSender.textContent = `${t('from')}: ${fileInfo.senderName || fileInfo.sender || 'Unknown'}`;
    previewFileTime.textContent = new Date(fileInfo.uploadedAt).toLocaleString();
    previewFileIcon.className = `bi ${getFileIcon(fileInfo.name)}`;
    downloadFileBtn.href = fileInfo.path;

    // Xóa nội dung preview cũ
    previewContent.innerHTML = '';

    // Kiểm tra loại file để hiển thị preview phù hợp
    const ext = fileInfo.name.split('.').pop().toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif'];
    const textExts = ['txt', 'md', 'json', 'js', 'css', 'html'];
    const pdfExts = ['pdf'];

    if (imageExts.includes(ext)) {
        // Preview ảnh
        const img = document.createElement('img');
        img.src = fileInfo.path;
        img.alt = fileInfo.name;
        previewContent.appendChild(img);
    } else if (textExts.includes(ext)) {
        // Preview text
        fetch(fileInfo.path)
            .then(response => response.text())
            .then(text => {
                const pre = document.createElement('pre');
                pre.className = 'bg-light p-3 rounded';
                pre.textContent = text;
                previewContent.appendChild(pre);
            })
            .catch(error => {
                console.error('Lỗi khi đọc file text:', error);
                previewContent.innerHTML = `<div class="alert alert-warning">${t('errorReading')}</div>`;
            });
    } else if (pdfExts.includes(ext)) {
        // Preview PDF
        const iframe = document.createElement('iframe');
        iframe.src = fileInfo.path;
        iframe.style.width = '100%';
        iframe.style.height = '500px';
        iframe.style.border = 'none';
        previewContent.appendChild(iframe);
    } else {
        // Không thể preview
        previewContent.innerHTML = `<div class="alert alert-info">${t('cannotPreview')}</div>`;
    }

    // Xử lý sự kiện khi modal mở
    modalElement.addEventListener('show.bs.modal', () => {
        // Loại bỏ aria-hidden
        modalElement.removeAttribute('aria-hidden');
    });

    // Xử lý sự kiện khi modal đóng
    modalElement.addEventListener('hidden.bs.modal', () => {
        // Thêm lại aria-hidden
        modalElement.setAttribute('aria-hidden', 'true');

        // Reset focus về nút preview
        const previewBtn = document.querySelector(`.preview-btn[data-file-info='${JSON.stringify(fileInfo)}']`);
        if (previewBtn) {
            previewBtn.focus();
        }
    });

    // Xử lý nút đóng modal
    closeBtn.addEventListener('click', () => {
        previewModal.hide();
    });

    // Xử lý nút hủy
    cancelBtn.addEventListener('click', () => {
        previewModal.hide();
    });

    // Xử lý khi nhấn phím ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalElement.classList.contains('show')) {
            previewModal.hide();
        }
    });

    // Hiển thị modal
    previewModal.show();

    // Focus vào nút đóng modal
    closeBtn.focus();
}

// Cleanup functions
function cleanup() {
    // Clear all timers
    cleanupFileTimers();

    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    // Disconnect socket
    if (socket) {
        isManualDisconnect = true;
        socket.disconnect();
    }
}

// Page lifecycle management
window.addEventListener('beforeunload', cleanup);
window.addEventListener('unload', cleanup);

// Handle visibility change for better performance
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, reduce activity
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
        }
    } else {
        // Page is visible again, check connection
        if (socket && !socket.connected && !isManualDisconnect) {
            scheduleReconnect();
        }
    }
});

// Export các hàm cần thiết
window.app = {
    changeLanguage,
    t,
    initializeApp,
    previewFile,
    refreshDevices,
    resetDeviceName,
    cleanup
};