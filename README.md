# VigDrop - Local File Sharing Application

A simple application for sharing files between devices on the same local network.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

## 🚀 Features

- 📤 Upload files from any device on the network
- 🔄 Real-time file updates for all connected devices
- 📥 Download shared files
- ℹ️ Display file information (name, size, upload time)
- 🎯 Drag and drop interface
- 🔍 File preview support
- 🔒 Secure file transfer
- ⚡ No internet connection required

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Real-time Communication**: Socket.io
- **Frontend**: HTML5, CSS3, JavaScript
- **File Handling**: Multer
- **Database**: SQLite3

## 📦 Installation

1. Install Node.js if you haven't already
2. Clone this repository
3. Install dependencies:

```bash
npm install
```

## 🚀 Usage

1. Start the server with default port (3000):

```bash
npm start
```

2. Or start with custom port:

```bash
node server.js -p 3030
# or
node server.js --port 3030
```

3. To clean up files in uploads directory that haven't been received by any device:

```bash
npm run clean
```

4. Open your browser and navigate to:

```
http://localhost:3000
```

4. For other devices on the local network, use the IP address of the computer running the server:

```
http://[IP_ADDRESS]:3000
```

## 📁 Supported File Types

- Images (JPG, PNG, GIF)
- Documents (PDF, TXT, DOC, DOCX)
- Videos (MP4, AVI, MOV)
- Audio (MP3, WAV)
- Archives (ZIP, RAR)

## 🔒 Security Features

- Files are transferred directly between devices
- No files are stored permanently on the server
- Files are automatically deleted after 3 hours
- All transfers are encrypted
- Works only within local network

## ⚠️ Important Notes

- The application only works within the local network
- Files are stored in the `uploads` directory
- Ensure port 3000 (or your custom port) is not blocked by your firewall
- Requires Node.js 14.x or higher
- Works best with modern browsers (Chrome, Firefox, Safari, Edge)

## 📝 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**Nghĩa Nè**

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Made with ❤️ for VigDrop - Easy local file sharing
