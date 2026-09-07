# API Code Generator Agent — Implementation Plan

## 1. Project Overview

### Project Name

**API Code Generator Agent — Swagger Assistant**

### Objective

Build a production-ready AI-powered API test generation system that reads OpenAPI/Swagger specifications and systematically generates comprehensive, runnable API test projects.

The system must combine:

* Deterministic OpenAPI parsing
* `$ref` and schema resolution
* Contract-driven test scenario generation
* LLM-powered intelligent test generation
* Framework-specific code generation
* Test coverage analysis
* Schema and response validation
* Runnable project generation

The system must not rely entirely on the LLM to determine API coverage.

The deterministic parser and scenario engine are responsible for identifying what must be tested. The LLM is responsible for intelligent scenario interpretation and framework-specific code generation.

---

# 2. Problem Statement

API teams maintain OpenAPI/Swagger specifications containing dozens or hundreds of endpoints.

Writing comprehensive tests manually for every:

* endpoint
* HTTP method
* documented response
* request parameter
* required field
* boundary condition
* invalid input
* authentication requirement
* response schema

is time-consuming and error-prone.

The agent should convert an API contract into an executable API test project while providing measurable test coverage.

The system should answer:

> "Given this OpenAPI contract, what should be tested, and can you generate runnable tests for it?"

---

# 3. Core Product Flow

The primary flow is:

```text
OpenAPI / Swagger Spec
        |
        v
Spec Ingestion
        |
        v
OpenAPI Parser
        |
        v
$ref / Schema Resolution
        |
        v
Normalized API Manifest
        |
        v
Deterministic Scenario Engine
        |
        v
Test Scenario Matrix
        |
        v
LLM Scenario Enhancement
        |
        v
Scenario Validation
        |
        v
Framework Code Generator
        |
        v
Generated Test Project
        |
        v
Coverage Report
```

The initial implementation should focus on generation and validation.

Actual API execution and automatic failure healing are future enhancements.

---

# 4. Supported Input

The system must support:

## OpenAPI / Swagger formats

* Swagger 2.0
* OpenAPI 3.x

## File formats

* JSON
* YAML
* YML

## Input methods

### File upload

User uploads:

```text
swagger.json
openapi.json
swagger.yaml
openapi.yaml
```

### URL

User provides:

```text
https://example.com/openapi.json
```

or:

```text
https://example.com/swagger.yaml
```

---

# 5. Separate Specification URL From API Base URL

The OpenAPI specification location and the actual API execution URL are different concepts.

Example:

```text
Specification URL:
https://example.com/swagger.json

API Base URL:
https://api.example.com
```

The application must support both.

The generated tests must use the API Base URL.

If the API Base URL can be reliably derived from:

* OpenAPI `servers`
* Swagger `host`
* Swagger `basePath`
* Swagger `schemes`

then use the derived value as the default.

The user must still be able to override it.

---

# 6. Supported Target Frameworks

V1 must support:

1. Playwright API
2. REST Assured
3. Karate
4. Supertest

The user selects exactly one framework per generation run.

Do not infer a framework from ambiguous text.

If no framework is provided, the system should return a clear validation error.

---

# 7. Architecture

## High-Level Architecture

```text
                         USER
                          |
                          v
                 React / Vite UI
                          |
                          v
                  Backend REST API
                          |
             +------------+------------+
             |                         |
             v                         v
       PostgreSQL                 LangFlow API
                                       |
                                       v
                               DeepSeek V4 Flash
                                       |
                                       v
                              Structured AI Output
             |                         |
             +------------+------------+
                          |
                          v
                    Test Generator
                          |
                          v
                  Generated Project
                          |
                          v
                     ZIP Download
```

---

# 8. Technology Stack

## Frontend

* React
* Vite
* TypeScript
* Tailwind CSS
* React Router
* TanStack Query
* Lucide Icons
* Recharts where charts are useful

## Backend

* Node.js
* TypeScript
* Express or Fastify
* Zod
* Prisma
* PostgreSQL

## AI

* LangFlow
* DeepSeek V4 Flash
* OpenAI-compatible LangFlow provider

## API Parsing

Prefer a mature OpenAPI parser/resolver library where appropriate.

Do not unnecessarily reimplement OpenAPI parsing from scratch.

The custom LangFlow component should normalize the resolved specification into the compact manifest required by the LLM.

## Storage

Development:

* Local filesystem

Future:

* S3-compatible storage

## Testing

* Playwright for application E2E tests
* Backend/API test framework appropriate for Node/TypeScript
* Unit tests for parser/scenario/coverage logic

---

# 9. LangFlow Role

LangFlow is the AI orchestration layer.

React must never directly call DeepSeek.

The architecture must be:

