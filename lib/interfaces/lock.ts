import { connect, Redis } from 'https://deno.land/x/redis@v0.29.0/mod.ts';
import 'std/dotenv/load.ts';

const REDIS_HOST = Deno.env.get('REDIS_HOST') || '';
const REDIS_PORT = Deno.env.get('REDIS_PORT') || '';
const REDIS_DBNAME = Deno.env.get('REDIS_DBNAME') || '';
const REDIS_USERNAME = Deno.env.get('REDIS_USERNAME') || '';
const REDIS_PASSWORD = Deno.env.get('REDIS_PASSWORD') || '';

export default class Lock {
  protected redis?: Redis;

  constructor(skipConnection = false) {
    if (!skipConnection) {
      this.connectToRedis();
    }
  }

  protected async connectToRedis() {
    if (this.redis) {
      return this.redis;
    }

    const redis = await connect({
      hostname: REDIS_HOST,
      port: REDIS_PORT,
      username: REDIS_USERNAME,
      password: REDIS_PASSWORD,
      name: REDIS_DBNAME,
    });

    // Set a default connection timeout of 300s
    // redis.configSet('timeout', '300'); // redislabs doesn't support this

    this.redis = redis;
  }

  protected disconnectFromRedis() {
    if (!this.redis) {
      return;
    }

    this.redis.close();

    this.redis = undefined;
  }

  public close() {
    this.disconnectFromRedis();
  }

  public async has(lockName: string) {
    if (!this.redis) {
      await this.connectToRedis();
    }

    const lock = await this.redis!.get(`lock:${lockName}`);

    return Boolean(lock);
  }

  public async set(lockName: string, expiresInSeconds = 300) {
    if (!this.redis) {
      await this.connectToRedis();
    }

    await this.redis!.set(`lock:${lockName}`, 'true', { ex: expiresInSeconds });
  }

  public async clear(lockName: string) {
    if (!this.redis) {
      await this.connectToRedis();
    }

    await this.redis!.del(`lock:${lockName}`);
  }
}
