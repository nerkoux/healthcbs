import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient> | null = null;
let isConnected = false;
let isConnecting = false;

// Only create Redis client if REDIS_URL is provided
function getRedisClient() {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL,
    });

    redisClient.on('error', (err) => {
      console.warn('Redis connection error - caching disabled:', err.message);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
      isConnected = true;
    });
  }

  return redisClient;
}

export async function connectRedis() {
  const client = getRedisClient();
  
  if (!client) {
    return null;
  }

  if (isConnected) {
    return client;
  }

  if (isConnecting) {
    // Wait for connection to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    return isConnected ? client : null;
  }

  try {
    isConnecting = true;
    await client.connect();
    isConnected = true;
    isConnecting = false;
    return client;
  } catch (error) {
    console.warn('Redis connection failed - caching disabled');
    isConnecting = false;
    isConnected = false;
    return null;
  }
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const client = await connectRedis();
    if (!client) return null;
    
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    // Silently fail - app works without cache
    return null;
  }
}

export async function setCache(key: string, value: any, expiresIn = 3600): Promise<void> {
  try {
    const client = await connectRedis();
    if (!client) return;
    
    await client.setEx(key, expiresIn, JSON.stringify(value));
  } catch (error) {
    // Silently fail - app works without cache
  }
}

export async function deleteCached(key: string): Promise<void> {
  try {
    const client = await connectRedis();
    if (!client) return;
    
    await client.del(key);
  } catch (error) {
    // Silently fail - app works without cache
  }
}

export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    const client = await connectRedis();
    if (!client) return;
    
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (error) {
    // Silently fail - app works without cache
  }
}

export default redisClient;