```text
React
  |
  v
Backend
  |
  v
LangFlow
  |
  v
DeepSeek V4 Flash
```

The LangFlow Flow ID must be configurable using environment variables.

Example:

```text
LANGFLOW_BASE_URL=
LANGFLOW_FLOW_ID=
LANGFLOW_API_KEY=
```

---

# 10. LangFlow Workflow

The recommended LangFlow workflow is:

```text
                    +----------------+
                    |   Chat Input   |
                    +-------+--------+
                            |
                            |
             +--------------+--------------+
             |                             |
             v                             v
       Spec URL Input                Uploaded File
             |                             |
             +--------------+--------------+
                            |
                            v
                 +----------------------+
                 | OpenAPI Spec Parser  |
                 |                      |
                 | JSON/YAML            |
                 | Swagger/OpenAPI      |
                 | $ref resolution      |
                 | Schema normalization |
                 +----------+-----------+
                            |
                            v
                 +----------------------+
                 | API Manifest         |
                 +----------+-----------+
                            |
                            v
                 +----------------------+
                 | Scenario Generator   |
                 +----------+-----------+
                            |
                            v
                 +----------------------+
                 | LLM                  |
                 | DeepSeek V4 Flash    |
                 +----------+-----------+
                            |
                            v
                 +----------------------+
                 | Scenario Validator   |
                 +----------+-----------+
                            |
                            v
                 +----------------------+
                 | Code Generator       |
                 +----------+-----------+
                            |
                            v
                 +----------------------+
                 | Generated Test       |
                 | Project               |
                 +----------+-----------+
                            |
                    +-------+-------+
                    |               |
                    v               v
               Chat Output      Write/Save
                               Generated Files
```

---

# 11. Why Not Use an Autonomous Agent for Everything

The initial workflow should behave primarily as a deterministic pipeline.

The core process is:

```text
Parse
  ->
Normalize
  ->
Generate scenarios
  ->
Validate scenarios
  ->
Generate code
```

There is no need for an autonomous agent to make arbitrary decisions.

Use normal LLM/prompt components where possible.

An Agent can be introduced later if the workflow gains tools such as:

* HTTP execution
* test runner
* schema inspection
* failure analyzer
* automatic test repair

Do not over-engineer V1.

---

# 12. OpenAPI Parser

Create a deterministic `OpenAPISpecParser` custom component or equivalent backend service.

## Inputs

```text
spec_url
spec_file
```

## Outputs

At minimum:

```text
spec_text
manifest
error
```

---

# 13. Parser Responsibilities

The parser must:

1. Load JSON or YAML.
2. Detect Swagger/OpenAPI version.
3. Validate that the document is an OpenAPI/Swagger document.
4. Resolve local `$ref`.
5. Resolve nested schema references.
6. Normalize Swagger 2.0 and OpenAPI 3.x structures.
7. Extract API metadata.
8. Extract servers/base URL information.
9. Extract security schemes.
10. Extract every path.
11. Extract every supported HTTP method.
12. Extract operation metadata.
13. Extract parameters.
14. Extract request bodies.
15. Extract response definitions.
16. Extract response schemas.
17. Extract schema constraints.
18. Extract examples/defaults where available.
19. Extract enums.
20. Extract required fields.

---

# 14. `$ref` Resolution

This is mandatory.

The parser must correctly handle structures such as:

```yaml
$ref: '#/components/schemas/User'
```

and Swagger 2.0 references such as:

```yaml
$ref: '#/definitions/User'
```

Also handle references inside:

* parameters
* request bodies
* responses
* properties
* arrays
* nested objects
* security definitions
* schemas

The normalized manifest should contain resolved information rather than leaving critical `$ref` references unresolved.

Avoid infinite recursion.

Protect against circular references.

---

# 15. Schema Features

Where available, extract:

```text
type
format
description
default
example
examples
enum
required
nullable
minimum
maximum
exclusiveMinimum
exclusiveMaximum
minLength
maxLength
minItems
maxItems
pattern
multipleOf
items
properties
additionalProperties
allOf
oneOf
anyOf
```

The implementation does not need to support every obscure OpenAPI feature in V1, but the architecture should allow additional schema support later.

---

# 16. Normalized API Manifest

Do not send the complete raw OpenAPI document to the LLM.

Generate a compact normalized manifest.

Example:

```json
{
  "spec": {
    "title": "Petstore",
    "version": "1.0.0",
    "format": "openapi",
    "version": "3.0.3"
  },
  "servers": [
    "https://api.example.com"
  ],
  "securitySchemes": [],
  "endpoints": [
    {
      "path": "/users/{id}",
      "method": "GET",
      "operationId": "getUser",
      "summary": "Get user",
      "tags": ["Users"],
      "parameters": [],
      "requestBody": null,
      "responses": [
        {
          "status": "200",
          "schema": {}
        },
        {
          "status": "404",
          "schema": {}
        }
      ]
    }
  ]
}
```

