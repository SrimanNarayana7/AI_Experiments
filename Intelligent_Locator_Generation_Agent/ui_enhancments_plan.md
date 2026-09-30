REDESIGN THE FRONTEND AS A PRODUCTION-GRADE ENTERPRISE AI DEVELOPER TOOL.

The current UI is functionally correct but visually looks like an internal learning/demo project. Do NOT simply adjust colors or add a few gradients. Rework the frontend visual system, information architecture, component hierarchy, spacing, interactions, and states.

PRODUCT:
AI Locator Generator
Purpose:
Analyze HTML/DOM and generate stable, maintainable automation locators.

TECH:
React + Vite
Tailwind CSS
Framer Motion
Lucide React icons

DESIGN DIRECTION:

Create a premium AI developer-tool interface inspired by modern products such as:
- Linear
- Vercel
- Raycast
- GitHub Copilot
- modern observability/devtools platforms

Do NOT copy any product directly.

Use a sophisticated dark-first visual language.

COLOR SYSTEM:
- Background: #080A12 / #0B0D17
- Surface: #111522
- Elevated surface: #171B2B
- Border: rgba(255,255,255,0.08)
- Primary: Indigo/Violet gradient
  #6366F1 → #8B5CF6
- Secondary accent: Cyan #22D3EE
- Success: #22C55E
- Warning: #F59E0B
- Error: #EF4444
- Main text: #F8FAFC
- Secondary text: #94A3B8

Use gradients sparingly.
Do NOT make every card colorful.

VISUAL FOUNDATION:

1. Full application should use a dark premium background.

2. Add a very subtle radial gradient/glow behind the main workspace:
   indigo/violet glow around the upper center/right.

3. Use subtle glass surfaces:
   backdrop-blur
   translucent surfaces
   1px low-opacity borders

4. Use consistent 8px spacing system.

5. Rounded corners:
   cards: 14–18px
   controls: 10–12px
   buttons: 10–12px

6. Typography:
   Inter or Geist
   Strong hierarchy
   compact developer-tool typography

7. Avoid excessive shadows.
   Prefer borders + subtle elevation.

APPLICATION STRUCTURE:

TOP NAVBAR

Create a premium compact navigation bar.

Left:
[AI icon] AI Locator Generator
small badge:
AI-powered test automation

Center/right:
API status indicator
Framework selector
Language selector
Theme/settings icon
GitHub/docs icon

API status should look like:

● Connected
LangFlow

Use subtle green pulse animation.

MAIN WORKSPACE

Do NOT use the current simple two-column white card layout.

Create a structured workspace:

------------------------------------------------
Header
"Generate stable locators from your DOM"
subtitle explaining the workflow
------------------------------------------------

Main workspace:

LEFT / PRIMARY:
DOM INPUT PANEL

Header:
HTML / DOM
Page URL

Input should look like a real developer editor.

Add:
- line numbers
- syntax-like HTML coloring if practical
- monospace font
- minimap optional
- character count
- Clear
- Load sample
- Paste button

Bottom toolbar:

Framework
Selenium
Language
Java

Primary CTA:

[ ✨ Analyze DOM ]

The CTA must visually dominate the interaction.

Use a gradient button:
indigo → violet

Hover:
slight lift
glow
scale 1.01

Loading:
animated shimmer
spinner
"Analyzing DOM..."

RIGHT:
ANALYSIS PANEL

Instead of the current simple three cards, create:

Analysis Overview

[ 10 Elements ]
[ 8 Stable ]
[ 89/100 Stability ]

Each metric should have:
icon
large number
small description
subtle accent

Then show:
"Analysis completed in 1.8s"

Use a thin confidence/stability visualization.

Below metrics:

INSIGHTS

Example:

✓ 8 elements have highly stable attributes
⚠ 2 elements rely on structural selectors
ⓘ Consider adding data-testid to 2 elements

These should be interactive.

ELEMENT RESULTS

Create a tabbed results area:

[Overview] [Elements] [Page Object] [Raw JSON]

DEFAULT = Overview

Overview should show a concise summary.

ELEMENTS VIEW

This is the most important missing UX.

Show each interactive DOM element as a card.

Example:

LOGIN BUTTON
button
data-testid="login-button"

Stability
92 / 100

Recommended
CSS

[data-testid="login-button"]

Why:
Stable custom attribute with unique match.

Alternatives:
1. CSS
2. XPath
3. Role

Each card should have:

element icon
element type
human-readable name
stability score
recommended badge
locator code
copy button
expand alternatives

