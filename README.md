\# Serverless Job Application Tracking System (ATS)



A cloud-native, event-driven backend system for managing high-volume recruitment workflows. Built on \*\*AWS Serverless\*\* architecture, this project features robust state management, asynchronous processing, and granular Role-Based Access Control (RBAC).



\*\*🔗 \[View Video Demo](LINK\_TO\_YOUR\_YOUTUBE\_VIDEO\_HERE)\*\* | \*\*🔗 \[View API Documentation](LINK\_TO\_YOUR\_POSTMAN\_DOCS\_HERE)\*\*



---



\## 🏗️ Architecture Overview



This system uses a \*\*Microservices Architecture\*\* to ensure separation of concerns and scalability. The API is fully decoupled from heavy background tasks (like email notifications) using Message Queues.



\### High-Level Data Flow

1\. \*\*API Gateway\*\* serves as the unified entry point, routing requests to specific Lambda microservices.

2\. \*\*Amazon Cognito\*\* handles authentication and issues JWTs with embedded role claims (`Recruiter`, `Candidate`).

3\. \*\*AWS Lambda\*\* executes business logic.

4\. \*\*Amazon RDS (PostgreSQL)\*\* stores relational data (Users, Jobs, Applications).

5\. \*\*AWS Step Functions\*\* manages the complex state transitions of a candidate's application.

6\. \*\*Amazon SQS \& SES\*\* handle asynchronous email notifications to avoid blocking the main API response.



\### 🧩 Microservices Breakdown

The system is composed of \*\*6 Specialized Microservices\*\* that cover 100% of the requirements:



| Service Name | Responsibility |

| :--- | :--- |

| \*\*`ATS-Job-Service`\*\* | Manages Job Postings (Create, Read, Update, Delete). |

| \*\*`ATS-Application-Service`\*\* | Manages Applications (Apply, View History, View Applicants). |

| \*\*`ATS-User-Sync`\*\* | Syncs new users from Cognito to PostgreSQL automatically via triggers. |

| \*\*`ATS-Workflow-Trigger`\*\* | Initiates the Hiring Process (Step Function) from the API. |

| \*\*`ATS-State-Updater`\*\* | Updates the Database automatically as the candidate moves stages. |

| \*\*`ATS-Email-Worker`\*\* | Decouples notifications by sending asynchronous emails via SQS \& SES. |