---

# 17. Coverage Metadata

The parser should also calculate deterministic coverage requirements.

Example:

```json
{
  "coverageRequirements": {
    "endpointCount": 20,
    "methodCount": 24,
    "documentedResponseCount": 61,
    "requiredFieldCount": 38,
    "boundaryConstraintCount": 29,
    "enumCount": 14,
    "securityRequirementCount": 18,
    "schemaCount": 32
  }
}
```

This allows the system to determine whether the generated test suite actually covers the API contract.

---

# 18. Deterministic Scenario Engine

This is a key component.

The scenario engine must derive test scenarios from the contract before asking the LLM to generate final code.

It should generate scenarios for:

## Happy path

Every endpoint/method should have at least one valid scenario when the contract permits it.

## Documented response codes

Every documented response status code should have a scenario.

Example:

```text
200
201
204
400
401
403
404
409
422
500
```

Only generate statuses documented by the contract unless there is a clear deterministic reason to generate a standard validation scenario.

Do not claim that an undocumented response is guaranteed.

---

# 19. Boundary Scenario Generation

Generate deterministic boundary scenarios from schema constraints.

## minimum

If:

```text
minimum = 10
```

generate:

```text
9
10
11
```

## maximum

If:

```text
maximum = 100
```

generate:

```text
99
100
101
```

## minLength

If:

```text
minLength = 5
```

generate:

```text
4 characters
5 characters
6 characters
```

## maxLength

If:

```text
maxLength = 10
```

generate:

```text
9 characters
10 characters
11 characters
```

## enum

For:

```text
ACTIVE
INACTIVE
```

generate:

```text
ACTIVE
INACTIVE
invalid enum value
```

## pattern

If a regex pattern is provided, generate valid and invalid values where practical.

Do not attempt impossible pattern generation.

---

# 20. Required Field Scenarios

For required fields, generate:

```text
valid request
missing field
empty field where applicable
null field where applicable
```

Example:

```text
required:
  - username
  - email
```

Generate:

```text
missing username
missing email
missing username + email
```

Do not generate redundant combinations that create an unreasonable test explosion.

Use sensible limits.

---

# 21. Invalid Data Types

Where schema type is known, generate invalid type scenarios.

Example:

```text
integer
```

negative/invalid scenarios may include:

```text
string
boolean
null
```

where appropriate.

Example:

```text
string
```

may include:

```text
number
boolean
object
null
```

Do not create meaningless invalid combinations.

---

# 22. Authentication Scenarios

Normalize:

```text
bearer
apiKey
basic
oauth2
openIdConnect
```

Generate applicable scenarios such as:

```text
valid authentication
missing authentication
invalid authentication
```

Do not generate fake credentials.

Generated test projects should reference environment variables.

Example:

```env
API_BASE_URL=
BEARER_TOKEN=
API_KEY=
USERNAME=
PASSWORD=
```

---

# 23. Test Scenario Matrix

Each scenario must have metadata.

Example:

```json
{
  "id": "POST-users-missing-email",
  "endpoint": "POST /users",
  "type": "missing_required",
  "inputMutation": {
    "field": "email",
    "action": "remove"
  },
  "expectedStatus": [
    400,
    422
  ],
  "source": "openapi-contract"
}
```

Supported scenario types:

```text
happy_path
documented_response
missing_required
boundary_min
boundary_max
invalid_type
invalid_format
invalid_enum
empty_value
null_value
authentication_missing
authentication_invalid
schema_validation
```

---

# 24. Scenario Validation

Before code generation, validate the scenario list.

Checks:

* endpoint exists
* HTTP method exists
* expected status is documented or explicitly classified
* referenced fields exist
* mutation is valid
* schema references are valid
* no duplicate scenarios
* no malformed scenario
* no impossible field mutation

Invalid scenarios must be removed or reported.

---

# 25. LLM Responsibilities

The LLM should NOT be responsible for discovering basic contract coverage.

The LLM should:

* interpret the manifest
* improve scenario descriptions
* determine useful test data where schema permits
* generate readable tests
* organize tests by resource/tag
* generate framework-specific code
* generate setup/teardown
* generate response assertions
* generate schema validation
* generate comments only when useful

The LLM must use the manifest as the source of truth.

---

# 26. LLM Integrity Rules

The LLM must NEVER:

* invent endpoints
* invent HTTP methods
* invent documented response codes
* invent request fields
* invent response fields
* invent authentication mechanisms
* invent required fields
* invent schema constraints
* invent API behavior

