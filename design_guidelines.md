# Wikigame Design Guidelines

## Design Approach

**Selected Approach**: Hybrid - Wikipedia-inspired minimalism + game interface patterns

Drawing inspiration from Wikipedia's clean, content-first design while incorporating game mechanics from modern web games like Wordle and GeoGuessr. The design prioritizes readability and quick navigation while making game elements prominent and engaging.

**Core Principles**:
- Content clarity above visual flourish
- Instant comprehension of game state
- Frictionless navigation through articles
- Clean, distraction-free reading experience

---

## Typography

**Font Stack**:
- Primary: 'Inter' or 'System UI' for interface elements
- Content: 'Georgia' or serif font for article text (Wikipedia-style)

**Hierarchy**:
- Game UI (timer/counter): text-lg to text-xl, font-semibold
- Article titles: text-3xl to text-4xl, font-bold
- Article content: text-base, leading-relaxed
- Path breadcrumbs: text-sm, font-medium

---

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, and 8 (p-2, m-4, gap-6, py-8)

**Layout Structure**:
- Fixed header: Contains game stats and target article
- Main content area: Two-column layout on desktop (article content + sidebar)
- Sidebar: Navigation path tracker (right side, sticky)
- Mobile: Single column, collapsible path drawer

**Container Strategy**:
- Game header: Full-width with max-w-7xl inner container
- Article content: max-w-3xl for optimal reading
- Overall page: No background distractions, clean white/neutral base

---

## Component Library

### Game Header (Fixed Top)
- Left section: Timer (MM:SS format) + Click counter
- Center: Current article title (truncated with ellipsis)
- Right section: Target article badge with subtle highlight
- Height: 16 or 20 units
- Border bottom for separation

### Article Display Area
- Wikipedia-style article rendering
- Internal links: Underlined, distinct styling, clear hover state
- External/non-game links: Disabled or visually muted
- Article sections: Proper heading hierarchy
- Images: If present in Wikipedia content, display inline with proper sizing

### Path Tracker (Sidebar)
- Vertical list of visited articles
- Each item: Article title + arrow indicator
- Current article: Highlighted
- Scrollable if path exceeds viewport
- Desktop: 300-350px width, sticky positioning
- Mobile: Collapsible drawer from bottom/side

### Win State Modal
- Centered overlay with backdrop blur
- Success message with path length and time
- Statistics: Number of clicks, time taken, path efficiency
- "New Game" prominent CTA button
- Option to share result

### New Game Controls
- Floating action button or header-integrated button
- Clear "New Game" label
- Confirmation if game in progress

### Loading States
- Skeleton screens for article loading
- Subtle spinner for API calls
- Smooth transitions between articles

---

## Interaction Patterns

**Navigation**:
- Click Wikipedia links to navigate (standard link behavior)
- Back button disabled (game rule enforcement)
- Smooth scroll to top on new article load

**Game Flow**:
- Start screen: Simple "Start Game" button with rules explanation
- During game: Seamless article transitions
- End game: Celebratory modal with stats

**Micro-interactions**:
- Path updates: Slide-in animation for new article in tracker
- Timer: Subtle pulse every second
- Win detection: Confetti or subtle celebration effect (minimal)

---

## Images

No hero image for this application. This is a utility-focused game where content clarity is paramount.

**Wikipedia Article Images**: Display inline images from Wikipedia API as they appear in articles, maintaining their original context and positioning within the content.

---

## Accessibility Notes

- High contrast for all text
- Clear focus states on all clickable links
- Keyboard navigation support
- ARIA labels for game stats and controls
- Screen reader announcements for game state changes

---

## Responsive Breakpoints

- Mobile (<768px): Single column, drawer-based path tracker, condensed header
- Tablet (768px-1024px): Moderate sidebar, balanced layout
- Desktop (>1024px): Full two-column experience with persistent sidebar

---

**Design Tone**: Clean, focused, and uncluttered - like Wikipedia itself but with clear game UI overlays that don't interfere with content consumption.