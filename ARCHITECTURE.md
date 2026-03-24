# Rutafy / Portex — Architecture Overview

## Product summary

Rutafy is a logistics platform focused initially on the Buenaventura port corridor in Colombia.

It connects:

- Transportistas (companies / cargo owners)
- Mensajeros (motorbike couriers / operational drivers)
- Nodos logísticos (paradores, port terminals, patios, gas stations, restaurants, parking lots, etc.)

The main goal is to optimize documentary and operational logistics for cargo transportation.

---

## Current product scope

Main service categories:

- Documentos
- Paquetes
- Cumplidos
- Transporte

Current geographical operation:

- Buenaventura logistics corridor
- dispatch based on logistic nodes
- no real-time GPS yet

---

## Official terminology

These labels must be used consistently in product and UI:

- "Cliente" -> "Transportista"
- "Conductor" -> "Mensajero"
- "Origen" -> "Recoger en"
- "Destino" -> "Entregar en"

---

## Backend architecture

### Stack

- Node.js
- Fastify
- PostgreSQL
- Docker Compose
- VPS Ubuntu

### Main service flow

REQUESTED
→ OFFERED
→ CLAIMED
→ STARTED
→ CLOSED

### UX interpretation

- REQUESTED = service created
- OFFERED = dispatch sent offer(s) to couriers
- CLAIMED = courier accepted and is going to pickup
- STARTED = courier already picked up and is on the way to deliver
- CLOSED = delivery completed

### Dispatch flow characteristics

- offer-based dispatch
- distance ranking
- offer expiration (TTL)
- release within grace window
- redispatch when released
- offer status tracking
- service state tracking
- status history table
- node-based dispatch logic

---

## Backend validation status

The backend flow has already been validated end-to-end with a real test:

REQUESTED
→ OFFERED
→ CLAIMED
→ STARTED
→ CLOSED

Confirmed in database:

- claimed_at populated
- started_at populated
- closed_at populated
- start_node_id populated
- end_node_id populated

---

## Important backend endpoints

### Services
- POST /v1/services
- POST /v1/services/:id/release
- POST /v1/services/:id/start
- POST /v1/services/:id/close
- POST /v1/services/:id/cancel

### Dispatch / offers
- POST /v1/service-offers/:offer_id/accept
- POST /v1/service-offers/:offer_id/reject
- POST /v1/service-offers/:offer_id/view
- GET /v1/messengers/:id/offers/active
- PATCH /v1/messengers/:id/availability

---

## Backend hardening already done

- public create response no longer exposes start_pin / close_pin
- dispatch flow works end-to-end
- better HTTP status handling started for dispatch functions
- dispatch_status constraint aligned with new statuses
- offer TTL made configurable
- route duplication issues fixed
- release/start/close flow stabilized
- trace_id behavior partially improved

---

## Backend constraints and product rules

### Important UX/backend rules
- no PIN required to accept
- no PIN required to start
- start_code can exist as informational reference only
- close confirmation should happen in frontend UX
- delivery photo is desirable but optional in V1 backend

### Offer TTL
Offer expiration is configurable through environment variable:

DISPATCH_OFFER_TTL_SECONDS

For manual testing:
- recommended: 300

For production initial operation:
- recommended: 45 to 90

---

## Frontend architecture

### Stack
- React
- Vite
- TypeScript

### Frontend root
C:\Users\yoine\OneDrive\Documentos\portex-rutafy

### Run command
npm run web:dev

### Usual port
5173

---

## Current frontend state

The current service creation flow for the Transportista is implemented inside:

client/src/pages/TransportistaPanel.tsx

The shared service form lives inside:
renderSharedForm(...)

This shared form currently supports both:
- Solicitar ahora
- Programar recogida

---

## Cursor-generated frontend work already done

Changes were already made in TransportistaPanel.tsx:

### Current improvements already introduced
- UI labels changed to:
  - Recoger en
  - Entregar en