If information is not present in the OpenAPI contract, it must not be presented as guaranteed behavior.

---

# 27. Code Generation

Generate framework-specific runnable projects.

Do not generate a single `.txt` file as the primary output.

---

# 28. Playwright Output

Example:

```text
api-tests/
├── package.json
├── playwright.config.ts
├── tests/
│   ├── users.spec.ts
│   ├── products.spec.ts
│   └── orders.spec.ts
├── test-data/
│   └── generated-data.ts
├── .env.example
└── README.md
```

Use Playwright APIRequest / `request`.

Tests should include:

* request setup
* API calls
* status assertions
* response body assertions
* schema validation where practical
* test data
* authentication configuration

---

# 29. REST Assured Output

Example:

```text
api-tests/
├── pom.xml
├── src/
│   └── test/
│       └── java/
│           ├── UsersTest.java
│           ├── ProductsTest.java
│           └── OrdersTest.java
├── src/test/resources/
│   └── test-data/
├── .env.example
└── README.md
```

Use standard REST Assured patterns.

---

# 30. Karate Output

Example:

```text
api-tests/
├── pom.xml
├── src/
│   └── test/
│       └── java/
│           ├── users/
│           │   └── users.feature
│           ├── products/
│           │   └── products.feature
│           └── orders/
│               └── orders.feature
├── karate-config.js
├── .env.example
└── README.md
```

---

# 31. Supertest Output

Example:

```text
api-tests/
├── package.json
├── tsconfig.json
├── jest.config.ts
├── tests/
│   ├── users.test.ts
│   ├── products.test.ts
│   └── orders.test.ts
├── test-data/
├── .env.example
└── README.md
```

Use Supertest and a suitable test runner.

---

# 32. Generated Project Requirements

Every generated project must include:

```text
README.md
environment configuration
installation instructions
execution instructions
test files
test data where required
framework configuration
```

README should explain:

```text
1. Install dependencies
2. Configure API_BASE_URL
3. Configure authentication
4. Run tests
```

---

# 33. Generated Test Assertions

Tests should validate:

## Status

Example:

```text
expect(response.status()).toBe(200)
```

## Response body

Validate expected fields.

## Data types

Where schema provides type information.

Example:

```text
id -> integer
name -> string
active -> boolean
```

## Required fields

Ensure expected fields exist.

## Schema

Use JSON Schema or framework-native equivalent where practical.

---

# 34. Test Organization

Organize generated tests by API tag/resource.

Example:

```text
Users
Products
Orders
Payments
```

Do not create one enormous test file unless the framework requires it.

---

# 35. Test Data Management

Test data should be:

* deterministic
* readable
* schema compliant
* configurable

Use OpenAPI examples/defaults where available.

Otherwise generate safe deterministic values from schema.

Do not use random data unless necessary.

If random data is used, seed it where possible.

---

# 36. API Base URL Configuration

Generated tests must never hardcode environment-specific API URLs when avoidable.

Use:

```env
API_BASE_URL=https://api.example.com
```

The generated framework configuration reads this value.

---

# 37. Authentication Configuration

Never hardcode credentials.

Use:

```env
BEARER_TOKEN=
API_KEY=
USERNAME=
PASSWORD=
```

Generated tests should skip or clearly handle authentication tests if required credentials are not supplied.

---

# 38. Coverage Report

After generation, calculate coverage.

Example:

```text
API Test Coverage

Endpoints                24 / 24     100%
HTTP Methods             24 / 24     100%
Documented Responses     58 / 61      95%
Required Fields          38 / 38     100%
Boundary Scenarios       27 / 29      93%
Enum Scenarios           14 / 14     100%
Authentication            8 / 8      100%
Schema Validation        24 / 24     100%
```

Clearly show uncovered requirements.

Example:

```text
3 documented responses have no generated scenario.
```

Do not claim 100% coverage if it isn't true.

---

# 39. UI

The UI should be implemented as a professional enterprise SaaS application.

Avoid:

* excessive gradients
* unnecessary animations
* oversized cards
* fake AI visuals
* decorative UI with no functional purpose

Prioritize:

* information density
* clear hierarchy
* usability
* responsive design
* accessibility
* clear status indicators

---

# 40. Main Navigation

Use:

```text
Dashboard
Generate Tests
Projects
History
Settings
```

---

# 41. Dashboard

Show:

```text
Specifications Processed
Endpoints Analyzed
Tests Generated
Average Coverage
Projects Generated
```

Recent generation history.

---

# 42. Generate Tests Screen

The main generation page should contain:

```text
Test Framework

[ Playwright API ▼ ]

OpenAPI Specification

[ Upload File ]

or

[ Specification URL ]

API Base URL

[ __________________ ]

Authentication

[ None ▼ ]

Additional Instructions

[ __________________ ]

[ Analyze Specification ]
```