```mermaid

graph TD

&nbsp;   User\[User Client] -->|HTTPS Requests| APIG\[API Gateway]

&nbsp;   APIG -->|Auth Check| Cognito\[Amazon Cognito]

&nbsp;   

&nbsp;   subgraph "Microservices Layer"

&nbsp;       APIG -->|/jobs| JobService\[ATS-Job-Service Lambda]

&nbsp;       APIG -->|/apply| AppService\[ATS-Application-Service Lambda]

&nbsp;       APIG -->|/transition| Trigger\[ATS-Workflow-Trigger Lambda]

&nbsp;   end



&nbsp;   subgraph "Data \& State Layer"

&nbsp;       JobService --> RDS\[(PostgreSQL RDS)]

&nbsp;       AppService --> RDS

&nbsp;       Trigger --> SFN\[AWS Step Functions]

&nbsp;   end



&nbsp;   subgraph "Async Processing Layer"

&nbsp;       AppService -.->|Push Event| SQS\[Amazon SQS]

&nbsp;       SFN -->|Update Status| StateUpdater\[ATS-State-Updater Lambda]

&nbsp;       SFN -.->|Push Event| SQS

&nbsp;       SQS -->|Trigger| EmailWorker\[ATS-Email-Worker Lambda]

&nbsp;       EmailWorker -->|Send Mail| SES\[Amazon SES]

&nbsp;   end

🔄 Workflow \& State ManagementThe application lifecycle is strictly enforced by AWS Step Functions. This prevents invalid state transitions (e.g., moving a candidate from "Applied" directly to "Hired" without an interview).Valid States: Applied → Screening → Interview → Offer → HiredCode snippetstateDiagram-v2

&nbsp;   \[\*] --> Applied

&nbsp;   Applied --> Screening : Recruiter Advances

&nbsp;   Screening --> Interview : Recruiter Advances

&nbsp;   Interview --> Offer : Recruiter Advances

&nbsp;   Offer --> Hired : Candidate Accepts

&nbsp;   

&nbsp;   Applied --> Rejected : Recruiter Rejects

&nbsp;   Screening --> Rejected

&nbsp;   Interview --> Rejected

&nbsp;   Offer --> Rejected

🔐 Role-Based Access Control (RBAC)Security is implemented at both the API Gateway level (Authorizers) and the Lambda level (Business Logic Validation).EndpointMethodRole: RecruiterRole: CandidateDescription/jobsPOST✅❌Post a new job opening/jobs/{id}PUT/DELETE✅❌Edit or remove a job/jobsGET✅✅View all open jobs/applyPOST❌✅Submit a new application/my-applicationsGET❌✅View own application history/job-applicationsGET✅❌View all candidates for a job/applications/{id}/transitionPOST✅❌Advance a candidate's stage🗄️ Database Schema (ERD)The system relies on a normalized PostgreSQL schema hosted on Amazon RDS.Code snippeterDiagram

&nbsp;   COMPANIES ||--|{ USERS : employs

&nbsp;   COMPANIES ||--|{ JOBS : posts

&nbsp;   USERS ||--|{ JOBS : recruiter\_managed\_by

&nbsp;   USERS ||--|{ APPLICATIONS : applies\_as

&nbsp;   JOBS ||--|{ APPLICATIONS : receives

&nbsp;   APPLICATIONS ||--|{ APPLICATION\_HISTORY : audit\_logs



&nbsp;   COMPANIES {

&nbsp;       int company\_id PK

&nbsp;       string name

&nbsp;   }

&nbsp;   USERS {

&nbsp;       int user\_id PK

&nbsp;       string email

&nbsp;       string role "recruiter/candidate"

&nbsp;       int company\_id FK

&nbsp;   }

&nbsp;   JOBS {

&nbsp;       int job\_id PK

&nbsp;       string title

&nbsp;       string status "open/closed"

&nbsp;       int recruiter\_id FK

&nbsp;   }

&nbsp;   APPLICATIONS {

&nbsp;       int application\_id PK

&nbsp;       string current\_stage

&nbsp;       int job\_id FK

&nbsp;       int candidate\_id FK

&nbsp;   }

⚙️ Setup \& Installation1. PrerequisitesNode.js v20.x installed locally.AWS Account (Free Tier recommended).PostgreSQL Client (e.g., DBeaver) for database initialization.2. Environment VariablesEvery Lambda function requires the following environment variables to be set in the AWS Console:BashDB\_HOST=ats-db.xxxx.us-east-1.rds.amazonaws.com

DB\_USER=postgres

DB\_PASSWORD=YOUR\_SECURE\_PASSWORD

DB\_NAME=postgres

QUEUE\_URL=\[https://sqs.us-east-1.amazonaws.com/YOUR\_ACCOUNT/ats-email-queue](https://sqs.us-east-1.amazonaws.com/YOUR\_ACCOUNT/ats-email-queue)

STATE\_MACHINE\_ARN=arn:aws:states:us-east-1:xxxx:stateMachine:ATS-Application-Workflow

3\. Database InitializationRun the SQL script provided in /database/schema.sql (in this repo) to create the tables and constraints.4. Running the ProjectSince this is a Serverless project, there is no single "server" to start.Deploy Microservices: Zip and upload each folder (ats-job-service, ats-application-service, etc.) to its respective AWS Lambda function.Configure API Gateway: Map the routes as defined in the Architecture section.Verify: Use the provided Postman Collection to hit the API Gateway URL.🧪 Testing (Postman)A full Postman Collection is included in this repository (ATS\_Postman\_Collection.json).How to test:Import the collection into Postman.Get a Recruiter Token via the /login flow (Cognito).Create a Job (POST /jobs).Get a Candidate Token.Apply for that job (POST /apply).Switch back to Recruiter and Trigger the Workflow (POST /transition).Verify: Check your email for the asynchronous notification!Built by Sameer Sayyad