Scores:
90–100 = highly stable
75–89 = stable
50–74 = moderate
<50 = fragile

Use visual indicators but don't overuse colors.

PAGE OBJECT VIEW

Instead of one enormous code block occupying most of the screen:

Header:
Generated Page Object

Actions:
Copy
Download
Regenerate

Tabs:
Java
Python
C#

Code editor panel with:
- syntax highlighting
- line numbers
- sticky header
- copy button
- filename indicator

Example:

LoginPage.java

Do not display the entire page object immediately if it is extremely long.

Allow:
Expand
Collapse
Copy

RAW RESPONSE

Show formatted JSON in a proper developer JSON viewer.

UX STATES

Implement all states.

EMPTY STATE:

Before analysis:

large subtle AI/locator illustration/icon

"Turn your DOM into resilient locators"

"Paste HTML or provide a page description to generate stable automation selectors."

CTA:
Load sample HTML

Do not show empty cards.

LOADING STATE:

When analyzing:

Show animated progress:

Parsing DOM
↓
Identifying interactive elements
↓
Evaluating locator strategies
↓
Calculating stability
↓
Generating Page Object

Use Framer Motion.

SUCCESS:

Smooth transition into results.

ERROR:

Premium error panel.

Example:

"Unable to analyze DOM"

Show actual useful error.

Actions:
Retry
Clear input

PAGE URL MODE

The Page URL option should have a dedicated UI.

Input:
https://example.com/login

Button:
Inspect Page

Explain that live URL inspection requires backend/browser integration.

Do not pretend frontend can directly inspect arbitrary pages.

RESPONSIVE DESIGN

Desktop:
Primary target.

Tablet:
Two-column layout becomes stacked.

Mobile:
Single column.

The DOM input and analysis should remain usable.

ANIMATIONS

Use Framer Motion.

Keep animations subtle and professional.

Implement:
- page entrance fade
- card stagger
- button hover
- score progress animation
- tab transitions
- expand/collapse
- copy confirmation
- loading shimmer
- success transition

Avoid:
- excessive bouncing
- rotating 3D objects
- flashy particle effects
- constant animations
- gimmicky AI effects

MICROINTERACTIONS

Every important action should have feedback.

Copy:
"Copied"

Analyze:
"Analyzing..."

Successful result:
"Analysis complete"

Dropdown:
smooth open

Cards:
subtle hover elevation

Locator:
click to copy

DESIGN PRINCIPLE

The application should feel like a serious developer productivity product.

NOT:
- student project
- dashboard template
- generic SaaS template
- colorful AI toy

YES:
- enterprise developer tool
- AI-assisted testing platform
- polished internal engineering product
- production SaaS quality

IMPORTANT:

Do not destroy the existing backend integration.

Keep the LangFlow API contract intact unless changes are required.

Separate UI components from API logic.

Recommended component structure:

src/
  components/
    layout/
      AppShell
      TopNav

    input/
      DomEditor
      UrlInput
      InputToolbar

    analysis/
      AnalysisSummary
      InsightList
      StabilityScore

    locators/
      LocatorCard
      LocatorStrategy
      LocatorScore

    code/
      CodeViewer
      PageObjectViewer
      JsonViewer

    common/
      Button
      Badge
      Tabs
      Tooltip
      CopyButton
      StatusIndicator

  pages/
    LocatorGenerator

  services/
    api.ts

  hooks/
    useLocatorAnalysis.ts

  types/
    locator.ts

QUALITY REQUIREMENTS

Before finishing:

1. Remove the current plain white dashboard appearance.
2. Make the application visually cohesive.
3. Ensure primary action is immediately obvious.
4. Ensure generated locator results are easier to scan than the current implementation.
5. Avoid huge unstructured code blocks.
6. Make element-level results interactive.
7. Add proper loading/error/empty/success states.
8. Ensure accessibility:
   keyboard navigation
   focus states
   semantic buttons
   sufficient contrast
9. Avoid hardcoded repeated UI.
10. Use reusable components.
11. Keep bundle/runtime performance reasonable.
12. Do not introduce unnecessary libraries.

MOST IMPORTANT:

Do not just modify the existing CSS.

Rebuild the frontend visual hierarchy around this workflow:

INPUT DOM
      ↓
ANALYZE
      ↓
ANALYSIS
      ↓
ELEMENT LOCATORS
      ↓
PAGE OBJECT

The user should understand this workflow within 3 seconds of opening the application.