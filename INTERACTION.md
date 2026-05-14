# INTERACTION

## Goal

Define the interaction model for this repository as a working knowledge console,
not a content showcase.

This document complements `DESIGN.md`. `DESIGN.md` defines the visual and
component rules. This file defines the product behavior, page responsibilities,
and navigation model.

## Product Mode

The product should behave like a three-surface internal console:

1. `Records`
2. `Record Detail`
3. `Jobs`

It should not behave like:

- a documentation homepage
- a publishing CMS
- a wizard-first admin backend

## Primary User Flows

### 1. Search and judge a record

Flow:

1. open the search-first home page
2. enter a keyword
3. move into the results state
4. narrow with category, status, or type
5. scan summary, status, confidence, freshness, and match source
6. open one record

This is the default top-level workflow. The home page should start as a clean
search entry state, not as a results list by default.

### 2. Verify trust and provenance

Flow:

1. open record detail
2. read summary and recommendation
3. inspect confidence and evidence
4. inspect sources
5. inspect freshness and review dates

This is the detail page's main job.

### 3. Traverse the graph

Flow:

1. open one record
2. follow outgoing relations to adjacent records
3. inspect incoming relations to see who references it
4. return to the original result set without losing query context

This means relation navigation is a first-class workflow, not a side feature.

### 4. Observe write jobs

Flow:

1. open jobs list
2. filter by status or source type
3. inspect one job
4. identify failed item, error reason, and affected records

This is the operational surface for imports and API writes.

## Surface Responsibilities

## Records List

Owns:

- search
- filtering
- result count
- active query state
- quick judgment
- opening detail pages

Does not own:

- record editing
- long-form reading
- full provenance inspection
- version history

### Recommended interaction model

- the home page has two states:
  - entry state: clean search box
  - result state: search + filters + result list
- search and filter state live in the URL
- filters appear in the result state, not as the first thing the user sees
- result list is dense and easy to scan
- result rows show only the fields needed for triage
- the page should not force browse-mode UI before the user searches

### Required fields in each list item

- title
- category
- type
- status
- freshness
- confidence
- summary
- updated date
- match source when query exists

## Record Detail

Owns:

- title and identity
- summary
- recommendation
- problem
- evidence
- sources
- outgoing relations
- incoming relations
- structured metadata
- translations
- version history

Does not own:

- bulk navigation across many records
- import-job monitoring

### Recommended interaction model

- top area explains what the record is
- sidebar holds status, dates, confidence, and quick actions
- main column holds reading flow
- local section navigation should exist once the page grows long
- back-navigation should preserve the originating list state

## Jobs

Owns:

- write job history
- job status
- failure diagnostics
- batch metadata
- write observability

Does not own:

- content authoring UI
- record search

### Recommended interaction model

- jobs list reads like an operational queue
- failed jobs are visually obvious
- each job can open a detail page
- job detail should show source label, source type, timestamps, affected items,
  and item-level failures

## Navigation Model

Recommended top-level navigation:

1. `Records`
2. `Jobs`

Future surfaces can be added later, but these are the current stable product
areas backed by real routes and APIs.

## URL Contract

The UI should treat URL state as canonical for list navigation.

### Records list

Use query params for:

- `q`
- `categoryCode`
- `status`
- `type`

### Detail page return behavior

Do not reconstruct search context from `record.title`.

Preferred behavior:

- preserve `from` query state in the detail link
- or preserve browser history naturally

## Interaction Decisions Confirmed

These decisions are the current recommended baseline.

1. The home page should begin as a clean search-first entry page.
2. The records list should appear after query or filter activation.
3. The record detail page should optimize for trust and relation traversal.
4. Jobs are a real product surface and should get their own operational UI.
5. Authoring remains draft-first through the repo-local skill and import
   pipeline, not through an inline CRUD form.

## Current Detail Page Review

The current record detail page is already useful, but not yet interaction-best
practice.

### Works well

- it exposes evidence, sources, relations, translations, and versions
- it already separates main content from sidebar content
- it already has reusable UI primitives in the file

### Still weak

1. back-navigation does not preserve the real originating query state
2. there is no local section navigation for long records
3. quick actions such as copy slug or copy external key are missing
4. section styling is too card-heavy and too color-varied
5. source icons use emoji instead of a product-consistent icon language

## Implementation Order

1. keep the home page search-first and minimal
2. fix detail-page context preservation
3. add detail-page quick actions
4. add jobs list and job detail UI
5. refactor shared UI primitives into reusable components
