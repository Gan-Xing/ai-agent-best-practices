# DESIGN

## 1. Product Positioning

This project is not a marketing site. It is a knowledge console for storing,
searching, reviewing, and reusing AI-agent best-practice records.

The UI should feel like:

- `Knowledge Utility`
- `Research Console`
- `Source-grounded internal tool`

It should not feel like:

- a landing page
- a showcase site
- a card-heavy editorial blog
- a playful note-taking app

The product's first job is to help a user answer four questions fast:

1. What is this record saying?
2. Why should I trust it?
3. What is it related to?
4. Can I reuse or import it safely?

## 2. Primary User Jobs

The design should optimize for these workflows in order:

1. Search records by keyword, category, tag, or source.
2. Judge a record's value from summary, confidence, freshness, and evidence.
3. Open the record and inspect body, recommendation, sources, relations, and
   version history.
4. Move between related records without losing context.
5. Copy identifiers and inspect JSON-compatible fields for reuse, import, or
   automation.

Any UI decision that does not improve one of those workflows is secondary.

## 3. Information Architecture

Current scope should be organized around three surfaces:

1. `Search / List`
   - query input
   - category filter
   - tag filter
   - source type filter
   - sort
   - result list

2. `Record Detail`
   - identity and status
   - summary and recommendation
   - evidence and confidence
   - sources
   - outgoing and incoming relations
   - structured fields
   - version history

3. `Write / Job Observability`
   - import/write job list
   - job detail
   - failure reason
   - affected records

The current repository already has `jobs` APIs, so the design should treat job
observability as a real product surface, even if its UI is not built yet.

## 4. Core Design Principles

### 4.1 Prioritize scanability over decoration

Users should be able to scan a page quickly without reading every section.

### 4.2 Trust comes from provenance

Sources, confidence, freshness, and review fields are primary UI signals, not
buried metadata.

### 4.3 Structured data should look structured

`metadata`, `applicability`, `compatibility`, `metrics`, `curation`, and
`relations` should render with stable layouts and labels, not as visually flat
generic blocks.

### 4.4 Detail pages should preserve navigation context

A user should be able to move from list -> detail -> related record -> back
without losing the original search trail.

### 4.5 One product, one visual language

Colors, spacing, radii, shadows, badges, and icon style should come from one
system. No per-section ad hoc styling.

## 5. Visual Direction

### 5.1 Target style

- restrained
- dense but readable
- operational
- evidence-first
- modern but not flashy

### 5.2 Color direction

Use a neutral console palette with one restrained accent.

Recommended structure:

- background: cool off-white or very light neutral
- primary text: near-black
- secondary text: neutral gray
- border: low-contrast gray
- accent: deep teal or dark green
- state colors: semantic, muted, and used sparingly

Avoid:

- beige/cream-dominant pages
- multiple pastel section colors competing at once
- strong decorative gradients
- color as the only status signal

### 5.3 Typography

- primary body font: readable sans
- mono font: identifiers, dates, status codes, keys
- body text: `16px` baseline
- compact labels: `12px` to `13px`
- headings: tight but not oversized
- no negative tracking on body copy

### 5.4 Radius and elevation

- default radius: `8px`
- large framed container radius: `10px` to `12px`
- avoid repeated `24px` to `32px` soft cards
- one shadow scale only

The product should feel framed and precise, not pillowy.

## 6. Layout System

### 6.1 Global page layout

- desktop content width: `1200px` to `1280px`
- page padding should be consistent across list and detail surfaces
- no section should feel like an isolated floating card unless it is truly a
  panel or repeated item

### 6.2 Search/List layout

- first-visit state should be simple: centered search entry with minimal chrome
- result state should add search refinement and active filters
- result stats row should appear only after a query or filter is active
- results in a single-column list on smaller screens
- results in a denser two-column layout only when cards remain easy to scan
- sorting and filter state must remain visible in the result state

### 6.3 Detail layout

- top summary block
- main reading column
- right sidebar for status, identifiers, confidence, dates, and quick actions
- sticky local navigation or section index on desktop when the page grows long

### 6.4 Section order on record detail

Recommended order:

1. title / identity / status
2. summary
3. recommendation
4. problem
5. evidence
6. sources
7. outgoing relations
8. incoming relations
9. structured domain fields
10. translations
11. version history

This order matches how a user judges trust and relevance.

## 7. Component System

The repository should eventually standardize these primitives:

- `PageHeader`
- `SearchBar`
- `FilterBar`
- `RecordCard`
- `FieldBadge`
- `StatusBadge`
- `ConfidenceMeter`
- `SectionBlock`
- `EvidenceBlock`
- `SourceList`
- `RelationList`
- `RecordTimeline`
- `KeyValueList`
- `CopyButton`
- `EmptyState`

### 7.1 RecordCard

Must show:

- title
- short summary
- category
- type
- status or freshness
- source or match reason
- updated date

