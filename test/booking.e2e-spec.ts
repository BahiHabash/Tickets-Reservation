import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Types } from 'mongoose';
import * as crypto from 'crypto';

describe('Booking System (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  let eventId: string;

  const adminEmail = `admin-${crypto.randomUUID()}@test.com`;
  const userEmail = `user-${crypto.randomUUID()}@test.com`;
  const password = 'Password@123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    // 1. Setup Admin & User
    await request(app.getHttpServer())
      .post('/users/register')
      .send({ email: adminEmail, password, role: 'admin' });
    
    const adminLogin = await request(app.getHttpServer())
      .post('/users/login')
      .send({ email: adminEmail, password });
    adminToken = adminLogin.body.access_token;

    await request(app.getHttpServer())
      .post('/users/register')
      .send({ email: userEmail, password, role: 'user' });
    
    const userLogin = await request(app.getHttpServer())
      .post('/users/login')
      .send({ email: userEmail, password });
    userToken = userLogin.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Flow: Create -> Publish -> Book -> Pay', () => {
    it('Phase 1: Admin creates and publishes an event', async () => {
      const eventRes = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'E2E Testing Event',
          price: 150,
          capacity: 10,
          date: new Date(Date.now() + 86400000).toISOString(),
          location: 'Virtual',
          currency: 'usd',
        });
      
      expect(eventRes.status).toBe(201);
      eventId = eventRes.body._id;

      const publishRes = await request(app.getHttpServer())
        .post(`/events/${eventId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(publishRes.status).toBe(201);
      expect(publishRes.body.status).toBe('published');
    });

    it('Phase 2: User books tickets (Happy Scenario)', async () => {
      const idempotencyKey = crypto.randomUUID();
      const bookingRes = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          eventId,
          quantity: 2,
          idempotencyKey,
          paymentGateway: 'stripe',
        });
      
      expect(bookingRes.status).toBe(201);
      expect(bookingRes.body.status).toBe('pending');
      expect(bookingRes.body.idempotencyKey).toBe(idempotencyKey);
      
      const bookingId = bookingRes.body._id;

      // Phase 3: Pay for the booking
      const payRes = await request(app.getHttpServer())
        .post('/payments/pay')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId,
        });

      expect(payRes.status).toBe(201);
      expect(payRes.body.success).toBe(true);
    });
  });

  describe('Concurrency & Conflicts', () => {
    it('should maintain idempotency for concurrent requests with same key', async () => {
      const idempotencyKey = crypto.randomUUID();
      
      const req1 = request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ eventId, quantity: 1, idempotencyKey });
      
      const req2 = request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ eventId, quantity: 1, idempotencyKey });

      const results = await Promise.all([req1, req2]);
      
      // One succeeds 201, one might succeed 201 (idempotent result) or 201 if first was so fast
      // But they must return the SAME booking ID.
      expect(results[0].status).toBe(201);
      expect(results[1].status).toBe(201);
      expect(results[0].body._id).toBe(results[1].body._id);
    });

    it('should prevent overbooking on concurrent requests (Race conditions)', async () => {
      // Create a small capacity event for this test
      const smallEvent = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Race Event',
          price: 50,
          capacity: 3,
          date: new Date(Date.now() + 86400000).toISOString(),
          location: 'Stadium',
          currency: 'usd'
        });
      
      const smallId = smallEvent.body._id;
      await request(app.getHttpServer()).post(`/events/${smallId}/publish`).set('Authorization', `Bearer ${adminToken}`);

      // Attempt concurrent bookings (4 requests for 1 ticket each, but only 3 slots available)
      const concurrentReqs = Array.from({ length: 4 }).map(() => 
        request(app.getHttpServer())
          .post('/bookings')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ eventId: smallId, quantity: 1, idempotencyKey: crypto.randomUUID() })
      );

      const results = await Promise.all(concurrentReqs);
      
      const successes = results.filter(r => r.status === 201).length;
      const failures = results.filter(r => r.status === 400).length;

      expect(successes).toBe(3);
      expect(failures).toBe(1);
    });
  });
});
