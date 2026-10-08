# The EyeX — Comprehensive System & Architectural Documentation

> **Real-Time AI-Powered Examination Hall Proctoring & Multi-Camera Vision System**  
> *Version: 2.4.0 — Release Build*  
> *Repository: `eyex-frontend` / `The-EyeX-vision`*

---

## 1. Executive Overview

**The EyeX** is an institutional computer-vision-driven examination surveillance and integrity assurance platform. It transforms standard classroom IP cameras, webcams, and mobile feeds into a proactive invigilation intelligence mesh. 

### Core Capabilities
- **Multi-Camera Hall Surveillance**: Simultaneous real-time monitoring of wide-angle front, rear, and lateral feeds.
- **Deep Learning Incident Ingestion**: Detection of unauthorized electronic devices (smartphones, smartwatches), communication behaviors, whisper gestures, and head turning.
- **Real-Time Incident Stream**: Sub-second push alerts to invigilator and proctor dashboards via Supabase Realtime WebSocket pub/sub.
- **Secure Hall Terminal Mode**: Pin/access-code protected kiosk mode (`/hall-access` & `/hall/[classroomId]`) enabling standalone room displays without exposing master admin credentials.
- **Candidate Seating & Identity Reconciliation**: Mapping computer vision trackers to registered candidates, seat positions, and exam registers.
- **Incident Audit Trail & Review**: Full evidentiary lifecycle for flagged anomalies (`FLAGGED` → `REVIEWED` → `CONFIRMED` or `DISMISSED`).

---

## 2. Technology Stack & Tools Used

| Layer | Tool / Technology | Version / Spec | Purpose |
|---|---|---|---|
| **Frontend Framework** | **Next.js** | `16.3.6` (Turbopack) | Server Components, Server Actions, Route Handlers, App Router |
| **UI Library** | **React** | `19.2.8` | Component rendering, concurrent transitions, `useActionState` |
| **Styling & Design** | **Tailwind CSS** | `v4.0` | High-performance CSS engine, custom EyeX design tokens |
| **Icons & Visuals** | **Lucide React** | `^1.52.0` | UI glyphs, alerts, cameras, status markers |
| **API Documentation** | **Swagger UI React** | `^5.33.1` | Embedded interactive OpenAPI documentation |
| **Email Service** | **Nodemailer** | `^10.0.15` | Automated invigilator notification dispatch & incident reports |
| **Language** | **TypeScript** | `5.x` | Strict type definitions across frontend and backend boundaries |
| **Database** | **PostgreSQL (Supabase)** | `15+` | Relational storage, UUID primary keys, JSONB metadata |
| **Auth & Sessions** | **Supabase Auth** | `@supabase/ssr` | Cookie-based JWT authentication, multi-tenant isolation |
| **Admin Controls** | **Supabase Service Role** | Admin Client | Elevated server-side user provisioning and RLS bypass |
| **Realtime Messaging**| **Supabase Realtime** | WebSockets | Push notifications for alerts, session status, and camera health |
| **Computer Vision (CV)**| **YOLOv8 / YOLOv11** | ONNX / PyTorch | Object detection (smartphones, notes, wearable devices) |
| **Pose & Keypoints** | **MediaPipe / OpenCV** | Python Server | Head pose estimation, gaze direction, peer-to-peer orientation |
| **Multi-Object Tracking**| **ByteTrack / DeepSORT** | Python Server | Persistent candidate tracking across camera frames (Tracker ID) |
| **Streaming Protocols**| **WebRTC / RTSP / HLS** | Low-latency | Camera stream ingestion from hall surveillance cameras |
| **Deployment Engine** | **Vercel / Node.js** | Edge & Serverless | Production hosting with automated CI/CD builds |

---

## 3. High-Level System Architecture

The following diagram illustrates the structural decoupling between the capture layer, computer vision inference engine, backend state manager, and frontend user applications.

