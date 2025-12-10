# Serverless Job Application Tracking System (ATS)

![AWS](https://img.shields.io/badge/AWS-Serverless-orange?logo=amazonaws)
![Node.js](https://img.shields.io/badge/Node.js-20.x-green?logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-RDS-blue?logo=postgresql)
![Architecture](https://img.shields.io/badge/Microservices-Event%20Driven-purple)

A cloud-native, event-driven **Serverless ATS** designed to manage high-volume recruitment workflows.  
Built with AWS Lambda, API Gateway, Cognito, Step Functions, SQS, SES, and PostgreSQL (RDS).  
This system ensures scalable hiring workflows, strict state transitions, background processing, and RBAC-driven access control.

---

## Folder Structure
```bash
/serverless-ats
│
├── ATS-Job-Service/
├── ATS-Application-Service/
├── ATS-User-Sync/
├── ATS-Workflow-Trigger/
├── ATS-State-Updater/
├── ATS-Email-Worker/
│
├── database/
│   └── schema.sql
│ 
├── ATS_Postman_Collection.json
│
├── Video-Demo
│
└── README.md
```

---

## Demo & Documentation

**Video Demo:** `LINK_TO_YOUR_YOUTUBE_VIDEO_HERE`  
**API Documentation:** [Postman Public API Docs](https://documenter.getpostman.com/view/48093520/2sB3dQw9rQ)

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

### High-Level Architecture

1. **Amazon API Gateway** – RESTful entry point for all HTTPS API requests  
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
| **ATS-Workflow-Trigger** | Orchestrator that triggers the Step Functions workflow |
| **ATS-State-Updater** | Updates database records when state transitions happen |
| **ATS-Email-Worker** | Sends emails asynchronously via SQS + SES |

---

## Data Flow Diagram

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
```

## Workflow & State Management
The application lifecycle is strictly enforced by AWS Step Functions. This prevents invalid state transitions (e.g., moving a candidate from "Applied" directly to "Hired" without an interview).

### Valid States: Applied → Screening → Interview → Offer → Hired / Rejected

```mermaid

stateDiagram-v2
    [*] --> Applied
    Applied --> Screening : Recruiter Advances
    Screening --> Interview : Recruiter Advances
    Interview --> Offer : Recruiter Advances
    Offer --> Hired : Candidate Accepts
    
    Applied --> Rejected : Recruiter Rejects
    Screening --> Rejected
    Interview --> Rejected
    Offer --> Rejected
```

## Role-Based Access Control (RBAC)

Security is implemented at both:
- **API Gateway level** (Authorizers)
- **Lambda level** (Business Logic Validation)

---

## Endpoint Permissions

| Endpoint                         | Method     | Recruiter | Candidate | Hiring Manager | Description                          |
|----------------------------------|------------|-----------|-----------|----------------|--------------------------------------|
| `/jobs`                          | POST       | ✅         | ❌         | ❌              | Post a new job opening               |
| `/jobs/{id}`                     | PUT / DEL  | ✅         | ❌         | ❌              | Edit or remove a job                 |
| `/jobs`                          | GET        | ✅         | ✅         | ✅              | View all open jobs                   |
| `/apply`                         | POST       | ❌         | ✅         | ❌              | Submit a new application             |
| `/my-applications`               | GET        | ❌         | ✅         | ❌              | View own application history         |
| `/job-applications`              | GET        | ✅         | ❌         | ✅              | View all candidates for a job        |
| `/applications/{id}/transition`  | POST       | ✅         | ❌         | ❌              | Advance a candidate's stage          |


## Database Schema (ERD)

The system relies on a normalized **PostgreSQL** schema hosted on **Amazon RDS**.

```mermaid
erDiagram
    COMPANIES ||--|{ USERS : employs
    COMPANIES ||--|{ JOBS : posts
    USERS ||--|{ JOBS : recruiter_managed_by
    USERS ||--|{ APPLICATIONS : applies_as
    JOBS ||--|{ APPLICATIONS : receives
    APPLICATIONS ||--|{ APPLICATION_HISTORY : audit_logs

    COMPANIES {
        int company_id PK
        string name
    }
    USERS {
        int user_id PK
        string email
        string role "recruiter/candidate"
        int company_id FK
    }
    JOBS {
        int job_id PK
        string title
        string status "open/closed"
        int recruiter_id FK
    }
    APPLICATIONS {
        int application_id PK
        string current_stage
        int job_id FK
        int candidate_id FK
    }
```

## Setup & Installation

---

### **1. Prerequisites**
- **Node.js v20.x** installed locally  
- **AWS Account** (Free Tier recommended)  
- **PostgreSQL Client** (e.g., DBeaver) for database initialization  

---

### **2. Environment Variables**

Every Lambda function requires the following environment variables to be set in the AWS Console:

```bash
DB_HOST=ats-db.xxxx.us-east-1.rds.amazonaws.com
DB_USER=postgres
DB_PASSWORD=YOUR_SECURE_PASSWORD
DB_NAME=postgres
QUEUE_URL=https://sqs.us-east-1.amazonaws.com/YOUR_ACCOUNT/ats-email-queue
STATE_MACHINE_ARN=arn:aws:states:us-east-1:xxxx:stateMachine:ATS-Application-Workflow
```

### 3. Database Initialization

Run the SQL script located at: /database/schema.sql


This will create all necessary tables and constraints for the ATS system.

---

### 4. Running the Project

Since this is a **Serverless project**, there is no single "server" to start.

#### **Deploy Microservices**
Zip and upload each microservice folder (e.g., `ats-job-service`, `ats-application-service`, etc.) to its corresponding **AWS Lambda** function.

#### **Configure API Gateway**
Map all routes as defined in the **Architecture** section.

#### **Verify Deployment**
Use the included **Postman Collection** to hit the API Gateway endpoint and test functionality.

---

## Testing (Postman)

A complete Postman collection is included: ATS_Postman_Collection.json


### **How to Test**

1. Import the collection into Postman  
2. Get a **Recruiter Token** via the `/login` Cognito login flow  
3. Create a job → `POST /jobs`  
4. Get a **Candidate Token**  
5. Apply for the job → `POST /apply`  
6. Switch back to **Recruiter** and trigger the workflow → `POST /transition`  
7. **Verify**: Check your email for the asynchronous notification  

---

### **Built by Sameer Sayyad**
