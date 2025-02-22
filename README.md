# 🚀 Modern SaaS Starter Kit

A production-ready, full-stack SaaS starter kit built with Next.js, NestJS, and modern web technologies. This template provides everything you need to launch your SaaS product quickly while following best practices.

## ✨ Features

### Frontend (`/web`)
- **Next.js 14** with App Router and Server Components
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Secure Authentication** system
- **Responsive Design** out of the box
- **Modern UI Components**
- **State Management** with React Context
- **Form Handling** with best practices
- **SEO Optimized**
- **Accessibility** built-in

### Backend (`/api/backend`)
- **NestJS** framework for scalable server-side applications
- **TypeScript** for type safety
- **Prisma** as the ORM
- **RESTful API** design
- **Authentication & Authorization**
- **Rate Limiting** for API protection
- **Error Logging** and monitoring
- **Unit & Integration Tests** setup
- **API Documentation** with Swagger

## 🛠 Tech Stack

- **Frontend**: Next.js, TypeScript, Tailwind CSS, React Context
- **Backend**: NestJS, Prisma, TypeScript
- **Database**: PostgreSQL (configurable)
- **Authentication**: JWT, OAuth providers
- **Testing**: Jest, React Testing Library
- **DevOps**: Docker support, CI/CD ready
- **API Documentation**: Swagger/OpenAPI

## 📁 Project Structure

```
├── web/                  # Frontend Next.js application
│   ├── app/             # App router pages and layouts
│   ├── components/      # Reusable UI components
│   ├── contexts/        # React Context providers
│   ├── utils/           # Utility functions
│   ├── styles/          # Global styles
│   └── public/          # Static assets
│
├── api/
│   └── backend/         # NestJS backend application
│       ├── src/         # Source code
│       ├── prisma/      # Database schema and migrations
│       └── test/        # Test files
```

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL
- pnpm (recommended) or npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/sass-starter.git
cd sass-starter
```

2. Install dependencies:
```bash
# Install frontend dependencies
cd web
pnpm install

# Install backend dependencies
cd ../api/backend
pnpm install
```

3. Set up environment variables:
```bash
# Frontend (.env in /web)
cp .env.example .env

# Backend (.env in /api/backend)
cp .env.example .env
```

4. Start the development servers:
```bash
# Frontend (in /web directory)
pnpm dev

# Backend (in /api/backend directory)
pnpm start:dev
```

## 🔒 Security Features

- CSRF Protection
- XSS Prevention
- Rate Limiting
- Input Validation
- Secure Headers
- Environment Variable Protection
- SQL Injection Prevention
- Authentication & Authorization
- API Security Best Practices

## 📱 Mobile Responsiveness

The frontend is built with a mobile-first approach and is fully responsive across all device sizes:
- Mobile phones
- Tablets
- Desktops
- Large screens

## 🧪 Testing

```bash
# Run frontend tests
cd web
pnpm test

# Run backend tests
cd api/backend
pnpm test
```

## 📚 Documentation

- [Frontend Documentation](/web/README.md)
- [Backend Documentation](/api/backend/README.md)
- [API Documentation](http://localhost:3001/api) (available when backend is running)

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- NestJS team for the robust backend framework
- All the open-source contributors

## 🆘 Support

For support, email support@yourdomain.com or join our Discord community. 