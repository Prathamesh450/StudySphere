# StudySphere

StudySphere is a comprehensive learning platform designed to help students collaborate, share resources, and study more effectively. The platform offers tools for managing past papers, participating in discussions, accessing study resources, and forming study groups.

## Features

- **🔍 Past Papers**: Access and download previous exam papers organized by subject.
- **💬 Discussion Forums**: Join academic forums to ask questions and collaborate with peers.
- **📚 Study Resources**: Find and share study materials, notes, and other learning resources.
- **👥 Study Groups**: Create or join study groups to collaborate with peers.
- **📅 Study Sessions**: Schedule and participate in study sessions with group members.
- **👤 User Profiles**: Manage your profile and track your activities on the platform.

## Tech Stack

- **Frontend**: React with TypeScript
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **Routing**: Wouter for client-side routing
- **State Management**: React Query for server state management
- **Backend**: Node.js (API details in server directory)
- **Database**: Drizzle ORM (SQL database)

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/StudySphere.git
   cd StudySphere
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
StudySphereApp/
├── client/            # Frontend code
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utility functions
│   │   ├── pages/       # Page components
├── server/            # Backend API
├── shared/            # Shared types and schemas
├── public/            # Static assets
```

## Usage

1. **Registration**: Create an account to get started.
2. **Browse Content**: Explore past papers, discussions, and study resources.
3. **Join Groups**: Find and join study groups relevant to your courses.
4. **Create Sessions**: Schedule study sessions with your groups.
5. **Share Resources**: Upload and share study materials with the community.

## Contributing

We welcome contributions to StudySphere! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Icons provided by [Lucide](https://lucide.dev/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Design inspiration from various educational platforms 