Should not show:

- too many badges
- long body text
- raw JSON-like details

### 7.2 EvidenceBlock

Must make these fields visually distinct:

- basis
- confidence reason
- caveat
- review status when present

### 7.3 SourceList

Each source row should support:

- source role
- source type
- title
- uri
- author or publisher
- note

Use a consistent icon set. Do not use emoji as source icons.

### 7.4 RelationList

Each relation row should support:

- relation type
- target record title
- optional strength
- optional description

Relation cards should optimize for quick graph navigation, not for decoration.

### 7.5 RecordTimeline

Version history should be a proper timeline or ordered event list with:

- version number
- change type
- date
- note

## 8. Interaction Rules

### 8.1 Search behavior

- search input should be always available
- active query should remain visible
- filter state must persist in the URL
- result count should update clearly

### 8.2 Navigation behavior

- a detail page back action should return to the actual previous query/filter
  state, not reconstruct a query from the current record title
- related record navigation should preserve context when possible

### 8.3 Utility actions

Every record detail should support quick access to:

- copy `slug`
- copy `externalKey`
- inspect canonical JSON path or source label
- open source links

### 8.4 Empty and failure states

Need clear states for:

- no search results
- no sources
- no relations
- failed job import
- stale record needing review

## 9. Accessibility and Content Rules

- all interactive controls need visible focus states
- icon-only actions need labels or tooltips
- no hover-only affordances for core actions
- section hierarchy must follow real heading order
- semantic colors must not be the only signal
- long identifiers should wrap or copy cleanly without breaking layout

## 10. Anti-Patterns

Do not introduce these patterns:

- emoji icons in the product UI
- large soft marketing hero sections
- every section rendered as a big rounded card
- multiple unrelated accent colors on one detail page
- raw hex colors inside page components
- field dumps without grouping
- badges used as substitutes for hierarchy
- giant summary blocks with no quick actions
- broken back-navigation context
- filters hidden behind unnecessary clicks

## 11. Current Codebase Assessment

This assessment is based on:

- `src/app/page.tsx`
- `src/app/records/[slug]/page.tsx`
- `src/app/globals.css`

### 11.1 What already aligns with the target

1. The product is already centered on search and record detail, which matches
   the right high-level IA.
2. Record detail already exposes the important domain entities:
   sources, outgoing relations, incoming relations, translations, and version
   history.
3. There is already an attempt at shared primitives in the detail page:
   `Section`, `Badge`, `ConfidenceBar`, `KeyValueRow`, `TagGroup`.
4. The app already uses a small token layer in `globals.css` instead of only
   hard-coded Tailwind utility values.

### 11.2 Where current code is not yet best practice

1. `src/app/page.tsx` should be search-first in its default state, then switch
   into a work-oriented results state after query activation.
   - default state must stay simpler than the result state
   - the product should not open directly into a browse-heavy list interface

2. `src/app/records/[slug]/page.tsx` is operationally useful, but visually too
   card-heavy.
   - almost every section is a rounded framed block
   - multiple tinted backgrounds compete for attention
   - the page lacks a stable local section navigation model

3. Source rendering currently uses emoji icons for source types. That is not a
   product-grade knowledge-console pattern.

4. Several color decisions are still local to the page component.
   - source type colors
   - badge variants
   - confidence gradients
   - section-specific tinted containers

   These should move into a more explicit design-token and component layer.

5. The current detail page is doing too much in one file.
   - formatting helpers
   - label mapping
   - section primitives
   - page layout
   - all detail subviews

   That is workable for now, but not a good long-term UI architecture.

6. The current "back to search" behavior rebuilds a query from `record.title`.
   That is not correct context preservation.

7. `globals.css` currently leans too warm and decorative for an operational
   knowledge tool.
   - beige-heavy palette
   - radial gradient background treatment
   - animation as a global personality choice instead of a narrow enhancement

### 11.3 Practical conclusion

The current UI is usable, but it is not yet a best-practice knowledge-console
UI. It is in a transitional state:

- strong enough data surface
- weak design system
- weak interaction density
- weak navigational context preservation

## 12. Recommended Implementation Order

When UI work resumes, the safest order is:

1. stabilize tokens in `globals.css`
2. extract shared primitives from record detail into reusable UI components
3. turn the home page into a real search/list console
4. tighten record detail hierarchy and actions
5. add job observability UI

This order improves the product without creating more page-level style drift.

## 13. Definition of Done

The UI can be considered aligned with this design once:

1. list and detail pages clearly feel like one product
2. a user can search, filter, inspect, and navigate relations efficiently
3. provenance is visible without scrolling through metadata dumps
4. identifiers and actions are easy to copy and reuse
5. back-navigation preserves user context
6. visual tokens are centralized
7. emoji, decorative gradients, and oversized card styling are removed from
   core product surfaces