---

# 43. Specification Analysis Screen

After parsing:

```text
Petstore

OpenAPI 3.0.3

Endpoints             24
Schemas                 18
Parameters              61
Documented Responses    57
Security Requirements    8
Boundary Rules           31
```

Show endpoint list.

Example:

```text
GET     /pets
POST    /pets
GET     /pets/{id}
DELETE  /pets/{id}
```

---

# 44. Scenario Review

Before code generation, show:

```text
Expected Test Scenarios: 183
```

Breakdown:

```text
Happy Path             24
Documented Responses   57
Required Fields        31
Boundary               31
Invalid Types          22
Enums                  12
Authentication          6
Schema Validation      24
```

Allow the user to review the scenario list.

A "Generate Tests" action starts code generation.

---

# 45. Generation Result

Show:

```text
Generation Complete

183 scenarios
4 test suites
96% contract coverage

[Download ZIP]
[View Files]
[View Coverage]
```

---

# 46. Generated Project Viewer

Allow users to inspect generated files.

Example:

```text
api-tests/
  package.json
  playwright.config.ts
  tests/
    users.spec.ts
    products.spec.ts
```

Code viewer should provide syntax highlighting if practical.

---

# 47. Backend API

Create REST APIs.

## Specification

```text
POST /api/specs/parse
```

## Analysis

```text
POST /api/specs/:id/analyze
```

## Scenario generation

```text
POST /api/specs/:id/scenarios
```

## Code generation

```text
POST /api/specs/:id/generate
```

## Projects

```text
GET /api/projects
GET /api/projects/:id
GET /api/projects/:id/files
GET /api/projects/:id/download
```

## Coverage

```text
GET /api/projects/:id/coverage
```

## History

```text
GET /api/history
```

---

# 48. Database

Use PostgreSQL with Prisma.

Core models:

```text
Specification
Endpoint
Scenario
GeneratedProject
GeneratedFile
GenerationRun
CoverageReport
```

---

# 49. Specification Model

Suggested fields:

```text
id
name
sourceType
sourceUrl
filePath
format
version
title
baseUrl
rawHash
createdAt
updatedAt
```

Do not necessarily persist the entire raw OpenAPI document if storage requirements make this undesirable.

---

# 50. Endpoint Model

Suggested fields:

```text
id
specificationId
path
method
operationId
summary
tags
parameters
requestBody
responses
security
```

Use JSONB for complex normalized structures.

---

# 51. Scenario Model

Suggested fields:

```text
id
specificationId
endpointId
type
name
inputMutation
expectedStatus
expectedAssertions
source
createdAt
```

---

# 52. Generated Project Model

Suggested fields:

```text
id
specificationId
framework
projectName
scenarioCount
coveragePercentage
outputPath
createdAt
```

---

# 53. Generation Run

Track:

```text
startedAt
completedAt
status
framework
scenarioCount
coverage
error
```

Statuses:

```text
PENDING
PARSING
GENERATING_SCENARIOS
GENERATING_CODE
COMPLETED
FAILED
```

---

# 54. Validation

Use Zod for:

* request validation
* parser output
* scenario objects
* LLM output
* coverage reports
* generated project metadata

Never blindly trust LLM output.

---

# 55. LLM Output Validation

The LLM must return structured JSON.

Do not accept arbitrary prose as the primary result.

Validate:

```text
framework
scenarios
testFiles
coverage
warnings
```

If parsing fails:

1. attempt controlled JSON repair
2. validate again
3. if invalid, return a controlled error

Never save malformed output.

---

# 56. Error Handling

Handle:

* invalid OpenAPI file
* malformed YAML
* malformed JSON
* unsupported OpenAPI version
* unresolved reference
* circular reference
* invalid URL
* URL fetch failure
* timeout
* LangFlow unavailable
* LLM timeout
* malformed LLM response
* unsupported framework
* file too large
* unsupported file type
* generation failure

Return useful errors.

Do not expose stack traces to users.

---

# 57. Security

Implement:

* Helmet
* CORS
* rate limiting
* input validation
* file size limits
* file type validation
* safe filenames
* URL validation
* timeout for remote specification fetching

Never expose:

```text
LANGFLOW_API_KEY
```

to the browser.

---

# 58. Remote Spec Fetching

When fetching a specification URL:

* validate URL
* enforce timeout
* limit response size
* follow redirects only when safe/required
* reject unsupported protocols
* validate returned content
* handle HTTP errors clearly

Do not allow arbitrary internal network access if this application is later deployed publicly.

SSRF protection should be considered for production deployment.

---

# 59. File Upload

Allow:

```text
.json
.yaml
.yml
```

