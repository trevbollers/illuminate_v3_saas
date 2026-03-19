# User Flows

## Flow 1: SaaS Signup & Onboarding

```
┌─────────────────────────────────────────────────────────────────┐
│                     NEW CUSTOMER SIGNUP                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. LANDING PAGE                                                │
│     ├── Hero: "Manage Your Meat Business, End to End"           │
│     ├── Feature highlights                                      │
│     ├── Social proof / testimonials                             │
│     └── CTA → "View Pricing"                                   │
│                                                                 │
│  2. PRICING PAGE                                                │
│     ├── Plan comparison (Starter / Pro / Enterprise)            │
│     ├── Monthly vs Annual toggle                                │
│     ├── Add-on features listed                                  │
│     └── CTA → "Start Free Trial" / "Get Started"               │
│                                                                 │
│  3. REGISTRATION                                                │
│     ├── Name, Email, Password                                   │
│     ├── Business Name                                           │
│     ├── Selected plan passed via URL param                      │
│     └── Submit → Create user + tenant (status: onboarding)      │
│                                                                 │
│  4. STRIPE CHECKOUT                                             │
│     ├── Redirect to Stripe Checkout Session                     │
│     ├── 14-day free trial (no charge until trial ends)          │
│     ├── On success → redirect to verify-email page              │
│     └── On cancel → redirect back to pricing                   │
│                                                                 │
│  5. EMAIL VERIFICATION                                          │
│     ├── Check your email banner                                 │
│     ├── Resend verification link                                │
│     └── Click link → mark emailVerified → redirect to login     │
│                                                                 │
│  6. FIRST LOGIN                                                 │
│     ├── Email + Password                                        │
│     ├── Detect onboarding status                                │
│     └── Redirect → Onboarding Wizard                            │
│                                                                 │
│  7. ONBOARDING WIZARD (3 steps)                                 │
│     ├── Step 1: Business Details (address, type, logo)          │
│     ├── Step 2: First Location setup                            │
│     ├── Step 3: Invite team members (optional, skip)            │
│     └── Complete → tenant.status = "active" → Dashboard         │
│                                                                 │
│  8. DASHBOARD                                                   │
│     ├── Welcome state with quick-start checklist                │
│     ├── "Add your first product"                                │
│     ├── "Set up your storefront"                                │
│     └── "Import ingredients"                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Flow 2: Super Admin Management

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUPER ADMIN PORTAL                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DASHBOARD                                                      │
│  ├── MRR / ARR metrics                                         │
│  ├── Active tenants count                                       │
│  ├── New signups this period                                    │
│  ├── Churn rate                                                 │
│  └── Revenue chart                                              │
│                                                                 │
│  TENANTS                                                        │
│  ├── List all tenants (search, filter by plan/status)           │
│  ├── View tenant detail                                         │
│  │   ├── Subscription info                                      │
│  │   ├── Usage metrics                                          │
│  │   ├── User list                                              │
│  │   ├── Activity log                                           │
│  │   └── Actions: suspend, upgrade, extend trial                │
│  └── Create tenant manually                                     │
│                                                                 │
│  BILLING                                                        │
│  ├── Revenue overview                                           │
│  ├── Failed payments / past due                                 │
│  ├── Upcoming renewals                                          │
│  └── Stripe dashboard link                                      │
│                                                                 │
│  FEATURE FLAGS                                                  │
│  ├── List all flags                                             │
│  ├── Create / edit flag                                         │
│  ├── Rollout controls (% / tenant list / plan)                  │
│  └── Toggle global enable/disable                               │
│                                                                 │
│  PLANS & PRICING                                                │
│  ├── Manage plans                                               │
│  ├── Edit features & limits                                     │
│  └── Manage add-ons                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Flow 3: Tenant Operations (Meat Locker App)

```
┌─────────────────────────────────────────────────────────────────┐
│                 TENANT DASHBOARD — MEAT LOCKER                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SIDEBAR NAVIGATION                                             │
│  ├── Dashboard (overview metrics)                               │
│  ├── Products                                                   │
│  │   ├── Product list / grid                                    │
│  │   ├── Create / edit product                                  │
│  │   ├── Configure product options                              │
│  │   └── Assign recipe                                          │
│  ├── Recipes                                                    │
│  │   ├── Recipe list                                            │
│  │   ├── Create / edit recipe                                   │
│  │   ├── Ingredient calculator (yield-based)                    │
│  │   └── Cost analysis                                          │
│  ├── Inventory                                                  │
│  │   ├── Ingredient stock levels                                │
│  │   ├── Stock movements log                                    │
│  │   ├── Low stock alerts                                       │
│  │   └── AI MRP suggestions (add-on)                            │
│  ├── Purchasing                                                 │
│  │   ├── Purchase orders                                        │
│  │   ├── Suppliers                                              │
│  │   └── Receiving                                              │
│  ├── Sales                                                      │
│  │   ├── Sales orders                                           │
│  │   ├── Quotes                                                 │
│  │   ├── Customers                                              │
│  │   └── Revenue reports                                        │
│  ├── Production                                                 │
│  │   ├── Production batches                                     │
│  │   ├── Schedule                                               │
│  │   └── Quality tracking                                       │
│  ├── Storefront                                                 │
│  │   ├── Storefront settings                                    │
│  │   ├── Product visibility                                     │
│  │   └── AI Configurator settings (add-on)                      │
│  ├── Team                                                       │
│  │   ├── Users & roles                                          │
│  │   ├── Invite members                                         │
│  │   └── Permissions                                            │
│  ├── Locations                                                  │
│  │   ├── Manage locations                                       │
│  │   └── Transfer inventory                                     │
│  └── Settings                                                   │
│      ├── Organization profile                                   │
│      ├── Billing & subscription                                 │
│      ├── Branding                                               │
│      └── Notifications                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Flow 4: B2C Storefront (Tenant's Customers)

```
┌─────────────────────────────────────────────────────────────────┐
│              B2C STOREFRONT — CUSTOMER FACING                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. BROWSE                                                      │
│     ├── Product catalog (grid/list)                             │
│     ├── Category filters                                        │
│     ├── Search                                                  │
│     └── Featured products                                       │
│                                                                 │
│  2. PRODUCT DETAIL                                              │
│     ├── Product images                                          │
│     ├── Description & pricing                                   │
│     ├── Configuration options                                   │
│     │   ├── Manual selection                                    │
│     │   └── AI Configurator (chatbot-style, add-on)             │
│     │       "I want a 5lb brisket, medium smoke, mesquite rub"  │
│     ├── Add to Cart                                             │
│     └── Request Quote (for bulk)                                │
│                                                                 │
│  3. CART                                                        │
│     ├── Line items with config summary                          │
│     ├── Quantity adjustment                                     │
│     ├── Subtotal / Tax / Total                                  │
│     └── Proceed to Checkout                                     │
│                                                                 │
│  4. CHECKOUT                                                    │
│     ├── Contact info                                            │
│     ├── Delivery / pickup selection                             │
│     ├── Stripe payment                                          │
│     └── Order confirmation                                      │
│                                                                 │
│  5. ORDER TRACKING                                              │
│     ├── Order status updates                                    │
│     ├── Estimated ready date                                    │
│     └── Pickup/delivery notifications                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Authentication Flows

### Login
```
Email + Password → NextAuth credentials provider
  → Check user exists
  → Verify password (bcrypt)
  → Check emailVerified
  → Load memberships & active tenant
  → Generate JWT with { userId, tenantId, role, permissions }
  → Redirect to appropriate dashboard
```

### OAuth (Google)
```
Google OAuth → NextAuth Google provider
  → Find or create user by email
  → If new user → prompt to create/join tenant
  → If existing → load memberships
  → Generate JWT → redirect to dashboard
```

### Password Reset
```
Enter email → Generate reset token → Send email
  → Click link → Validate token → New password form
  → Update password → Redirect to login
```

### Invite Flow
```
Admin sends invite (email + role)
  → Generate invite token → Send email
  → Click link → Register (pre-filled email)
  → Auto-join tenant with assigned role
  → Redirect to dashboard
```
