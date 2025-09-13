# Version {version}

## 🚀 New Features
- Cross-platform protocol testing tool with support for TCP, UDP, WebSocket, MQTT, and SSE connections
- Intuitive user interface for sending and receiving protocol messages
- Real-time message logging and response tracking
- Support for various data formats (JSON, XML, Plain Text, Binary, Hex, Base64)
- Session management for different protocol types
- Client connection management for server sessions

## 🔧 Improvements
- **Fixed TCP server duplicate connection issues**: Resolved automatic reconnection problems on startup
- **Improved sidebar display**: Server sessions now correctly show connected clients instead of self-reference
- **Enhanced connection state management**: Fixed status synchronization between backend and frontend
- **Better error handling**: Improved error messages and retry logic for network operations
- **Cross-compilation fixes**: Resolved build issues for multiple platforms

## 📦 Platform Support
- **Windows**: MSI installer, NSIS installer, and MSIX package (Microsoft Store) for both x64 and x86 architectures
- **macOS**: Separate packages for Intel x64 and Apple Silicon (ARM64)
- **Linux**: Packages for x86_64 architecture (ARM64 support planned for future releases)

## 📝 Installation Notes
- Download the appropriate package for your platform from the release assets
- Windows users can choose between MSI installer (recommended) or NSIS installer
- macOS users should download the package matching their processor architecture
- Linux users can install the appropriate package for their system architecture

## 🔗 Links
- [Documentation](https://github.com/chenqi92/keke-proto-tool)
- [Issues](https://github.com/chenqi92/keke-proto-tool/issues)
- [Discussions](https://github.com/chenqi92/keke-proto-tool/discussions)

---

*This release was automatically generated. For detailed changes, please check the commit history.*