Set reasonable file size limits.

Validate actual content rather than trusting only the filename.

---

# 60. Logging

Backend should provide structured logs for:

* generation start
* parser result
* endpoint count
* scenario count
* LangFlow call
* generation completion
* errors

Never log secrets.

---

# 61. Environment Variables

Create:

```text
.env.example
```

Include:

```env
DATABASE_URL=

LANGFLOW_BASE_URL=
LANGFLOW_FLOW_ID=
LANGFLOW_API_KEY=

PORT=
FRONTEND_URL=

STORAGE_PATH=
MAX_UPLOAD_SIZE=
```

Never commit real credentials.

---

# 62. Docker

Provide Docker Compose for PostgreSQL.

Optionally support:

```text
docker compose up
```

for the development database.

The frontend and backend should also be easy to containerize.

---

# 63. Testing Strategy

Create tests for:

## Parser

* Swagger 2 JSON
* OpenAPI 3 JSON
* OpenAPI 3 YAML
* nested `$ref`
* schema constraints
* enums
* required fields
* security schemes

## Scenario Engine

* happy paths
* response codes
* minimum
* maximum
* minLength
* maxLength
* enum
* missing fields
* invalid types
* authentication

## Coverage

* full coverage
* partial coverage
* uncovered scenarios
* duplicate scenarios

## LLM Validation

* valid JSON
* malformed JSON
* missing fields
* invalid scenario references

## Backend

* upload
* URL ingestion
* generation
* download
* error handling

---

# 64. End-to-End Test

The main E2E test must verify:

```text
Open application
        ↓
Select Playwright
        ↓
Upload OpenAPI spec
        ↓
Enter API Base URL
        ↓
Analyze
        ↓
View endpoint count
        ↓
View scenarios
        ↓
Generate tests
        ↓
View coverage
        ↓
Download generated project
```

The E2E test should verify actual functionality rather than only screenshots.

---

# 65. V1 Scope

V1 MUST include:

```text
Swagger 2.0
OpenAPI 3.x
JSON
YAML

URL ingestion
File upload

$ref resolution

Endpoint extraction
Parameter extraction
Request body extraction
Response extraction
Schema extraction

Deterministic scenario generation

Happy paths
Documented response codes
Required fields
Boundary values
Invalid types
Enums
Authentication scenarios
Schema validation

Playwright
REST Assured
Karate
Supertest

Structured LLM output
Scenario validation
Code generation
Runnable project generation
ZIP download
Coverage report
```

---

# 66. Explicitly Out of Scope for V1

Do NOT implement these unless required for the core workflow:

```text
User authentication
Multi-tenancy
Cloud storage
GitHub integration
Jira integration
CI/CD integration
API execution against real environments
Automatic test healing
AI-generated API mocks
Performance testing
Load testing
Security scanning
Complex RBAC
Billing
Subscription management
```

These can be V2/V3.

---

# 67. V2 Roadmap

Potential V2:

```text
Execute generated tests
        ↓
Collect failures
        ↓
Analyze failures with AI
        ↓
Fix generated tests
        ↓
Re-run
```

Additional V2 capabilities:

* GitHub integration
* GitLab integration
* CI/CD integration
* Postman collection generation
* Newman support
* environment management
* test execution dashboard
* automatic failure classification
* test repair
* API contract drift detection

---

# 68. Future AI API Test Engineer

The long-term architecture should allow the product to evolve from:

```text
API Code Generator
```

into:

```text
AI API Test Engineer
```

Long-term flow:

```text
OpenAPI
   ↓
Generate tests
   ↓
Execute tests
   ↓
Analyze failures
   ↓
Determine:
   - API defect
   - test defect
   - environment defect
   - authentication defect
   ↓
Repair test if appropriate
   ↓
Re-run
   ↓
Generate final report
```

This should NOT be implemented in V1.

---

# 69. Important Product Principle

The system must distinguish between:

### Contract coverage

What the OpenAPI specification explicitly describes.

and:

### Business-rule coverage

Behavior that may exist in the real API but is not described in OpenAPI.

The tool can guarantee systematic coverage of the contract.

It cannot guarantee all possible business-rule edge cases.

Use accurate language such as:

> Comprehensive contract-driven API test generation.

Avoid claiming:

> Every possible API edge case.

---

# 70. Important AI Principle

The deterministic system decides:

```text
WHAT must be tested.
```

The LLM decides:

```text
HOW the test should be expressed.
```

This separation is fundamental.

```text
OpenAPI
   ↓
Deterministic parser
   ↓
Deterministic scenario matrix
   ↓
LLM
   ↓
Framework-specific implementation
```

This reduces hallucination and makes test completeness measurable.

---

# 71. Recommended Project Structure

