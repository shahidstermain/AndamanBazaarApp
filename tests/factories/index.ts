/**
 * Test Data Factories for AndamanBazaar
 * Provides consistent, realistic test data generation
 */

import { faker } from "@faker-js/faker";

// User factory
export const createUser = (overrides = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  phone: faker.phone.number(),
  avatar: faker.image.avatar(),
  isVerified: faker.datatype.boolean(),
  isPremium: faker.datatype.boolean(),
  location: {
    latitude: faker.location.latitude({ min: 11.0, max: 13.0 }),
    longitude: faker.location.longitude({ min: 92.0, max: 94.0 }),
    address: faker.location.streetAddress(),
    city: "Port Blair",
    state: "Andaman & Nicobar Islands",
  },
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

// Listing factory
export const createListing = (overrides = {}) => ({
  id: faker.string.uuid(),
  title: faker.commerce.productName(),
  description: faker.commerce.productDescription(),
  price: parseFloat(faker.commerce.price({ min: 100, max: 50000 })),
  category: faker.helpers.arrayElement([
    "electronics",
    "clothing",
    "furniture",
    "vehicles",
    "books",
    "sports",
    "home",
    "other",
  ]),
  condition: faker.helpers.arrayElement([
    "new",
    "like-new",
    "good",
    "fair",
    "poor",
  ]),
  images: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () =>
    faker.image.url({ width: 640, height: 480 }),
  ),
  location: {
    latitude: faker.location.latitude({ min: 11.0, max: 13.0 }),
    longitude: faker.location.longitude({ min: 92.0, max: 94.0 }),
    address: faker.location.streetAddress(),
    city: "Port Blair",
    state: "Andaman & Nicobar Islands",
  },
  sellerId: faker.string.uuid(),
  status: faker.helpers.arrayElement(["active", "sold", "reserved", "deleted"]),
  isBoosted: faker.datatype.boolean(),
  viewCount: faker.number.int({ min: 0, max: 1000 }),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

// Chat message factory
export const createMessage = (overrides = {}) => ({
  id: faker.string.uuid(),
  chatId: faker.string.uuid(),
  senderId: faker.string.uuid(),
  receiverId: faker.string.uuid(),
  content: faker.lorem.sentences(faker.number.int({ min: 1, max: 3 })),
  type: faker.helpers.arrayElement(["text", "image", "location"]),
  isRead: faker.datatype.boolean(),
  createdAt: faker.date.recent(),
  ...overrides,
});

// Chat factory
export const createChat = (overrides = {}) => ({
  id: faker.string.uuid(),
  listingId: faker.string.uuid(),
  buyerId: faker.string.uuid(),
  sellerId: faker.string.uuid(),
  lastMessage: faker.lorem.sentence(),
  lastMessageTime: faker.date.recent(),
  isActive: faker.datatype.boolean(),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

// Payment factory
export const createPayment = (overrides = {}) => ({
  id: faker.string.uuid(),
  orderId: faker.string.uuid(),
  amount: parseFloat(faker.commerce.price({ min: 100, max: 50000 })),
  currency: "INR",
  status: faker.helpers.arrayElement([
    "pending",
    "processing",
    "completed",
    "failed",
    "refunded",
  ]),
  paymentMethod: faker.helpers.arrayElement([
    "upi",
    "card",
    "net_banking",
    "cash",
  ]),
  transactionId: faker.string.alphanumeric({ length: 20 }),
  createdAt: faker.date.recent(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

// Review factory
export const createReview = (overrides = {}) => ({
  id: faker.string.uuid(),
  listingId: faker.string.uuid(),
  reviewerId: faker.string.uuid(),
  revieweeId: faker.string.uuid(),
  rating: faker.number.int({ min: 1, max: 5 }),
  comment: faker.lorem.paragraph(),
  isVerified: faker.datatype.boolean(),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

// Notification factory
export const createNotification = (overrides = {}) => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  type: faker.helpers.arrayElement([
    "new_message",
    "listing_view",
    "listing_sold",
    "payment_received",
    "review_received",
    "system_update",
  ]),
  title: faker.lorem.sentence(),
  message: faker.lorem.paragraph(),
  isRead: faker.datatype.boolean(),
  actionUrl: faker.internet.url(),
  createdAt: faker.date.recent(),
  ...overrides,
});

// Bulk data creation utilities
export const createBulkUsers = (count: number, overrides = {}) =>
  Array.from({ length: count }, () => createUser(overrides));

export const createBulkListings = (count: number, overrides = {}) =>
  Array.from({ length: count }, () => createListing(overrides));

export const createBulkMessages = (
  count: number,
  chatId: string,
  overrides = {},
) =>
  Array.from({ length: count }, () => createMessage({ chatId, ...overrides }));

// Test scenarios
export const createTestScenario = {
  newUserWithListings: () => ({
    user: createUser(),
    listings: createBulkListings(3, { sellerId: createUser().id }),
  }),

  activeChatSession: () => {
    const buyer = createUser();
    const seller = createUser();
    const listing = createListing({ sellerId: seller.id });
    const chat = createChat({
      listingId: listing.id,
      buyerId: buyer.id,
      sellerId: seller.id,
    });
    const messages = createBulkMessages(5, chat.id);

    return { buyer, seller, listing, chat, messages };
  },

  completedTransaction: () => {
    const buyer = createUser();
    const seller = createUser();
    const listing = createListing({ sellerId: seller.id, status: "sold" });
    const payment = createPayment({
      orderId: listing.id,
      status: "completed",
    });
    const review = createReview({
      listingId: listing.id,
      reviewerId: buyer.id,
      revieweeId: seller.id,
    });

    return { buyer, seller, listing, payment, review };
  },
};

// Edge case data
export const createEdgeCaseData = {
  emptyUser: () =>
    createUser({
      email: "",
      name: "",
      phone: "",
      location: null,
    }),

  invalidListing: () =>
    createListing({
      title: "",
      price: -1,
      images: [],
      category: "invalid",
    }),

  longMessage: () =>
    createMessage({
      content: "A".repeat(10000),
    }),

  extremeLocation: () => ({
    latitude: 999,
    longitude: -999,
    address: "",
    city: "",
    state: "",
  }),
};
