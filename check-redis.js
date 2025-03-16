const Redis = require('redis');

async function checkRedis() {
    const host = 'master.graphene-backend-v2-redis--wlcfywkylwkq.addon.code.run';
    const port = 6379;
    const username = 'default';
    const password = '5003d40465510ccd270e7a5c67a3596e';
    
    console.log('Connecting to Redis...');
    const client = Redis.createClient({
        username: username,
        password: password,
        socket: {
            host: host,
            port: port,
            tls: true,
            servername: host // This matches the hostname for TLS verification
        }
    });

    client.on('error', err => console.log('Redis Client Error', err));

    await client.connect();

    console.log('\nChecking update locks:');
    const keys = [
        'carbon:isUpdating:mantle-1',
        'carbon:isUpdating:sonic-1',
        'carbon:isUpdatingAnalytics:mantle-1',
        'carbon:isUpdatingAnalytics:sonic-1'
    ];

    for (const key of keys) {
        const value = await client.get(key);
        console.log(`${key}: ${value === null ? 'not set' : value}`);
    }

    await client.quit();
}

checkRedis().catch(console.error); 