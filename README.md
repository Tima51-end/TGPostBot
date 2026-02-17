TG Posts Bot
A professional Telegram Content Management System for automated channel administration.

This bot is designed to handle scheduled media publications, global metadata management, and persistent storage integration. It is optimized for high availability on containerized cloud infrastructure.

Core Functionality
Asynchronous Media Scheduling: Precise scheduling of posts containing photos or videos with per-minute accuracy.

Media Group Processing: Advanced handling of Telegram media groups (albums) ensuring visual integrity during automated posting.

Global Metadata Configuration: Centralized management of default descriptions and action buttons stored in a persistent database.

Timezone Synchronization: Native support for regional time offsets, specifically configured for Eastern European Time (Europe/Kyiv).

Session-Based Interaction: Sequential user input handling for seamless content creation workflows.

Technical Architecture
Runtime Environment: Node.js utilizing TypeScript for type-safe development.

Bot Framework: grammY (High-performance Telegram Bot API framework).

Database Layer: Supabase (PostgreSQL) for persistent storage of scheduled tasks and global settings.

Containerization: Docker-based build process for consistent environment reproduction.

Cloud Infrastructure: Deployed via Render with automated CI/CD integration.

Project Structure
src/bot.ts: The primary entry point. Manages command routing, middleware, and session state transitions.

src/scheduler.ts: The background worker process. Executes periodic database polling and triggers Telegram API calls for scheduled content.

src/supabase.ts: Encapsulates database connection logic and ORM-like interactions with Supabase.

Dockerfile: Multi-stage build instructions that compile TypeScript source code and optimize the production runtime image.

Deployment and Scalability
The application is engineered to operate within the constraints of free-tier cloud environments. It includes an integrated HTTP health-check server to satisfy platform-specific networking requirements and maintain service uptime.

The system leverages environment variables for sensitive credential management and infrastructure configuration, ensuring a secure and portable deployment.