```text
API-Code-Generator-Agent/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── lib/
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── validators/
│   │   ├── parser/
│   │   ├── scenarios/
│   │   ├── generators/
│   │   ├── langflow/
│   │   ├── storage/
│   │   └── utils/
│   └── package.json
│
├── prisma/
│   └── schema.prisma
│
├── langflow/
│   └── api-code-generator-agent.json
│
├── storage/
│   ├── uploads/
│   └── generated/
│
├── tests/
│   ├── unit/
│   ├── api/
│   └── e2e/
│
├── docker-compose.yml
├── .env.example
├── README.md
└── plan.md
```

---

# 72. LangFlow Export

Create:

```text
langflow/api-code-generator-agent.json
```

Do not overwrite any existing file such as:

```text
api-code-generator.json
```

if that file is an unrelated SPA/application artifact.

The LangFlow JSON must use the actual export structure supported by the installed LangFlow version.

For LangFlow Desktop 1.11.x, validate:

```text
data.nodes
data.edges
data.viewport
name
id
description
last_tested_version
```

Use unique node IDs.

---

# 73. LangFlow Custom Component

If using a custom `OpenAPISpecParser`, follow the actual custom-component conventions of the installed LangFlow version.

The component should:

* accept URL
* accept uploaded file
* parse JSON/YAML
* resolve references
* normalize the specification
* emit manifest
* emit errors cleanly

Keep the component self-contained if the exported JSON is intended to be portable.

---

# 74. Write File / Project Generation

Do not rely on a single TXT output as the final product.

The preferred result is a generated project directory that can be zipped.

If LangFlow's native file-writing capabilities are insufficient for creating a multi-file project, allow the backend to perform final project assembly.

The architecture should therefore support:

```text
LangFlow
    ↓
Structured generation result
    ↓
Backend project assembler
    ↓
ZIP
```

This is preferable to forcing all filesystem operations into the LLM workflow.

---

# 75. Generation Output Contract

The LLM/backend pipeline should ultimately produce something equivalent to:

```json
{
  "framework": "playwright",
  "projectName": "petstore-api-tests",
  "files": [
    {
      "path": "package.json",
      "content": "..."
    },
    {
      "path": "playwright.config.ts",
      "content": "..."
    },
    {
      "path": "tests/pets.spec.ts",
      "content": "..."
    }
  ],
  "scenarios": [],
  "coverage": {
    "endpointCoverage": 100,
    "responseCoverage": 100,
    "boundaryCoverage": 95,
    "schemaCoverage": 100
  },
  "warnings": []
}
```

The backend validates this structure before writing files.

---

# 76. Generation Safety

Before creating files:

* validate file paths
* reject `../`
* reject absolute paths
* sanitize project name
* limit generated file count
* limit file size

Do not allow generated content to write outside the designated project directory.

---

# 77. Verification Plan

The implementation is not complete until the following is verified.

## Test 1 — Petstore URL

Input:

```text
framework=playwright
spec=https://petstore.swagger.io/v2/swagger.json
```

Verify:

```text
spec loads
parser succeeds
endpoints are extracted
scenarios are generated
tests are generated
coverage report appears
project ZIP is created
```

---

# 78. Test 2 — Uploaded YAML

Upload an OpenAPI YAML file.

Verify:

```text
YAML parsing
$ref resolution
schema extraction
scenario generation
code generation
```

---

# 79. Test 3 — REST Assured

Generate REST Assured project.

Verify:

```text
pom.xml
Java test files
configuration
README
```

---

# 80. Test 4 — Karate

Generate Karate project.

Verify:

```text
pom.xml
feature files
configuration
README
```

---

# 81. Test 5 — Supertest

Generate Supertest project.

Verify:

```text
package.json
TypeScript tests
configuration
README
```

---

# 82. Test 6 — Missing Input

Submit without:

* URL
* file

Return:

```text
No OpenAPI specification provided.
Upload a JSON/YAML file or provide a specification URL.
```

Do not crash.

---

# 83. Test 7 — Invalid Specification

Upload invalid JSON/YAML.

Return a useful error.

Do not call the LLM.

---

# 84. Test 8 — Unsupported Framework

Return:

```text
Unsupported framework.
Choose Playwright, REST Assured, Karate, or Supertest.
```

---

# 85. Test 9 — Incomplete Coverage

Use a specification with multiple response codes and constraints.

Verify the coverage engine identifies all requirements and reports anything not generated.

---

# 86. Definition of Done

The project is considered complete only when:

### Ingestion

* JSON works
* YAML works
* Swagger 2 works
* OpenAPI 3 works
* URL works
* upload works

### Parsing

* endpoints extracted
* methods extracted
* parameters extracted
* request bodies extracted
* responses extracted
* schemas extracted
* `$ref` resolution works
* security schemes extracted