```mermaid
graph TD
    subgraph CaptureLayer["1. Capture & Edge Layer"]
        C1["Camera 1: Front Wide (IP/RTSP)"]
        C2["Camera 2: Rear Ceiling (IP/RTSP)"]
        C3["Invigilator Mobile/Webcam"]
    end

    subgraph VisionEngine["2. Computer Vision Inference Service"]
        STREAM_INGEST["Stream Demuxer (RTSP / WebRTC)"]
        YOLO["YOLO Object Detector (Phones, Cheating Material)"]
        POSE["Pose & Gaze Estimator (Head Turn, Body Angle)"]
        TRACKER["ByteTrack Multi-Object Tracker (Tracker #ID)"]
        SCORER["Heuristic & Suspicion Fusion Scorer"]
    end

    subgraph BackendLayer["3. Cloud Backend & Realtime State"]
        API_GW["Next.js Route Handlers (/api/violations, /api/alerts)"]
        ADMIN_CLI["Supabase Service Role Client (Elevated Sync)"]
        PG_DB[("PostgreSQL Database (Schools, Exams, Violations)")]
        REALTIME["Supabase Realtime Engine (WebSocket Channels)"]
    end

    subgraph ClientLayer["4. Web Applications & Terminals"]
        DASH["Main Dashboard (/dashboard, /monitoring)"]
        HALL_TERM["Hall Kiosk Terminal (/hall/session/[id])"]
        ALERTS_MGR["Incident & Violation Review Console"]
        PUBLIC_KIOSK["Hall Access Portal (/hall-access)"]
    end

    C1 --> STREAM_INGEST
    C2 --> STREAM_INGEST
    C3 --> STREAM_INGEST

    STREAM_INGEST --> YOLO
    STREAM_INGEST --> POSE
    YOLO --> TRACKER
    POSE --> TRACKER
    TRACKER --> SCORER

    SCORER -->|"POST /api/violations (Bearer Token)"| API_GW
    API_GW --> ADMIN_CLI
    ADMIN_CLI --> PG_DB
    PG_DB --> REALTIME

    REALTIME -.->|"WebSocket: alerts & sessions"| DASH
    REALTIME -.->|"WebSocket: live stream"| HALL_TERM
    REALTIME -.->|"WebSocket: notifications"| ALERTS_MGR
    PUBLIC_KIOSK -->|"Verify 8-char Code"| API_GW
```

---

## 4. End-to-End User & Operational Workflow

The step-by-step institutional journey from account registration to session closure and evidentiary review.

```mermaid
flowchart TD
    Start([Institutional Admin Visits EyeX]) --> Register[Register School Account at /signup]
    Register --> Confirmed{Account Confirmed?}
    Confirmed -- Yes --> Login[Authenticate at /login]
    Confirmed -- Auto --> Dashboard[Enter Station Dashboard]
    Login --> Dashboard

    Dashboard --> SetupHall[Create Examination Hall at /classrooms]
    SetupHall --> GenCode[Generate 8-character Hall Access Code]
    Dashboard --> SetupExam[Schedule Examination at /exams/create]
    SetupExam --> AssignStudents[Assign Candidates & Seat Numbers]

    GenCode --> KioskLaunch[Open Hall Terminal at /hall-access]
    KioskLaunch --> TerminalActive[Station Hall Terminal Active /hall/session/:id]

    Dashboard --> StartSession[Start Monitoring Session]
    StartSession --> CVLive[Activate CV Camera Ingestion & Object Tracking]

    CVLive --> Monitor{Suspicious Activity Detected?}
    Monitor -- No --> NormalExam[Normal Ingestion Loop]
    NormalExam --> Monitor
    Monitor -- Yes --> PushAlert[Emit Violation via API & Supabase Realtime]

    PushAlert --> AudioAlarm[Trigger Audio & Visual Warning on Terminal]
    PushAlert --> ProctorReview[Proctor Reviews Snapshot & Evidence]

    ProctorReview --> Decision{Proctor Decision}
    Decision -- Valid Infraction --> ConfirmViolation[Mark CONFIRMED with Notes]
    Decision -- False Positive --> DismissViolation[Mark DISMISSED]

    StartSession --> EndSession[End Examination Session]
    ConfirmViolation --> EndSession
    DismissViolation --> EndSession
    EndSession --> FinalReport[Generate Comprehensive Station Integrity Report]
    FinalReport --> Done([Session Archived])
```

