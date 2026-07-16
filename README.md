# Event Ticketing

Tổng quan ngắn gọn về công nghệ và cấu trúc thư mục của repo.

## Công nghệ

### Backend

- NestJS 11 + TypeScript: xây dựng REST API.
- Prisma 7 + PostgreSQL: ORM và database chính.
- `@prisma/adapter-pg` + `pg`: adapter kết nối database cho Prisma 7.
- `@nestjs/swagger`: tạo Swagger UI và OpenAPI JSON.
- Passport JWT + `@nestjs/jwt`: xác thực bằng bearer token.
- `@nestjs/config` + Joi: cấu hình và validate biến môi trường.
- `nestjs-pino` + Pino: logging request và runtime.
- Jest: test backend.

### App

- Expo 54 + React Native 0.81 + React 19: nền tảng mobile app.
- Expo Router 6: routing theo file.
- NativeWind + Tailwind CSS: styling.
- TanStack Query: quản lý server state.
- Zustand: quản lý local state.
- Expo Secure Store + Async Storage: lưu token, user và cấu hình local.
- `i18next` + `react-i18next`: đa ngôn ngữ.
- Socket.IO client: chuẩn bị cho realtime.
- `openapi-typescript`: sinh type API từ OpenAPI backend.

## Cấu trúc thư mục

```text
event-ticketing/
├── app/                    # Ứng dụng mobile Expo
│   ├── src/
│   │   ├── app/            # Route theo Expo Router
│   │   ├── components/     # Component UI dùng lại
│   │   ├── constants/      # Theme, token, cấu hình giao diện
│   │   ├── hooks/          # React hooks dùng chung
│   │   ├── i18n/           # Bản dịch vi/en
│   │   ├── lib/            # API client, auth, format, mock, socket
│   │   └── stores/         # Zustand stores
│   ├── package.json
│   └── README.md
│
├── backend/                # API server NestJS
│   ├── prisma/
│   │   ├── schema.prisma   # Prisma schema
│   │   └── seed.ts         # Seed dữ liệu phát triển
│   ├── src/
│   │   ├── common/         # Error code, filter, middleware
│   │   ├── config/         # Runtime config, env validation, logger
│   │   ├── modules/        # Feature modules, hiện có auth
│   │   ├── prisma/         # Prisma module/service
│   │   ├── app.module.ts   # Root module
│   │   └── main.ts         # Bootstrap app
│   ├── test/               # E2E tests
│   ├── package.json
│   └── README.md
│
├── .nvmrc                  # Node.js version dùng chung
└── README.md               # Tổng quan repo
```
