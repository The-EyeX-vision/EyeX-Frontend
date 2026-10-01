/**
 * GET /api/openapi.json
 * Generates and serves the full OpenAPI 3.0.0 specification for EyeX Backend APIs.
 */
import { NextResponse } from 'next/server'

export async function GET() {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'EyeX Examination Monitoring Backend API',
      version: '1.0.0',
      description:
        'Official backend API documentation for EyeX — Live Examination Monitoring System powered by Next.js & Supabase.',
      contact: {
        name: 'EyeX Engineering Team',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        CookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'sb-access-token',
          description: 'Supabase session cookie established upon login.',
        },
        ModelApiKeyAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Key',
          description:
            'Server-to-server secret key used by the computer-vision model. Send header: Authorization: Bearer <MODEL_API_KEY>',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'CLASSROOM_SESSION_CONFLICT' },
            message: {
              type: 'string',
              example: 'This hall already has an active examination session.',
            },
          },
        },
        School: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            school_name: { type: 'string', example: 'University of Engineering' },
            email: { type: 'string', format: 'email', example: 'admin@university.edu' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Classroom: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            school_id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Hall A' },
            access_code: { type: 'string', example: '7K4P92XM' },
            code_valid_until: { type: 'string', format: 'date-time', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            camera_count: { type: 'integer', example: 3 },
          },
        },
        Camera: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            classroom_id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Overhead Wide 1' },
            camera_number: { type: 'integer', example: 1 },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'OFFLINE'] },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        ExamSession: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            classroom_id: { type: 'string', format: 'uuid' },
            course_name: { type: 'string', example: 'Mathematics Final' },
            course_code: { type: 'string', example: 'MTH401' },
            duration_minutes: { type: 'integer', example: 120 },
            student_count: { type: 'integer', example: 87 },
            status: {
              type: 'string',
              enum: ['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
              example: 'SCHEDULED',
            },
            started_at: { type: 'string', format: 'date-time', nullable: true },
            ended_at: { type: 'string', format: 'date-time', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        ModelDetectionRequest: {
          type: 'object',
          required: [
            'session_id',
            'camera_id',
            'tracker_label',
            'activity_type',
          ],
          properties: {
            session_id: { type: 'string', format: 'uuid' },
            camera_id: { type: 'string', format: 'uuid' },
            tracker_label: { type: 'string', example: '1' },
            activity_type: {
              type: 'string',
              enum: [
                'PHONE_DETECTED',
                'UNAUTHORIZED_MATERIAL',
                'SUSPICIOUS_MOVEMENT',
                'POSSIBLE_COMMUNICATION',
                'LOOKING_AWAY',
                'MULTIPLE_PERSONS',
                'UNKNOWN',
              ],
              example: 'PHONE_DETECTED',
            },
            description: { type: 'string', example: 'Possible phone usage detected' },
            confidence: { type: 'number', minimum: 0, maximum: 1, example: 0.94 },
            timestamp: { type: 'string', format: 'date-time' },
            image: {
              type: 'string',
              description: 'Base64 encoded evidence image frame',
            },
          },
        },
      },
    },
    paths: {
      '/api/auth/register': {
        post: {
          summary: 'Register School Account (Sign Up)',
          description:
            'Creates an authenticated school account in Supabase Auth and initializes the school profile in public.schools.',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['school_name', 'email', 'password'],
                  properties: {
                    school_name: { type: 'string', example: 'University Example' },
                    email: { type: 'string', format: 'email', example: 'admin@university.edu' },
                    password: { type: 'string', format: 'password', example: 'SecurePassword123!' },
                  },
                },
                example: {
                  school_name: 'University Example',
                  email: 'admin@university.edu',
                  password: 'SecurePassword123!',
                },
              },
            },
          },
          responses: {
            201: { description: 'School registered successfully' },
            400: { description: 'Validation error' },
            409: { description: 'Email already registered' },
          },
        },
      },
      '/api/auth/signin': {
        post: {
          summary: 'School Sign In (Log In)',
          description:
            'Authenticates the school account using email and password, establishing an HTTP-only session cookie.',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'admin@university.edu' },
                    password: { type: 'string', format: 'password', example: 'SecurePassword123!' },
                  },
                },
                example: {
                  email: 'admin@university.edu',
                  password: 'SecurePassword123!',
                },
              },
            },
          },
          responses: {
            200: { description: 'Signed in successfully; session established' },
            401: { description: 'Invalid email or password' },
          },
        },
      },
      '/api/auth/signout': {
        post: {
          summary: 'School Sign Out (Log Out)',
          description: 'Terminates the authenticated session and clears session cookies.',
          tags: ['Authentication'],
          security: [{ CookieAuth: [] }],
          responses: {
            200: { description: 'Signed out successfully' },
          },
        },
      },
      '/api/auth/me': {
        get: {
          summary: 'Get Current Authenticated User & School Profile',
          tags: ['Authentication'],
          security: [{ CookieAuth: [] }],
          responses: {
            200: { description: 'Authenticated user and school information' },
            401: { description: 'Unauthenticated' },
          },
        },
      },
      '/api/school': {
        get: {
          summary: 'Get School Details',
          tags: ['School'],
          security: [{ CookieAuth: [] }],
          responses: {
            200: { description: 'School profile details' },
            401: { description: 'Unauthenticated' },
          },
        },
        patch: {
          summary: 'Update School Details',
          tags: ['School'],
          security: [{ CookieAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    school_name: { type: 'string' },
                    email: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Updated school profile' },
            400: { description: 'Validation error' },
          },
        },
      },
      '/api/classrooms': {
        get: {
          summary: 'List Examination Halls (Classrooms)',
          tags: ['Classrooms'],
          security: [{ CookieAuth: [] }],
          responses: {
            200: { description: 'List of classrooms belonging to school' },
          },
        },
        post: {
          summary: 'Create Examination Hall (Classroom)',
          tags: ['Classrooms'],
          security: [{ CookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: { type: 'string', example: 'Hall A' },
                    access_code: {
                      type: 'string',
                      description: 'Optional custom code; auto-generated if omitted',
                    },
                    code_valid_until: { type: 'string', format: 'date-time' },
                  },
                },
                example: {
                  name: 'Main Examination Hall A',
                },
              },
            },
          },
          responses: {
            201: { description: 'Classroom created successfully' },
            400: { description: 'Invalid request' },
          },
        },
      },
      '/api/classrooms/{id}': {
        get: {
          summary: 'Get Examination Hall Details',
          tags: ['Classrooms'],
          security: [{ CookieAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Classroom details, cameras, and active session' },
            404: { description: 'Classroom not found' },
          },
        },
        patch: {
          summary: 'Update Examination Hall Details',
          tags: ['Classrooms'],
          security: [{ CookieAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    code_valid_until: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Classroom updated' },
            404: { description: 'Classroom not found' },
          },
        },
        delete: {
          summary: 'Delete Examination Hall',
          tags: ['Classrooms'],
          security: [{ CookieAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Classroom deleted' },
            409: { description: 'Cannot delete classroom with ACTIVE session' },
          },
        },
      },
      '/api/classrooms/{id}/rotate-code': {
        post: {
          summary: 'Rotate Hall Access Code',
          description:
            'Generates a fresh access code for the hall. The code belongs to the hall, not individual sessions.',
          tags: ['Classrooms'],
          security: [{ CookieAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Access code rotated successfully' },
            404: { description: 'Classroom not found' },
          },
        },
      },
      '/api/classrooms/{id}/cameras': {
        get: {
          summary: 'List Cameras in Hall',
          tags: ['Cameras'],
          security: [{ CookieAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'List of cameras in hall' },
          },
        },
        post: {
          summary: 'Add Camera to Hall',
          tags: ['Cameras'],
          security: [{ CookieAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'camera_number'],
                  properties: {
                    name: { type: 'string', example: 'Camera 1' },
                    camera_number: { type: 'integer', example: 1 },
                    status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'OFFLINE'] },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Camera registered successfully' },
            409: { description: 'Camera number already exists in this hall' },
          },
        },
      },
      '/api/cameras/{id}': {
        patch: {
          summary: 'Update Camera',
          tags: ['Cameras'],
          security: [{ CookieAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Camera updated' },
            404: { description: 'Camera not found' },
          },
        },
        delete: {
          summary: 'Delete Camera',
          tags: ['Cameras'],
          security: [{ CookieAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Camera deleted' },
          },
        },
      },
      '/api/hall-access/verify': {
        post: {
          summary: 'Verify Hall Access Code',
          description:
            'Examiner enters a hall access code. Verifies code, checks expiration, and returns isolated hall workspace context.',
          tags: ['Hall Access'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['access_code'],
                  properties: {
                    access_code: { type: 'string', example: '7K4P92XM' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Valid code; returns hall and session context' },
            403: { description: 'ACCESS_DENIED: Invalid or expired code' },
          },
        },
      },
      '/api/sessions': {
        get: {
          summary: 'List Examination Sessions',
          tags: ['Exam Sessions'],
          security: [{ CookieAuth: [] }],
          parameters: [
            { name: 'classroom_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'status', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            200: { description: 'List of sessions' },
          },
        },
        post: {
          summary: 'Create Examination Session',
          tags: ['Exam Sessions'],
          security: [{ CookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: [
                    'classroom_id',
                    'course_name',
                    'course_code',
                    'duration_minutes',
                  ],
                  properties: {
                    classroom_id: { type: 'string', format: 'uuid' },
                    course_name: { type: 'string', example: 'Mathematics' },
                    course_code: { type: 'string', example: 'MTH401' },
                    duration_minutes: { type: 'integer', example: 120 },
                    student_count: { type: 'integer', example: 87 },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Session created (Status: SCHEDULED)' },
            400: { description: 'Invalid input' },
          },
        },
      },
      '/api/sessions/{id}': {
        get: {
          summary: 'Get Session Details',
          tags: ['Exam Sessions'],
          security: [{ CookieAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Session details, trackers, and violation metrics' },
            404: { description: 'Session not found' },
          },
        },
      },
      '/api/sessions/{id}/start': {
        post: {
          summary: 'Start Examination Session (Enforces 1 Active Session Per Hall)',
          description:
            'Transitions session to ACTIVE. CRITICAL: Rejects with HTTP 409 CLASSROOM_SESSION_CONFLICT if another session in this hall is already ACTIVE.',
          tags: ['Exam Sessions'],
          security: [{ CookieAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Session started successfully' },
            409: {
              description:
                'CLASSROOM_SESSION_CONFLICT: Hall already has an active examination session',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/sessions/{id}/end': {
        post: {
          summary: 'End Active Examination Session',
          description:
            'Transitions session to COMPLETED. Frees the hall so subsequent sessions may be started.',
          tags: ['Exam Sessions'],
          security: [{ CookieAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Session ended successfully' },
            409: { description: 'Session is not ACTIVE' },
          },
        },
      },
      '/api/sessions/{id}/students': {
        get: {
          summary: 'List Detected Session Trackers',
          description:
            'Retrieves temporary tracker identities detected by the CV model during this session.',
          tags: ['Session Students'],
          security: [{ CookieAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'List of detected trackers and violation counts' },
          },
        },
      },
      '/api/sessions/{id}/violations': {
        get: {
          summary: 'List Session Violations',
          tags: ['Violations'],
          security: [{ CookieAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'List of violations recorded for session' },
          },
        },
      },
      '/api/violations/{id}': {
        get: {
          summary: 'Get Violation Details & Evidence URL',
          tags: ['Violations'],
          security: [{ CookieAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Violation details with signed evidence image URL' },
            404: { description: 'Violation not found' },
          },
        },
      },
      '/api/model/detections': {
        post: {
          summary: 'Ingest Computer Vision Model Detection (Primary Integration)',
          description:
            'Receives detections from the external CV model. Validates session is ACTIVE, matches camera to hall, creates/updates temporary tracker, enforces 1 tracker+1 activity=1 record rule (increments count), stores evidence image in Supabase Storage, and pushes to Supabase Realtime.',
          tags: ['Model Integration'],
          security: [{ ModelApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ModelDetectionRequest' },
              },
            },
          },
          responses: {
            200: { description: 'Violation occurrence incremented' },
            201: { description: 'New violation recorded' },
            400: { description: 'Validation error or camera mismatch' },
            401: { description: 'Unauthorized model key' },
            409: { description: 'Session is not ACTIVE' },
          },
        },
      },
      '/api/model/health': {
        get: {
          summary: 'Model Service Health Check',
          tags: ['Model Integration'],
          responses: {
            200: { description: 'Model service healthy' },
            503: { description: 'Model service unavailable' },
          },
        },
      },
    },
  }

  return NextResponse.json(spec, { status: 200 })
}
