<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

# Backend API Documentation

## Overview
This document provides an overview of the backend services, their endpoints, and the data they accept and return.

## Services

### App Service
- **Description**: Provides a simple greeting message.
- **Endpoints**:
  - `GET /`: Returns a greeting message.
- **Data**:
  - **Returns**: `{ message: string }`

### Notification Service
- **Description**: Manages notifications.
- **Endpoints**:
  - `GET /notification/status`: Returns the status of the notification service.
- **Data**:
  - **Returns**: `{ status: string }`

### Auth Service
- **Description**: Handles user authentication.
- **Endpoints**:
  - `POST /auth/signup`: Registers a new user.
    - **Accepts**: `{ email: string, password: string }`
    - **Returns**: `{ user: User }`
  - `POST /auth/login`: Authenticates a user.
    - **Accepts**: `{ email: string, password: string }`
    - **Returns**: `{ access_token: string }`

### Payment Service
- **Description**: Manages payment operations.
- **Endpoints**:
  - `POST /payment/create-checkout-session`: Creates a checkout session.
    - **Accepts**: `{ amount: number, currency: string }`
    - **Returns**: `{ sessionId: string }`
  - `POST /payment/create-subscription`: Creates a subscription.
    - **Accepts**: `{ customerId: string, priceId: string }`
    - **Returns**: `{ subscriptionId: string }`
  - `POST /payment/cancel-subscription`: Cancels a subscription.
    - **Accepts**: `{ subscriptionId: string }`
    - **Returns**: `{ status: string }`
  - `POST /payment/webhook`: Handles Stripe webhook events.
    - **Accepts**: Stripe event payload
    - **Returns**: `{ received: boolean }`

### Admin Service
- **Description**: Manages administrative tasks.
- **Endpoints**:
  - `GET /admin/users`: Lists all users.
    - **Returns**: `User[]`
  - `PUT /admin/users/:id`: Updates a user.
    - **Accepts**: `{ userData: any }`
    - **Returns**: `{ user: User }`
  - `DELETE /admin/users/:id`: Deletes a user.
    - **Returns**: `{ message: string }`
  - `POST /admin/tickets`: Creates a support ticket.
    - **Accepts**: `{ userId: string, issue: string }`
    - **Returns**: `{ ticket: Ticket }`
  - `GET /admin/tickets`: Lists all support tickets.
    - **Returns**: `Ticket[]`
  - `PUT /admin/tickets/:id`: Updates a support ticket.
    - **Accepts**: `{ status: string }`
    - **Returns**: `{ ticket: Ticket }`

### Dashboard Service
- **Description**: Tracks user events and engagement.
- **Endpoints**:
  - `POST /dashboard/track-event`: Tracks an event.
    - **Accepts**: `{ event: string, properties: Record<string, any> }`
    - **Returns**: `{ message: string }`
  - `POST /dashboard/track-user-engagement`: Tracks user engagement.
    - **Accepts**: `{ userId: string, event: string, properties: Record<string, any> }`
    - **Returns**: `{ message: string }`

## Data Models
- **User**: Represents a user in the system.
- **Ticket**: Represents a support ticket.

## Authentication
All endpoints require a valid JWT token for authentication, except for the signup and webhook endpoints.

## Error Handling
Errors are returned in the following format:
```json
{
  "statusCode": number,
  "message": string
}
```
