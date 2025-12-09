# Serverless Job Application Tracking System (ATS)

![AWS](https://img.shields.io/badge/AWS-Serverless-orange?logo=amazonaws)
![Node.js](https://img.shields.io/badge/Node.js-20.x-green?logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-RDS-blue?logo=postgresql)
![Architecture](https://img.shields.io/badge/Microservices-Event%20Driven-purple)

A cloud-native, event-driven **Serverless ATS** designed to manage high-volume recruitment workflows.  
Built with AWS Lambda, API Gateway, Cognito, Step Functions, SQS, SES, and PostgreSQL (RDS).  
This system ensures scalable hiring workflows, strict state transitions, background processing, and RBAC-driven access control.

---

## Demo & Documentation

🔗 **Video Demo:** `LINK_TO_YOUR_YOUTUBE_VIDEO_HERE`  
🔗 **API Documentation:** `LINK_TO_YOUR_POSTMAN_DOCS_HERE`

---

# Table of Contents

- [Architecture Overview](#️-architecture-overview)
- [Microservices](#-microservices)
- [Workflow & State Machine](#-workflow--state-machine)
- [Role-Based Access Control](#-role-based-access-control)
- [Database Schema](#️-database-schema)
- [Folder Structure](#-folder-structure)
- [Setup & Installation](#️-setup--installation)
- [Deployment Guide](#-deployment-guide)
- [Testing (Postman)](#-testing-postman)
- [Author](#-author)

---

# Architecture Overview

This project follows a fully decoupled **microservices architecture** backed by event-driven messaging.  
The system ensures reliability, fault-tolerance, and high scalability using AWS-managed services.

### 🔧 High-Level Architecture

1. **Amazon API Gateway** – Entry point for all HTTPS API requests  
2. **Amazon Cognito** – Authentication, JWT issuance, RBAC claims  
3. **AWS Lambda** – Stateless compute for all services  
4. **Amazon RDS (PostgreSQL)** – Primary database  
5. **AWS Step Functions** – Manages candidate lifecycle state transitions  
6. **Amazon SQS + SES** – Asynchronous event queue + email notifications

---

## Microservices

| Microservice | Description |
|--------------|-------------|
| **ATS-Job-Service** | Create, read, update, delete job postings |
| **ATS-Application-Service** | Apply for jobs, view applicants, view application history |
| **ATS-User-Sync** | Sync Cognito users into PostgreSQL automatically |
| **ATS-Workflow-Trigger** | Initiates Step Function for candidate workflow |
| **ATS-State-Updater** | Updates database records when state transitions happen |
| **ATS-Email-Worker** | Sends emails asynchronously via SQS + SES |

---

## Data Flow Diagram (Mermaid)

```mermaid
graph TD
    User[Client] -->|HTTPS| APIG[API Gateway]
    APIG --> Cognito[Amazon Cognito]

    subgraph Microservices
        APIG -->|/jobs| JobService[Job Service Lambda]
        APIG -->|/apply| AppService[Application Service Lambda]
        APIG -->|/transition| Trigger[Workflow Trigger Lambda]
    end

    subgraph DataLayer
        JobService --> RDS[(PostgreSQL RDS)]
        AppService --> RDS
        Trigger --> SFN[AWS Step Functions]
    end

    subgraph AsyncProcessing
        AppService -.->|Push| SQS[SQS Queue]
        SFN --> StateUpdater[State Updater Lambda]
        SFN -.-> SQS
        SQS --> EmailWorker[Email Worker Lambda]
        EmailWorker --> SES[SES]
    end

