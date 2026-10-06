/**
 * EyeX Exam Monitor — OpenAPI 3.0 Specification
 * Covers all backend API routes.
 */
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'EyeX Exam Monitor API',
    version: '2.0.0',
    description:
      'Backend REST API for EyeX Exam Monitor — a real-time examination hall monitoring system for Cameroonian secondary schools (GCE Board / MINESEC). Covers authentication, hall access, session management, violations ingestion, and classroom administration.',
    contact: {
      name: 'EyeX Support',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'Next.js API Routes (same origin)',
    },
  ],
  tags: [
    { name: 'Auth', description: 'School administrator authentication' },
    { name: 'Hall Access', description: 'Passwordless examiner hall entry' },
    { name: 'Sessions', description: 'Examination session lifecycle' },
    { name: 'Violations', description: 'Real-time malpractice violation ingestion and query' },
    { name: 'Alerts', description: 'Classroom alert stream' },
    { name: 'Classrooms', description: 'Classroom and camera management' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'sb-access-token',
        description: 'Supabase session cookie set after login/register.',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Invalid request.' },
        },
      },
      School: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          school_name: { type: 'string', example: 'Lycée de Nkolbisson' },
          email: { type: 'string', format: 'email' },
          auth_user_id: { type: 'string', format: 'uuid' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Session: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          classroom_id: { type: 'string', format: 'uuid' },
          course_name: { type: 'string', example: 'Pure Mathematics Paper II' },
          course_code: { type: 'string', example: 'MATH-402' },
          status: { type: 'string', enum: ['SCHEDULED', 'ACTIVE', 'COMPLETED'] },
          duration_minutes: { type: 'integer', example: 120 },
          expected_students: { type: 'integer', example: 30 },
          started_at: { type: 'string', format: 'date-time', nullable: true },
          ended_at: { type: 'string', format: 'date-time', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Violation: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          session_id: { type: 'string', format: 'uuid' },
          tracker_label: { type: 'string', example: 'Tracker #4' },
          tracker_id: { type: 'integer', nullable: true },
          activity_type: {
            type: 'string',
            enum: ['PHONE_DETECTED', 'LOOKING_AWAY', 'UNAUTHORIZED_ITEM', 'IMPERSONATION', 'TALKING'],
          },
          severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
          confidence: { type: 'number', format: 'float', minimum: 0, maximum: 1, example: 0.94 },
          status: { type: 'string', enum: ['FLAGGED', 'CONFIRMED', 'DISMISSED'] },
          evidence_url: { type: 'string', format: 'uri', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Alert: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          session_id: { type: 'string', format: 'uuid' },
          student_id: { type: 'string', example: '#12' },
          timestamp_ms: { type: 'integer', example: 1727786400000 },
          suspicion_score: { type: 'number', format: 'float', example: 0.87 },
          status: { type: 'string', example: 'FLAGGED' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a school',
        description: 'Creates a new school administrator account and provisions a school profile. The user is immediately signed in upon success.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['school_name', 'email', 'password'],
                properties: {
                  school_name: { type: 'string', example: 'Lycée de Nkolbisson' },
                  email: { type: 'string', format: 'email', example: 'admin@lycee-nkolbisson.cm' },
                  password: { type: 'string', minLength: 6, example: 'securepass123' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'School registered and signed in successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        email: { type: 'string' },
                      },
                    },
                    school: { $ref: '#/components/schemas/School' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'School admin login',
        description: 'Authenticates a school administrator with email and password. Sets a session cookie on success.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'admin@lycee-nkolbisson.cm' },
                  password: { type: 'string', example: 'securepass123' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    user: { type: 'object', properties: { id: { type: 'string' }, email: { type: 'string' } } },
                    school: { $ref: '#/components/schemas/School' },
                  },
                },
              },
            },
          },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current authenticated user',
        description: 'Returns the currently authenticated user and their linked school profile. Requires a valid session cookie.',
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: 'Authenticated user and school profile.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { type: 'object', properties: { id: { type: 'string' }, email: { type: 'string' } } },
                    school: { $ref: '#/components/schemas/School' },
                  },
                },
              },
            },
          },
          401: { description: 'Not authenticated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Sign out',
        description: 'Signs out the current user and clears the session cookie.',
        security: [{ cookieAuth: [] }],
        responses: {
          200: { description: 'Signed out successfully.' },
        },
      },
    },
    '/hall-access/verify': {
      post: {
        tags: ['Hall Access'],
        summary: 'Verify examiner hall code',
        description: 'Validates an 8-character hall access code issued by the school administrator. Returns the classroom ID and sets a 12-hour examiner cookie (`eyex_examiner_hall`). No authentication required.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code'],
                properties: {
                  code: { type: 'string', minLength: 8, maxLength: 8, example: '7K4P92XM' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Code verified. Classroom ID returned.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    classroomId: { type: 'string', format: 'uuid' },
                    hallName: { type: 'string', example: 'Main Hall A' },
                    classroom: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        access_code: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid or missing code', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Code expired', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'No classroom matched this code', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/sessions': {
      get: {
        tags: ['Sessions'],
        summary: 'List examination sessions',
        description: 'Returns all examination sessions, optionally filtered by classroom and/or status.',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'classroomId', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filter by classroom' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['SCHEDULED', 'ACTIVE', 'COMPLETED'] } },
        ],
        responses: {
          200: {
            description: 'Array of sessions.',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Session' } } } },
          },
        },
      },
      post: {
        tags: ['Sessions'],
        summary: 'Create examination session',
        description: 'Creates or schedules a new examination session for a hall.',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['classroomId', 'courseName'],
                properties: {
                  classroomId: { type: 'string', format: 'uuid' },
                  courseName: { type: 'string', example: 'Pure Mathematics Paper II' },
                  courseCode: { type: 'string', example: 'MATH-402' },
                  durationMinutes: { type: 'integer', default: 120 },
                  expectedStudents: { type: 'integer', default: 30 },
                  startImmediately: { type: 'boolean', default: false },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Session created.',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, session: { $ref: '#/components/schemas/Session' } } } } },
          },
          400: { description: 'Validation error' },
          409: { description: 'Active session already exists in this hall' },
        },
      },
    },
    '/sessions/{id}/start': {
      post: {
        tags: ['Sessions'],
        summary: 'Start a scheduled session',
        description: 'Transitions a SCHEDULED session to ACTIVE and records `started_at`.',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: {
            description: 'Session started.',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, session: { $ref: '#/components/schemas/Session' } } } } },
          },
          500: { description: 'Server error' },
        },
      },
    },
    '/sessions/{id}/end': {
      post: {
        tags: ['Sessions'],
        summary: 'End an active session',
        description: 'Concludes an active examination session, sets status to COMPLETED and records `ended_at`.',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: {
            description: 'Session ended.',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, session: { $ref: '#/components/schemas/Session' } } } } },
          },
          500: { description: 'Server error' },
        },
      },
    },
    '/violations': {
      post: {
        tags: ['Violations'],
        summary: 'Ingest a real-time violation',
        description: 'Called by computer vision edge hardware or simulation consoles to record a detected malpractice event.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['sessionId'],
                properties: {
                  sessionId: { type: 'string', format: 'uuid' },
                  trackerLabel: { type: 'string', example: 'Tracker #4' },
                  trackerId: { type: 'integer', example: 4 },
                  activityType: { type: 'string', enum: ['PHONE_DETECTED', 'LOOKING_AWAY', 'UNAUTHORIZED_ITEM', 'IMPERSONATION', 'TALKING'], default: 'PHONE_DETECTED' },
                  severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
                  confidence: { type: 'number', format: 'float', minimum: 0, maximum: 1, example: 0.94 },
                  evidenceUrl: { type: 'string', format: 'uri', nullable: true },
                  metadata: { type: 'object', example: { desk_quadrant: 'B-12' } },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Violation recorded.',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, violation: { $ref: '#/components/schemas/Violation' } } } } },
          },
          400: { description: 'Missing sessionId' },
        },
      },
      get: {
        tags: ['Violations'],
        summary: 'Query violations ledger',
        description: 'Fetches recorded violations, filterable by session.',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'sessionId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
        ],
        responses: {
          200: {
            description: 'Array of violations.',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Violation' } } } },
          },
        },
      },
    },
    '/alerts': {
      get: {
        tags: ['Alerts'],
        summary: 'Get classroom alerts',
        description: 'Returns recent classroom alerts from the `classroom_alerts` table, scoped by RLS to the current school.',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
          { name: 'status', in: 'query', schema: { type: 'string', example: 'FLAGGED' } },
        ],
        responses: {
          200: {
            description: 'Array of alerts.',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Alert' } } } },
          },
          500: { description: 'Database error' },
        },
      },
    },
    '/classrooms/{id}/cameras': {
      post: {
        tags: ['Classrooms'],
        summary: 'Attach camera to hall',
        description: 'Registers an overhead or peripheral camera feed to an examination hall.',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, description: 'Classroom UUID', schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'cameraNumber'],
                properties: {
                  name: { type: 'string', example: 'Camera 2 (Overhead Wide)' },
                  cameraNumber: { type: 'integer', example: 2 },
                  status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Camera registered.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    camera: { type: 'object', properties: { id: { type: 'string' }, camera_number: { type: 'integer' }, status: { type: 'string' } } },
                  },
                },
              },
            },
          },
        },
      },
      get: {
        tags: ['Classrooms'],
        summary: 'List cameras for a hall',
        description: 'Returns all cameras registered to a specific classroom/hall.',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Array of cameras.' },
        },
      },
    },
    '/classrooms/{id}/rotate-code': {
      post: {
        tags: ['Classrooms'],
        summary: 'Rotate hall access code',
        description: 'Generates a fresh 8-character access code for the hall (valid 7 days), invalidating previous codes.',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: {
            description: 'New code generated.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    access_code: { type: 'string', example: '3N8P4Z9X' },
                    code_expires_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          500: { description: 'Server error' },
        },
      },
    },
  },
}
