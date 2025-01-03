"""
InfluxDB Configuration
"""

INFLUX_CONFIG = {
    'url': 'http://10.241.0.11:8086',
    'token': 'tYOhoTE_K37UjdL_84JDGM9fMVRWV7nzNROchO4L2lT9Wfl2-6WUxQPrIFJyHz2MwYxT0blsNN3b-P_wPFeqLg==',
    'org': 'irissar',
    'bucket': 'PK_Marine',
    'measurement': 'PK_Marine'
}

# Initialize async InfluxDB client
_client = None
query_api = None

async def get_client() -> InfluxDBClientAsync:
    """Get or create InfluxDB client"""
    global _client, query_api
    
    if not _client:
        try:
            _client = InfluxDBClientAsync(
                url=INFLUX_CONFIG['url'],
                token=INFLUX_CONFIG['token'],
                org=INFLUX_CONFIG['org']
            )
            query_api = _client.query_api()
            logger.info('InfluxDB client initialized')
        except Exception as e:
            logger.error('Failed to initialize InfluxDB client:', error=str(e))
            raise AppError('Failed to initialize database connection', 500)
    
    return _client

async def query_with_retry(query: str, max_retries: int = 3) -> Optional[Dict]:
    """Execute query with retry logic"""
    client = await get_client()
    retries = 0
    
    while retries < max_retries:
        try:
            result = await query_api.query(query)
            return result
        except Exception as e:
            retries += 1
            logger.warning(f'Query failed (attempt {retries}/{max_retries}):', error=str(e))
            
            if retries == max_retries:
                logger.error('Max retries reached:', error=str(e))
                raise AppError('Database query failed after max retries', 500)
            
            # Reset client on connection errors
            if 'connection' in str(e).lower():
                global _client, query_api
                _client = None
                query_api = None
                client = await get_client()

async def close_connection():
    """Close InfluxDB connection"""
    global _client, query_api
    if _client:
        await _client.close()
        _client = None
        query_api = None
        logger.info('InfluxDB connection closed') 