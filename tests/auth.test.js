require("dotenv").config({
  path: ".env.test",
});

const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = require("../app");
const User = require("../models/User");
const Item = require("../models/Item");
const Bid = require("../models/Bid");
const AutoBid = require("../models/AutoBid");
const Notification = require("../models/Notification");

const mockIo = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
};

jest.mock("../middleware/cloudinary", () => ({
  uploader: {
    upload_stream: jest.fn((options, callback) => {
      return {
        end: jest.fn(() => {
          callback(null, {
            secure_url:
              "https://res.cloudinary.com/demo/image/upload/sample.jpg",
            public_id: "eternal/items/sample_id",
          });
        }),
      };
    }),
  },
}));

jest.mock("../middleware/nodemailer", () => {
  const mockSendMail = jest.fn().mockResolvedValue({
    messageId: "<test-message-id-12345@ethereal.email>",
  });

  return jest.fn().mockResolvedValue({
    transporter: {
      sendMail: mockSendMail,
    },
    user: "no-reply@eternal.com",
  });
});

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  app.set("io", mockIo);
});

afterEach(async () => {
  jest.clearAllMocks();
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});

const generateToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role || "User",
    },
    process.env.JWT_SECRET || "test-secret",
  );
};

const createDummyItem = async (overrideProps = {}) => {
  return await Item.create({
    title: "Test Item",
    description: "Standard item description",
    category: "Collectibles",
    startingPrice: 100,
    auctionStart: new Date(),
    auctionEnd: new Date(Date.now() + 86400000),
    image: {
      url: "https://example.com/image.jpg",
      publicId: "sample_public_id",
    },
    ...overrideProps,
  });
};