- visual service type selector added:
  - Documentos
  - Paquete
  - Cumplido
  - Transporte
- location input supports:
  - free text
  - registered node
- validation messages now use pickup/delivery language

### Important limitation
Although the UI now shows 4 service categories, backend mapping currently still sends everything as DOCS to avoid breaking integrations.

This means the UI must not falsely imply full backend support for all categories unless explicitly marked as visual / future-ready.

---

## Product design principles

Rutafy should not feel like:

- an ecommerce store
- a social app
- an overdesigned concept UI

Rutafy should feel like:

- operational
- fast
- clear
- trustworthy
- logistics-first
- mobile-first

---

## UX references chosen

Conceptual references for frontend design:

- Bolt -> courier/driver tracking card + live trip feel
- Chipotle -> progress timeline / service stages
- Snoonu -> simple request flow
- Shopify Orders -> history and service list patterns
- Grab / Taco Bell -> location selection patterns
- Blank Street -> clean home with active service emphasis

---

## Core frontend screens

These are the 5 most important screens for the product:

1. Transportista home / dashboard
2. Create service
3. Searching for courier
4. Service in progress
5. Service history

---

## Desired frontend component architecture

Future components that should probably exist:

- PrimaryActionCard
- ServiceTypeSelector
- LocationInputCard
- NodePickerSheet
- ServiceStatusTimeline
- MessengerInfoCard
- ServiceHistoryCard
- EmptyState
- ServiceSummaryCard

However:
Do not do a large refactor immediately.
Prefer iterative extraction from TransportistaPanel only when the UX is validated.

---

## UX decisions already defined

### Official labels
Always use:
- Recoger en
- Entregar en

Never use as primary UI labels:
- Origen
- Destino

### Main dashboard CTA hierarchy
The top action block for the Transportista should clearly separate:
- Solicitar ahora
- Programar recogida

These must feel like the primary decision cards on the screen.

### Service progress
Eventually the product should visually show something like:

- Solicitado
- Mensajero asignado
- Recogiendo
- Entregando
- Finalizado

### Micro-animations
Allowed and desired:
- lightweight loading
- service status transitions
- smooth card appearance
- minimal progress transitions

Avoid:
- long animations
- 3D effects
- heavy decorative motion
- visually noisy transitions

---

## Mobile-first design rules

- prioritize thumb-friendly actions
- strong visual hierarchy
- clean cards
- good spacing
- clear CTA buttons
- compact but not cramped
- transportista must understand service state in seconds

---

## Current immediate objective

Refine the "Crear Servicio" block for the Transportista without rewriting the whole frontend.

### What must be preserved
- two clear action flows:
  - Solicitar ahora
  - Programar recogida
- Recoger en / Entregar en labels
- free text + node selection
- current logic should not break
- keep changes scoped and safe

### What should improve next
- stronger visual hierarchy for the top request cards
- better service type clarity
- avoid misleading the user about backend support for all 4 service categories
- prepare future component extraction without large refactor yet

---

## Recommended AI workflow for this repo

When using Cursor / Claude / any coding agent:

1. first analyze the codebase
2. identify the exact files involved
3. summarize plan
4. make scoped changes
5. avoid large uncontrolled refactors
6. prefer incremental improvements
7. preserve backend integration assumptions

Never ask the agent to rewrite the whole frontend at once.

Preferred workflow:
- analyze
- plan
- implement one screen/block
- validate
- continue

---

## Current place to resume work

Resume exactly after the Cursor analysis of TransportistaPanel.tsx.

The next task is:

- evaluate the current frontend adjustments
- preserve the good parts
- improve the visual hierarchy
- avoid backend/UI inconsistency around service type support
- decide how and when to extract reusable components from the current panel

---

## Short product truth

Rutafy already has a working backend core.
The product is no longer in idea stage.
The current phase is:

- hardening
- UX refinement
- frontend evolution
- operational clarity

The next big value comes from making the app feel alive, clear and logistics-native.