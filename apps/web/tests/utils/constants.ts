/**
 * Test user credentials and data
 */
export const TEST_USER = {
  email: "test@example.com",
  password: "TestPassword123!",
  name: "Test User",
  id: "user-test-123",
};

/**
 * Test project data
 */
export const TEST_PROJECT = {
  name: "Test Project",
  description: "A project created for testing purposes",
  id: "project-test-123",
};

/**
 * Test subscription tiers
 */
export const TEST_PLANS = {
  FREE: {
    name: "Free",
    priceId: "price_free",
    features: ["1 Project", "Basic Support"],
  },
  PRO: {
    name: "Pro",
    priceId: "price_pro_monthly",
    features: ["10 Projects", "Priority Support", "Analytics"],
  },
  TEAM: {
    name: "Team",
    priceId: "price_team_monthly",
    features: [
      "Unlimited Projects",
      "24/7 Support",
      "Advanced Analytics",
      "SSO",
    ],
  },
};

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  HEALTH: "/api/v1/health",
  USERS: "/api/v1/users",
  PROJECTS: "/api/v1/projects",
  CHECKOUT: "/api/v1/checkout",
  BILLING: "/api/v1/billing",
  WEBHOOKS_STRIPE: "/api/webhooks/stripe",
};

/**
 * Page routes
 */
export const ROUTES = {
  HOME: "/",
  SIGN_IN: "/sign-in",
  SIGN_UP: "/sign-up",
  DASHBOARD: "/dashboard",
  PROFILE: "/dashboard/profile",
  SETTINGS: "/dashboard/settings",
};

/**
 * Test timeouts
 */
export const TIMEOUTS = {
  SHORT: 1000,
  MEDIUM: 5000,
  LONG: 10000,
  E2E: 30000,
};

/**
 * HTTP status codes for assertions
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};