---

## 5. Real-Time Computer Vision & Alert Pipeline

Detailed sequence diagram tracing a single millisecond-level computer vision infraction event from camera lens to the invigilator dashboard.

```mermaid
sequenceDiagram
    autonumber
    actor Candidate as Candidate in Hall
    participant Camera as Hall RTSP/Webcam
    participant CV as Python CV Engine (YOLO+ByteTrack)
    participant API as Next.js API (/api/violations)
    participant DB as Supabase PostgreSQL
    participant RT as Supabase Realtime
    actor Proctor as Invigilator / Chief Proctor

    Candidate->>Camera: Retrieves unauthorized smartphone
    Camera->>CV: High-FPS Video Frame
    CV->>CV: YOLO detects 'cell phone' (confidence: 0.94)
    CV->>CV: ByteTrack correlates candidate to Tracker #4
    CV->>CV: Capture frame crop evidence_url
    CV->>API: POST /api/violations { sessionId, trackerId: 4, activityType: 'PHONE_DETECTED', severity: 'HIGH' }
    API->>DB: INSERT into violations / classroom_alerts
    DB->>RT: Trigger postgres_changes (INSERT)
    RT-->>Proctor: WebSocket payload delivered (<250ms)
    Note over Proctor: Terminal plays alert chime & flashes Red Indicator
    Proctor->>API: POST /api/violations (Update status: 'CONFIRMED')
    API->>DB: UPDATE violations SET status = 'CONFIRMED'
    DB->>RT: Broadcast status change
    RT-->>Proctor: Dashboard status updated
```

---

## 6. Examination Session Lifecycle State Machine

Each monitoring session transitions through strict state guarantees to maintain evidentiary chain of custody.

```mermaid
stateDiagram-v2
    [*] --> SCHEDULED: Exam created & hall scheduled
    
    SCHEDULED --> ACTIVE: Proctor clicks "Start Session" / Access code redeemed
    
    state ACTIVE {
        [*] --> IngestingFeeds: Camera feeds online
        IngestingFeeds --> TrackingCandidates: ByteTrack trackers mapped
        TrackingCandidates --> AlertTriggered: Anomaly confidence >= threshold
        AlertTriggered --> TrackingCandidates: Alert processed
    }

    ACTIVE --> PAUSED: Technical interruption or emergency break
    PAUSED --> ACTIVE: Resume invigilation
    
    ACTIVE --> COMPLETED: Scheduled time concludes or Proctor ends session
    COMPLETED --> ARCHIVED: Incidents reviewed & signed off
    
    SCHEDULED --> CANCELLED: Examination cancelled prior to start
    ARCHIVED --> [*]
    CANCELLED --> [*]
```

---

## 7. Database Entity-Relationship Model (ERD)

The relational schema enforcing strict multi-tenancy by `school_id`:

