// Các biến toàn cục
const socket = io();
let currentDeviceId = null;
let selectedDeviceId = null;
let selectedFiles = [];
let downloadedFiles = new Set();
let currentDeviceType = 'desktop';
let currentLanguage = localStorage.getItem('language') || 'vi';

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

// Khởi tạo ứng dụng
function initializeApp() {
    currentDeviceType = detectDeviceType();
    updateDeviceIcon(currentDeviceType);

    if (!localStorage.getItem('deviceId')) {
        currentDeviceId = getRandomName() + '-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('deviceId', currentDeviceId);
    } else {
        currentDeviceId = localStorage.getItem('deviceId');
    }

    const savedName = localStorage.getItem('deviceName');
    const deviceName = savedName || getRandomName();

    socket.emit('registerDevice', {
        id: currentDeviceId,
        name: deviceName,
        type: currentDeviceType
    });

    document.getElementById('currentDeviceName').textContent = deviceName;
    document.getElementById('currentDeviceStatus').textContent = t('connecting');
    
    updateUI();
}

// Xử lý khi có thiết bị đổi tên
socket.on('deviceNameUpdated', (data) => {
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
});

// Cập nhật danh sách thiết bị
socket.on('deviceList', (devices) => {
    const deviceList = document.getElementById('deviceList');
    if (!deviceList) return;
    
    deviceList.innerHTML = '';
    devices.forEach(device => {
        if (device.id !== currentDeviceId) {
            const deviceCard = document.createElement('div');
            deviceCard.className = `card device-card`;
            deviceCard.dataset.deviceId = device.id;
            deviceCard.onclick = () => selectDevice(device);

            deviceCard.innerHTML = `
                <div class="card-body text-center">
                    <div class="device-icon">
                        <i class="bi ${device.type === 'desktop' ? 'bi-pc-display' : 'bi-phone'}"></i>
                    </div>
                    <div class="device-name">${device.name}</div>
                    <div class="device-status">${t('online')}</div>
                </div>
            `;

            deviceList.appendChild(deviceCard);
        }
    });
});

// Xử lý sự kiện file bị xóa
socket.on('fileDeleted', (data) => {
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
});

// Xử lý sự kiện khi có file mới
socket.on('newFile', (fileInfo) => {
    if (fileInfo.receiver === currentDeviceId) {
        addFileToList(fileInfo);
    }
});

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
        <i class="bi ${fileIcon} file-icon"></i>
        <div class="file-info">
            <div class="file-name">${fileInfo.name}</div>
            <div class="file-meta">
                <span>${size}</span>
                <span class="mx-2">•</span>
                <span>${t('from')}: ${fileInfo.sender}</span>
                <span class="mx-2">•</span>
                <span>${time}</span>
            </div>
        </div>
        <div class="file-actions">
            <button type="button" class="btn btn-icon preview-btn" data-file-info='${JSON.stringify(fileInfo)}'>
                <i class="bi bi-eye"></i>
            </button>
            <a href="${fileInfo.path}" class="btn btn-icon ${isDownloaded ? 'btn-secondary' : 'btn-download'}" download>
                <i class="bi ${isDownloaded ? 'bi-check-circle-fill' : 'bi-download'}"></i>
            </a>
        </div>
    `;

    fileItem.appendChild(expiryElement);
    fileList.insertBefore(fileItem, fileList.firstChild);

    // Thêm event listener cho nút preview
    const previewBtn = fileItem.querySelector('.preview-btn');
    if (previewBtn) {
        previewBtn.addEventListener('click', () => {
            const fileInfo = JSON.parse(previewBtn.dataset.fileInfo);
            previewFile(fileInfo);
        });
    }

    // Xử lý sự kiện tải xuống
    const downloadBtn = fileItem.querySelector('a');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            downloadedFiles.add(fileInfo.id);
            downloadBtn.classList.remove('btn-download');
            downloadBtn.classList.add('btn-secondary');
            downloadBtn.innerHTML = '<i class="bi bi-check-circle-fill"></i>';
        });
    }

    // Cập nhật thời gian còn lại mỗi giây
    const timer = setInterval(() => {
        if (!updateExpiryTime(expiryElement, expiresAt)) {
            clearInterval(timer);
            fileItem.classList.add('expired');
            const downloadBtn = fileItem.querySelector('a');
            if (downloadBtn) {
                downloadBtn.classList.remove('btn-download');
                downloadBtn.classList.add('btn-secondary');
                downloadBtn.innerHTML = '<i class="bi bi-x-circle-fill"></i>';
                downloadBtn.removeAttribute('href');
                downloadBtn.removeAttribute('download');
            }
        }
    }, 1000);
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

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
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
    if (selectedFiles.length === 0 || !selectedDeviceId) return;

    const uploadArea = document.getElementById('uploadArea');
    const uploadButton = document.getElementById('uploadButton');
    const progressBar = document.getElementById('uploadProgress');

    if (!uploadArea || !uploadButton || !progressBar) return;

    // Hiển thị trạng thái loading
    uploadArea.classList.add('loading');
    uploadButton.disabled = true;

    for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('senderId', currentDeviceId);
        formData.append('receiverId', selectedDeviceId);

        try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/upload', true);

            // Xử lý tiến trình upload
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    progressBar.style.width = percentComplete + '%';
                }
            };

            await new Promise((resolve, reject) => {
                xhr.onload = () => {
                    if (xhr.status === 200) {
                        resolve();
                    } else {
                        reject(new Error('Upload failed'));
                    }
                };

                xhr.onerror = () => reject(new Error('Upload error'));

                xhr.send(formData);
            });
        } catch (error) {
            console.error('Lỗi khi tải lên:', error);
            showToast(`${t('uploadError')} ${file.name}`, 'danger');
        }
    }

    // Upload hoàn tất
    bootstrap.Modal.getInstance(document.getElementById('uploadModal')).hide();
    resetUploadForm();
    showToast(t('uploadSuccess'), 'success');
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
    previewFileSender.textContent = `${t('from')}: ${fileInfo.sender}`;
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

// Export các hàm cần thiết
window.app = {
    changeLanguage,
    t,
    initializeApp,
    previewFile
}; 