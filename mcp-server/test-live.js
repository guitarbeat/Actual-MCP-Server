import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const EventSource = require('eventsource');
const ES = EventSource;

const URL = 'https://actual-mcp.onrender.com';
const TOKEN = '9d7ed444f28745aa225d7ab219c00b1500414949121412002b2d34ad7f1bc97b';

async function test() {
    console.log('--- Starting Live MCP Test ---');
    console.log('EventSource object:', EventSource);
    const RealES = typeof EventSource === 'function' ? EventSource : EventSource.EventSource || EventSource.default;

    if (!RealES) {
        console.error('Could not find EventSource constructor');
        process.exit(1);
    }

    const es = new RealES(`${URL}/sse`, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
    });

    let messageEndpoint = '';

    es.onmessage = (event) => {
        console.log('Received SSE message:', event.data);
    };

    es.addEventListener('endpoint', async (event) => {
        console.log('Received endpoint:', event.data);
        const url = new URL(event.data, URL);
        messageEndpoint = url.toString();

        try {
            console.log('1. Fetching tools...');
            const listResponse = await fetch(messageEndpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'tools/list',
                    params: {}
                })
            });
            const tools = await listResponse.json();
            console.log(`Found ${tools.result.tools.length} tools.`);

            const hasInsights = tools.result.tools.some(t => t.name === 'get-financial-insights');
            console.log('Financial Insights tool found:', hasInsights);

            if (hasInsights) {
                console.log('2. Calling get-financial-insights...');
                const callResponse = await fetch(messageEndpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: 2,
                        method: 'tools/call',
                        params: {
                            name: 'get-financial-insights',
                            arguments: {}
                        }
                    })
                });
                const insights = await callResponse.json();
                console.log('Insights Result:', JSON.stringify(insights.result, null, 2));
            }

        } catch (error) {
            console.error('Error during test:', error);
        } finally {
            es.close();
            console.log('--- Test Complete ---');
            process.exit(0);
        }
    });

    es.onerror = (err) => {
        console.error('SSE Error:', err);
        es.close();
        process.exit(1);
    };

    setTimeout(() => {
        console.error('Test timed out');
        es.close();
        process.exit(1);
    }, 20000);
}

test();
