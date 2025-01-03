from typing import Optional
import aioredis
from utils.errors import AppError
from utils.logger import logger

# Redis Configuration
REDIS_CONFIG = {
    'enabled': False,  # Set to True when needed
    'host': 'localhost',
    'port': 6379,
    'password': None,
    'prefix': 'tank_management:'
}

# Initialize Redis client
_redis = None

async def get_redis() -> Optional[aioredis.Redis]:
    """Get or create Redis client"""
    global _redis
    
    if not REDIS_CONFIG['enabled']:
        return None
    
    if not _redis:
        try:
            _redis = await aioredis.Redis(
                host=REDIS_CONFIG['host'],
                port=REDIS_CONFIG['port'],
                password=REDIS_CONFIG['password'],
                encoding='utf-8',
                decode_responses=True
            )
            # Test connection
            await _redis.ping()
            logger.info('Redis client initialized')
        except Exception as e:
            logger.error('Failed to initialize Redis client:', error=str(e))
            raise AppError('Failed to initialize cache connection', 500)
    
    return _redis

async def set_cache(key: str, value: str, expire: int = 3600) -> bool:
    """Set cache with expiration"""
    redis = await get_redis()
    if not redis:
        return False
    
    try:
        key = f"{REDIS_CONFIG['prefix']}{key}"
        await redis.set(key, value, ex=expire)
        return True
    except Exception as e:
        logger.error('Failed to set cache:', error=str(e))
        return False

async def get_cache(key: str) -> Optional[str]:
    """Get cache value"""
    redis = await get_redis()
    if not redis:
        return None
    
    try:
        key = f"{REDIS_CONFIG['prefix']}{key}"
        return await redis.get(key)
    except Exception as e:
        logger.error('Failed to get cache:', error=str(e))
        return None

async def delete_cache(key: str) -> bool:
    """Delete cache value"""
    redis = await get_redis()
    if not redis:
        return False
    
    try:
        key = f"{REDIS_CONFIG['prefix']}{key}"
        await redis.delete(key)
        return True
    except Exception as e:
        logger.error('Failed to delete cache:', error=str(e))
        return False

async def clear_cache_pattern(pattern: str) -> bool:
    """Clear cache by pattern"""
    redis = await get_redis()
    if not redis:
        return False
    
    try:
        pattern = f"{REDIS_CONFIG['prefix']}{pattern}*"
        keys = await redis.keys(pattern)
        if keys:
            await redis.delete(*keys)
        return True
    except Exception as e:
        logger.error('Failed to clear cache pattern:', error=str(e))
        return False

async def close_connection():
    """Close Redis connection"""
    global _redis
    if _redis:
        await _redis.close()
        _redis = None
        logger.info('Redis connection closed') 