### Scenario generation

* happy path
* documented response codes
* required fields
* boundaries
* enums
* invalid types
* authentication
* schema validation

### AI

* LangFlow integration works
* DeepSeek V4 Flash works
* structured output is validated
* hallucinated endpoints are prevented

### Code generation

* Playwright works
* REST Assured works
* Karate works
* Supertest works

### Output

* runnable project generated
* README generated
* `.env.example` generated
* ZIP downloadable
* coverage report generated

### Quality

* frontend builds
* backend builds
* tests pass
* no TypeScript errors
* no lint errors
* Docker database starts
* main E2E workflow passes

---

# 87. Implementation Order

Implement in this order.

## Phase 1 — Repository Inspection

Inspect:

* existing files
* existing package configuration
* existing LangFlow JSON
* available dependencies
* existing components

Do not overwrite useful existing work.

---

## Phase 2 — Architecture

Create:

* frontend
* backend
* Prisma
* Docker
* shared types where appropriate

---

## Phase 3 — Parser

Implement:

```text
JSON/YAML
Swagger 2
OpenAPI 3
$ref
schemas
parameters
responses
security
```

Write parser tests.

---

## Phase 4 — Scenario Engine

Implement deterministic:

```text
happy path
responses
required fields
boundaries
enums
invalid types
authentication
schema
```

Write unit tests.

---

## Phase 5 — LangFlow

Implement:

```text
Backend
 ↓
LangFlow
 ↓
DeepSeek
```

Validate structured output.

---

## Phase 6 — Code Generators

Implement one framework at a time:

```text
Playwright
REST Assured
Karate
Supertest
```

Prefer templates and deterministic assembly where possible.

Use the LLM for content generation and framework-specific test logic.

---

## Phase 7 — Project Assembly

Create:

```text
project directory
files
README
.env.example
ZIP
```

---

## Phase 8 — Frontend

Build:

```text
Dashboard
Generate Tests
Specification Analysis
Scenario Review
Generation Result
Project Viewer
Coverage
History
Settings
```

---

## Phase 9 — Integration

Connect:

```text
React
 ↓
Backend
 ↓
Parser
 ↓
Scenario Engine
 ↓
LangFlow
 ↓
Code Generator
 ↓
ZIP
```

---

## Phase 10 — Testing

Run:

```text
unit tests
API tests
E2E tests
lint
typecheck
build
```

Fix all discovered issues.

---

# 88. Development Philosophy

Do not over-engineer.

Prefer:

```text
simple
testable
modular
deterministic
maintainable
```

over:

```text
complex
abstract
over-generalized
prematurely scalable
```

Do not introduce unnecessary microservices.

A modular monolith is sufficient for V1.

---

# 89. Most Important Design Decisions

The following decisions are intentional and should not be changed without a strong reason:

### Decision 1

OpenAPI parsing is deterministic.

### Decision 2

`$ref` resolution is mandatory.

### Decision 3

Scenario generation is separated from code generation.

### Decision 4

LLM output is structured and validated.

### Decision 5

API Base URL is separate from OpenAPI Specification URL.

### Decision 6

Generated output is a runnable project rather than a TXT file.

### Decision 7

Coverage is measurable.

### Decision 8

The tool does not claim to guarantee undocumented business-rule coverage.

### Decision 9

The LLM must never fabricate API contract information.

### Decision 10

V1 does not execute tests against real APIs.

---

# 90. Final Target

The final product should allow a QA/SDET engineer to do:

```text
Upload Swagger
       ↓
Select Playwright
       ↓
Enter API Base URL
       ↓
Analyze
       ↓
183 contract-driven scenarios
       ↓
Review coverage
       ↓
Generate
       ↓
Download ZIP
       ↓
Run:

npm install
npx playwright test
```

The equivalent experience must exist for:

```text
REST Assured
Karate
Supertest
```

The key value proposition is:

> **Turn an OpenAPI contract into a measurable, comprehensive, runnable API test project.**

The system should combine deterministic QA logic with LLM intelligence rather than relying on the LLM alone.

---

# 91. Final Engineering Instruction

Do not stop at creating the architecture or UI.

Actually implement the system.

After implementation:

1. Start the database.
2. Start the backend.
3. Start the frontend.
4. Start/verify LangFlow integration.
5. Run unit tests.
6. Run API tests.
7. Run E2E tests.
8. Run lint.
9. Run TypeScript checks.
10. Build frontend.
11. Build backend.
12. Fix all errors.
13. Verify the complete generation workflow.
14. Verify generated project structure.
15. Verify ZIP download.

Only after all of this provide the final implementation summary.

Do not claim functionality is working unless it has actually been verified.
