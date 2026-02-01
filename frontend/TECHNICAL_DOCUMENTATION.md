
# Bonded - Technical Documentation

**Version:** 1.0
**Last Updated:** January 6, 2026
**Status:** Pre-Production Development (60-70% Complete)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [Authentication Flow](#authentication-flow)
6. [Feature Status](#feature-status)
7. [Feature Gates](#feature-gates)
8. [UI/UX Best Practices](#uiux-best-practices)
9. [Current State](#current-state)
10. [Production Readiness](#production-readiness)
11. [Supabase Cost Analysis](#supabase-cost-analysis)
12. [Development Setup](#development-setup)
13. [Deployment Guide](#deployment-guide)

---

## 📚 Additional Documentation

- **[AI_CODING_GUIDELINES.md](./AI_CODING_GUIDELINES.md)** - **IMPORTANT**: Coding patterns, best practices, and conventions for AI assistants. **Read this before implementing new features.**
- **[.planning/codebase/CONVENTIONS.md](./.planning/codebase/CONVENTIONS.md)** - Code style and naming conventions
- **[docs/MIGRATION_HISTORY.md](./docs/MIGRATION_HISTORY.md)** - Supabase migration history and baseline notes
- **[docs/PRODUCTION_READINESS_AUDIT.md](./docs/PRODUCTION_READINESS_AUDIT.md)** - Launch audit and blockers list

---

## Project Overview

### What is Bonded?

Bonded is a campus-exclusive social networking platform designed to help college students connect authentically with their peers. It combines elements of:

- **YikYak**: Anonymous campus discussions and forums
- **Series**: Vibe-based personality matching
- **Instagram**: Visual profiles, stories, and content sharing
- **LinkedIn**: Professional connections and networking

### Core Value Proposition

1. **Find your people** - Connect with classmates, study partners, roommates, and friends
2. **Discover organically** - AI-powered personality matching through "Love Print" for meaningful connections
3. **Engage with campus** - Forums, events, clubs, and campus-wide discussions
4. **Stay safe** - Campus verification (.edu emails), anonymous options, AI-powered moderation

### Target Users

- **Primary**: College students (18-22 years old)
- **Secondary**: Graduate students, faculty (future expansion)
- **Geographic**: US universities initially, globally expandable

### Key Differentiators

- Campus-only (verified .edu emails)
- Multi-tenant architecture (siloed by university)
- AI-powered matching ("Love Print" personality model)
- Class-based connections (schedule upload → find classmates)
- Flexible anonymity (users choose per post/interaction)
- Multi-purpose (dating, friends, study partners, roommates, co-founders)

---

## Tech Stack

### Frontend

```
Framework:          React Native (Expo SDK 54)
Language:           JavaScript/TypeScript
Navigation:         Expo Router (file-based routing)
State Management:
  - Zustand (auth, onboarding)
  - React Query v5 (data fetching, caching)
  - Context API (Stories, Events, Clubs, Messages)
Styling:            React Native StyleSheet with responsive utilities
UI Library:         Custom components + Lucide React Native icons
Platform Support:   iOS, Android, Web
```

**Key Dependencies:**
- `@supabase/supabase-js` v2.88.0
- `@tanstack/react-query` v5.90.11
- `zustand` v5.0.8
- `expo-router` v6.0.15
- `react-native` v0.81.5
- `react` v19.1.0

**Media & Permissions:**
- `expo-camera` - Camera access
- `expo-image-picker` - Photo/video selection
- `expo-av` - Audio/video playback
- `expo-audio` - Voice recording
- `react-native-vision-camera` - Advanced camera features

### Backend

```
Database:           PostgreSQL (Supabase)
Authentication:     Supabase Auth (magic links + OTP)
Storage:            Supabase Storage (bonded-media, images only)
Real-time:          Supabase Realtime (implemented for messages)
Edge Functions:     Supabase Functions (planned for push notifications)
API:                Supabase REST API
```

### External Services

```
Photos:             Unsplash API (stock photos for onboarding)
Events:             URI Events Scraper (campus events)
AI/ML:
  - Link AI (conversation assistance) - PLANNED
  - Message Moderation (content filtering) - PLANNED
Analytics:          Supabase Analytics (basic) - PLANNED
Error Tracking:     None (needs Sentry) - TODO
```

### Development Tools

```
Version Control:    Git + GitHub
Package Manager:    npm
Build Tool:         Expo
Testing:            None (critical gap) - TODO
Linting:            ESLint (expo config)
Type Checking:      TypeScript (partial)
```

---

## Architecture

### Project Structure

```
Bonded-Official/
├── app/                          # Expo Router pages (30 screens)
│   ├── _layout.tsx              # Root layout
│   ├── index.jsx                # Entry point (connection test)
│   ├── welcome.jsx              # Welcome screen
│   ├── login.jsx                # Email login
│   ├── otp.jsx                  # OTP verification
│   ├── onboarding.jsx           # Multi-step onboarding flow
│   ├── yearbook.jsx             # Profile discovery (home)
│   ├── forum.jsx                # Campus forum
│   ├── events/                  # Events feature
│   │   ├── index.jsx           # Events list
│   │   └── [id].jsx            # Event details
│   ├── clubs/                   # Clubs feature
│   │   ├── index.jsx           # Clubs list
│   │   ├── create.jsx          # Create club
│   │   └── [id].jsx            # Club details
│   ├── messages.jsx             # Direct messaging
│   ├── notifications.jsx        # Notifications
│   ├── profile.jsx              # User profile
│   ├── settings.jsx             # App settings
│   ├── calendar.jsx             # Calendar view
│   ├── chat.jsx                 # Chat screen
│   └── auth/                    # Auth callbacks
│
├── components/                   # Reusable UI components
│   ├── Stories/                 # Story-related components
│   │   ├── Stories.jsx
│   │   ├── StoryCircle.jsx
│   │   ├── StoryCreator.jsx
│   │   ├── StoryEditor.jsx
│   │   ├── StoryPreview.jsx
│   │   └── StoryViewer.jsx
│   ├── Forum/                   # Forum components
│   │   ├── PostCard.jsx
│   │   └── PostTags.jsx
│   ├── Events/                  # Event components
│   │   └── EventCard.jsx
│   ├── onboarding/              # Onboarding components
│   │   ├── OnboardingNavigation.jsx
│   │   ├── ProgressBar.jsx
│   │   ├── CompletionCelebration.jsx
│   │   ├── OnboardingCarousel.jsx
│   │   └── steps/               # Onboarding step components
│   │       ├── IntroStep.jsx
│   │       ├── BasicInfoStep.jsx
│   │       ├── PhotoSelectionStep.jsx
│   │       ├── InterestsStep.jsx
│   │       ├── PersonalityStep.jsx
│   │       ├── StudyHabitsStep.jsx
│   │       ├── LivingHabitsStep.jsx
│   │       ├── ClassScheduleStep.jsx
│   │       ├── ScheduleUploadStep.tsx
│   │       ├── ScheduleEditStep.tsx
│   │       └── ScheduleConfirmStep.tsx
│   ├── ui/                      # Basic UI components
│   ├── Chip.jsx                 # Tag chips
│   ├── PrimaryButton.jsx        # Primary button
│   ├── OTPInput.jsx             # OTP input field
│   ├── ForumSelectorModal.jsx   # Forum selector
│   ├── OnboardingNudge.jsx      # Onboarding reminder
│   └── VoiceNoteRecorder.jsx    # Voice recording
│
├── contexts/                     # React Context providers
│   ├── EventsContext.jsx        # Events state
│   ├── StoriesContext.jsx       # Stories state
│   ├── ClubsContext.jsx         # Clubs state
│   ├── MessagesContext.jsx      # Messages state
│   └── CirclesContext.jsx       # Social circles state
│
├── stores/                       # Zustand stores
│   ├── authStore.js             # Authentication state
│   └── onboardingStore.js       # Onboarding progress
│
├── hooks/                        # Custom React hooks
│   ├── useSendOTP.js            # Send OTP/magic link
│   ├── useVerifyOTP.js          # Verify OTP
│   ├── useSaveOnboarding.js     # Save onboarding data
│   ├── useProfiles.js           # Fetch profiles (Supabase)
│   ├── usePosts.js              # Fetch posts (Supabase)
│   ├── useForums.js             # Fetch forums (Supabase)
│   ├── useCurrentUserProfile.js # Current user profile
│   ├── useCreateProfile.js      # Create profile
│   ├── useCreatePost.js         # Create post
│   ├── useStories.js            # Fetch stories
│   ├── useFriends.js            # Friends management
│   ├── useClassMatching.js      # Class matching
│   ├── useSaveSchedule.js       # Save class schedule
│   ├── useOnboardingGate.js     # Onboarding check
│   └── events/
│       ├── useEvents.js         # Fetch events (Supabase)
│       ├── useCreateEvent.js    # Create event
│       └── useEventsForUser.js  # User's events
│
├── services/                     # External API services
│   ├── unsplashService.js       # Unsplash API client
│   ├── schoolEventsService.js   # Generic school events service
│   ├── schoolEventsScraper.js   # Generic school events scraper
│   ├── scheduleParser.js        # Class schedule parser
│   ├── linkAIConversation.js    # Link AI integration (planned)
│   └── messageModeration.js     # Content moderation (planned)
│
├── lib/                          # Core utilities
│   ├── supabase.js              # Supabase client config
│   └── auth.ts                  # Auth utilities
│
├── helpers/                      # Helper functions
│   └── uploadPhotos.js          # Photo upload utility
│
├── constants/                    # App constants
│   └── onboardingTheme.js       # Onboarding theme config
│
├── theme/                        # App theme
│   └── index.js                 # Theme constants
│
├── utils/                        # Utility functions
│
├── landing-page/                 # Next.js marketing site
│   ├── app/
│   │   ├── page.tsx             # Landing page
│   │   ├── layout.tsx           # Layout
│   │   ├── globals.css          # Global styles
│   │   └── api/waitlist/        # Waitlist API
│   ├── components/              # Landing components
│   │   ├── WaitlistForm.tsx
│   │   ├── SchoolPicker.tsx
│   │   ├── PhoneMockup.tsx
│   │   ├── AnimatedSubtitle.tsx
│   │   └── ValueBlock.tsx
│   └── lib/
│       └── supabase.ts          # Supabase client
│
├── app.json                      # Expo config
├── package.json                  # Dependencies
└── .env                          # Environment variables
```

### State Management Architecture

**Zustand Stores** (Simple, persistent state):
- `authStore.js` - User authentication state (session, user)
- `onboardingStore.js` - Onboarding progress tracking

**React Query** (Server state, data fetching):
- All database queries (profiles, posts, forums, events)
- Automatic caching, refetching, background updates
- Loading and error states management
- Mutations for create/update operations

**Context API** (Complex feature state):
- StoriesContext - Story creation, viewing, reactions
- EventsContext - Event management, RSVP tracking
- ClubsContext - Club membership, management
- MessagesContext - Messaging state

### Data Flow

```
User Action
    ↓
Component/Screen
    ↓
Custom Hook (React Query/Zustand)
    ↓
Supabase Client
    ↓
PostgreSQL Database
    ↓
Row Level Security (RLS) Check
    ↓
Return Data
    ↓
React Query Cache
    ↓
Component Re-render
```

---

## Database Schema

### Current Deployment Status

**Deployed to Supabase**: 56% (5 of 9 SQL files)

| File | Status | Purpose |
|------|--------|---------|
| `00-base-schema.sql` | ✅ DEPLOYED | Core tables (universities, profiles, orgs) |
| `setup.sql` | ✅ DEPLOYED | Auth setup, triggers |
| `onboarding-schema.sql` | ✅ DEPLOYED | Onboarding fields for profiles |
| `forum-features-schema.sql` | ✅ DEPLOYED | Forums, posts, comments, reactions |
| `class-schedule-schema.sql` | ✅ DEPLOYED | Classes, sections, enrollments |
| `events-schema.sql` | ⏳ PENDING | Events, tickets, attendance |
| `complete-schema-additions-fixed.sql` | ⏳ PENDING | Social features (friends, stories, messages) |
| `revised-features-fixed.sql` | ⏳ PENDING | OCR, enhanced Bond features |
| `SECURITY_FIXES.sql` | 🔴 CRITICAL | Security hardening, RLS fixes |

### Core Tables (20+ tables created)

**Multi-Tenancy & Auth:**
- `universities` - University records (root tenant)
- `profiles` - User profiles (extends `auth.users`)

**Organizations:**
- `orgs` - Organizations/clubs
- `org_members` - Organization membership with roles

**Messaging:**
- `conversations` - Message threads
- `messages` - Direct messages
- `conversation_participants` - Conversation membership

**Forums & Discussions:**
- `forums` - Discussion forums (campus, class, org)
- `posts` - Forum posts
- `polls` - Post polls
- `poll_votes` - Poll responses
- `forum_comments` - Post comments
- `post_reactions` - Post reactions (upvotes, etc.)
- `forum_reposts` - Post sharing

**Classes & Education:**
- `classes` - Course catalog
- `class_sections` - Class instances (semester, section)
- `user_class_enrollments` - Student enrollments

**Events (Schema exists, not fully deployed):**
- `events` - Campus events
- `event_attendees` - RSVP tracking
- `event_tickets` - Ticketing (future)

**Stories (Schema exists, disabled in V1):**
- `stories` - 24-hour ephemeral content
- `stories_viewers` - Story view tracking

**Social Features (Schema exists, not fully deployed):**
- `friendships` - Friend connections
- `friend_requests` - Friend request flow
- `relationships` - Social graph (friends, blocks, follows)

### Key Database Functions

**Auto-create Class Forums:**
```sql
ensure_class_forum(class_id, university_id)
→ Creates forum when class enrollment happens
```

**Find Classmates:**
```sql
find_classmates(user_id, class_id, semester)
→ Returns users enrolled in same class
```

**Cleanup Expired Content:**
```sql
cleanup_expired_content()
→ Soft-deletes expired stories, events
```

### Row Level Security (RLS)

**Multi-tenant Isolation:**
All tables use RLS to ensure:
- Users only see data from their university
- Cross-campus data leakage is prevented
- Database-level security (defense in depth)

**Example Policy:**
```sql
CREATE POLICY "Users can view posts from their university"
ON posts FOR SELECT
USING (
  forum_id IN (
    SELECT id FROM forums
    WHERE university_id = (
      SELECT university_id FROM profiles WHERE id = auth.uid()
    )
  )
);
```

### Database Architecture Decisions

1. **Multi-Tenant by University**
   - Each university is isolated tenant
   - Students interact only within their campus
   - Prevents cross-campus spam/abuse

2. **UUID Primary Keys**
   - No ID enumeration attacks
   - Globally unique across tenants
   - Distributed-system ready

3. **Soft Deletes**
   - All tables have `deleted_at` column
   - Data preserved for audit/recovery
   - Maintains referential integrity

4. **Denormalized Counts**
   - `upvotes_count`, `comments_count` on posts
   - Faster reads, triggers update counts
   - Trade-off: write complexity for read speed

5. **JSONB for Flexible Data**
   - `metadata` columns for extensibility
   - `tags` arrays for filtering
   - `user_preferences` for settings

### Indexes (40+ created)

**Critical Performance Indexes:**
```sql
-- User lookups
idx_profiles_university (university_id)
idx_profiles_email (email)

-- Forum queries
idx_forums_university_type (university_id, type)
idx_posts_forum_created (forum_id, created_at DESC)

-- Search
idx_posts_tags GIN(tags)
idx_profiles_full_name (full_name)

-- Messages
idx_messages_conversation (conversation_id, created_at DESC)
idx_messages_sender (sender_id)
```

---

## Authentication Flow

### Current Implementation (Magic Links Only)

**Tech:** Supabase Auth with magic links

**Flow:**
1. User enters email (`.edu` preferred, not enforced)
2. `useSendOTP` hook calls `supabase.auth.signInWithOtp()`
3. Magic link sent to email with redirect: `bonded://auth/callback`
4. User clicks link → App opens via deep link
5. Supabase auto-verifies and creates session
6. App detects session via `onAuthStateChange`
7. Check if profile exists:
   - **New user** → Route to `/onboarding`
   - **Existing user** → Route to `/yearbook` (home)

### Deep Link Configuration

**App Scheme:** `bonded://`

**app.json:**
```json
{
  "scheme": "bonded"
}
```

**Supabase Dashboard Settings:**
```
Site URL: bonded://
Redirect URLs:
  - bonded://auth/callback
  - bonded://**
```

### Key Files

- `lib/supabase.js` - Supabase client with `detectSessionInUrl: true`
- `hooks/useSendOTP.js` - Sends magic link
- `app/login.jsx` - Email entry screen
- `app/otp.jsx` - "Check your email" + handles callback
- `stores/authStore.js` - Auth state management

### Profile Creation

**After successful auth:**
1. Check if profile exists in `profiles` table
2. If not, create profile with:
   - `id` (from `auth.users.id`)
   - `email`
   - `university_id` (from email domain, if available)
   - `created_at`

**Onboarding Flow:**
1. Basic Info (name, major, year)
2. Photo Selection (up to 6 photos)
3. Interests (tags)
4. Personality (vibe line, about me)
5. Study Habits
6. Living Habits
7. Class Schedule (optional, upload screenshot)

### Sign Out / Logout Flow

**Implementation:**
- Sign out button located in Settings (`app/settings.jsx`)
- Complete JWT and session clearing process

**Sign Out Process:**
1. **Supabase Session Clear** (`supabase.auth.signOut()`)
   - Removes JWT tokens (access_token, refresh_token) from SecureStore
   - Uses `SecureStore.deleteItemAsync` (configured in `lib/supabase.js`)
   - This is the primary JWT clearing mechanism

2. **Auth Store Clear** (`logout()` from `authStore`)
   - Clears Zustand state (resets to `initialState`)
   - Explicitly clears AsyncStorage (`auth-storage` key)
   - Ensures no stale auth data persists

3. **Navigation**
   - Redirects to `/login` screen after successful sign out

**Storage Architecture:**
- **SecureStore** (via Supabase): Stores JWT tokens
  - Cleared by: `supabase.auth.signOut()`
- **AsyncStorage** (via Zustand): Stores auth state
  - Cleared by: `logout()` function

**Why This Works:**
- Supabase's `signOut()` uses the configured `removeItem` function (`SecureStore.deleteItemAsync`)
- This removes the session data containing JWT tokens from secure storage
- Auth store is also cleared to prevent stale state
- All authentication data is properly cleared, including JWT tokens

### Security Status

**Current:**
- Magic links work
- Session persistence ✅
- Sign out properly clears JWT tokens ✅
- Basic RLS policies ✅
- Email verification ✅

**Missing:**
- Rate limiting on auth attempts
- Email domain allowlist (currently open)
- Advanced fraud detection
- MFA (future)

---

## Feature Status

### 1. Authentication & Onboarding

**Status:** 🟢 85% Complete

**Working:**
- ✅ Magic link login
- ✅ Email verification
- ✅ Session management
- ✅ Profile creation
- ✅ Simplified onboarding UI (4 active steps: Basic Info, Photos, Interests, Class Schedule)
- ✅ Photo upload
- ✅ Interest selection
- ✅ Feature-gated onboarding steps (Study Habits, Living Habits, Personality gated for future)

**Current Onboarding Flow (Simplified for Production):**

The onboarding has been simplified to focus on essential profile creation. Only 4 steps are active:

1. **Basic Information** (Required) - Full name, school, age, grade, gender, major
2. **Photos** (Required) - Yearbook photo + additional photos + yearbook quote
3. **Interests** (Optional) - User interests and preferences
4. **Class Schedule** (Optional) - Schedule upload for finding classmates (previously step 7, now step 4)

**Gated Steps (Future Expansion):**
- Study Habits - Gated via `ONBOARDING_STUDY_HABITS` feature gate
- Living Habits - Gated via `ONBOARDING_LIVING_HABITS` feature gate
- Personality - Gated via `ONBOARDING_PERSONALITY` feature gate

**Implementation Details:**
- Feature gates control which steps are shown
- `getActiveOnboardingSteps()` function filters steps based on feature gates
- Completion percentages adjusted: 25% per active step (total 100%)
- Gated steps are completely hidden from the flow
- Can be re-enabled by setting feature gates to `true` in `utils/featureGates.js`

**Why Simplified:**
- Faster onboarding = better user experience
- Focus on essential profile data for launch
- Additional steps can be added later via feature gates
- Reduces friction for new users

**UI Changes:**
- Skip button removed (only 4 steps, all should be completed)
- Skip functionality can be re-added later if needed when more optional steps are added
- Users can still use "Finish Later" to exit onboarding and complete later

**Photo Upload Status:**
- ✅ Photo selection and processing working
- ✅ Upload progress logging and error handling
- ⚠️ **Note**: Must use the bonded-media bucket and canonical university-scoped paths (see Media & Storage Architecture)

**OCR Status:**
- ❌ **NOT IMPLEMENTED** - OCR is currently a placeholder
- 📝 Schedule photo import requires OCR library installation
- ✅ Alternative methods available:
  - iCal (.ics) file upload
  - CSV file upload
  - Manual schedule entry
- 🔧 **To Implement OCR:**
  - Option 1: Install `@react-native-ml-kit/text-recognition` (recommended for on-device)
  - Option 2: Use cloud OCR service (Google Vision, AWS Textract, Azure)
  - Option 3: Use Tesseract.js (client-side, slower but free)
  - See `utils/ocr/extractText.ts` for implementation details

**Needs Work:**
- ⏳ OCR implementation for schedule photo import
- ⏳ .edu email enforcement (optional)
- ⏳ Domain-based university assignment
- ⏳ Ensure bonded-media bucket and storage policies are applied

---

## Media & Storage Architecture (Canonical)

**Decision:** Universities (`university_id`) are the canonical school abstraction for media, RLS, and permissions.

**Bucket:** `bonded-media` (private, 5 MB limit, images only)

**Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`, `image/heic`

**Folder Structure (locked):**
```
bonded-media/
└── universities/{university_id}/
    ├── users/{user_id}/
    │   ├── profile/avatar.jpg
    │   ├── profile/photos/{media_id}.jpg
    │   ├── posts/{post_id}/{media_id}.jpg
    │   └── stories/{story_id}.jpg
    ├── orgs/{org_id}/
    │   ├── logo/logo.jpg
    │   └── cover/cover.jpg
    └── events/{event_id}/
        ├── cover/cover.jpg
        └── gallery/{media_id}.jpg
```

**Rules:**
- Frontend never invents paths; must match the canonical structure.
- Storage is not queried directly for app logic.
- No `school_id` or schools table in Phase 1.
- Videos are not allowed in this bucket.

**Media Metadata Table:** `public.media` is the source of truth for ownership, permissions, expiry, and cleanup.

**Media Types (enum, keep in sync with DB + RLS):**
- `profile_avatar`
- `profile_banner`
- `profile_photo`
- `story`
- `post`
- `org_logo`
- `org_cover`
- `event_cover`
- `event_gallery`

**Upload Flow (mandatory order):**
1. Client-side compression (max 1080–1440px, ~0.7 JPEG quality, strip EXIF)
2. Generate canonical path
3. Upload to Storage
4. Insert row into `public.media`
5. UI updates

**Story Expiry:** soft delete via `deleted_at`, hard delete later via cron/edge function.

**RLS (storage.objects):**
- Uploads enforced by path + role:
  - users: own `universities/{university_id}/users/{auth.uid()}/...`
  - orgs: org admins/officers
  - events: event creator
- Read access: authenticated only, bucket-scoped

---

### 2. Yearbook (Profile Discovery)

**Status:** 🟢 95% Complete

**Working:**
- ✅ Instagram-style grid layout
- ✅ Profile cards (photo, name, tags, vibe line)
- ✅ Filter by major, class year, interests
- ✅ Profile detail view
- ✅ Social links display
- ✅ **Real data from Supabase** (via `useProfiles` hook)
- ✅ **"All" year filter** - Shows all profiles by default instead of filtering by year
- ✅ **Handles missing data gracefully** - Default values for major ("Undeclared"), quote ("No bio yet")
- ✅ **"You" card first** - Current user's card shows first with "You" badge so they can preview their yearbook appearance
- ✅ **Shared interests highlighting** - Interests that match the viewer's are highlighted in purple with checkmark
- ✅ **Clean top bar** - Notification button moved to top right with Bonded logo centered

**Implementation Details:**
- `useProfiles` hook fetches profiles from same university
- Shows profiles where `yearbook_visible = true OR yearbook_visible IS NULL`
- Default filter is "All" years - shows everyone regardless of graduation year
- Transforms profile data to match UI expectations (`photoUrl`, `name`, `quote`, etc.)
- Current user's profile is always first with `isCurrentUser: true` flag
- Shared interests comparison uses `Set` for efficient lookup

**Removed Features (V2 Scope):**
- ⏳ **GroupJam Score** - Compatibility scoring not yet implemented. Add when matching algorithm is ready.
- ⏳ **Highlights section** - "Interests", "Study matches", "Roommate fit" badges removed until features are implemented.

**Friendships System:**
- ✅ **Send friend requests** - Users can send requests via "Add friend" button in profile modal
- ✅ **Accept/Decline requests** - Friend requests appear in Notifications with Accept/Decline buttons
- ✅ **Friendship status** - Button shows appropriate state: "Add friend", "Pending", "Accept", "Friends"
- ✅ **Full-bleed profile photo** - Profile modal extends past notch for immersive experience

**Friendship Status States:**
1. `none` - Shows "Add friend" button
2. `request_sent` - Shows "Pending" with clock icon, tap to cancel
3. `request_received` - Shows "Accept" button (purple), tap to accept
4. `friends` - Shows "Friends" with checkmark, tap to unfriend

**Database Schema:**
- `friend_requests` table: id, sender_id, receiver_id, message, status (pending/accepted/declined), created_at, updated_at
- `friendships` table: id, user1_id, user2_id, created_at (bidirectional, user1_id < user2_id constraint)
- SQL: `database/friendships-schema.sql`

**Implementation Files:**
- `hooks/useFriends.js` - All friendship hooks (useFriends, useFriendshipStatus, useSendFriendRequest, etc.)
- `app/notifications.jsx` - Friend request notifications with Accept/Decline UI
- `app/yearbook.jsx` - ProfileModalContent component with friendship button

**Needs Work:**
- ⏳ Classmate highlighting (depends on schedule upload)
- ⏳ Advanced filters (distance, availability)
- ⏳ Profile analytics
- ⏳ GroupJam compatibility scoring (V2)
- ⏳ Study/Roommate matching highlights (V2)

---

### 3. The Quad (Campus Forum)

**Status:** 🟡 80% Complete

**Working:**
- ✅ Forum post feed
- ✅ Post creation (text, images)
- ✅ Forum switching (Main, Events, Clubs, Classes)
- ✅ Anonymous posting option
- ✅ **Real data from Supabase** (via `usePosts` hook)
- ✅ **Pagination** - Infinite scroll with 20 posts per page
- ✅ **Image preview** - Industry-standard design (Instagram/Twitter style)
- ✅ **Media upload** - Images upload to Supabase Storage and display in posts
- ✅ **Username display** - Public posts show username instead of full name for privacy

**Post Creation UI (V1):**
- ✅ Clean, modern design with image/video picker
- ✅ Image preview with adaptive layout:
  - Single image: Full-width square preview (1:1 aspect ratio)
  - Two images: Side-by-side grid with gap
  - Three+: 2-column grid with "+X more" overlay
- ✅ Remove button on each preview (dark overlay with shadow, platform-specific)
- ✅ Simplified action bar (image/video only - tags/meme/GIF removed for V1)

**Post Creation Features (V1):**
- ✅ Text posts
- ✅ Image posts (single or multiple)
- ✅ Video posts (UI ready, upload pending)
- ⏳ Tags (removed from UI, will add post-launch)
- ⏳ Meme picker (removed from UI, will add post-launch)
- ⏳ GIF picker (removed from UI, will add post-launch)

**Forum Feed Features (V1):**
- ✅ Username display for public posts (privacy-focused)
- ✅ Anonymous posts show "Anonymous" with purple avatar
- ⏳ Tag filter chips (removed from UI, will add post-launch)

**Default Forum Setup:**
- ✅ Auto-seeding logic in `useForums` hook creates "Main" forum if none exists
- ✅ SQL seed script available: `database/seed-uri-main-forum.sql` for URI
- ✅ SQL seed script available: `database/seed-default-forums.sql` for all universities
- ✅ Forum name: "Main" (not "The Quad" - Phase 1 naming)
- ✅ Forum type: `campus` (default main forum)
- ✅ Forum page automatically loads and displays the default "Main" forum

**Needs Work:**
- ⏳ **V1**: Comments persistence (DB + RLS + counts + UI wiring)
- ⏳ **V1**: Media upload pipeline (Supabase Storage buckets + policies)
- ⏳ Auto-create class forums on enrollment
- ⏳ Real-time post updates
- ⏳ Content moderation
- ⏳ Report/flag system

**V2 Scope:**
- ⏳ User-created forums (public/private/worldwide)
- ⏳ Reactions (upvote/downvote)
- ⏳ Reposts
- ⏳ Polls
- ⏳ Tags, Meme picker, GIF picker (removed from V1, will add post-launch)
- ⏳ Friends-only Yearbook ("My Network" drawer item)
- ⏳ Stories (relaunch with Supabase storage + realtime)

---

### 4. Stories

**Status:** 🔒 Disabled in V1 (Coming Soon in V2)

**Notes:**
- Stories UI is hidden in V1 and replaced with a "Coming soon" placeholder.
- Schema exists, but storage + realtime integration will ship in V2.

---

### 5. Events

**Status:** 🟡 85% Complete

**Working:**
- ✅ Calendar view (month/week/day)
- ✅ Event list view
- ✅ Event creation UI
- ✅ Event detail pages
- ✅ RSVP functionality UI
- ✅ Event filtering
- ✅ **Real Supabase integration** (via `useEventsForUser` hook)
- ✅ **Pagination** - Infinite scroll with 20 events per page
- ✅ **Future events only** - Automatically filters out past events
- ✅ **Proper sorting** - Events sorted by `start_at` ascending (upcoming first)

**Performance Optimizations:**
- **Pagination**: Uses `useInfiniteQuery` with 20 events per page
  - Reduces initial load time by fetching only first page
  - Loads more events as user scrolls (`onEndReached` in FlatList)
  - Prevents loading all events at once
- **Caching Strategy**:
  - `staleTime: 30 seconds` - Events refresh frequently to catch new events
  - `gcTime: 5 minutes` - Events kept in cache for quick access
  - `refetchOnMount: true` - Always refetches to get new events
  - `refetchOnWindowFocus: true` - Refetches when app regains focus
  - `refetchOnReconnect: true` - Refetches if connection was lost
- **Query Optimization**:
  - Only fetches future events (`gte('start_at', now)`)
  - Sorted by `start_at` ascending (upcoming events first)
  - Invite-only events fetched separately on first page only (to avoid duplicates)
  - Gracefully falls back to simpler queries if joins fail (RLS issues)
- **Result**: Fast initial load (20 events), smooth infinite scroll, always fresh data

**Pagination Details:**
- **Page Size**: 20 events per page
- **Infinite Scroll**: Automatically loads next page when user scrolls near bottom
- **Invite-Only Events**: Fetched on first page only and combined with regular events
- **Deduplication**: Events are deduplicated when combining invite-only and regular events
- **Sorting**: Combined events are re-sorted by `start_at` after merging

**Needs Work:**
- ⏳ URI events scraper deployment
- ⏳ Event notifications
- ⏳ Ticketing system (future)

---

### 6. Messaging

**Status:** 🟢 85% Complete

**Architecture:**

The messaging system uses a hybrid approach optimized for real-time performance and user experience:

1. **Messages (Postgres Changes)** - Persistent storage with real-time sync
   - Messages stored in `messages` table with `conversation_id`, `sender_id`, `content`, `metadata`
   - Real-time delivery via Supabase Realtime (Postgres Changes subscription)
   - Periodic polling (2.5s interval) as fallback for reliability
   - Optimistic UI updates for instant feedback
   - Users see message history when opening a conversation
   
2. **Typing Indicators (Broadcast)** - Ephemeral, not stored
   - Uses Supabase Broadcast channels for instant delivery
   - Shows profile picture/name with "is typing..." bubble
   - Auto-dismisses after 3 seconds of inactivity
   - Never touches the database (fast & cheap)
   - Broadcast payload includes `userName` and `userAvatar` for display
   
3. **Online Status (Presence)** - Real-time user presence
   - Uses Supabase Presence API
   - Shows green dot for online users
   - Automatically syncs across all clients

4. **Message Reactions (Postgres Changes)** - Real-time heart reactions
   - Heart reactions stored in `message_reactions` table
   - Real-time updates via Postgres Changes subscription
   - Double-tap to heart (Instagram-style)
   - Shows heart icon when anyone has reacted (not just current user)
   - Optimistic UI updates for instant feedback

5. **Push Notifications (Future)** - Edge Functions
   - Database Webhook triggers Edge Function on new message
   - Edge Function sends push via FCM/APNS
   - Reaches users when app is closed
6. **In-App Message Notifications (Future)** - Single Realtime Channel
   - Use one `notifications` realtime subscription per user instead of per-conversation channels
   - Triggers badges/toasts and updates unread counts without exhausting realtime connections
   - Pairs with message polling as a fallback when realtime is unavailable

**Database Schema:**

```sql
-- conversations table
CREATE TABLE conversations (
  id uuid PRIMARY KEY,
  name text,                    -- Optional for groups
  type text CHECK (type IN ('direct', 'group')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz,
  updated_at timestamptz
);

-- conversation_participants table  
CREATE TABLE conversation_participants (
  id uuid PRIMARY KEY,
  conversation_id uuid REFERENCES conversations(id),
  user_id uuid REFERENCES profiles(id),
  last_read_at timestamptz,     -- For unread counts
  is_muted boolean DEFAULT false,
  UNIQUE (conversation_id, user_id)
);

-- messages table
CREATE TABLE messages (
  id uuid PRIMARY KEY,
  conversation_id uuid REFERENCES conversations(id),
  sender_id uuid REFERENCES profiles(id),
  content text NOT NULL,
  metadata JSONB DEFAULT '{}',  -- For image URLs, file paths, etc.
  created_at timestamptz
);

-- message_reactions table
CREATE TABLE message_reactions (
  id uuid PRIMARY KEY,
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('heart')),
  created_at timestamptz,
  UNIQUE (message_id, user_id, reaction_type)
);
```

**Real-time Implementation Details:**

#### Message Delivery (Postgres Changes)

**How it works:**
1. **Initial Load**: `useMessages` hook uses React Query's `useInfiniteQuery` to fetch message history
2. **Real-time Subscription**: `MessagesContext.subscribeToMessages()` sets up a Postgres Changes subscription
3. **Subscription Setup**:
   ```javascript
   const channel = supabase
     .channel(`messages:${conversationId}`, {
       config: { broadcast: { self: false } } // Don't echo own messages
     })
     .on('postgres_changes', {
       event: 'INSERT',
       schema: 'public',
       table: 'messages',
       filter: `conversation_id=eq.${conversationId}`
     }, (payload) => {
       // Process new message
       // Fetch sender details
       // Add to contextMessages state
     })
     .subscribe()
   ```
4. **Deduplication**: Messages are deduplicated using a `Map` keyed by message ID
5. **Optimistic Updates**: When sending, a temporary message (`temp-{timestamp}`) is added immediately
6. **Replacement Logic**: When real message arrives, optimistic message is replaced by matching content/sender

**Key Features:**
- **Single Subscription Per Conversation**: Only one subscription active at a time (prevents loops)
- **Periodic Polling Fallback**: `refetchInterval: 2500` ensures messages arrive even if subscription fails
- **Optimistic UI**: Messages appear instantly when sent, then replaced with real data
- **Rapid Send Handling**: FIFO (First-In-First-Out) replacement ensures correct order when sending multiple messages quickly

**Deduplication Logic:**
```javascript
// In app/chat.jsx useEffect
setMessages(prev => {
  const merged = new Map();
  
  // 1. Add all existing optimistic messages (temp-*)
  prev.forEach(msg => {
    if (msg.id && msg.id.startsWith('temp-')) {
      merged.set(msg.id, msg);
    }
  });
  
  // 2. Add all real messages, replacing optimistic ones
  allDisplayMessages.forEach(msg => {
    // Find matching optimistic message (by content + sender for text, by type for images)
    const optimisticKey = /* ... matching logic ... */;
    
    if (optimisticKey) {
      merged.delete(optimisticKey); // Replace optimistic with real
    }
    
    merged.set(msg.id, msg); // Add/update real message
  });
  
  return Array.from(merged.values()).sort(/* by timestamp */);
});
```

#### Typing Indicators (Broadcast)

**How it works:**
1. **Send Typing Event**: When user types, `sendTypingIndicator()` broadcasts to channel
   ```javascript
   channel.send({
     type: 'broadcast',
     event: 'typing',
     payload: {
       userName: user.user_metadata?.full_name || user.user_metadata?.username,
       userAvatar: user.user_metadata?.avatar_url
     }
   })
   ```
2. **Receive Typing Event**: Other participants listen via `on('broadcast')`
3. **Display**: Shows profile picture/name with "is typing..." for 3 seconds
4. **Auto-dismiss**: Timeout clears indicator after 3 seconds of no typing

**Key Features:**
- **No Database**: Broadcast channels are ephemeral, never stored
- **Profile Info**: Includes user name and avatar for better UX
- **Self-exclusion**: `broadcast: { self: false }` prevents seeing own typing indicator
- **Debounced**: Only sends after user stops typing for 300ms

#### Image Messages

**How it works:**
1. **Image Selection**: User picks image from library using `expo-image-picker`
2. **Preview**: Image preview shown above text input (industry standard)
3. **Upload**: Image uploaded to Supabase Storage with path:
   ```
   universities/{universityId}/users/{userId}/messages/{mediaId}.jpg
   ```
4. **Metadata Storage**: Image path stored in message `metadata` JSONB column:
   ```json
   {
     "type": "image",
     "imagePath": "universities/.../messages/abc123.jpg",
     "imageUrl": "https://...signed-url..." // Temporary signed URL
   }
   ```
5. **Display**: `MessageImage` component regenerates signed URL from `imagePath` (since URLs expire)
6. **Optimistic Updates**: Local image URI shown immediately, replaced with uploaded image once ready

**Key Features:**
- **Signed URLs**: Images use temporary signed URLs (10-minute TTL)
- **URL Regeneration**: Component regenerates signed URL on render if expired
- **Loading States**: Shows "Loading image..." with 10-second timeout
- **Error Handling**: Falls back to placeholder if image fails to load
- **Media Type**: Uses `message_media` type in `media` table

#### Heart Reactions (Real-time)

**How it works:**
1. **Double-Tap Detection**: 400ms window between taps to detect double-tap
2. **Toggle Logic**: If hearted, remove reaction; if not, add reaction
3. **Optimistic Update**: UI updates immediately (optimistic)
4. **Database Update**: Supabase insert/delete in `message_reactions` table
5. **Real-time Sync**: Postgres Changes subscription broadcasts to all participants
6. **State Management**:
   - `userReactions`: Tracks current user's reactions (for toggle state)
   - `allReactions`: Tracks all users' reactions (for displaying heart icon)

**Real-time Subscription:**
```javascript
const channel = supabase
  .channel(`reactions:${conversationId}`)
  .on('postgres_changes', {
    event: '*', // INSERT, UPDATE, DELETE
    schema: 'public',
    table: 'message_reactions',
    filter: `reaction_type=eq.heart`
  }, (payload) => {
    if (payload.eventType === 'INSERT') {
      // Add reaction to allReactions
      setAllReactions(prev => {
        const updated = { ...prev };
        if (!updated[reaction.message_id]) {
          updated[reaction.message_id] = new Set();
        }
        updated[reaction.message_id].add(reaction.user_id);
        return updated;
      });
      
      // Update userReactions if it's from current user
      if (reaction.user_id === user.id) {
        setUserReactions(prev => ({ ...prev, [reaction.message_id]: 'heart' }));
      }
    } else if (payload.eventType === 'DELETE') {
      // Remove reaction from allReactions
      setAllReactions(prev => {
        const updated = { ...prev };
        if (updated[reaction.message_id]) {
          updated[reaction.message_id].delete(reaction.user_id);
          if (updated[reaction.message_id].size === 0) {
            delete updated[reaction.message_id];
          }
        }
        return updated;
      });
    }
  })
  .subscribe()
```

**Key Features:**
- **Real-time Updates**: Reactions appear instantly for all participants
- **All Users Visible**: Heart icon shows when ANY user has reacted (not just current user)
- **Optimistic UI**: Instant feedback when toggling own reaction
- **UUID Validation**: Filters out temporary message IDs before querying reactions

**Key Files:**
- `contexts/MessagesContext.jsx` - Real-time subscriptions, message state, typing indicators
- `hooks/useMessages.js` - React Query hooks for data fetching with periodic polling
- `app/messages.jsx` - Messages list UI
- `app/chat.jsx` - Chat screen UI with real-time updates, typing indicators, reactions
- `database/messaging-schema.sql` - Full schema with RLS policies
- `database/enable-realtime-messaging.sql` - Real-time replication setup
- `database/add-message-metadata.sql` - Metadata column for images
- `database/add-message-reactions.sql` - Reactions table and RLS

**Working:**
- ✅ Direct messaging UI
- ✅ Conversation list with real data
- ✅ Message sending with persistence
- ✅ **Real-time message delivery** (Postgres Changes + periodic polling)
- ✅ **Typing indicators** (Broadcast with profile picture/name)
- ✅ **Online status** (Presence)
- ✅ **Image messages** (upload, display, signed URLs)
- ✅ **Heart reactions** (double-tap, real-time updates)
- ✅ **Message unsend** (long-press to delete)
- ✅ Unread message counts
- ✅ Suggested people (profiles from same university)
- ✅ Create conversation (direct or group)
- ✅ Optimistic UI updates
- ✅ Message deduplication (handles rapid sends)

**Needs Work:**
- ⏳ Voice notes (removed from UI, planned for future)
- ⏳ Video messages
- ⏳ Push notifications (Edge Functions)
- ⏳ Message read receipts
- ⏳ Full reaction system (bond, fire, thumbs up, laugh - currently only heart)
- ⏳ Group chat management (add/remove members)

**Setup:**
1. Run `database/messaging-schema.sql` in Supabase SQL Editor to create tables and RLS policies
2. Run `database/enable-realtime-messaging.sql` to enable real-time replication
3. Run `database/add-message-metadata.sql` to add metadata column for images
4. Run `database/add-message-reactions.sql` to create reactions table
5. Ensure `message_reactions` table is added to `supabase_realtime` publication
6. Set `REPLICA IDENTITY FULL` on `messages` and `message_reactions` tables

---

### 7. Class Schedule & Classmates

**Status:** 🟡 20% Complete

**Working:**
- ✅ Database schema created
- ✅ Classes table structure
- ✅ Enrollment tracking schema

**Missing:**
- ❌ Schedule upload (iCal, CSV, screenshot OCR)
- ❌ Class matching to course catalog
- ❌ Auto-create class forums
- ❌ Classmate discovery UI
- ❌ "My Classes" screen
- ❌ "Find Study Partners" feature

---

### 8. Clubs

**Status:** 🟢 80% Complete

**Working:**
- ✅ Club profiles
- ✅ Member management
- ✅ Club discovery
- ✅ Join/leave clubs
- ✅ Club forums

**Needs Work:**
- ⏳ Event integration
- ⏳ Role permissions (admin, member)
- ⏳ Club analytics

---

### 9. Notifications

**Status:** 🟡 30% Complete

**Working:**
- ✅ Notifications screen UI
- ✅ Notification badge

**Missing:**
- ❌ Push notifications
- ❌ Real-time notification updates
- ❌ Notification preferences
- ❌ Email digests

---

### 10. Profile Management

**Status:** 🟡 60% Complete

**Working (V1 Shipped):**
- ✅ Profile view (basic info, interests read-only)
- ✅ Onboarding photo upload stored on profile
- ✅ Profile photo display + swipeable gallery
- ✅ Name editing only (no username edits)
- ✅ Social links display (if present)
- ✅ Settings screen

**Post-V1 (Planned):**
- ⏳ Username change flow (unique validation + availability check)
- ⏳ Profile photo editing (replace, reorder, delete)
- ⏳ Interests add/remove from profile
- ⏳ Cover photo support
- ⏳ Privacy settings
- ⏳ Block/report users
- ⏳ Activity status
- ⏳ Profile analytics

---

### 11. Scrapbook (Love Mode) - Dating/Matching

**Status:** ❌ 0% Not Started

**Planned Features:**
- Anonymous 1-10 rating system
- Preference unlock flow
- AI matching algorithm ("Love Print")
- Bonded stages (Text → Voice → Profile Reveal)
- Personality compatibility scoring

**Priority:** Post-MVP

---

### 12. Link AI Agent

**Status:** ❌ 0% Not Started

**Planned Features:**
- "Find me someone who..." natural language queries
- Personality checking
- Interest matching
- Conversation assistance
- Message moderation
- Red flag detection

**Priority:** Post-MVP

---

## Feature Gates

**Status:** ✅ Implemented

Feature gates allow us to control which features are enabled/disabled in the app without code changes. This is useful for:
- Gradual feature rollouts
- Beta testing
- Maintenance mode
- Feature deprecation

### Implementation

Feature gates are controlled via `utils/featureGates.js`:

```javascript
export const FEATURE_GATES = {
  LINK_AI: false,              // AI-powered conversation assistant
  RATE_MY_PROFESSOR: false,    // Professor rating and review system
  PAID_EVENTS: false,          // Event ticketing and payment system
}
```

### Currently Gated Features

As of January 2026, the following features are **disabled** (gated):

1. **Link AI** (`LINK_AI`)
   - **Location**: `app/link-ai.jsx`
   - **Status**: Disabled
   - **Reason**: Not ready for production, requires AI integration
   - **Impact**: 
     - Hidden from navigation drawer
     - Page redirects to home if accessed directly
     - Link AI suggestions in chat are disabled

2. **Rate My Professor** (`RATE_MY_PROFESSOR`)
   - **Location**: `app/rate-professor.jsx`
   - **Status**: Disabled
   - **Reason**: Not ready for production, requires professor data integration
   - **Impact**:
     - Hidden from navigation drawer
     - Page redirects to home if accessed directly

3. **Paid Events** (`PAID_EVENTS`)
   - **Location**: Event components (`components/Events/EventCard.jsx`, `app/events/[id].jsx`)
   - **Status**: Disabled
   - **Reason**: Payment integration not implemented
   - **Impact**:
     - "Buy Ticket" buttons replaced with "Paid Event - Coming Soon" (disabled)
     - Paid events still visible but non-purchasable
     - Event creation can still mark events as paid, but users cannot purchase

4. **Onboarding Steps** (Gated for future expansion)
   - **Study Habits** (`ONBOARDING_STUDY_HABITS`)
     - **Status**: Disabled (gated)
     - **Reason**: Simplified onboarding flow for production launch
     - **Impact**: Step not shown in onboarding flow
   
   - **Living Habits** (`ONBOARDING_LIVING_HABITS`)
     - **Status**: Disabled (gated)
     - **Reason**: Simplified onboarding flow for production launch
     - **Impact**: Step not shown in onboarding flow
   
   - **Personality** (`ONBOARDING_PERSONALITY`)
     - **Status**: Disabled (gated)
     - **Reason**: Simplified onboarding flow for production launch
     - **Impact**: Step not shown in onboarding flow

### How to Enable/Disable Features

To enable a feature, edit `utils/featureGates.js`:

```javascript
export const FEATURE_GATES = {
  LINK_AI: true,  // Change from false to true
  // ... other features
}
```

**Note**: After changing feature gates, you may need to:
- Restart the development server
- Clear app cache (if using Expo Go)
- Rebuild the app (for production)

### Feature Gate Checks

Features are gated in the following locations:

- **Navigation**: `app/_layout.tsx` - Drawer menu items conditionally rendered
- **Pages**: `app/link-ai.jsx`, `app/rate-professor.jsx` - Redirect if disabled
- **Components**: `components/Events/EventCard.jsx`, `app/events/[id].jsx` - UI elements conditionally rendered
- **Filters**: `app/events/index.jsx` - Paid events filtered if disabled

### Future Use Cases

Feature gates can be extended for:
- A/B testing different feature implementations
- Gradual rollout to specific user segments
- Maintenance mode for specific features
- Beta features for select users
- Regional feature availability

---

## UI/UX Best Practices

### Keyboard Handling in Modals

**Problem:** When text inputs are used inside modals, the keyboard can cover the input field, making it impossible for users to see what they're typing. This is especially problematic for location pickers and other forms that require text input.

**Solution:** Implement `KeyboardAvoidingView` with platform-specific behavior to push modal content above the keyboard.

#### Implementation Pattern

```jsx
import { KeyboardAvoidingView, Keyboard, Platform } from 'react-native'

<Modal
  visible={showModal}
  transparent
  animationType="slide"
  onRequestClose={() => {
    Keyboard.dismiss()
    setShowModal(false)
  }}
>
  <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={styles.modalOverlay}
    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
  >
    <TouchableOpacity
      style={styles.modalOverlay}
      activeOpacity={1}
      onPress={() => {
        Keyboard.dismiss()
        setShowModal(false)
      }}
    >
      <TouchableOpacity
        style={styles.modalContent}
        activeOpacity={1}
        onPress={(e) => e.stopPropagation()}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Modal content with TextInput */}
        </ScrollView>
      </TouchableOpacity>
    </TouchableOpacity>
  </KeyboardAvoidingView>
</Modal>
```

#### Key Components

1. **KeyboardAvoidingView**
   - Wraps the entire modal overlay
   - Platform-specific behavior: `'padding'` for iOS, `'height'` for Android
   - `keyboardVerticalOffset`: Adjusts positioning (typically 0 for iOS, 20 for Android)

2. **Keyboard.dismiss()**
   - Called when modal closes or overlay is tapped
   - Ensures keyboard is dismissed before modal closes
   - Prevents keyboard from staying visible after modal dismissal

3. **ScrollView with keyboardShouldPersistTaps**
   - Allows taps on interactive elements while keyboard is visible
   - `"handled"` value ensures buttons/links work even when keyboard is open

4. **TouchableOpacity for overlay**
   - Prevents accidental taps from closing modal
   - `stopPropagation()` on content prevents closing when tapping inside modal

#### Platform Differences

**iOS:**
- Uses `behavior="padding"` - adds padding to push content up
- `keyboardVerticalOffset={0}` - usually no offset needed
- Keyboard animation is smooth and predictable

**Android:**
- Uses `behavior="height"` - adjusts container height
- `keyboardVerticalOffset={20}` - may need small offset for status bar
- Keyboard behavior can vary by device/manufacturer

#### Current Implementation

**Files Using This Pattern:**
- `app/events/create.jsx` - Location picker modal
- `app/clubs/create.jsx` - Meeting location picker modal

**Why This Approach:**
- Provides consistent keyboard behavior across platforms
- Maintains modal accessibility (can still tap outside to close)
- Prevents keyboard from covering input fields
- Handles edge cases (keyboard dismissal on modal close)

#### Message Reactions (Planned for Future - Currently Only Heart via Double-Tap)

**Status:** Partially implemented - Only heart reaction via double-tap works. Full reaction system planned for future.

**Current Implementation:**
- ✅ Double-tap on message to heart (Instagram-style)
- ✅ Heart reactions stored in `message_reactions` table
- ❌ Reaction badges/UI not displayed (removed for simplicity)
- ❌ Multiple reaction types not available in UI (only heart works)

**Planned Full Implementation:**
- Multiple reaction types: heart ❤️, bond 🔗, fire 🔥, thumbs up 👍, laugh 😂
- Reaction badges below messages showing all reactions with counts
- Tap reaction badge to toggle your reaction
- Visual feedback when you've reacted (highlighted badge)
- Real-time reaction updates via Supabase subscriptions
- Reaction counts and who reacted

**Database Schema:**
- Table: `message_reactions`
- Columns: `id`, `message_id`, `user_id`, `reaction_type`, `created_at`
- Reaction types: `'heart'`, `'bond'`, `'fire'`, `'thumbs_up'`, `'laugh'`
- Unique constraint: `(message_id, user_id, reaction_type)` - one reaction type per user per message
- RLS policies ensure users can only react to messages in their conversations

**Technical Notes:**
- SQL script: `database/add-message-reactions.sql`
- Double-tap detection: 300ms window between taps
- Optimistic UI updates for instant feedback
- Reactions are stored but not currently displayed in UI
- Full reaction system can be re-enabled by uncommenting reaction badge UI

**Future Enhancements:**
- Animated heart on double-tap (visual feedback)
- Show reaction count in message footer
- Long-press to see who reacted
- Quick reaction picker (swipe up on message)
- Reaction animations and haptic feedback

#### Voice Notes in Messaging (Planned for Future)

**Status:** Removed from UI, planned for future implementation

**Description:**
Voice notes functionality was partially implemented but removed from the chat interface. The feature will be re-implemented in a future release.

**Planned Implementation:**
- Record voice messages using `expo-audio` or `react-native-vision-camera`
- Upload audio files to Supabase Storage (similar to image messages)
- Store audio metadata in message `metadata` JSONB column
- Display voice note bubbles with play/pause controls
- Show duration and waveform visualization
- Support for voice note playback with progress tracking

**Technical Notes:**
- Component `VoiceNoteRecorder` exists but is not currently used
- Audio playback would use `expo-av` Audio API
- Storage path: `universities/{universityId}/users/{userId}/messages/{mediaId}.m4a`
- Message type: `voice` with metadata containing `uri`, `duration`, `fileSize`

**Dependencies:**
- `expo-audio` - Voice recording
- `expo-av` - Audio playback
- Supabase Storage - Audio file storage

**Removed Components:**
- `VoiceNoteRecorder` component (exists but unused)
- Voice note button in chat input area
- Voice note message rendering
- Voice note playback functionality

#### Future Improvements

1. **Keyboard Height Detection**
   - Use `react-native-keyboard-controller` for more precise keyboard height tracking
   - Dynamic offset calculation based on actual keyboard height

2. **Animated Transitions**
   - Smooth animations when keyboard appears/disappears
   - Better visual feedback for users

3. **Accessibility**
   - Ensure screen readers announce keyboard state
   - Add keyboard shortcuts for common actions

4. **Testing**
   - Test on various device sizes (small phones, tablets)
   - Test with different keyboard types (external keyboards, split keyboards)
   - Test with different Android manufacturers (Samsung, OnePlus, etc.)

5. **Alternative Approaches**
   - Consider `react-native-keyboard-aware-scroll-view` for complex forms
   - Evaluate `react-native-modal` library which has built-in keyboard handling

#### Location Picker Specific Implementation

The location picker uses this pattern with additional features:

- **Real-time geocoding**: As user types, location is geocoded and map preview is shown
- **Loading states**: Shows activity indicator during geocoding
- **Error handling**: Displays error message if location cannot be found
- **Map preview**: Shows static map image with location overlay

**Technical Details:**
- Geocoding happens after 3+ characters are typed (debounced)
- Uses Google Geocoding API (with OpenStreetMap fallback)
- Map preview generated using `getStaticMapUrlWithCoords` for accuracy
- Coordinates stored for future use (directions, map navigation)

---

## Current State

### What Works Now (Can Demo)

1. **Authentication Flow** ✅
   - Email login → Magic link → Session created
   - Profile creation → Onboarding → Home

2. **Yearbook** ✅
   - Browse real profiles from Supabase
   - Filter by major, year, interests
   - View profile details

3. **Forum** ✅
   - View real posts from Supabase
   - Create posts with text, images, polls
   - Comment, upvote, share
   - Tag filtering

4. **Clubs** ✅
   - Browse clubs
   - Join/leave clubs
   - View club members

5. **Events** 🟡
   - View events (currently mock data)
   - Calendar view
   - RSVP UI (not saving to DB yet)

6. **Stories** 🔒
   - Disabled in V1 (Coming soon in V2)

7. **Profile** ✅
   - View profile details
   - Swipeable profile photos from onboarding (no in-profile edits yet)
   - Name edit only (username edits planned post-V1)
   - Interests read-only (editing planned post-V1)

### What Doesn't Work (Blockers)

1. **Real-time Features** ❌
   - No Supabase Realtime implementation
   - Messages use polling (inefficient)
   - No live updates for posts, stories

2. **Events & Stories** 🟡
   - Events still use partial integration
   - Stories disabled in V1; relaunch planned in V2

3. **Class Schedule** ❌
   - Upload not implemented
   - No parsing logic deployed
   - No classmate matching

4. **Advanced Features** ❌
   - No Scrapbook/Love Mode
   - No Link AI
   - No voice notes

5. **Monitoring** ❌
   - No error tracking (Sentry)
   - No analytics
   - No performance monitoring

6. **Testing** ❌
   - Zero test coverage
   - No CI/CD pipeline

### Known Issues

1. **Database Schema Incomplete**
   - 4 of 9 SQL files not deployed
   - Missing: Events, Social features, Security fixes

2. **Security Vulnerabilities**
   - 26 security issues identified (8 critical)
   - SECURITY_FIXES.sql not deployed
   - RLS policies incomplete

3. **Performance**
   - No image optimization/CDN
   - No query optimization
   - No caching strategy

4. **Content Moderation**
   - No AI moderation
   - No abuse reporting system
   - No admin tools

---

## Production Readiness

### Critical Blockers (MUST FIX)

#### Store Compliance & Sensitive Logging 🔴
**Impact:** App Store rejection, privacy violations, credential leakage, and unstable production logs.

**Issues (must fix before submission):**
- **Public debug routes**: `app/auth/debug.tsx` is a public expo-router screen and can expose token workflows.
- **Sensitive auth logging**: `app/auth/callback.tsx` previously logged tokens/emails during deep-link auth.
- **Missing iOS usage strings**: camera, photo library, microphone, and location permissions must be declared in `app.json` or the App Store will reject the build.
- **Excessive console logging in production**: high-volume `console.log` in chat/forum/onboarding can leak user data and impact performance.

**Fix applied (Jan 2026):**
- Gate debug routes and auth logs behind `__DEV__` and remove sensitive token/email output.
- Add iOS usage descriptions in `app.json` for camera, photo library, microphone, and location.
- Replace production `console.log` calls in core flows with dev-only logs.

**Maintenance: What to watch going forward**
- **New routes**: any debug/test pages under `app/` must be gated behind `__DEV__` or moved out of production routing.
- **Auth logs**: never log full URLs or token values; use sanitized logs only in dev.
- **Permissions**: when adding a new native capability (e.g., contacts, Bluetooth), add its iOS usage string immediately.
- **Logging policy**: keep a single logger utility and enforce `__DEV__` gates for non-error logs; review before each release.

---

#### Dynamic University Context & Route Hygiene 🟠
**Impact:** Incorrect campus branding in UI, user confusion, and accidental exposure of legacy screens.

**Issues:**
- **Hardcoded school names** in Yearbook/Calendar caused incorrect campus labels for non‑URI users.
- **Legacy screens in `app/`** are routable by default in Expo Router (e.g., `app/chat_legacy.jsx`).

**Fix applied (Jan 2026):**
- Yearbook/Calendar now read the university name from the current user profile (`profiles → universities.name`).
- Moved legacy screens out of `app/` so they are not route‑addressable.

**Maintenance: What to watch going forward**
- **No hardcoded campus strings**: always pull from `profiles.university` or a centralized campus context.
- **Route surface area**: anything under `app/` is a public route. Keep legacy/debug files outside `app/`.
- **Fallbacks**: use neutral copy like “Your University” when the profile hasn’t loaded.

---

#### Migration Parity & RLS Fallbacks 🟠
**Impact:** Features silently degrade (empty states, missing counts) even when the UI looks healthy.

**Issues:**
- Client warnings indicate tables or RLS policies might be missing or blocked (`notifications`, `org_members`, `forums`, etc.).
- Supabase migrations list should match repo/expected schema; gaps lead to runtime fallbacks.

**Fix guidance (Jan 2026):**
- Verify **all required tables exist** and RLS policies are applied in production.
- Compare `database/` scripts + expected schema against actual Supabase migrations.

**Maintenance: What to watch going forward**
- **Add a migration checklist** to release process (tables + RLS + realtime).
- **Fail fast in dev**: log missing tables loudly and add a health check screen for admins.
- **Schema drift**: use migration tooling or a schema diff before every release.

---

#### 1. Security Vulnerabilities 🔴
**Impact:** Data breaches, privacy violations

**Issues:**
- 26 security vulnerabilities (8 critical)
- Missing input validation on SECURITY DEFINER functions
- Incomplete RLS policies
- Overly permissive access controls
- No rate limiting

**Fix:**
- Deploy SECURITY_FIXES.sql
- Add `auth.uid()` validation to all functions
- Complete RLS policies for all tables
- Add input validation and length constraints

**Time:** 1-2 weeks

---

#### 2. Database Schema Incomplete 🔴
**Impact:** Features won't work, data loss risk

**Issues:**
- 4 of 9 SQL files not deployed
- Missing: Events schema, Social features, OCR features

**Fix:**
- Deploy `events-schema.sql`
- Deploy `complete-schema-additions-fixed.sql`
- Deploy `revised-features-fixed.sql`
- Deploy `SECURITY_FIXES.sql`

**Time:** 2-3 days

---

#### 3. No Testing 🔴
**Impact:** Bugs in production, crashes, app store rejection

**Issues:**
- Zero test coverage
- No unit, integration, or E2E tests
- No security testing

**Fix:**
- Set up Jest for unit tests
- Set up Detox/Appium for E2E tests
- Target 70%+ coverage
- Set up CI/CD pipeline

**Time:** 2-3 weeks

---

#### 4. No Monitoring 🔴
**Impact:** Blind to production issues, slow response

**Issues:**
- No error tracking (Sentry)
- No performance monitoring
- No crash reporting
- No business metrics

**Fix:**
- Set up Sentry
- Configure Supabase monitoring
- Create analytics dashboard
- Set up alerts

**Time:** 1 week

---

#### 5. Mock Data Everywhere 🟠
**Impact:** Features don't work with real users

**Issues:**
- Events use mock data
- Stories use mock data
- Need error handling for API failures

**Fix:**
- Update `useEvents` hook to use Supabase
- Update `useStories` hook to use Supabase
- Add error boundaries
- Add loading/empty states

**Time:** 1 week

---

### High Priority (SHOULD FIX)

#### 6. Real-time Features Missing 🟡
- Messaging uses polling (inefficient)
- No real-time notifications
- No live post updates

**Fix:** Implement Supabase Realtime subscriptions
**Time:** 1-2 weeks

---

#### 7. Performance Issues 🟡
- No image optimization
- No CDN
- No caching strategy
- No query optimization

**Fix:** Set up Cloudflare CDN, optimize images, add React Query caching
**Time:** 1 week

---

#### 8. Content Moderation 🟠
- No AI moderation
- No abuse reporting
- No admin tools

**Fix:** Implement basic moderation queue, add report functionality
**Time:** 2 weeks

---

### Estimated Timeline to Production

**Conservative (Recommended): 13-16 weeks**

- Week 1-2: Security & Database fixes
- Week 3-4: Replace mock data, error handling
- Week 5-6: Testing setup, achieve 70% coverage
- Week 7-8: Monitoring, performance optimization
- Week 9-10: Real-time features
- Week 11-12: Beta testing at 1-2 universities
- Week 13-16: Bug fixes, polish, launch

**Aggressive: 8-10 weeks**
(Assumes high focus, no blockers, some parallel work)

---

## Supabase Cost Analysis

### Overview

This section provides cost estimates for running Bonded on Supabase at various user scales. **Review this before production deployment** to understand infrastructure costs and plan accordingly.

---

### Supabase Pricing Tiers (2024)

#### Free Tier (Hobby) - Not Recommended for Production
- **Cost:** $0/month
- **Database:** 500 MB storage, 2 GB bandwidth
- **Storage:** 1 GB file storage, 2 GB bandwidth
- **MAUs:** 50,000 included
- **Realtime:** 200,000 messages/month
- **Edge Functions:** 500,000 invocations/month
- **Compute:** Shared (unreliable for production)
- **Why Not Recommended:**
  - Shared compute (unreliable performance)
  - Insufficient storage for production (1 GB files, 500 MB database)
  - Limited bandwidth (2 GB each)
  - No SLA or support
  - Bonded's usage would exceed limits immediately

#### Pro Tier (Recommended for Production)
- **Cost:** $25/month base + usage
- **Database:** 8 GB storage, 250 GB bandwidth included
- **Storage:** 100 GB file storage, 250 GB bandwidth included
- **MAUs:** 100,000 included
- **Realtime:** 5 million messages/month included
- **Edge Functions:** 2 million invocations/month included
- **Compute:** $10/month (Micro instance) included in base fee
- **Features:**
  - Dedicated compute (production-ready)
  - Daily backups
  - Point-in-time recovery
  - Email support
  - SLA guarantee

---

### Bonded App Usage Analysis

#### Features Using Supabase:

1. **Authentication** ✅
   - User signup/login
   - OTP verification
   - Session management

2. **Database (PostgreSQL)** ✅
   - Profiles, posts, comments, reactions
   - Messages, conversations
   - Events, organizations
   - Friendships, notifications
   - Media metadata

3. **Storage** ✅
   - Profile photos (avatar, banner, gallery)
   - Post images
   - Message images
   - Event images

4. **Real-time Subscriptions** ✅
   - Messages (real-time delivery)
   - Typing indicators (broadcast channels)
   - Message reactions (broadcast channels)
   - Notifications (potentially)

5. **Edge Functions** (Optional)
   - OCR text extraction (if using Supabase Edge Function)
   - Event scraping (if using Edge Functions)

---

### Cost Estimate for 1,000 Active Users

#### Assumptions:
- **1,000 Monthly Active Users (MAUs)**
- **Average user activity:**
  - 50 messages/user/month = 50,000 messages/month
  - 10 posts/user/month = 10,000 posts/month
  - 5 images uploaded/user/month = 5,000 images/month
  - Average image size: 2 MB
  - Real-time subscriptions: ~200 concurrent during peak hours

#### Monthly Usage Breakdown:

**1. Database Storage**
- Profile data: ~1 MB per user = 1 GB
- Posts/comments: ~500 KB per user = 500 MB
- Messages: ~200 KB per user = 200 MB
- Media metadata: ~100 KB per user = 100 MB
- **Total:** ~1.8 GB
- **Cost:** $0 (within 8 GB included)

**2. File Storage**
- Images: 5,000 images × 2 MB = 10 GB
- Growth over time: ~20 GB after 6 months
- **Cost:** $0 (within 100 GB included)

**3. Database Bandwidth (Egress)**
- Queries: ~500 MB/month
- **Cost:** $0 (within 250 GB included)

**4. Storage Bandwidth (Egress)**
- Image downloads: ~5 GB/month
- **Cost:** $0 (within 250 GB included)

**5. Real-time Messages**
- Messages: 50,000 messages/month
- Typing indicators: ~100,000 events/month
- Reactions: ~20,000 events/month
- **Total:** ~170,000 real-time messages/month
- **Cost:** $0 (within 5 million included)

**6. Edge Functions (if used)**
- OCR calls: ~1,000/month (if using Supabase Edge Function)
- Event scraping: ~100/month
- **Total:** ~1,100 invocations/month
- **Cost:** $0 (within 2 million included)

**7. Compute Resources**
- Micro instance ($10/month): Included in Pro plan
- Suitable for: Up to ~5,000 concurrent users
- **Cost:** $0 (included in base fee)

**8. Monthly Active Users (MAUs)**
- 1,000 MAUs
- **Cost:** $0 (within 100,000 included)

---

### Total Monthly Cost Estimate

#### For 1,000 Users: **Pro Plan - $25/month**

**Breakdown:**
- Base subscription: $25/month
- Includes $10 compute credits (covers Micro instance)
- All usage within included limits for 1,000 users
- **Total: $25/month**

---

### Cost Scaling Projections

#### 5,000 Users
- Storage: ~50 GB files, ~9 GB database
- Real-time: ~850,000 messages/month
- **Cost:** $25/month (still within limits)

#### 10,000 Users
- Storage: ~100 GB files, ~18 GB database
- Real-time: ~1.7 million messages/month
- **Cost:** $25/month (still within limits)

#### 50,000 Users
- Storage: ~500 GB files, ~90 GB database
- Real-time: ~8.5 million messages/month
- **Additional costs:**
  - File storage: (500 - 100) × $0.021 = **$8.40/month**
  - Database storage: (90 - 8) × $0.125 = **$10.25/month**
  - Real-time: (8.5M - 5M) × $2.50/1M = **$8.75/month**
- **Total:** $25 + $8.40 + $10.25 + $8.75 = **$52.40/month**

#### 100,000 Users
- Storage: ~1 TB files, ~180 GB database
- Real-time: ~17 million messages/month
- **Additional costs:**
  - File storage: (1000 - 100) × $0.021 = **$18.90/month**
  - Database storage: (180 - 8) × $0.125 = **$21.50/month**
  - Real-time: (17M - 5M) × $2.50/1M = **$30/month**
- **Total:** $25 + $18.90 + $21.50 + $30 = **$95.40/month**

#### Cost per User:
- **1,000 users:** $0.025/user/month
- **10,000 users:** $0.0025/user/month
- **100,000 users:** $0.00095/user/month

**The cost per user decreases significantly as you scale!**

---

### Cost Optimization Strategies

#### 1. Image Optimization (75% savings potential)
- **Compress images before upload** (reduce from 2 MB to ~500 KB)
- **Use WebP format** (smaller file sizes)
- **Implement lazy loading** (reduce bandwidth)
- **Status:** ⏳ Not yet implemented

#### 2. Database Optimization (30-50% savings potential)
- **Index frequently queried columns** ✅ (already implemented)
- **Use pagination** ✅ (already implemented)
- **Archive old data** (move old messages/posts to cold storage)
- **Status:** Partially implemented

#### 3. Real-time Optimization (40-60% savings potential)
- **Batch typing indicators** (send every 2-3 seconds, not every keystroke)
- **Use polling for less critical updates** ✅ (already implemented)
- **Implement message batching** (group multiple messages)
- **Status:** Partially implemented

#### 4. Storage Optimization (20-30% savings potential)
- **Delete unused images** (old profile photos, deleted posts)
- **Implement image CDN** (Cloudflare, etc.) to reduce bandwidth
- **Use signed URLs with expiration** ✅ (already implemented)
- **Status:** Partially implemented

#### 5. Caching (50-70% savings potential)
- **Cache frequently accessed data** (profiles, posts)
- **Use React Query caching** ✅ (already implemented)
- **Implement Redis for hot data** (if needed at scale)
- **Status:** Partially implemented

---

### Recommended Plan Selection

#### For 1,000 Users: **Pro Plan ($25/month)**

**Why:**
- ✅ Production-ready (dedicated compute, SLA)
- ✅ All usage within included limits
- ✅ Room to grow to ~10,000 users
- ✅ Support included
- ✅ Daily backups included

#### When to Upgrade:

**Team Plan ($599/month)** - Consider when:
- You need 100,000+ MAUs
- You need custom compute sizes
- You need dedicated support
- You need advanced security features

**Enterprise Plan (Custom pricing)** - Consider when:
- You need 1M+ MAUs
- You need custom infrastructure
- You need compliance certifications (SOC2, HIPAA, etc.)
- You need dedicated account management

---

### Additional Costs to Consider

#### 1. Domain & SSL
- **Domain:** ~$10-15/year
- **SSL:** Free (included with Supabase)

#### 2. Email Service (for OTP)
- **Supabase Auth:** Free (included)
- **Alternative (SendGrid, etc.):** $15-50/month for 50K emails

#### 3. Monitoring & Analytics
- **Supabase Dashboard:** Free (included)
- **Additional (Sentry, etc.):** $26-99/month (recommended for production)

#### 4. CDN (for images)
- **Cloudflare:** Free tier available
- **Supabase CDN:** Included in Pro plan

#### 5. Backup & Recovery
- **Daily backups:** Free (included in Pro)
- **Point-in-time recovery:** Free (included in Pro)

---

### Pre-Production Checklist

Before going to production, review:

- [ ] **Select Pro Plan** ($25/month) - Do not use Free tier
- [ ] **Set up usage alerts** in Supabase Dashboard
- [ ] **Monitor initial usage** for first month
- [ ] **Implement image compression** (high priority optimization)
- [ ] **Set up monitoring** (Sentry recommended)
- [ ] **Configure backup retention** (default is 7 days, can extend)
- [ ] **Review bandwidth usage** after first week
- [ ] **Plan for scaling** when approaching 10,000 users

---

### Resources

- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase Usage Dashboard](https://app.supabase.com/project/_/settings/billing)
- [Supabase Cost Calculator](https://supabase.com/pricing/calculator)
- [Supabase Documentation - Billing](https://supabase.com/docs/guides/platform/billing)

---

## Development Setup

### Prerequisites

```bash
Node.js:     v18+ or v20+
npm:         v9+
Expo CLI:    Installed via npm
Supabase:    Account with project created
macOS:       For iOS development (optional)
Android Studio: For Android development (optional)
```

### Environment Variables

**Create `.env` in root:**

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Unsplash
EXPO_PUBLIC_UNSPLASH_ACCESS_KEY=your-unsplash-key

# Optional
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/Bonded-Official.git
cd Bonded-Official

# Install dependencies
npm install

# Start Expo development server
npm start

# Run on iOS simulator (macOS only)
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web
```

### Supabase Setup

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create new project
   - Note your project URL and anon key

2. **Deploy Database Schema**
   - Go to SQL Editor in Supabase Dashboard
   - Run these files IN ORDER:
     1. `database/00-base-schema.sql`
     2. `database/setup.sql`
     3. `database/onboarding-schema.sql`
     4. `database/forum-features-schema.sql`
     5. `database/class-schedule-schema.sql`
     6. `database/events-schema.sql` (if available)
     7. `database/complete-schema-additions-fixed.sql` (if available)
     8. `database/revised-features-fixed.sql` (if available)
     9. `database/SECURITY_FIXES.sql` (CRITICAL - if available)

3. **Configure Authentication**
   - Go to Authentication → Providers → Email
   - Enable email provider
   - Allow new users to sign up: ON

4. **Configure URL Settings**
   - Go to Authentication → URL Configuration
   - Site URL: `bonded://`
   - Redirect URLs: Add `bonded://auth/callback` and `bonded://**`

5. **Test Connection**
   - Open app
   - Should see "Connected to Supabase" on index screen
   - If error, check environment variables

### Landing Page Setup

```bash
cd landing-page

# Install dependencies
npm install

# Set up environment variables
# Create .env.local with:
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Run development server
npm run dev

# Build for production
npm run build

# Deploy to Vercel (recommended)
vercel deploy
```

---

## Deployment Guide

### Mobile App Deployment

#### iOS App Store

**Prerequisites:**
- Apple Developer Account ($99/year)
- macOS with Xcode installed
- App Store Connect access

**Steps:**
1. Configure app.json with iOS bundle ID
2. Build production app: `eas build --platform ios`
3. Submit to App Store: `eas submit --platform ios`
4. Fill out App Store Connect metadata
5. Submit for review

**Required Assets:**
- App icon (1024x1024px)
- Screenshots (5.5", 6.5" displays)
- Privacy policy URL
- Terms of service URL

#### Android Play Store

**Prerequisites:**
- Google Play Developer Account ($25 one-time)
- Android signing key

**Steps:**
1. Configure app.json with Android package name
2. Build production APK/AAB: `eas build --platform android`
3. Submit to Play Store: `eas submit --platform android`
4. Fill out Play Store listing
5. Submit for review

**Required Assets:**
- App icon (512x512px)
- Feature graphic (1024x500px)
- Screenshots (phone, tablet)
- Privacy policy URL
- Terms of service URL

### Backend Deployment (Supabase)

**Production Supabase Project:**
1. Create production Supabase project (separate from dev)
2. Deploy all database schema files
3. Enable Point-in-Time Recovery (PITR)
4. Configure backups (daily automated)
5. Set up database monitoring
6. Configure connection pooling

### Landing Page Deployment (Vercel)

```bash
cd landing-page

# Link to Vercel project
vercel link

# Deploy to production
vercel --prod
```

**Environment Variables:**
- Set in Vercel dashboard
- Add `NEXT_PUBLIC_SUPABASE_URL`
- Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### CI/CD Pipeline (Recommended)

**GitHub Actions:**
```yaml
# .github/workflows/test.yml
name: Test
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm test
      - run: npm run lint
```

**Automated Builds:**
- Set up EAS Build for automatic builds on push
- Configure branch-based deployments
- Set up staging environment

---

## Next Steps

### Immediate Actions (This Week)

1. **Complete Database Deployment**
   - Deploy remaining 4 SQL files
   - Verify all tables created
   - Test RLS policies

2. **Update Events & Stories to Use Supabase**
   - Refactor `useEvents` hook
   - Refactor `useStories` hook
   - Update Context providers

3. **Set Up Basic Monitoring**
   - Install Sentry
   - Configure error tracking
   - Set up basic alerts

### Short-term (Next 2-4 Weeks)

4. **Replace All Mock Data**
   - Ensure all features use real Supabase data
   - Add comprehensive error handling
   - Add loading and empty states

5. **Set Up Testing Framework**
   - Install Jest
   - Write first unit tests
   - Set up CI/CD pipeline

6. **Fix Critical Security Issues**
   - Deploy SECURITY_FIXES.sql
   - Review and update RLS policies
   - Add input validation

### Medium-term (1-3 Months)

7. **Implement Real-time Features**
   - Supabase Realtime for messaging
   - Push notifications
   - Live post updates

8. **Performance Optimization**
   - Image optimization + CDN
   - Query optimization
   - Caching strategy

9. **Beta Testing**
   - Recruit beta testers from 1-2 universities
   - Collect feedback
   - Iterate

### Long-term (Post-Launch)

10. **Advanced Features**
    - Scrapbook (Love Mode) - AI matching
    - Link AI Agent - Conversation assistance
    - Voice notes in messaging (removed from UI, planned for future implementation)
    - Event ticketing system

11. **Scale & Growth**
    - Expand to more universities
    - Advanced analytics
    - A/B testing framework
    - Growth experiments

---

## Appendix

### Key Contacts

- **Founder**: Isaac (isaac@uri.edu)
- **Primary University**: University of Rhode Island (URI)

### Resources

- **Supabase Docs**: https://supabase.com/docs
- **Expo Docs**: https://docs.expo.dev
- **React Query Docs**: https://tanstack.com/query/latest
- **Zustand Docs**: https://zustand.docs.pmnd.rs

### Troubleshooting

**Common Issues:**

1. **"Supabase connection failed"**
   - Check environment variables
   - Verify Supabase project is active
   - Check network connectivity

2. **"Deep link not working"**
   - Verify `app.json` has correct scheme
   - Check Supabase redirect URLs match
   - Rebuild app after changes

3. **"Data not loading"**
   - Check Supabase RLS policies
   - Verify user is authenticated
   - Check browser/app console for errors

4. **"Cannot read property of undefined"**
   - Check React Query loading states
   - Add null checks to components
   - Use optional chaining (?.)

---

**Document Status:** Living document - update as project evolves
**Next Review:** After completing database deployment and mock data replacement