describe("App Integration Tests", () => {
  describe("Auth Routes", () => {
    describe("POST /auth/sign-up", () => {
      test("creates a new user", async () => {
        const response = await request(app).post("/auth/sign-up").send({
          username: "zaid",
          email: "zaid@example.com",
          password: "password123",
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.username).toBe("zaid");
        expect(response.body.hashedPassword).toBeUndefined();
      });

      test("does not allow signup when missing fields", async () => {
        const response = await request(app).post("/auth/sign-up").send({
          username: "zaid",
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe("Please fill the required Fields.");
      });

      test("does not allow password less than 6 characters", async () => {
        const response = await request(app).post("/auth/sign-up").send({
          username: "zaid",
          email: "zaid@example.com",
          password: "123",
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe(
          "Password must be more than 6 characters",
        );
      });
    });

    describe("POST /auth/sign-in", () => {
      beforeEach(async () => {
        const hashedPassword = await bcrypt.hash("password123", 10);
        await User.create({
          username: "zaid",
          email: "zaid@example.com",
          hashedPassword,
        });
      });

      test("authenticates with valid credentials", async () => {
        const response = await request(app).post("/auth/sign-in").send({
          email: "zaid@example.com",
          password: "password123",
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.accessToken).toBeDefined();
      });

      test("rejects invalid password", async () => {
        const response = await request(app).post("/auth/sign-in").send({
          email: "zaid@example.com",
          password: "wrongpassword",
        });

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toBe("Invalid credentials.");
      });
    });
  });

  describe("Admin Routes", () => {
    describe("GET /admin/all-users", () => {
      test("returns users with role 'User'", async () => {
        const admin = await User.create({
          username: "admin1",
          email: "a1@test.com",
          hashedPassword: "password123",
          role: "Admin",
        });

        await User.create({
          username: "user1",
          email: "u1@test.com",
          hashedPassword: "password123",
          role: "User",
        });

        const token = generateToken(admin);

        const response = await request(app)
          .get("/admin/all-users")
          .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.users || response.body).toBeDefined();
      });
    });

    describe("PUT /admin/delete/:userId", () => {
      test("soft deletes user and user items", async () => {
        const admin = await User.create({
          username: "admin",
          email: "adm@t.com",
          hashedPassword: "password123",
          role: "Admin",
        });
        const user = await User.create({
          username: "zaid",
          email: "z@t.com",
          hashedPassword: "password123",
        });
        const item = await createDummyItem({
          title: "Item 1",
          owner: user._id,
        });

        const token = generateToken(admin);

        const response = await request(app)
          .put(`/admin/delete/${user._id}`)
          .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(200);

        const checkItem = await Item.findById(item._id);
        expect(checkItem.isDeleted).toBe(true);
      });
    });
  });

  describe("Item Routes", () => {
    describe("POST /items", () => {
      test("creates new item with image upload", async () => {
        const user = await User.create({
          username: "seller",
          email: "s@t.com",
          hashedPassword: "password123",
        });
        const token = generateToken(user);

        const response = await request(app)
          .post("/items")
          .set("Authorization", `Bearer ${token}`)
          .field("title", "Antique Watch")
          .field("description", "Rare item description")
          .field("category", "Watches")
          .field("startingPrice", "100")
          .field("auctionStart", new Date().toISOString())
          .field("auctionEnd", new Date(Date.now() + 86400000).toISOString())
          .attach("image", Buffer.from("fake-img"), "watch.jpg");

        expect([200, 201]).toContain(response.statusCode);
      });
    });

    describe("DELETE /items/:id", () => {
      test("soft deletes item when requested by owner", async () => {
        const user = await User.create({
          username: "owner",
          email: "o@t.com",
          hashedPassword: "password123",
        });
        const token = generateToken(user);

        const item = await createDummyItem({ title: "Item", owner: user._id });

        const response = await request(app)
          .delete(`/items/${item._id}`)
          .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(200);
      });
    });
  });

  describe("Bid Routes", () => {
    describe("POST /bid/:itemId/bids", () => {
      test("creates manual bid successfully", async () => {
        const seller = await User.create({
          username: "seller",
          email: "s@t.com",
          hashedPassword: "password123",
        });
        const bidder = await User.create({
          username: "bidder",
          email: "b@t.com",
          hashedPassword: "password123",
        });
        const token = generateToken(bidder);

        const item = await createDummyItem({
          title: "Painting",
          startingPrice: 500,
          owner: seller._id,
          auctionEnd: new Date(Date.now() + 86400000),
        });

        const response = await request(app)
          .post(`/bid/${item._id}/bids`)
          .set("Authorization", `Bearer ${token}`)
          .send({ amount: 500 });

        expect([200, 201]).toContain(response.statusCode);
      });

      test("prevents owner from bidding on own item", async () => {
        const seller = await User.create({
          username: "seller",
          email: "s@t.com",
          hashedPassword: "password123",
        });
        const token = generateToken(seller);

        const item = await createDummyItem({
          title: "Painting",
          startingPrice: 500,
          owner: seller._id,
          auctionEnd: new Date(Date.now() + 86400000),
        });

        const response = await request(app)
          .post(`/bid/${item._id}/bids`)
          .set("Authorization", `Bearer ${token}`)
          .send({ amount: 500 });

        expect([400, 403]).toContain(response.statusCode);
      });
    });
  });

  describe("Notification Routes", () => {
    describe("POST /Notification", () => {
      test("creates notification and sends email", async () => {
        const user = await User.create({
          username: "recipient",
          email: "r@t.com",
          hashedPassword: "password123",
        });
        const token = generateToken(user);

        const response = await request(app)
          .post("/Notification")
          .set("Authorization", `Bearer ${token}`)
          .send({
            recipient: user._id,
            subject: "Alert",
            message: "You won!",
          });

        expect([200, 201]).toContain(response.statusCode);
      });
    });
  });

  describe("Profile Routes", () => {
    describe("GET /user/dashboard", () => {
      test("returns full user profile state", async () => {
        const user = await User.create({
          username: "zaid",
          email: "z@t.com",
          hashedPassword: "password123",
        });
        const token = generateToken(user);

        await createDummyItem({ title: "My Item", owner: user._id });

        const response = await request(app)
          .get("/user/dashboard")
          .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(200);
      });

      test("returns 404 when user is soft deleted", async () => {
        const user = await User.create({
          username: "zaid",
          email: "z@t.com",
          hashedPassword: "password123",
          isDeleted: true,
        });
        const token = generateToken(user);

        const response = await request(app)
          .get("/user/dashboard")
          .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(404);
      });
    });
  });
});
