# 3D Sphere AI Chat Interface

A beautiful, interactive 3D gradient sphere with AI chat interface built with Next.js, React Three Fiber, and physically-based rendering.

Screenshot 2025-06-17 at 14.20.36.png

## ✨ Features

- **Interactive 3D Sphere**: Physically-based rendered sphere with realistic lighting
- **Seamless Gradient**: Beautiful color transitions from pink → purple → blue
- **AI Chat Interface**: Clean, modern chat UI with voice interaction controls
- **Real-time Lighting**: Advanced PBS materials with subsurface scattering
- **Mobile Responsive**: Optimized for all devices and screen sizes
- **Smooth Animations**: Auto-rotation and floating animations
- **Touch Controls**: Orbit controls for interactive exploration

## 🚀 Live Demo

**[View Live Demo →](https://your-app-name.vercel.app)**

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **3D Graphics**: React Three Fiber + Three.js
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Typography**: Segoe UI font family
- **Deployment**: Vercel

## 🎨 Visual Features

### 3D Sphere Properties
- **Materials**: Physically-based shading (PBS)
- **Lighting**: Real-time directional and point lights
- **Effects**: Subsurface scattering, clearcoat reflections
- **Animation**: Gentle floating motion with auto-rotation
- **Size**: Optimized 25% smaller for better mobile experience

### AI Chat Interface
- **Voice Controls**: Microphone, settings, and close buttons
- **Status Display**: "I'm listening" interactive text
- **Glass Morphism**: Translucent control panel with backdrop blur
- **Responsive Design**: Adapts to all screen sizes

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/3d-sphere-ai-chat.git

# Navigate to project directory
cd 3d-sphere-ai-chat

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 📱 Usage

### Desktop
- **Drag**: Rotate the sphere
- **Scroll**: Zoom in/out
- **Click buttons**: Interact with AI controls

### Mobile
- **Touch & drag**: Rotate the sphere
- **Pinch**: Zoom in/out
- **Tap buttons**: Access AI features

## 🎛️ Customization

### Sphere Colors
Edit the gradient in `interactive-sphere.tsx`:

```javascript
gradient.addColorStop(0, "#FF1493")    // Pink
gradient.addColorStop(0.5, "#1E90FF")  // Blue  
gradient.addColorStop(1, "#9932CC")    // Purple
```

### Sphere Position
Adjust the Y position in the `useFrame` hook:

```javascript
meshRef.current.position.y = 0 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1
```

### UI Text
Modify the chat interface text in `mobile-chat-ui.tsx`:

```javascript
{isListening ? "I'm listening" : "How can I help?"}
```

## 🔧 Configuration

### Environment Variables
No environment variables required for basic functionality.

### Build Configuration
The app uses Next.js default configuration optimized for:
- Static export compatibility
- Vercel deployment
- Mobile performance

## 📦 Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx           # Main page component
│   └── globals.css        # Global styles
├── components/
│   └── ui/                # shadcn/ui components
├── interactive-sphere.tsx  # 3D sphere component
├── mobile-chat-ui.tsx     # Chat interface overlay
└── README.md
```

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy with one click

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/3d-sphere-ai-chat)

### Other Platforms
- **Netlify**: Supports Next.js static export
- **GitHub Pages**: Use `next export` for static deployment
- **Docker**: Containerized deployment ready

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Three.js** - 3D graphics library
- **React Three Fiber** - React renderer for Three.js  
- **shadcn/ui** - Beautiful UI components
- **Vercel** - Deployment platform
- **Next.js** - React framework

## 📞 Support

If you have any questions or need help:

- 📧 Email: your-email@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/3d-sphere-ai-chat/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/3d-sphere-ai-chat/discussions)

---

**Made with ❤️ and React Three Fiber**

⭐ Star this repo if you found it helpful!
```

This README provides:

- **Clear project description** with visual appeal
- **Live demo link** placeholder for your deployment
- **Complete tech stack** information
- **Step-by-step setup** instructions
- **Usage guidelines** for desktop and mobile
- **Customization examples** for common modifications
- **Deployment options** with Vercel button
- **Contributing guidelines** for open source collaboration
- **Professional formatting** with emojis and badges

Just replace `yourusername` and `your-app-name` with your actual GitHub username and app name!