```mermaid
erDiagram
    SCHOOLS ||--o{ USERS : "employs"
    SCHOOLS ||--o{ CLASSROOMS : "owns"
    SCHOOLS ||--o{ EXAMS : "conducts"
    SCHOOLS ||--o{ STUDENTS : "enrolls"
    SCHOOLS ||--o{ MONITORING_SESSIONS : "manages"

    CLASSROOMS ||--o{ CAMERAS : "equipped with"
    CLASSROOMS ||--o{ MONITORING_SESSIONS : "hosts"

    EXAMS ||--o{ EXAM_STUDENTS : "registers"
    EXAMS ||--o{ MONITORING_SESSIONS : "monitored during"

    STUDENTS ||--o{ EXAM_STUDENTS : "allocated to"
    STUDENTS ||--o{ ALERTS : "associated with"

    MONITORING_SESSIONS ||--o{ ALERTS : "records"
    MONITORING_SESSIONS ||--o{ VIOLATIONS : "contains"

    SCHOOLS {
        uuid id PK
        uuid auth_user_id UK
        string school_name
        string email UK
        string code_prefix
        timestamp created_at
    }

    CLASSROOMS {
        uuid id PK
        uuid school_id FK
        string name
        string access_code UK
        timestamp code_expires_at
        timestamp created_at
    }

    CAMERAS {
        uuid id PK
        uuid classroom_id FK
        int camera_number
        string name
        string status
        timestamp created_at
    }

    EXAMS {
        uuid id PK
        uuid school_id FK
        string title
        text description
        date exam_date
        time start_time
        int duration_minutes
        string room_number
        string status
        timestamp created_at
    }

    STUDENTS {
        uuid id PK
        uuid school_id FK
        string student_number
        string full_name
        string email
        timestamp created_at
    }

    EXAM_STUDENTS {
        uuid id PK
        uuid exam_id FK
        uuid student_id FK
        string seat_number
        timestamp created_at
    }

    MONITORING_SESSIONS {
        uuid id PK
        uuid exam_id FK
        uuid school_id FK
        string status
        timestamp started_at
        timestamp ended_at
        timestamp created_at
    }

    VIOLATIONS {
        uuid id PK
        uuid session_id FK
        string tracker_label
        int tracker_id
        string activity_type
        string severity
        string status
        numeric confidence
        string evidence_url
        jsonb metadata
        timestamp created_at
    }

    ALERTS {
        uuid id PK
        uuid monitoring_session_id FK
        uuid student_id FK
        string event_type
        numeric confidence
        string severity
        string status
        jsonb metadata
        timestamp created_at
    }
```

---

## 8. Multi-Tenancy & Security Architecture

1. **Row Level Security (RLS)**:
   - All standard queries evaluate `auth.uid() = auth_user_id` or join through `schools.id`.
   - No institution can read or modify another institution's camera feeds, students, exams, or incident logs.
2. **Elevated Computer Vision Ingestion**:
   - The computer vision microservice authenticates via `MODEL_API_KEY` and writes through the Server Admin client, bypassing browser RLS barriers for high-throughput stream writes.
3. **Kiosk Hall Terminal Isolation**:
   - On-site display tablets and hall projection terminals run under ephemeral hall sessions verified through time-bound 8-character codes (`/hall-access`), avoiding master administrator password exposure in public exam halls.
4. **Resilient Auto-Provisioning**:
   - Server Actions guarantee automatic synchronization of newly registered user identities into `public.schools`, eliminating orphaned auth records.

---

## 9. Key API Endpoints Reference

| Method | Endpoint | Description | Access Control |
|---|---|---|---|
| `POST` | `/api/auth/register` | Institutional signup | Public |
| `POST` | `/api/auth/signin` | Institutional login | Public |
| `POST` | `/api/hall-access/verify` | Validates 8-character terminal code | Public / Terminal |
| `POST` | `/api/violations` | Ingests real-time CV incident detections | Service Key / Model Key |
| `GET` | `/api/violations` | Queries violation history for session | Authenticated Proctor |
| `POST` | `/api/sessions/[id]/start` | Begins hall surveillance session | Authenticated Admin |
| `POST` | `/api/sessions/[id]/end` | Finalizes surveillance session | Authenticated Admin |
| `POST` | `/api/classrooms/[id]/rotate-code` | Rotates hall 8-char terminal code | Authenticated Admin |
| `POST` | `/api/classrooms/[id]/cameras` | Adds/modifies camera feed bindings | Authenticated Admin |

---

## 10. Hardware & Deployment Recommendations

### Recommended Edge Node (Per Hall)
- **Processor**: Intel Core i7 12th Gen+ or AMD Ryzen 7 / Apple Silicon M2+
- **GPU**: NVIDIA RTX 3060 / 4060 (8GB+ VRAM) with CUDA support for 30 FPS multi-stream inference
- **Cameras**: Onvif-compliant IP PoE Cameras (1080p @ 30 FPS, H.264/H.265 stream)
- **Local Network**: Isolated 1Gbps PoE Switch dedicated to surveillance camera traffic

### Cloud Infrastructure
- **Frontend / Application Server**: Vercel Serverless / Docker on AWS ECS / DigitalOcean App Platform
- **Database & Realtime PubSub**: Supabase Dedicated or Pro Instance with pgvector & WebSockets enabled
- **Object Storage**: Supabase Storage / AWS S3 for snapshot evidence and audit clip archives
